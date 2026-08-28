/**
 * Update Admin Password Script
 * Target: ahmedkhanghaleja4@gmail.com
 */

const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const prisma = new PrismaClient();
const { hashPassword } = require('../server/src/utils/phpass');
const authService = require('../server/src/services/authService');

const TARGET_EMAIL = 'ahmedkhanghaleja4@gmail.com';

function generateNewSecurePassword() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let pass = 'PoconoAdmin2026!';
  for (let i = 0; i < 8; i++) {
    pass += chars[crypto.randomInt(chars.length)];
  }
  return pass;
}

async function main() {
  // 1. Find existing user
  const user = await prisma.user.findUnique({
    where: { email: TARGET_EMAIL }
  });

  if (!user) {
    throw new Error(`User with email ${TARGET_EMAIL} not found.`);
  }

  // 2. Verify role = ADMIN, status = ACTIVE
  const isRoleAdmin = user.role === 'ADMIN';
  const isStatusActive = user.status === 'ACTIVE';

  if (!isRoleAdmin || !isStatusActive) {
    throw new Error(`Pre-check failed: role=${user.role}, status=${user.status}`);
  }

  // 3. Generate and hash new password
  const newPassword = generateNewSecurePassword();
  const hashedPassword = hashPassword(newPassword);

  // 4. Update password without modifying other fields
  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: hashedPassword
    }
  });

  // 5. Verify authentication via authService.login
  let loginSuccess = false;
  try {
    const authResult = await authService.login(TARGET_EMAIL, newPassword);
    if (authResult && authResult.token && authResult.user.role === 'ADMIN') {
      loginSuccess = true;
    }
  } catch (err) {
    loginSuccess = false;
  }

  // Write verification status object
  const reportData = {
    userId: updatedUser.id,
    email: updatedUser.email,
    firstName: updatedUser.firstName,
    lastName: updatedUser.lastName,
    role: updatedUser.role,
    status: updatedUser.status,
    isHashed: updatedUser.passwordHash.startsWith('$2'),
    loginSuccess: loginSuccess,
    newPassword: newPassword
  };

  console.log(JSON.stringify(reportData, null, 2));

  await prisma.$disconnect();
}

main().catch(e => {
  console.error(JSON.stringify({ error: e.message }));
  prisma.$disconnect();
  process.exit(1);
});
