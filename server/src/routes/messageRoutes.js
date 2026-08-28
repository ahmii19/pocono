const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { authenticate, optionalAuthenticate } = require('../middleware/auth');

router.get('/threads', authenticate, messageController.getMyThreads);
router.get('/threads/:id', authenticate, messageController.getThreadById);
router.post('/threads/:id/reply', authenticate, messageController.replyToThread);
router.patch('/threads/:id/read', authenticate, messageController.markThreadAsRead);
router.post('/', optionalAuthenticate, messageController.sendMessage);

module.exports = router;
