const rateLimit = require('express-rate-limit');

const isDev = (process.env.NODE_ENV || 'development') === 'development';

// Helper to check if request is coming from localhost / loopback or dev environment
function isLocalhost(req) {
  if (isDev) return true;
  const ip = req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || '';
  return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1' || ip.endsWith('127.0.0.1');
}

// 1. Strict Auth Rate Limiter (for POST /auth/login, POST /auth/register, password resets)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: (req) => (isLocalhost(req) ? 100 : 20), // 20 attempts per 15 min in prod; 100 in dev/localhost
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many authentication attempts. Please try again in 15 minutes.' }
});

// 2. Public Read & Taxonomy Rate Limiter (GET /cities, GET /communities, GET /property-types, etc.)
const publicReadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: (req) => (isLocalhost(req) ? 10000 : 1500), // 1500 in prod, 10000 in dev
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later.' }
});

// 3. General API & Admin Operations Rate Limiter
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: (req) => (isLocalhost(req) ? 10000 : (process.env.RATE_LIMIT_MAX ? Number(process.env.RATE_LIMIT_MAX) : 2000)), // 2000 in prod, 10000 in dev
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later.' }
});

module.exports = {
  authLimiter,
  publicReadLimiter,
  generalLimiter,
  isLocalhost
};
