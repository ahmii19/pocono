const authService = require('../services/authService');

async function login(req, res, next) {
  try {
    const { email, password, intent } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    const result = await authService.login(email, password, intent);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(401).json({ success: false, error: err.message });
  }
}

async function register(req, res, next) {
  try {
    const { email, password, firstName, lastName, phone, intent } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    const result = await authService.register({ email, password, firstName, lastName, phone, intent });
    res.status(201).json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    const prisma = require('../config/prisma');
    const user = await prisma.user.findUnique({ where: { email: String(email).trim().toLowerCase() } });

    if (user && user.status !== 'DELETED') {
      const { signToken } = require('../utils/jwt');
      const resetToken = signToken({ userId: user.id, action: 'password_reset' });

      try {
        const emailService = require('../services/emailService');
        emailService.sendPasswordResetEmail({ user, resetToken }).catch(err => {
          console.error('[EMAIL SERVICE] Password reset email error:', err.message);
        });
      } catch (e) {
        console.error('[EMAIL SERVICE] Failed to trigger password reset email:', e.message);
      }
    }

    // Always return success message for security (prevent email enumeration)
    return res.json({ success: true, message: 'If email exists, password reset instructions have been sent.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

async function me(req, res, next) {
  try {
    const user = await authService.getCurrentUser(req.user.id);
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
}

async function updateProfile(req, res, next) {
  try {
    // Explicitly exclude role modification
    const { role, ...updateData } = req.body;
    const user = await authService.updateProfile(req.user.id, updateData);
    res.json({ success: true, user });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

async function logout(req, res) {
  res.json({ success: true, message: 'Logged out successfully' });
}

module.exports = { login, register, forgotPassword, me, updateProfile, logout };
