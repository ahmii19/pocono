require('dotenv').config();
const nodemailer = require('nodemailer');

async function testPort(port, secure) {
  console.log(`Testing port ${port} (secure: ${secure})...`);
  const t = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
  try {
    await t.verify();
    console.log(`✅ SUCCESS on port ${port}!`);
    return true;
  } catch (e) {
    console.log(`❌ FAIL on port ${port}:`, e.message);
    return false;
  }
}

async function run() {
  console.log('User:', process.env.SMTP_USER);
  console.log('Pass length:', process.env.SMTP_PASS ? process.env.SMTP_PASS.length : 0);
  const p465 = await testPort(465, true);
  const p587 = await testPort(587, false);
}

run();
