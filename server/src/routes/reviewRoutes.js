const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { authenticate } = require('../middleware/auth');

router.post('/', authenticate, reviewController.createReview);

module.exports = router;
