/**
 * Update Admin Password to specific password: poconoadmin123
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { hashPassword } = require('../server/src/utils/phpass');
const authService = require('../server/src/services/authService');

const TARGET_EMAIL = 'ahmedkhanghaleja4@gmail.com';
const NEW_PASSWORD = 'poconoadmin123';

async function main() {
  // 1. Find existing user
  const user = await prisma.user.findUnique({
    where: { email: TARGET_EMAIL }
  });

  if (!user) {
    throw new Error(`User ${TARGET_EMAIL} not found.`);
  }

  // 2. Verify account is role = ADMIN, status = ACTIVE
  if (user.role !== 'ADMIN' || user.status !== 'ACTIVE') {
    throw new Error(`Invalid user state: role=${user.role}, status=${user.status}`);
  }

  // 3. Hash the new password
  const newHash = hashPassword(NEW_PASSWORD);

  // 4. Update ONLY passwordHash
  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: newHash }
  });

  // 5. Verify authentication via authService.login()
  let loginSuccess = false;
  try {
    const res = await authService.login(TARGET_EMAIL, NEW_PASSWORD);
    if (res && res.token && res.user.role === 'ADMIN') {
      loginSuccess = true;
    }
  } catch (err) {
    loginSuccess = false;
  }

  // Verification metrics
  console.log(JSON.stringify({
    userId: updatedUser.id,
    email: updatedUser.email,
    role: updatedUser.role,
    status: updatedUser.status,
    isHashed: updatedUser.passwordHash.startsWith('$2'),
    loginVerified: loginSuccess
  }, null, 2));

  await prisma.$disconnect();
}

main().catch(e => {
  console.error('Error:', e.message);
  prisma.$disconnect();
  process.exit(1);
});
