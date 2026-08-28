const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticate } = require('../middleware/auth');

// Public Webhook endpoints
router.post('/stripe/webhook', express.raw({ type: 'application/json' }), paymentController.handleStripeWebhook);

// Protected Payment endpoints
router.post('/stripe/create-checkout-session', authenticate, paymentController.createStripeSession);
router.post('/paypal/create-order', authenticate, paymentController.createPayPalOrder);
router.post('/paypal/capture-order', authenticate, paymentController.capturePayPalOrder);
router.post('/pay-later/create-reservation', authenticate, paymentController.createPayLaterSession);

module.exports = router;
