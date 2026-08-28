const express = require('express');
const router = express.Router();
const membershipController = require('../controllers/membershipController');
const { authenticate } = require('../middleware/auth');

router.get('/plans', membershipController.getPlans);
router.get('/my-subscriptions', authenticate, membershipController.getMySubscriptions);

module.exports = router;
