const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const { sequelize, User, Ad, syncDatabase } = require('./db');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

// Cloudinary SDK reads CLOUDINARY_URL on require — validate format first
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

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const ALLOWED_IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

/** Require env in production; allow dev fallbacks only for local SQLite. */
function requireEnv(name, devFallback) {
  const value = process.env[name];
  if (value && String(value).trim()) {
    return String(value).trim();
  }
  if (IS_PRODUCTION) {
    console.error(`[FATAL] Missing required environment variable: ${name}`);
    process.exit(1);
  }
  if (devFallback !== undefined) {
    console.warn(`[WARN] ${name} not set — using development fallback.`);
    return devFallback;
  }
  console.error(`[FATAL] Missing environment variable: ${name}`);
  process.exit(1);
}

const JWT_SECRET = requireEnv('JWT_SECRET', 'dev-only-jwt-secret');
const ADMIN_PASSWORD = requireEnv('ADMIN_PASSWORD', 'dev-only-admin-password');
const ADMIN_TOKEN = requireEnv('ADMIN_TOKEN', 'dev-only-admin-token');
const ADMIN_2FA_CODE = requireEnv('ADMIN_2FA_CODE', '000000');

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5000;

// Local Upload Directory Creation
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Multer Storage Configuration
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
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB per file
  fileFilter: uploadFilter
});

const uploadAvatar = multer({
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB per file
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
      const filename = parts[parts.length - 1];
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

// Security HTTP Headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
    },
  },
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
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

// Global Rate Limiting (Prevent DDoS / abuse)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 150,
  message: { error: 'Too many requests from this IP, please try again later.' }
});
app.use('/api/', globalLimiter);

// Auth Rate Limiting for general users
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
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

app.use(express.json({ limit: '200kb' }));

// Validation wrapper middleware
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

// Validation schemas
const registerValidation = [
  body('fullname')
    .trim()
    .notEmpty().withMessage('Имя пользователя обязательно')
    .isLength({ min: 2, max: 50 }).withMessage('Имя должно содержать от 2 до 50 символов')
    .escape(),
  body('email')
    .trim()
    .notEmpty().withMessage('Email обязателен')
    .isEmail().withMessage('Некорректный email адрес')
    .normalizeEmail(),
  body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 25 }).withMessage('Номер телефона слишком длинный')
    .escape(),
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
    .isLength({ min: 3, max: 100 }).withMessage('Заголовок должен содержать от 3 до 100 символов')
    .escape(),
  body('category')
    .trim()
    .notEmpty().withMessage('Категория обязательна')
    .isLength({ max: 50 }).withMessage('Недопустимая категория')
    .escape(),
  body('price')
    .trim()
    .notEmpty().withMessage('Цена обязательна')
    .isFloat({ min: 0 }).withMessage('Цена должна быть положительным числом')
    .customSanitizer(val => parseFloat(val).toFixed(2)),
  body('description')
    .trim()
    .notEmpty().withMessage('Описание обязательно')
    .isLength({ min: 10, max: 1000 }).withMessage('Описание должно содержать от 10 до 1000 символов')
    .escape(),
  body('type')
    .trim()
    .default('service')
    .isIn(['service', 'product']).withMessage('Недопустимый тип объявления')
    .escape(),
  body('condition')
    .custom((value, { req }) => {
      if (req.body.type === 'product') {
        if (!value || !['new', 'used'].includes(value)) {
          throw new Error('Для товара обязательно указать состояние (новое или б/у)');
        }
      }
      return true;
    })
    .escape(),
  body('price_type')
    .custom((value, { req }) => {
      if (req.body.type === 'product') {
        if (!value || !['fixed', 'negotiable'].includes(value)) {
          throw new Error('Для товара обязательно указать тип цены (фиксированная или договорная)');
        }
      }
      return true;
    })
    .escape(),
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

// Middleware for Admin validation
const checkAdminAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader === `Bearer ${ADMIN_TOKEN}`) {
    next();
  } else {
    res.status(403).json({ error: 'Доступ запрещен. Требуется авторизация администратора.' });
  }
};

// Middleware for User validation (supports Admin token bypass)
const checkUserAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ error: 'Авторизация обязательна. Пожалуйста, войдите в аккаунт.' });
  }

  const token = authHeader.split(' ')[1];

  // Admin token bypass
  if (authHeader === `Bearer ${ADMIN_TOKEN}`) {
    req.isAdmin = true;
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Неверный или просроченный токен авторизации.' });
    }
    req.user = decoded;
    next();
  });
};

// --- AUTHENTICATION ROUTES ---

// User Registration (Sequelize version)
app.post('/api/auth/register', validate(registerValidation), async (req, res) => {
  const { fullname, email, phone, password } = req.body;

  try {
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Пользователь с таким email уже зарегистрирован.' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const newUser = await User.create({
      fullname,
      email,
      phone,
      password: hashedPassword
    });

    const userPayload = { id: newUser.id, fullname, email, phone, avatar_url: newUser.avatar_url || null };
    const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '7d' });

    res.json({ success: true, token, user: userPayload });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Ошибка при сохранении пользователя.' });
  }
});

// User Login (Sequelize version)
app.post('/api/auth/login', validate(loginValidation), async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(400).json({ error: 'Неверный email или пароль.' });
    }

    const isPasswordCorrect = bcrypt.compareSync(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({ error: 'Неверный email или пароль.' });
    }

    const userPayload = {
      id: user.id,
      fullname: user.fullname,
      email: user.email,
      phone: user.phone,
      avatar_url: user.avatar_url || null
    };
    const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '7d' });

    res.json({ success: true, token, user: userPayload });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Ошибка базы данных.' });
  }
});

// --- ADMIN SECURITY & AUTHENTICATION ENHANCEMENTS ---

// Separate rate limiters for Step 1 (verify-password) and Step 2 (login)
// This ensures that hitting one endpoint doesn't exhaust the rate limit bucket of the other.
const adminVerifyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { error: 'Превышено число попыток входа. Пожалуйста, попробуйте через час.' },
  statusCode: 429
});

const adminLoginLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { error: 'Превышено число попыток входа. Пожалуйста, попробуйте через час.' },
  statusCode: 429
});

// Delayed Generic Mismatch Response Helper
const sendFailedAdminResponse = (req, res) => {
  const ip = req.ip || req.connection.remoteAddress;
  console.warn(`[WARN] Failed admin login attempt from IP ${ip} at ${new Date().toISOString()}`);
  
  // Random delay between 1.0 and 2.0 seconds
  const delay = Math.floor(Math.random() * 1000) + 1000;
  setTimeout(() => {
    res.status(401).json({ error: 'Неверные учётные данные' });
  }, delay);
};

// Admin Login Step 1: Verify Password
app.post('/api/admin/verify-password', adminVerifyLimiter, (req, res) => {
  const { password } = req.body;
  if (password && password.trim() === ADMIN_PASSWORD.trim()) {
    res.json({ success: true, message: 'Password verified. Proceed to 2FA.' });
  } else {
    sendFailedAdminResponse(req, res);
  }
});

// Admin Login Step 2: Verify Password again + 2FA Code
app.post('/api/admin/login', adminLoginLimiter, (req, res) => {
  const { password, code } = req.body;

  if (password && code && password.trim() === ADMIN_PASSWORD.trim() && code.trim() === ADMIN_2FA_CODE.trim()) {
    const ip = req.ip || req.connection.remoteAddress;
    console.log(`[INFO] Successful admin login from IP ${ip} at ${new Date().toISOString()}`);
    res.json({ success: true, token: ADMIN_TOKEN });
  } else {
    sendFailedAdminResponse(req, res);
  }
});

// --- BOARD STATUS & API ROUTES ---

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

// GET all ads (Sequelize version) with type filter
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

// Posting ads is protected by user authorization with schema validation (Sequelize version)
app.post('/api/ads', checkUserAuth, validate(adValidation), async (req, res) => {
  if (!boardActive && !req.isAdmin) {
    return res.status(403).json({ error: 'Публикация объявлений временно отключена администратором.' });
  }

  const { title, category, price, description, type, condition, trade_possible, price_type, images } = req.body;
  
  // Use fullname from verified token, or allow admin override, or fallback to body name
  const name = req.isAdmin ? (req.body.name || 'Admin') : (req.user?.fullname || req.body.name || 'User');
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

// GET listings created by the logged-in user (Sequelize version) with optional type filter
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

// Consolidate delete checks for both api/listings/:id and api/ads/:id (Sequelize version) with file cleanup
const handleAdDeletion = async (req, res) => {
  const id = req.params.id;
  try {
    const ad = await Ad.findByPk(id);
    if (!ad) {
      return res.status(404).json({ error: 'Объявление не найдено' });
    }

    if (req.isAdmin || (req.user && ad.user_id === req.user.id)) {
      // Clean up associated images
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

// GET listing details by ID (Sequelize version with LEFT JOIN)
app.get('/api/listings/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const ad = await Ad.findByPk(id, {
      include: [{
        model: User,
        as: 'user',
        attributes: ['fullname', 'email', 'phone', 'avatar_url']
      }]
    });

    if (!ad) {
      return res.status(404).json({ error: 'Объявление не найдено' });
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
      email: ad.user?.email || '',
      phone: ad.user?.phone || '',
      avatar_url: ad.user?.avatar_url || null,
      type: ad.type,
      condition: ad.condition,
      trade_possible: ad.trade_possible,
      price_type: ad.price_type,
      images: parsedImages
    });
  } catch (err) {
    console.error('Error fetching listing detail:', err);
    res.status(500).json({ error: 'Ошибка базы данных при получении деталей объявления' });
  }
});

// Securely update an ad (allows admin and the listing author only) (Sequelize version)
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

      // Handle old images deletion if we are updating images!
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

// --- IMAGE UPLOAD API ENDPOINTS ---

// Upload Avatar (Authorized, max 2MB)
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
      
      // Update User in database
      const user = await User.findByPk(req.user.id);
      if (user) {
        // Delete old avatar if present
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

// Upload Ad Photos (Authorized, max 5 images, each max 5MB)
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

// Serve local upload files (path traversal safe)
app.get('/api/uploads/:filename', (req, res) => {
  const filePath = resolveUploadFilePath(req.params.filename);
  if (!filePath || !fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Файл не найден' });
  }
  res.sendFile(filePath);
});

// --- ADMIN STATS ENDPOINT ---

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

// Health check endpoint for Render
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Serve frontend build static files only in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client/build')));
  
  app.get('/{*splat}', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
  });
}

// Sync Database (with safe migrations) and Start Server
syncDatabase()
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('Unable to sync database:', err);
    process.exit(1);
  });