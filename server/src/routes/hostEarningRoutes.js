const express = require('express');
const router = express.Router();
const hostEarningController = require('../controllers/hostEarningController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate, authorize('HOST', 'ADMIN'));

router.get('/summary', hostEarningController.getHostEarningSummary);
router.get('/', hostEarningController.getHostEarnings);
router.get('/:id', hostEarningController.getHostEarningById);

module.exports = router;
