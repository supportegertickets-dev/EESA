require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173,http://localhost:3000')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);
const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    console.warn(`CORS blocked for origin: ${origin}`);
    return callback(null, false);
  },
  credentials: true
};

// Connect MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => { console.error('MongoDB error:', err.message); process.exit(1); });

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many login attempts, please try again later.' }
});

// Middleware
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const publicPath = path.join(__dirname, '..', 'frontend', 'public');
app.use(express.static(publicPath, { index: false }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const candidateReactDistPaths = [
  path.join(__dirname, '..', 'dist'),
  path.join(__dirname, '..', 'frontend', 'dist')
];
const reactDistPath = candidateReactDistPaths.find(dir => fs.existsSync(path.join(dir, 'index.html')));
const reactIndexPath = reactDistPath ? path.join(reactDistPath, 'index.html') : null;
const hasReactBuild = Boolean(reactIndexPath);
if (hasReactBuild) {
  app.use(express.static(reactDistPath, { index: false }));
}

app.use(session({
  name: 'eesa.sid',
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  proxy: isProduction,
  store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
  cookie: {
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: isProduction ? 'none' : 'lax',
    secure: isProduction
  }
}));

// Apply rate limiting
app.use('/api/', apiLimiter);
app.use('/api/auth', authLimiter);

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'eesa-api', time: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/members', require('./routes/members'));
app.use('/api/events', require('./routes/events'));
app.use('/api/announcements', require('./routes/announcements'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/resources', require('./routes/resources'));
app.use('/api/elections', require('./routes/elections'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/sponsors', require('./routes/sponsors'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/units', require('./routes/units'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/gallery', require('./routes/gallery'));

// Legacy page routes used by the React dashboard loader
app.get('/legacy/admin*', (req, res) => res.sendFile(path.join(publicPath, 'admin.html')));
app.get('/legacy/lecturer*', (req, res) => res.sendFile(path.join(publicPath, 'lecturer.html')));
app.get('/legacy/portal*', (req, res) => res.sendFile(path.join(publicPath, 'portal.html')));

// React app routes (fallback to legacy HTML if the React build is not available yet)
app.get('/dashboard*', (req, res) => res.sendFile(hasReactBuild ? reactIndexPath : path.join(publicPath, 'dashboard.html')));
app.get('/admin*', (req, res) => res.sendFile(hasReactBuild ? reactIndexPath : path.join(publicPath, 'admin.html')));
app.get('/lecturer*', (req, res) => res.sendFile(hasReactBuild ? reactIndexPath : path.join(publicPath, 'lecturer.html')));
app.get('/portal*', (req, res) => res.sendFile(hasReactBuild ? reactIndexPath : path.join(publicPath, 'portal.html')));
app.get('*', (req, res) => res.sendFile(hasReactBuild ? reactIndexPath : path.join(publicPath, 'index.html')));

app.listen(PORT, () => console.log(`EESA Portal running at http://localhost:${PORT}`));
