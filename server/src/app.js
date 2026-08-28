const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const routes = require('./routes');
const { errorHandler } = require('./middleware/error');

const app = express();

// Trust proxy header for Vercel / reverse proxy rate limiting compatibility
app.set('trust proxy', 1);

// Security Headers (configured to allow cross-origin media rendering)
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// ---------------------------------------------------------------------------
// CORS — allowlist-based, production-safe
// ---------------------------------------------------------------------------
const ALLOWED_ORIGINS = [
  'https://pocono-theta.vercel.app',
  'https://pocono.vercel.app',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  // Support any extra origins supplied via env (comma-separated)
  ...(process.env.EXTRA_ALLOWED_ORIGINS
    ? process.env.EXTRA_ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : [])
];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, server-to-server, health checks)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin not allowed — ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count'],
  credentials: true,
  optionsSuccessStatus: 200   // IE11 sends 204 but some proxies choke on it
};

// Apply CORS before everything else — including preflight OPTIONS
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));  // explicit preflight handler for all routes

// Body Parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static WordPress media uploads directory
const clientUploadsPath = path.join(__dirname, '../../client/public/wp-content/uploads');
const poconoUploadsPath = path.join(__dirname, '../../pocono/wp-content/uploads');

if (fs.existsSync(clientUploadsPath)) {
  app.use('/uploads', express.static(clientUploadsPath));
  app.use('/wp-content/uploads', express.static(clientUploadsPath));
}
if (fs.existsSync(poconoUploadsPath)) {
  app.use('/uploads', express.static(poconoUploadsPath));
  app.use('/wp-content/uploads', express.static(poconoUploadsPath));
}

// Rate Limiting
const { generalLimiter } = require('./middleware/rateLimiter');
app.use('/api/', generalLimiter);

// Health check endpoints
app.get(['/health', '/api/health'], (req, res) => {
  res.json({
    success: true,
    message: 'Pocono API is running',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/v1', routes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Cannot ${req.method} ${req.originalUrl}` });
});

// Centralized Error Handler
app.use(errorHandler);

module.exports = app;
