const messageService = require('../services/messageService');
const prisma = require('../config/prisma');

async function getMyThreads(req, res, next) {
  try {
    const threads = await messageService.getUserThreads(req.user);
    res.json({ success: true, count: threads.length, data: threads });
  } catch (err) {
    next(err);
  }
}

async function getThreadById(req, res, next) {
  try {
    const thread = await messageService.getThreadById(req.params.id, req.user);
    res.json({ success: true, data: thread });
  } catch (err) {
    const status = err.statusCode || 404;
    res.status(status).json({ success: false, error: err.message });
  }
}

async function sendMessage(req, res, next) {
  try {
    let senderUser = req.user;

    // If unauthenticated guest sends a message from Property Detail Form
    if (!senderUser) {
      const { email, name } = req.body;
      if (!email || !String(email).trim()) {
        return res.status(400).json({ success: false, error: 'Email is required to send a inquiry message' });
      }

      const formattedEmail = String(email).trim().toLowerCase();
      
      // Find existing user or create a temporary guest user
      senderUser = await prisma.user.findUnique({ where: { email: formattedEmail } });
      if (!senderUser) {
        const nameParts = String(name || 'Guest User').trim().split(' ');
        const firstName = nameParts[0] || 'Guest';
        const lastName = nameParts.slice(1).join(' ') || 'User';

        senderUser = await prisma.user.create({
          data: {
            email: formattedEmail,
            passwordHash: 'GUEST_NO_PASS',
            firstName,
            lastName,
            role: 'GUEST'
          }
        });
      }
    }

    const result = await messageService.sendMessage(req.body, senderUser);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    const status = err.statusCode || 400;
    res.status(status).json({ success: false, error: err.message });
  }
}

async function replyToThread(req, res, next) {
  try {
    const message = await messageService.replyToThread(req.params.id, req.body.messageText || req.body.content || req.body.message, req.user);
    res.status(201).json({ success: true, data: message });
  } catch (err) {
    const status = err.statusCode || 400;
    res.status(status).json({ success: false, error: err.message });
  }
}

async function markThreadAsRead(req, res, next) {
  try {
    const result = await messageService.markThreadAsRead(req.params.id, req.user);
    res.json({ success: true, data: result });
  } catch (err) {
    const status = err.statusCode || 400;
    res.status(status).json({ success: false, error: err.message });
  }
}

module.exports = {
  getMyThreads,
  getThreadById,
  sendMessage,
  replyToThread,
  markThreadAsRead
};
