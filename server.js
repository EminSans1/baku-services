const express = require('express');
const path = require('path');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const { authenticator } = require('otplib');
const { sequelize, User, Ad, syncDatabase } = require('./db');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

// ─────────────────────────────────────────────────────────────────────────────
// Cloudinary SDK reads CLOUDINARY_URL on require — validate format first
// ─────────────────────────────────────────────────────────────────────────────
function parseCloudinaryEnv() {
  const raw = process.env.CLOUDINARY_URL;
  if (!raw) return null;
  const trimmed = String(raw).trim().replace(/^["']|["']$/g, '');
  const match = trimmed.match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/);
  if (!match) {
    console.warn(
      '[WARN] CLOUDINARY_URL invalid. Use: cloudinary://API_KEY:API_SECRET@CLOUD_NAME (from Cloudinary Dashboard)'
    );
    return null;
  }
  return {
    api_key: match[1],
    api_secret: match[2],
    cloud_name: match[3]
  };
}

const cloudinaryCredentials = parseCloudinaryEnv();
if (!cloudinaryCredentials) {
  delete process.env.CLOUDINARY_URL;
}

const cloudinary = require('cloudinary').v2;
if (cloudinaryCredentials) {
  cloudinary.config(cloudinaryCredentials);
  console.log(`[INFO] Cloudinary enabled (cloud: ${cloudinaryCredentials.cloud_name})`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Environment & secrets
// ─────────────────────────────────────────────────────────────────────────────
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const ALLOWED_IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

/**
 * Require env in production. In development a fallback is allowed ONLY for
 * non-secret values; security-critical secrets MUST be provided explicitly.
 */
function requireEnv(name, { devFallback, secret = false } = {}) {
  const value = process.env[name];
  if (value && String(value).trim()) {
    return String(value).trim();
  }
  if (IS_PRODUCTION) {
    console.error(`[FATAL] Missing required environment variable: ${name}`);
    process.exit(1);
  }
  if (secret) {
    // Generate a random per-process value so dev still works but the secret
    // is unique per restart and never matches anything an attacker could guess.
    const generated = crypto.randomBytes(48).toString('hex');
    console.warn(
      `[WARN] ${name} not set — generated an EPHEMERAL random value for this dev process. ` +
      'All sessions/tokens will be invalidated when the server restarts.'
    );
    return generated;
  }
  if (devFallback !== undefined) {
    console.warn(`[WARN] ${name} not set — using non-secret development fallback.`);
    return devFallback;
  }
  console.error(`[FATAL] Missing environment variable: ${name}`);
  process.exit(1);
}

const JWT_SECRET = requireEnv('JWT_SECRET', { secret: true });
const ADMIN_PASSWORD = requireEnv('ADMIN_PASSWORD', { secret: true });
// TOTP base32 secret. Generate once with otplib.authenticator.generateSecret()
// and store in env. If absent in development, an ephemeral one is generated
// (and printed once below) so QR provisioning still works for local testing.
const ADMIN_TOTP_SECRET = (() => {
  const env = process.env.ADMIN_TOTP_SECRET && process.env.ADMIN_TOTP_SECRET.trim();
  if (env) return env;
  if (IS_PRODUCTION) {
    console.error('[FATAL] Missing required environment variable: ADMIN_TOTP_SECRET');
    process.exit(1);
  }
  const generated = authenticator.generateSecret();
  console.warn(
    `[WARN] ADMIN_TOTP_SECRET not set — generated dev secret: ${generated} ` +
    '(scan into your authenticator app or set in env to persist).'
  );
  return generated;
})();
// Optional fallback: legacy static 2FA code, kept ONLY for dev/migration.
// Never set this in production.
const ADMIN_2FA_CODE_FALLBACK = process.env.ADMIN_2FA_CODE
  ? String(process.env.ADMIN_2FA_CODE).trim()
  : null;
if (IS_PRODUCTION && ADMIN_2FA_CODE_FALLBACK) {
  console.warn(
    '[WARN] ADMIN_2FA_CODE is set in production. Static codes are insecure — ' +
    'remove ADMIN_2FA_CODE and rely on ADMIN_TOTP_SECRET.'
  );
}

// CSRF: a server-side secret used to derive double-submit cookie tokens.
const CSRF_SECRET = requireEnv('CSRF_SECRET', { secret: true });

// ─────────────────────────────────────────────────────────────────────────────
const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5000;

// Cookie configuration
const COOKIE_NAME_USER = 'bbs_session';
const COOKIE_NAME_ADMIN = 'bbs_admin';
const COOKIE_NAME_CSRF = 'bbs_csrf';
const USER_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days
const ADMIN_TOKEN_TTL_SECONDS = 60 * 60;          // 1 hour

const baseCookieOptions = {
  httpOnly: true,
  secure: IS_PRODUCTION,
  sameSite: IS_PRODUCTION ? 'strict' : 'lax',
  path: '/'
};

function setUserSessionCookie(res, token) {
  res.cookie(COOKIE_NAME_USER, token, {
    ...baseCookieOptions,
    maxAge: USER_TOKEN_TTL_SECONDS * 1000
  });
}
function clearUserSessionCookie(res) {
  res.clearCookie(COOKIE_NAME_USER, baseCookieOptions);
}
function setAdminSessionCookie(res, token) {
  res.cookie(COOKIE_NAME_ADMIN, token, {
    ...baseCookieOptions,
    maxAge: ADMIN_TOKEN_TTL_SECONDS * 1000
  });
}
function clearAdminSessionCookie(res) {
  res.clearCookie(COOKIE_NAME_ADMIN, baseCookieOptions);
}

// ─────────────────────────────────────────────────────────────────────────────
// Local Upload Directory & Multer
// ─────────────────────────────────────────────────────────────────────────────
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = ALLOWED_IMAGE_EXTENSIONS.has(ext) ? ext : '.jpg';
    cb(null, `${uuidv4()}${safeExt}`);
  }
});

const uploadFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowedTypes.includes(file.mimetype) || !ALLOWED_IMAGE_EXTENSIONS.has(ext)) {
    return cb(new Error('Недопустимый тип файла. Разрешены только JPG, PNG и WEBP.'), false);
  }
  cb(null, true);
};

/** Prevent path traversal when serving or deleting local uploads. */
function safeLocalFilename(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const base = path.basename(raw);
  if (!base || base !== raw || base.includes('..')) return null;
  const ext = path.extname(base).toLowerCase();
  if (!ALLOWED_IMAGE_EXTENSIONS.has(ext)) return null;
  if (!/^[a-zA-Z0-9._-]+$/.test(base)) return null;
  return base;
}

function resolveUploadFilePath(filename) {
  const safe = safeLocalFilename(filename);
  if (!safe) return null;
  const uploadRoot = path.resolve(UPLOAD_DIR);
  const resolved = path.resolve(uploadRoot, safe);
  if (!resolved.startsWith(uploadRoot + path.sep)) return null;
  return resolved;
}

function isAllowedImageUrl(url) {
  if (typeof url !== 'string' || url.length > 512) return false;
  if (url.startsWith('https://res.cloudinary.com/')) {
    return /^https:\/\/res\.cloudinary\.com\/[a-zA-Z0-9_-]+\//.test(url);
  }
  if (url.startsWith('https://images.unsplash.com/')) {
    return true;
  }
  if (url.startsWith('/api/uploads/')) {
    return safeLocalFilename(url.slice('/api/uploads/'.length)) !== null;
  }
  return false;
}

function sanitizeImageUrls(images) {
  if (images == null) return null;
  if (!Array.isArray(images)) {
    throw new Error('Изображения должны быть массивом URL');
  }
  if (images.length > 5) {
    throw new Error('Можно прикрепить не более 5 изображений');
  }
  for (const url of images) {
    if (!isAllowedImageUrl(url)) {
      throw new Error('Недопустимый URL изображения');
    }
  }
  return images;
}

const uploadAdImage = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: uploadFilter
});

const uploadAvatar = multer({
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: uploadFilter
});

// Helper: Upload file to Cloudinary (fallback to local if failed or not configured)
const uploadToCloudinaryOrLocal = async (file) => {
  if (cloudinaryCredentials) {
    try {
      const result = await cloudinary.uploader.upload(file.path, {
        folder: 'baku_services'
      });
      try {
        fs.unlinkSync(file.path);
      } catch (err) {
        console.error('Failed to delete temp file:', err);
      }
      return result.secure_url;
    } catch (err) {
      console.error('Cloudinary upload failed, falling back to local:', err);
      return `/api/uploads/${file.filename}`;
    }
  }
  return `/api/uploads/${file.filename}`;
};

// Helper: Delete file from local or Cloudinary
const deleteFileOrCloudinary = async (url) => {
  if (!url) return;
  if (url.includes('cloudinary.com')) {
    try {
      const parts = url.split('/');
      const publicIdWithExt = parts.slice(parts.indexOf('upload') + 2).join('/');
      const publicId = publicIdWithExt.substring(0, publicIdWithExt.lastIndexOf('.'));
      await cloudinary.uploader.destroy(publicId);
      console.log('Successfully deleted from Cloudinary:', publicId);
    } catch (err) {
      console.error('Failed to delete from Cloudinary:', err);
    }
  } else if (url.includes('/api/uploads/')) {
    try {
      const filename = url.split('/api/uploads/')[1];
      const filePath = resolveUploadFilePath(filename);
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log('Successfully deleted local file:', filePath);
      }
    } catch (err) {
      console.error('Failed to delete local file:', err);
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Security middleware
// ─────────────────────────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      // Allow only own scripts. CRA inlines a tiny bootstrap chunk in
      // index.html; we hash-allow it via 'strict-dynamic' alternative if
      // needed. For now we only permit 'self' which works once CRA is
      // configured to emit external scripts (default in production build).
      scriptSrc: ["'self'"],
      // Tailwind/CRA rely on inline <style> for runtime theming. Limited to
      // styles only (not scripts), which keeps the major XSS vector closed.
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://res.cloudinary.com", "https://images.unsplash.com"],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false,
  hsts: IS_PRODUCTION
    ? { maxAge: 31536000, includeSubDomains: true, preload: true }
    : false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

// CORS Configuration - Restrict origins to frontend dev & prod & custom CLIENT_ORIGIN env
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5000',
  'https://baku-services.onrender.com',
  process.env.CLIENT_ORIGIN
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Same-origin requests (e.g. server-rendered HTML, curl) have no Origin.
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      // Silent reject keeps the client from getting a 500 with a stack trace.
      return callback(null, false);
    }
    return callback(null, true);
  },
  credentials: true
}));

app.use(cookieParser());
app.use(express.json({ limit: '200kb' }));

// Global Rate Limiting (Prevent DDoS / abuse)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 150,
  message: { error: 'Too many requests from this IP, please try again later.' }
});
app.use('/api/', globalLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many login or registration attempts. Please try again after 15 minutes.' }
});
app.use('/api/auth/', authLimiter);

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  message: { error: 'Слишком много загрузок. Попробуйте позже.' }
});
app.use('/api/upload/', uploadLimiter);

// ─────────────────────────────────────────────────────────────────────────────
// CSRF protection (double-submit cookie + Origin check)
// ─────────────────────────────────────────────────────────────────────────────
function generateCsrfToken() {
  return crypto.randomBytes(24).toString('hex');
}
function setCsrfCookie(res, token) {
  // Readable by JS — that's the whole point of double-submit.
  res.cookie(COOKIE_NAME_CSRF, token, {
    httpOnly: false,
    secure: IS_PRODUCTION,
    sameSite: IS_PRODUCTION ? 'strict' : 'lax',
    path: '/',
    maxAge: USER_TOKEN_TTL_SECONDS * 1000
  });
}

function ensureCsrfCookie(req, res, next) {
  if (!req.cookies[COOKIE_NAME_CSRF]) {
    setCsrfCookie(res, generateCsrfToken());
  }
  next();
}
app.use(ensureCsrfCookie);

const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// Origin allowlist for CSRF — same as CORS allowlist plus same-origin.
function isAllowedOrigin(origin) {
  if (!origin) return true; // same-origin browser navigation
  return allowedOrigins.indexOf(origin) !== -1;
}

function csrfProtect(req, res, next) {
  if (!STATE_CHANGING_METHODS.has(req.method)) return next();
  if (!req.path.startsWith('/api/')) return next();

  // 1. Origin / Referer check — defence in depth.
  const origin = req.headers.origin || (req.headers.referer && new URL(req.headers.referer).origin);
  if (origin && !isAllowedOrigin(origin)) {
    return res.status(403).json({ error: 'Origin не разрешён.' });
  }

  // 2. Double-submit cookie token. Skipped only for the very first auth call
  //    on a brand-new client that hasn't seen the cookie yet — but the cookie
  //    is set on every response (ensureCsrfCookie), so by the time the form
  //    is submitted the client always has it.
  const cookieToken = req.cookies[COOKIE_NAME_CSRF];
  const headerToken = req.headers['x-csrf-token'];
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({ error: 'Недействительный CSRF-токен.' });
  }

  next();
}
app.use(csrfProtect);

// Endpoint for the SPA to fetch the current CSRF token explicitly
app.get('/api/csrf-token', (req, res) => {
  let token = req.cookies[COOKIE_NAME_CSRF];
  if (!token) {
    token = generateCsrfToken();
    setCsrfCookie(res, token);
  }
  res.json({ csrfToken: token });
});

// ─────────────────────────────────────────────────────────────────────────────
// Validation helpers
// ─────────────────────────────────────────────────────────────────────────────
const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map(validation => validation.run(req)));
    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }
    return res.status(400).json({ error: errors.array()[0].msg });
  };
};

const registerValidation = [
  body('fullname')
    .trim()
    .notEmpty().withMessage('Имя пользователя обязательно')
    .isLength({ min: 2, max: 50 }).withMessage('Имя должно содержать от 2 до 50 символов'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email обязателен')
    .isEmail().withMessage('Некорректный email адрес')
    .normalizeEmail(),
  body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 25 }).withMessage('Номер телефона слишком длинный'),
  body('password')
    .notEmpty().withMessage('Пароль обязателен')
    .isLength({ min: IS_PRODUCTION ? 8 : 6 }).withMessage(
      IS_PRODUCTION
        ? 'Пароль должен содержать не менее 8 символов'
        : 'Пароль должен содержать не менее 6 символов'
    )
];

const loginValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email обязателен')
    .isEmail().withMessage('Некорректный email адрес')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Пароль обязателен')
];

const adValidation = [
  body('title')
    .trim()
    .notEmpty().withMessage('Заголовок обязателен')
    .isLength({ min: 3, max: 100 }).withMessage('Заголовок должен содержать от 3 до 100 символов'),
  body('category')
    .trim()
    .notEmpty().withMessage('Категория обязательна')
    .isLength({ max: 50 }).withMessage('Недопустимая категория'),
  body('price')
    .trim()
    .notEmpty().withMessage('Цена обязательна')
    .isFloat({ min: 0 }).withMessage('Цена должна быть положительным числом')
    .customSanitizer(val => parseFloat(val).toFixed(2)),
  body('description')
    .trim()
    .notEmpty().withMessage('Описание обязательно')
    .isLength({ min: 10, max: 1000 }).withMessage('Описание должно содержать от 10 до 1000 символов'),
  body('type')
    .trim()
    .default('service')
    .isIn(['service', 'product']).withMessage('Недопустимый тип объявления'),
  body('condition')
    .custom((value, { req }) => {
      if (req.body.type === 'product') {
        if (!value || !['new', 'used'].includes(value)) {
          throw new Error('Для товара обязательно указать состояние (новое или б/у)');
        }
      }
      return true;
    }),
  body('price_type')
    .custom((value, { req }) => {
      if (req.body.type === 'product') {
        if (!value || !['fixed', 'negotiable'].includes(value)) {
          throw new Error('Для товара обязательно указать тип цены (фиксированная или договорная)');
        }
      }
      return true;
    }),
  body('trade_possible')
    .optional()
    .customSanitizer(val => val === 'true' || val === true),
  body('images')
    .optional()
    .custom((value) => {
      sanitizeImageUrls(value);
      return true;
    })
];

let boardActive = true;


// ─────────────────────────────────────────────────────────────────────────────
// Auth middleware (cookie-based JWT)
// ─────────────────────────────────────────────────────────────────────────────
function readJwtFromRequest(req, cookieName) {
  const cookieToken = req.cookies && req.cookies[cookieName];
  if (cookieToken) return cookieToken;

  // Backward-compat fallback: still accept Authorization: Bearer <token>
  // for non-browser clients (e.g. Postman). Browsers always use cookies.
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return null;
}

function checkAdminAuth(req, res, next) {
  const token = readJwtFromRequest(req, COOKIE_NAME_ADMIN);
  if (!token) {
    return res.status(403).json({ error: 'Доступ запрещён. Требуется авторизация администратора.' });
  }
  jwt.verify(token, JWT_SECRET, { audience: 'admin' }, (err, decoded) => {
    if (err || !decoded || decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Доступ запрещён. Требуется авторизация администратора.' });
    }
    req.admin = decoded;
    req.isAdmin = true;
    next();
  });
}

async function checkUserAuth(req, res, next) {
  // Admin token grants user-level access too.
  const adminToken = readJwtFromRequest(req, COOKIE_NAME_ADMIN);
  if (adminToken) {
    try {
      const decoded = jwt.verify(adminToken, JWT_SECRET, { audience: 'admin' });
      if (decoded && decoded.role === 'admin') {
        req.admin = decoded;
        req.isAdmin = true;
        return next();
      }
    } catch (_) { /* fall through to user auth */ }
  }

  const userToken = readJwtFromRequest(req, COOKIE_NAME_USER);
  if (!userToken) {
    return res.status(401).json({ error: 'Авторизация обязательна. Пожалуйста, войдите в аккаунт.' });
  }

  let decoded;
  try {
    decoded = jwt.verify(userToken, JWT_SECRET, { audience: 'user' });
  } catch (_) {
    clearUserSessionCookie(res);
    return res.status(401).json({ error: 'Неверный или просроченный токен авторизации.' });
  }

  // Verify token version against the DB so logout/password-change can revoke
  // every existing JWT for the account.
  try {
    const user = await User.findByPk(decoded.id, {
      attributes: ['id', 'fullname', 'email', 'phone', 'avatar_url', 'token_version']
    });
    if (!user || user.token_version !== decoded.tv) {
      clearUserSessionCookie(res);
      return res.status(401).json({ error: 'Сессия завершена. Войдите снова.' });
    }
    req.user = {
      id: user.id,
      fullname: user.fullname,
      email: user.email,
      phone: user.phone,
      avatar_url: user.avatar_url || null
    };
    next();
  } catch (err) {
    console.error('Auth lookup error:', err);
    res.status(500).json({ error: 'Ошибка авторизации.' });
  }
}

function buildUserPayload(user) {
  return {
    id: user.id,
    fullname: user.fullname,
    email: user.email,
    phone: user.phone || null,
    avatar_url: user.avatar_url || null
  };
}

function signUserToken(user) {
  return jwt.sign(
    {
      id: user.id,
      tv: user.token_version
    },
    JWT_SECRET,
    {
      audience: 'user',
      expiresIn: USER_TOKEN_TTL_SECONDS
    }
  );
}

function signAdminToken() {
  return jwt.sign(
    { role: 'admin' },
    JWT_SECRET,
    {
      audience: 'admin',
      expiresIn: ADMIN_TOKEN_TTL_SECONDS
    }
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTHENTICATION ROUTES
// ─────────────────────────────────────────────────────────────────────────────
app.post('/api/auth/register', validate(registerValidation), async (req, res) => {
  const { fullname, email, phone, password } = req.body;

  try {
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Пользователь с таким email уже зарегистрирован.' });
    }

    const hashedPassword = await bcrypt.hash(password, IS_PRODUCTION ? 12 : 10);
    const newUser = await User.create({
      fullname,
      email,
      phone,
      password: hashedPassword
    });

    const token = signUserToken(newUser);
    setUserSessionCookie(res, token);
    res.json({ success: true, user: buildUserPayload(newUser) });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Ошибка при сохранении пользователя.' });
  }
});

const LOGIN_LOCK_THRESHOLD = 6;
const LOGIN_LOCK_MINUTES = 15;

app.post('/api/auth/login', validate(loginValidation), async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ where: { email } });
    // Always run a bcrypt comparison to avoid leaking which emails exist via
    // response timing.
    const dummyHash = '$2b$10$CwTycUXWue0Thq9StjUM0uJ8Nlz6Jx7kQbb6/LFwG/zZ/h0a6cT8e';
    const passwordHash = user ? user.password : dummyHash;
    const valid = await bcrypt.compare(password, passwordHash);

    if (user && user.locked_until && new Date(user.locked_until) > new Date()) {
      return res.status(429).json({ error: 'Аккаунт временно заблокирован из-за множества неудачных попыток. Попробуйте позже.' });
    }

    if (!user || !valid) {
      if (user) {
        const failed = (user.failed_login_count || 0) + 1;
        const updates = { failed_login_count: failed };
        if (failed >= LOGIN_LOCK_THRESHOLD) {
          updates.locked_until = new Date(Date.now() + LOGIN_LOCK_MINUTES * 60 * 1000);
          updates.failed_login_count = 0;
        }
        await user.update(updates);
      }
      return res.status(400).json({ error: 'Неверный email или пароль.' });
    }

    if (user.failed_login_count > 0 || user.locked_until) {
      await user.update({ failed_login_count: 0, locked_until: null });
    }

    const token = signUserToken(user);
    setUserSessionCookie(res, token);
    res.json({ success: true, user: buildUserPayload(user) });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Ошибка базы данных.' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  clearUserSessionCookie(res);
  clearAdminSessionCookie(res);
  res.json({ success: true });
});

// Returns the current user (if any) — useful on SPA boot to restore state.
app.get('/api/auth/me', async (req, res) => {
  const userToken = readJwtFromRequest(req, COOKIE_NAME_USER);
  if (!userToken) return res.json({ user: null });
  try {
    const decoded = jwt.verify(userToken, JWT_SECRET, { audience: 'user' });
    const user = await User.findByPk(decoded.id, {
      attributes: ['id', 'fullname', 'email', 'phone', 'avatar_url', 'token_version']
    });
    if (!user || user.token_version !== decoded.tv) {
      clearUserSessionCookie(res);
      return res.json({ user: null });
    }
    res.json({ user: buildUserPayload(user) });
  } catch (_) {
    clearUserSessionCookie(res);
    res.json({ user: null });
  }
});

app.get('/api/admin/me', (req, res) => {
  const adminToken = readJwtFromRequest(req, COOKIE_NAME_ADMIN);
  if (!adminToken) return res.json({ admin: false });
  try {
    const decoded = jwt.verify(adminToken, JWT_SECRET, { audience: 'admin' });
    res.json({ admin: decoded.role === 'admin' });
  } catch (_) {
    clearAdminSessionCookie(res);
    res.json({ admin: false });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN AUTHENTICATION (TOTP)
// ─────────────────────────────────────────────────────────────────────────────
const adminVerifyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: 'Превышено число попыток входа. Пожалуйста, попробуйте через час.' },
  statusCode: 429
});

const adminLoginLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: 'Превышено число попыток входа. Пожалуйста, попробуйте через час.' },
  statusCode: 429
});

function constantTimeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) {
    // Still do a comparison to keep timing similar.
    crypto.timingSafeEqual(bufA, Buffer.alloc(bufA.length));
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

function verifyAdmin2FA(code) {
  if (!code || typeof code !== 'string') return false;
  const trimmed = code.trim();
  if (!trimmed) return false;

  // Primary: TOTP via otplib (RFC 6238).
  try {
    if (authenticator.check(trimmed, ADMIN_TOTP_SECRET)) return true;
  } catch (_) { /* ignore */ }

  // Backward-compat fallback: static code, if explicitly configured.
  if (ADMIN_2FA_CODE_FALLBACK && constantTimeEqual(trimmed, ADMIN_2FA_CODE_FALLBACK)) {
    return true;
  }
  return false;
}

const sendFailedAdminResponse = (req, res) => {
  const ip = req.ip || req.connection.remoteAddress;
  console.warn(`[WARN] Failed admin login attempt from IP ${ip} at ${new Date().toISOString()}`);
  const delay = Math.floor(Math.random() * 1000) + 1000;
  setTimeout(() => {
    res.status(401).json({ error: 'Неверные учётные данные' });
  }, delay);
};

// Step 1: verify password
app.post('/api/admin/verify-password', adminVerifyLimiter, (req, res) => {
  const password = req.body && typeof req.body.password === 'string' ? req.body.password : '';
  if (password && constantTimeEqual(password.trim(), ADMIN_PASSWORD.trim())) {
    return res.json({ success: true, message: 'Password verified. Proceed to 2FA.' });
  }
  sendFailedAdminResponse(req, res);
});

// Step 2: verify password + TOTP code
app.post('/api/admin/login', adminLoginLimiter, (req, res) => {
  const password = req.body && typeof req.body.password === 'string' ? req.body.password : '';
  const code = req.body && typeof req.body.code === 'string' ? req.body.code : '';

  if (
    password &&
    code &&
    constantTimeEqual(password.trim(), ADMIN_PASSWORD.trim()) &&
    verifyAdmin2FA(code)
  ) {
    const ip = req.ip || req.connection.remoteAddress;
    console.log(`[INFO] Successful admin login from IP ${ip} at ${new Date().toISOString()}`);
    const token = signAdminToken();
    setAdminSessionCookie(res, token);
    return res.json({ success: true });
  }
  sendFailedAdminResponse(req, res);
});

app.post('/api/admin/logout', (req, res) => {
  clearAdminSessionCookie(res);
  res.json({ success: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// BOARD STATUS & ADS
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/board-status', (req, res) => {
  res.json({ active: boardActive });
});

app.post('/api/admin/toggle-board', checkAdminAuth, (req, res) => {
  const { active } = req.body;
  if (typeof active === 'boolean') {
    boardActive = active;
    res.json({ success: true, active: boardActive });
  } else {
    res.status(400).json({ error: 'Неверный формат данных' });
  }
});

// GET all ads — does NOT include user PII.
app.get('/api/ads', async (req, res) => {
  const { type } = req.query;
  const whereClause = {};
  if (type && ['service', 'product'].includes(type)) {
    whereClause.type = type;
  }

  try {
    const ads = await Ad.findAll({
      where: whereClause,
      order: [['created_at', 'DESC']]
    });
    res.json(ads);
  } catch (err) {
    console.error('Error fetching ads:', err);
    res.status(500).json({ error: 'Ошибка базы данных при получении объявлений' });
  }
});

app.post('/api/ads', checkUserAuth, validate(adValidation), async (req, res) => {
  if (!boardActive && !req.isAdmin) {
    return res.status(403).json({ error: 'Публикация объявлений временно отключена администратором.' });
  }

  const { title, category, price, description, type, condition, trade_possible, price_type, images } = req.body;

  const name = req.isAdmin
    ? (req.body.name || 'Admin')
    : (req.user?.fullname || req.body.name || 'User');
  const userId = req.isAdmin ? null : (req.user?.id || null);

  let imagesStr = null;
  try {
    const safeImages = sanitizeImageUrls(images);
    imagesStr = safeImages ? JSON.stringify(safeImages) : null;
  } catch (imgErr) {
    return res.status(400).json({ error: imgErr.message });
  }

  try {
    const ad = await Ad.create({
      name,
      title,
      category,
      price,
      description,
      user_id: userId,
      type: type || 'service',
      condition: type === 'product' ? condition : null,
      trade_possible: type === 'product' ? !!trade_possible : false,
      price_type: type === 'product' ? price_type : 'fixed',
      images: imagesStr
    });
    res.json({ id: ad.id });
  } catch (err) {
    console.error('Error inserting ad:', err);
    res.status(500).json({ error: 'Ошибка базы данных при добавлении объявления' });
  }
});

app.get('/api/listings/my', checkUserAuth, async (req, res) => {
  const userId = req.user ? req.user.id : null;
  const { type } = req.query;
  const whereClause = { user_id: userId };
  if (type && ['service', 'product'].includes(type)) {
    whereClause.type = type;
  }

  try {
    const ads = await Ad.findAll({
      where: whereClause,
      order: [['created_at', 'DESC']]
    });
    res.json(ads);
  } catch (err) {
    console.error('Error fetching user listings:', err);
    res.status(500).json({ error: 'Ошибка базы данных при получении ваших объявлений' });
  }
});

const handleAdDeletion = async (req, res) => {
  const id = req.params.id;
  try {
    const ad = await Ad.findByPk(id);
    if (!ad) {
      return res.status(404).json({ error: 'Объявление не найдено' });
    }

    if (req.isAdmin || (req.user && ad.user_id === req.user.id)) {
      if (ad.images) {
        try {
          const images = JSON.parse(ad.images);
          if (Array.isArray(images)) {
            for (const img of images) {
              await deleteFileOrCloudinary(img);
            }
          }
        } catch (e) {
          console.error('Failed to parse images for deletion:', e);
        }
      }

      await ad.destroy();
      res.json({ success: true });
    } else {
      res.status(403).json({ error: 'У вас нет прав для удаления этого объявления.' });
    }
  } catch (err) {
    console.error('Error deleting listing:', err);
    res.status(500).json({ error: 'Ошибка базы данных при удалении объявления' });
  }
};

app.delete('/api/listings/:id', checkUserAuth, handleAdDeletion);
app.delete('/api/ads/:id', checkUserAuth, handleAdDeletion);

// PUBLIC listing detail — does NOT expose contact info.
// Increments a view counter, throttled per IP to avoid refresh-spam.
const viewCooldown = new Map(); // key: `${ip}:${adId}` -> timestamp
const VIEW_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

// Periodically prune old cooldown entries so the map can't grow unbounded.
setInterval(() => {
  const now = Date.now();
  for (const [key, ts] of viewCooldown) {
    if (now - ts > VIEW_COOLDOWN_MS) viewCooldown.delete(key);
  }
}, 30 * 60 * 1000).unref();

function shouldCountView(req, adId) {
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  const key = `${ip}:${adId}`;
  const now = Date.now();
  const last = viewCooldown.get(key);
  if (last && now - last < VIEW_COOLDOWN_MS) return false;
  viewCooldown.set(key, now);
  return true;
}

app.get('/api/listings/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const ad = await Ad.findByPk(id, {
      include: [{
        model: User,
        as: 'user',
        attributes: ['fullname', 'avatar_url']
      }]
    });

    if (!ad) {
      return res.status(404).json({ error: 'Объявление не найдено' });
    }

    // Count the view (fire-and-forget, throttled per IP).
    let viewCount = ad.views || 0;
    if (shouldCountView(req, id)) {
      viewCount += 1;
      ad.increment('views').catch(err => console.error('Failed to increment views:', err));
    }

    let parsedImages = [];
    if (ad.images) {
      try {
        parsedImages = JSON.parse(ad.images);
      } catch (e) {
        parsedImages = [];
      }
    }

    res.json({
      id: ad.id,
      name: ad.user?.fullname || ad.name || 'User',
      title: ad.title,
      category: ad.category,
      price: ad.price,
      description: ad.description,
      created_at: ad.created_at,
      avatar_url: ad.user?.avatar_url || null,
      type: ad.type,
      condition: ad.condition,
      trade_possible: ad.trade_possible,
      price_type: ad.price_type,
      images: parsedImages,
      views: viewCount,
      has_user: !!ad.user_id
    });
  } catch (err) {
    console.error('Error fetching listing detail:', err);
    res.status(500).json({ error: 'Ошибка базы данных при получении деталей объявления' });
  }
});

// AUTHENTICATED contact info — separate endpoint with its own rate limit.
const contactsLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 60,
  message: { error: 'Слишком много запросов контактных данных. Попробуйте позже.' }
});
app.get('/api/listings/:id/contacts', contactsLimiter, checkUserAuth, async (req, res) => {
  const id = req.params.id;
  try {
    const ad = await Ad.findByPk(id, {
      include: [{
        model: User,
        as: 'user',
        attributes: ['email', 'phone']
      }]
    });
    if (!ad) {
      return res.status(404).json({ error: 'Объявление не найдено' });
    }
    res.json({
      email: ad.user?.email || '',
      phone: ad.user?.phone || ''
    });
  } catch (err) {
    console.error('Error fetching contacts:', err);
    res.status(500).json({ error: 'Ошибка получения контактов' });
  }
});

app.put('/api/ads/:id', checkUserAuth, validate(adValidation), async (req, res) => {
  const id = req.params.id;
  const { title, category, price, description, type, condition, trade_possible, price_type, images } = req.body;

  try {
    const ad = await Ad.findByPk(id);
    if (!ad) return res.status(404).json({ error: 'Объявление не найдено' });

    if (req.isAdmin || (req.user && ad.user_id === req.user.id)) {
      const name = req.isAdmin ? (req.body.name || ad.name) : ad.name;

      let safeImages = null;
      try {
        safeImages = images != null ? sanitizeImageUrls(images) : null;
      } catch (imgErr) {
        return res.status(400).json({ error: imgErr.message });
      }
      const imagesStr = safeImages ? JSON.stringify(safeImages) : ad.images;

      if (safeImages && ad.images) {
        try {
          const oldImages = JSON.parse(ad.images);
          for (const oldImg of oldImages) {
            if (!safeImages.includes(oldImg)) {
              await deleteFileOrCloudinary(oldImg);
            }
          }
        } catch (e) {
          console.error('Failed to parse old images for deletion:', e);
        }
      }

      await ad.update({
        name,
        title,
        category,
        price,
        description,
        type: type || ad.type,
        condition: type === 'product' ? condition : null,
        trade_possible: type === 'product' ? !!trade_possible : false,
        price_type: type === 'product' ? price_type : 'fixed',
        images: imagesStr
      });
      res.json({ success: true });
    } else {
      res.status(403).json({ error: 'У вас нет прав для редактирования этого объявления.' });
    }
  } catch (err) {
    console.error('Error checking ownership for edit:', err);
    res.status(500).json({ error: 'Ошибка базы данных при обновлении объявления' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// IMAGE UPLOAD ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────
app.post('/api/upload/avatar', checkUserAuth, (req, res) => {
  uploadAvatar.single('avatar')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Пожалуйста, выберите файл для загрузки' });
    }
    if (!req.user?.id || req.isAdmin) {
      return res.status(403).json({ error: 'Загрузка аватара доступна только авторизованным пользователям.' });
    }

    try {
      const url = await uploadToCloudinaryOrLocal(req.file);
      const user = await User.findByPk(req.user.id);
      if (user) {
        if (user.avatar_url) {
          await deleteFileOrCloudinary(user.avatar_url);
        }
        await user.update({ avatar_url: url });
      }
      res.json({ success: true, url });
    } catch (dbErr) {
      console.error('Error updating user avatar:', dbErr);
      res.status(500).json({ error: 'Ошибка сервера при сохранении аватара' });
    }
  });
});

app.post('/api/upload/ad-image', checkUserAuth, (req, res) => {
  uploadAdImage.array('images', 5)(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Пожалуйста, выберите хотя бы один файл' });
    }

    try {
      const urls = [];
      for (const file of req.files) {
        const url = await uploadToCloudinaryOrLocal(file);
        urls.push(url);
      }
      res.json({ success: true, urls });
    } catch (uploadErr) {
      console.error('Error uploading ad images:', uploadErr);
      res.status(500).json({ error: 'Ошибка сервера при загрузке изображений' });
    }
  });
});

app.get('/api/uploads/:filename', (req, res) => {
  const filePath = resolveUploadFilePath(req.params.filename);
  if (!filePath || !fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Файл не найден' });
  }
  res.sendFile(filePath);
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN STATS
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/admin/stats', checkAdminAuth, async (req, res) => {
  try {
    const servicesCount = await Ad.count({ where: { type: 'service' } });
    const productsCount = await Ad.count({ where: { type: 'product' } });
    res.json({
      services: servicesCount,
      products: productsCount
    });
  } catch (err) {
    console.error('Error fetching admin stats:', err);
    res.status(500).json({ error: 'Ошибка базы данных при получении статистики' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// ─────────────────────────────────────────────────────────────────────────────
// SEO: sitemap + social sharing meta tags
// ─────────────────────────────────────────────────────────────────────────────
const PUBLIC_BASE_URL = (
  process.env.PUBLIC_BASE_URL ||
  process.env.CLIENT_ORIGIN ||
  'https://baku-services.onrender.com'
).replace(/\/+$/, '');

function escapeHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function absoluteImageUrl(url) {
  if (!url) return `${PUBLIC_BASE_URL}/logo512.png`;
  if (url.startsWith('http')) return url;
  if (url.startsWith('/')) return `${PUBLIC_BASE_URL}${url}`;
  return `${PUBLIC_BASE_URL}/${url}`;
}

// Google Search Console HTML Verification
app.get('/googlef1d9eb9aaf4880a4.html', (req, res) => {
  res.send('google-site-verification: googlef1d9eb9aaf4880a4.html');
});

// Temporary database seeding route for Render Free Tier
app.get('/api/seed-database-secret-7711', async (req, res) => {
  try {
    const { Ad, User } = require('./db');
    
    // Delete all existing ads
    await Ad.destroy({ where: {} });

    // Create or find mock users to author the listings
    const [userDev] = await User.findOrCreate({
      where: { email: 'ruslan.aliyev.dev@gmail.com' },
      defaults: {
        fullname: 'Руслан Алиев',
        phone: '+9945028319470',
        password: 'mockpassword123',
        avatar_url: null
      }
    });

    const [userDesign] = await User.findOrCreate({
      where: { email: 'aysel.mammadova.design@gmail.com' },
      defaults: {
        fullname: 'Айсель Мамедова',
        phone: '+9945571940283',
        password: 'mockpassword123',
        avatar_url: null
      }
    });

    const [userTech] = await User.findOrCreate({
      where: { email: 'ilgar.hasanov.tech@mail.ru' },
      defaults: {
        fullname: 'Ильгар Гасанов',
        phone: '+9947036251842',
        password: 'mockpassword123',
        avatar_url: null
      }
    });

    const [userAuto] = await User.findOrCreate({
      where: { email: 'dmitry.petrov.auto@yandex.ru' },
      defaults: {
        fullname: 'Дмитрий Петров',
        phone: '+9945124673051',
        password: 'mockpassword123',
        avatar_url: null
      }
    });

    const mockAds = [
      {
        name: userDev.fullname,
        title: 'Разработка современных веб-сайтов и веб-приложений под ключ',
        category: 'IT и фриланс',
        price: '1200',
        description: 'Профессиональная разработка веб-сайтов на React, Next.js, Node.js. Создаю быстрые, адаптивные и оптимизированные для SEO решения. В стоимость входит: проектирование интерфейса, адаптивная верстка, интеграция платежных систем, базовая SEO-оптимизация и перенос на ваш хостинг. Опыт работы более 6 лет. Гарантия качества и соблюдение согласованных сроков!',
        user_id: userDev.id,
        type: 'service',
        condition: null,
        trade_possible: false,
        price_type: 'fixed',
        images: JSON.stringify(['https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80']),
        views: 142
      },
      {
        name: userDesign.fullname,
        title: 'Дизайн интерьера квартир и коммерческих помещений',
        category: 'Ремонт и строительство',
        price: '30',
        description: 'Создаю уникальные и функциональные дизайн-проекты в современных стилях (минимализм, скандинавский, лофт, неоклассика). Разработка полного пакета чертежей для строителей, фотореалистичная 3D-визуализация каждого помещения, детальный подбор отделочных материалов, мебели и освещения. Авторский надзор на всех этапах реализации. Индивидуальный подход к вашему бюджету! Цена указана за кв. м.',
        user_id: userDesign.id,
        type: 'service',
        condition: null,
        trade_possible: false,
        price_type: 'negotiable',
        images: JSON.stringify(['https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=800&q=80']),
        views: 98
      },
      {
        name: userTech.fullname,
        title: 'MacBook Pro 16" M3 Max / 36GB / 1TB Space Black',
        category: 'Электроника',
        price: '4800',
        description: 'В идеальном косметическом и техническом состоянии (как новый). Полный оригинальный комплект (коробка, зарядное устройство MagSafe 3 мощностью 140W, кабель в оплетке). Батарея 98% емкости, всего 45 циклов перезарядки. Без царапин, сколов и потертостей, экран под защитной пленкой с первого дня. Использовался исключительно дома для работы с графикой. Любые проверки приветствуются!',
        user_id: userTech.id,
        type: 'product',
        condition: 'new',
        trade_possible: false,
        price_type: 'fixed',
        images: JSON.stringify(['https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80']),
        views: 215
      },
      {
        name: userAuto.fullname,
        title: 'Оригинальные диски Vossen HF-3 R20 с летней резиной',
        category: 'Авто и запчасти',
        price: '2600',
        description: 'Продаю комплект оригинальных литых дисков Vossen HF-3 (разболтовка 5x112, разноширокие). Состояние идеальное, без бордюрной болезни, трещин и каких-либо сварок. Профессионально окрашены в фирменный цвет Gloss Black. Обуты в летнюю премиальную резину Michelin Pilot Sport 4S с отличным остатком протектора (около 6.5 мм). Стояли на Mercedes E-Class. Возможен разумный торг или обмен на диски R19 с вашей доплатой.',
        user_id: userAuto.id,
        type: 'product',
        condition: 'used',
        trade_possible: true,
        price_type: 'fixed',
        images: JSON.stringify(['https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=800&q=80']),
        views: 74
      }
    ];

    for (const adData of mockAds) {
      await Ad.create(adData);
    }

    res.send('<h1>База данных успешно очищена и наполнена премиум объявлениями на Render!</h1>');
  } catch (err) {
    res.status(500).send(`<h1>Ошибка при наполнении базы: ${err.message}</h1>`);
  }
});

// Dynamic sitemap so Google can discover every listing.
app.get('/sitemap.xml', async (req, res) => {
  try {
    const ads = await Ad.findAll({ attributes: ['id', 'updated_at'], order: [['created_at', 'DESC']], limit: 5000 });
    const urls = [
      `<url><loc>${PUBLIC_BASE_URL}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>`
    ];
    for (const ad of ads) {
      const lastmod = ad.updated_at ? new Date(ad.updated_at).toISOString() : new Date().toISOString();
      urls.push(
        `<url><loc>${PUBLIC_BASE_URL}/listing/${ad.id}</loc><lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`
      );
    }
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`;
    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (err) {
    console.error('Sitemap error:', err);
    res.status(500).send('');
  }
});

// Serve frontend build static files only in production
if (process.env.NODE_ENV === 'production') {
  const BUILD_DIR = path.join(__dirname, 'client/build');
  const INDEX_HTML = path.join(BUILD_DIR, 'index.html');

  // Inject per-listing Open Graph / Twitter meta tags so links unfurl nicely
  // in WhatsApp, Telegram, Facebook, Twitter, etc. (crawlers don't run JS).
  app.get('/listing/:id', async (req, res, next) => {
    try {
      const ad = await Ad.findByPk(req.params.id, {
        include: [{ model: User, as: 'user', attributes: ['fullname'] }]
      });
      if (!ad) return next();

      let template;
      try {
        template = fs.readFileSync(INDEX_HTML, 'utf8');
      } catch (e) {
        return next();
      }

      let firstImage = null;
      if (ad.images) {
        try {
          const imgs = JSON.parse(ad.images);
          if (Array.isArray(imgs) && imgs.length) firstImage = imgs[0];
        } catch (_) { /* ignore */ }
      }

      const priceLabel = ad.price_type === 'negotiable'
        ? 'Договорная'
        : `${ad.price} AZN`;
      const title = escapeHtml(`${ad.title} — ${priceLabel} | Baku Services`);
      const rawDesc = (ad.description || '').replace(/\s+/g, ' ').trim().slice(0, 200);
      const description = escapeHtml(rawDesc || 'Объявление на Baku Services');
      const image = escapeHtml(absoluteImageUrl(firstImage));
      const url = `${PUBLIC_BASE_URL}/listing/${ad.id}`;

      const meta = `
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <link rel="canonical" href="${url}" />
    <meta property="og:type" content="product" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${image}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:site_name" content="Baku Services" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${image}" />
  `;

      // Replace the static <title> (and inject the rest right after it).
      let html = template.replace(/<title>.*?<\/title>/i, meta.trim());
      if (html === template) {
        // No <title> found — inject before </head> as a fallback.
        html = template.replace('</head>', `${meta}\n</head>`);
      }

      res.header('Content-Type', 'text/html');
      res.send(html);
    } catch (err) {
      console.error('Listing meta injection error:', err);
      next();
    }
  });

  app.use(express.static(BUILD_DIR));

  app.get(/^\/(?!api\/).*/, (req, res) => {
    res.sendFile(INDEX_HTML);
  });
}

syncDatabase()
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('Unable to sync database:', err);
    process.exit(1);
  });
