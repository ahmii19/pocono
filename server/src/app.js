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

// CORS Configuration
app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  credentials: true
}));

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

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', environment: process.env.NODE_ENV || 'development', timestamp: new Date().toISOString() });
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
