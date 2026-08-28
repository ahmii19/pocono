/**
 * server/tests/test_smtp.js
 * 
 * Safe SMTP verification script for Pocono Vacations.
 * Loads .env, verifies SMTP connection, sends one test email.
 *
 * Usage:
 *   node server/tests/test_smtp.js
 *   node server/tests/test_smtp.js recipient@example.com
 *
 * SECURITY:
 *   - Never prints SMTP_PASS
 *   - Never creates a public API endpoint
 *   - Only call from the terminal / CI pipeline
 */

'use strict';

require('dotenv').config();

const emailService = require('../src/services/emailService');

const recipient = process.argv[2] || process.env.SMTP_USER;

async function run() {
  console.log('');
  console.log('===========================================');
  console.log(' POCONO VACATIONS — SMTP CONNECTION TEST  ');
  console.log('===========================================');
  console.log('');
  console.log('Config:');
  console.log(`  SMTP_HOST   : ${process.env.SMTP_HOST || 'smtp.gmail.com (default)'}`);
  console.log(`  SMTP_PORT   : ${process.env.SMTP_PORT || '465 (default)'}`);
  console.log(`  SMTP_SECURE : ${process.env.SMTP_SECURE || 'true (default)'}`);
  console.log(`  SMTP_USER   : ${process.env.SMTP_USER || '(NOT SET)'}`);
  console.log(`  SMTP_PASS   : ${process.env.SMTP_PASS ? '[SET - ' + process.env.SMTP_PASS.length + ' chars]' : '(NOT SET)'}`);
  console.log(`  ADMIN_EMAIL : ${process.env.ADMIN_EMAIL || '(NOT SET)'}`);
  console.log(`  FRONTEND_URL: ${process.env.FRONTEND_URL || 'http://localhost:3000 (default)'}`);
  console.log(`  Recipient   : ${recipient}`);
  console.log('');

  // ── Step 1: SMTP Connection Verify ──────────────────────────────
  process.stdout.write('  [1/2] Verifying SMTP connection ... ');
  try {
    await emailService.verifySmtp();
    console.log('PASS ✅');
  } catch (err) {
    console.log('FAIL ❌');
    console.error('');
    console.error('  ERROR:', err.message);
    console.error('');
    console.error('  Troubleshooting:');
    console.error('  1. Confirm SMTP_USER is your Gmail address');
    console.error('  2. Confirm SMTP_PASS is a Gmail App Password (NOT your account password)');
    console.error('     → Google Account → Security → 2-Step Verification → App Passwords');
    console.error('  3. Confirm 2-Step Verification is enabled on the Gmail account');
    console.error('  4. Confirm SMTP_PORT=465 and SMTP_SECURE=true');
    console.error('');
    console.log('===========================================');
    console.log(' SMTP CONNECTION: FAIL');
    console.log(' TEST EMAIL: SKIPPED');
    console.log('===========================================');
    process.exit(1);
  }

  // ── Step 2: Send Test Email ──────────────────────────────────────
  if (!recipient) {
    console.log('  [2/2] Skipped (no recipient provided or SMTP_USER not set)');
    console.log('');
    console.log('===========================================');
    console.log(' SMTP CONNECTION: PASS ✅');
    console.log(' TEST EMAIL: SKIPPED');
    console.log('===========================================');
    return;
  }

  process.stdout.write(`  [2/2] Sending test email to ${recipient} ... `);
  try {
    const sent = await emailService.sendTestEmail(recipient);
    if (sent) {
      console.log('PASS ✅');
      console.log('');
      console.log('  ✉️  Check your inbox at:', recipient);
    } else {
      console.log('FAIL ❌  (sendEmail returned false — check server logs above)');
      process.exit(1);
    }
  } catch (err) {
    console.log('FAIL ❌');
    console.error('  ERROR:', err.message.replace(process.env.SMTP_PASS || '', '[REDACTED]'));
    process.exit(1);
  }

  console.log('');
  console.log('===========================================');
  console.log(' SMTP CONNECTION: PASS ✅');
  console.log(' TEST EMAIL: PASS ✅');
  console.log('===========================================');
  console.log('');
}

run().catch(err => {
  console.error('\n[FATAL]', err.message.replace(process.env.SMTP_PASS || '', '[REDACTED]'));
  process.exit(1);
});
