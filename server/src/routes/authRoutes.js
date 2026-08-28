const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

const { authLimiter } = require('../middleware/rateLimiter');

router.post('/login', authLimiter, authController.login);
router.post('/register', authLimiter, authController.register);
router.post('/forgot-password', authLimiter, authController.forgotPassword);
router.get('/me', authenticate, authController.me);
router.put('/me', authenticate, authController.updateProfile);
router.post('/logout', authController.logout);

module.exports = router;
