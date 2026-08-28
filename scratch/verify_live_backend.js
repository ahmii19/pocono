require('dotenv').config();
const emailService = require('../server/src/services/emailService');

async function runLiveCheck() {
  console.log('==================================================');
  console.log(' LIVE BACKEND SMTP RUNTIME VERIFICATION (READ-ONLY)');
  console.log('==================================================');

  const userLoaded = !!process.env.SMTP_USER;
  const passLoaded = !!process.env.SMTP_PASS;

  console.log(`1. SMTP_USER in process.env  : ${userLoaded ? 'SET' : 'NOT SET'}`);
  console.log(`2. SMTP_PASS in process.env  : ${passLoaded ? 'SET' : 'NOT SET'}`);
  console.log(`3. SMTP Host                 : ${process.env.SMTP_HOST || 'smtp.gmail.com'}`);
  console.log(`4. SMTP Port                 : ${process.env.SMTP_PORT || '465'}`);
  console.log(`5. SMTP Secure Mode          : ${process.env.SMTP_SECURE || 'true'}`);

  if (!userLoaded || !passLoaded) {
    console.log('Transport Mode              : JSON/MOCK (SMTP credentials missing in memory)');
    console.log('Transporter Verification    : FAIL');
    return;
  }

  console.log('Transport Mode              : Gmail SMTP (Real SSL/TLS delivery)');
  console.log('Mock/JSON Mode              : NOT ACTIVE');

  process.stdout.write('6. Transporter Verification   : ');
  try {
    const res = await emailService.verifySmtp();
    if (res && res.ok) {
      console.log('PASS ✅');
    } else {
      console.log('FAIL ❌');
    }
  } catch (err) {
    console.log('FAIL ❌');
    console.error('   Detail:', err.message);
  }

  console.log('==================================================');
}

runLiveCheck();
