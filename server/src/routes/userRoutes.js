const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');

router.put('/profile', authenticate, userController.updateProfile);
router.get('/hosts/:id', userController.getHostProfile);

module.exports = router;
