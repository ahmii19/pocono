const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');

router.post('/', async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ success: false, error: 'Missing required contact fields (name, email, message are required)' });
    }

    const contactMsg = await prisma.contactMessage.create({
      data: {
        name: String(name).trim(),
        email: String(email).trim().toLowerCase(),
        phone: phone ? String(phone).trim() : null,
        subject: subject ? String(subject).trim() : 'General Inquiry',
        message: String(message).trim(),
        status: 'NEW'
      }
    });

    console.log(`[CONTACT FORM INQUIRY SAVED TO POSTGRESQL] ID: ${contactMsg.id} | From: ${name} (${email}) - Subject: ${contactMsg.subject}`);
    
    try {
      const emailService = require('../services/emailService');
      emailService.sendContactUsEmails({ contactMsg }).catch(err => {
        console.error('[EMAIL SERVICE] sendContactUsEmails error:', err.message);
      });
    } catch (e) {
      console.error('[EMAIL SERVICE] Failed to trigger contact emails:', e.message);
    }

    return res.status(200).json({
      success: true,
      message: 'Your inquiry has been received. A Pocono.Vacations team member will get back to you shortly.',
      data: contactMsg
    });
  } catch (e) {
    console.error('Error saving contact inquiry:', e);
    return res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
