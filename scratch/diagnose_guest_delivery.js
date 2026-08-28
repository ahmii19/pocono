require('dotenv').config();
const prisma = require('../server/src/config/prisma');
const nodemailer = require('nodemailer');
const emailService = require('../server/src/services/emailService');

async function runDiagnosis() {
  console.log('========================================');
  console.log('REAL EMAIL DELIVERY DIAGNOSIS (READ-ONLY)');
  console.log('========================================\n');

  // 1 & 2. Check user record in DB
  const user = await prisma.user.findUnique({
    where: { email: 'revoluxemindset@gmail.com' },
    select: { id: true, email: true, firstName: true, lastName: true, role: true, createdAt: true }
  });

  console.log('USER RECORD IN POSTGRESQL:');
  if (user) {
    console.log('  Found User ID  :', user.id);
    console.log('  Email          :', user.email);
    console.log('  Role           :', user.role);
    console.log('  Created At     :', user.createdAt);
  } else {
    console.log('  User NOT FOUND in database!');
  }
  console.log('');

  // Check running backend processes (are there multiple processes listening on port 5000?)
  const http = require('http');
  let runningServerResponse = null;
  try {
    const checkRes = await new Promise((resolve, reject) => {
      const req = http.get('http://127.0.0.1:5000/health', (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => resolve({ status: res.statusCode, body }));
      });
      req.on('error', reject);
    });
    runningServerResponse = checkRes;
    console.log('HEALTH CHECK ON PORT 5000:', checkRes.status, checkRes.body);
  } catch (e) {
    console.log('HEALTH CHECK ON PORT 5000 FAILED:', e.message);
  }
  console.log('');

  // Perform ONE controlled SMTP diagnostic email to revoluxemindset@gmail.com
  console.log('--- CONTROLLED DIAGNOSTIC SMTP SEND TO revoluxemindset@gmail.com ---');
  
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  const secure = String(process.env.SMTP_SECURE).toLowerCase() === 'true' || port === 465;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM || 'Pocono Vacations <no-reply@pocono.vacations>';

  console.log('SMTP Config Check:');
  console.log('  Host       :', host);
  console.log('  Port       :', port);
  console.log('  Secure     :', secure);
  console.log('  User       :', smtpUser ? 'SET' : 'NOT SET');
  console.log('  Pass       :', smtpPass ? 'SET' : 'NOT SET');
  console.log('  FROM       :', smtpFrom);
  console.log('');

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user: smtpUser, pass: smtpPass }
  });

  try {
    const verifyRes = await transporter.verify();
    console.log('transporter.verify(): PASS (Connection established & authenticated)');
  } catch (e) {
    console.log('transporter.verify(): FAIL', e.message);
  }

  try {
    const mailOptions = {
      from: smtpFrom,
      to: 'revoluxemindset@gmail.com',
      subject: 'Welcome to Pocono Vacations, Test!',
      text: 'Thank you for creating a Guest account on Pocono Vacations.',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #0f172a; color: #ffffff; padding: 24px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">Pocono Vacations</h1>
            <p style="margin: 4px 0 0; opacity: 0.8;">Welcome to our community</p>
          </div>
          <div style="padding: 24px; color: #334155; line-height: 1.6;">
            <h2 style="color: #0f172a;">Hi Test,</h2>
            <p>Thank you for creating a Guest account on Pocono Vacations.</p>
            <p>Discover luxury cabins, chalets, and getaway properties across the Pocono Mountains.</p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="http://localhost:3000/dashboard" style="background-color: #059669; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Explore Vacation Rentals</a>
            </div>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('\nFULL NODEMAILER RESULT OBJECT:');
    console.log('  messageId   :', info.messageId);
    console.log('  accepted    :', JSON.stringify(info.accepted));
    console.log('  rejected    :', JSON.stringify(info.rejected));
    console.log('  pending     :', JSON.stringify(info.pending));
    console.log('  response    :', info.response);
    console.log('  envelope.from:', info.envelope ? info.envelope.from : 'N/A');
    console.log('  envelope.to  :', info.envelope ? JSON.stringify(info.envelope.to) : 'N/A');

  } catch (err) {
    console.log('\nNODEMAILER ERROR:', err.message);
  }

  await prisma.$disconnect();
}

runDiagnosis();
