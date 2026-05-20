const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const { sequelize, User, Ad } = require('./db');

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5000;

// Security HTTP Headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:"],
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

app.use(express.json());

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
    .isLength({ min: 6 }).withMessage('Пароль должен содержать не менее 6 символов')
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
    .escape()
];

// Admin and User Authentication Configurations
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Sansfrisk2008';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'baku-admin-token-2026-Sansfrisk2008';
const JWT_SECRET = process.env.JWT_SECRET || 'baku_services_jwt_secret_key_2026_special';
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

    const userPayload = { id: newUser.id, fullname, email, phone };
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

    const userPayload = { id: user.id, fullname: user.fullname, email: user.email, phone: user.phone };
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
  const ADMIN_2FA_CODE = process.env.ADMIN_2FA_CODE || '8844';

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

// GET all ads (Sequelize version)
app.get('/api/ads', async (req, res) => {
  try {
    const ads = await Ad.findAll({ order: [['created_at', 'DESC']] });
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

  const { title, category, price, description } = req.body;
  
  // Use fullname from verified token, or allow admin override, or fallback to body name
  const name = req.isAdmin ? (req.body.name || 'Admin') : (req.user?.fullname || req.body.name || 'User');
  const userId = req.isAdmin ? null : (req.user?.id || null);

  try {
    const ad = await Ad.create({
      name,
      title,
      category,
      price,
      description,
      user_id: userId
    });
    res.json({ id: ad.id });
  } catch (err) {
    console.error('Error inserting ad:', err);
    res.status(500).json({ error: 'Ошибка базы данных при добавлении объявления' });
  }
});

// GET listings created by the logged-in user (Sequelize version)
app.get('/api/listings/my', checkUserAuth, async (req, res) => {
  const userId = req.user ? req.user.id : null;
  try {
    const ads = await Ad.findAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC']]
    });
    res.json(ads);
  } catch (err) {
    console.error('Error fetching user listings:', err);
    res.status(500).json({ error: 'Ошибка базы данных при получении ваших объявлений' });
  }
});

// Consolidate delete checks for both api/listings/:id and api/ads/:id (Sequelize version)
const handleAdDeletion = async (req, res) => {
  const id = req.params.id;
  try {
    const ad = await Ad.findByPk(id);
    if (!ad) {
      return res.status(404).json({ error: 'Объявление не найдено' });
    }

    if (req.isAdmin || (req.user && ad.user_id === req.user.id)) {
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
        attributes: ['fullname', 'email', 'phone']
      }]
    });

    if (!ad) {
      return res.status(404).json({ error: 'Объявление не найдено' });
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
      phone: ad.user?.phone || ''
    });
  } catch (err) {
    console.error('Error fetching listing detail:', err);
    res.status(500).json({ error: 'Ошибка базы данных при получении деталей объявления' });
  }
});

// Securely update an ad (allows admin and the listing author only) (Sequelize version)
app.put('/api/ads/:id', checkUserAuth, validate(adValidation), async (req, res) => {
  const id = req.params.id;
  const { title, category, price, description } = req.body;

  try {
    const ad = await Ad.findByPk(id);
    if (!ad) return res.status(404).json({ error: 'Объявление не найдено' });

    if (req.isAdmin || (req.user && ad.user_id === req.user.id)) {
      const name = req.isAdmin ? (req.body.name || ad.name) : ad.name;
      
      await ad.update({
        name,
        title,
        category,
        price,
        description
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

// Sync Sequelize Models and Start Server
sequelize.sync()
  .then(() => {
    console.log('Database synced successfully.');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('Unable to sync database:', err);
    process.exit(1);
  });