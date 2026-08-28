/**
 * Production-Safe Admin Account Creation / Upgrade Script
 * Target Email: ahmedkhanghaleja4@gmail.com
 */

const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const prisma = new PrismaClient();
const { hashPassword } = require('../server/src/utils/phpass');
const authService = require('../server/src/services/authService');

const TARGET_EMAIL = 'ahmedkhanghaleja4@gmail.com';

function generateSecureTempPassword() {
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lowercase = 'abcdefghijkmnopqrstuvwxyz';
  const numbers = '23456789';
  const special = '!@#$%^&*';
  const all = uppercase + lowercase + numbers + special;

  // Ensure at least 1 of each required class
  let pass = '';
  pass += uppercase[crypto.randomInt(uppercase.length)];
  pass += lowercase[crypto.randomInt(lowercase.length)];
  pass += numbers[crypto.randomInt(numbers.length)];
  pass += special[crypto.randomInt(special.length)];

  for (let i = 0; i < 12; i++) {
    pass += all[crypto.randomInt(all.length)];
  }

  // Shuffle
  return pass.split('').sort(() => 0.5 - Math.random()).join('');
}

async function main() {
  console.log('====================================================');
  console.log(` PRODUCTION-SAFE ADMIN CREATION / UPGRADE`);
  console.log(` Target Email: ${TARGET_EMAIL}`);
  console.log('====================================================\n');

  const tempPassword = generateSecureTempPassword();
  const hashedPassword = hashPassword(tempPassword);

  // 1. Check existing user
  const existingUser = await prisma.user.findUnique({
    where: { email: TARGET_EMAIL }
  });

  let userAction = '';
  let finalUser = null;

  if (existingUser) {
    userAction = 'EXISTED_AND_UPGRADED';
    console.log(`[INFO] Existing user found: ID ${existingUser.id}, current role: ${existingUser.role}`);

    finalUser = await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        role: 'ADMIN',
        passwordHash: hashedPassword,
        status: 'ACTIVE',
        deletedAt: null
      }
    });
    console.log(`[SUCCESS] Existing user updated to ADMIN role and password reset.`);
  } else {
    userAction = 'NEWLY_CREATED';
    console.log(`[INFO] No existing user found with email ${TARGET_EMAIL}. Creating new ADMIN user...`);

    finalUser = await prisma.user.create({
      data: {
        email: TARGET_EMAIL,
        passwordHash: hashedPassword,
        firstName: 'Ahmed',
        lastName: 'Khan',
        role: 'ADMIN',
        status: 'ACTIVE'
      }
    });
    console.log(`[SUCCESS] New ADMIN user created: ID ${finalUser.id}`);
  }

  // 2. Verification
  console.log('\n--- VERIFICATION STEP ---');
  const dbUser = await prisma.user.findUnique({
    where: { email: TARGET_EMAIL }
  });

  const dbCheck = dbUser && dbUser.email === TARGET_EMAIL && dbUser.role === 'ADMIN' && dbUser.status === 'ACTIVE';
  console.log(`1. DB User Check    : ${dbCheck ? '✅ PASSED' : '❌ FAILED'}`);

  // Test authService login
  let loginCheck = false;
  try {
    const authResult = await authService.login(TARGET_EMAIL, tempPassword);
    if (authResult && authResult.token && authResult.user.role === 'ADMIN') {
      loginCheck = true;
    }
  } catch (e) {
    console.error('Login test failed:', e.message);
  }
  console.log(`2. Auth Login Check : ${loginCheck ? '✅ PASSED' : '❌ FAILED'}`);

  console.log('\n====================================================');
  console.log(' FINAL RESULT');
  console.log('====================================================');
  console.log(`Action Performed : ${userAction}`);
  console.log(`User ID          : ${finalUser.id}`);
  console.log(`Email            : ${finalUser.email}`);
  console.log(`Final Role       : ${finalUser.role}`);
  console.log(`Login Verified   : ${loginCheck ? 'SUCCESS' : 'FAILED'}`);
  console.log(`Temp Password    : ${tempPassword}`);
  console.log('====================================================\n');

  await prisma.$disconnect();
}

main().catch(e => {
  console.error('Error executing script:', e);
  prisma.$disconnect();
  process.exit(1);
});
