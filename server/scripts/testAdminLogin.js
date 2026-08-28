const { login } = require('../src/services/authService');
const prisma = require('../src/config/prisma');

async function verifyLogin() {
  try {
    const res = await login('vr@serhii.com', 'AdminPass123!');
    console.log('\n==================================================');
    console.log('ADMIN LOGIN VERIFICATION: SUCCESS');
    console.log('==================================================');
    console.log('User Email:    ', res.user.email);
    console.log('User Role:     ', res.user.role);
    console.log('JWT Generated: ', !!res.token);
    console.log('Token Header:  ', res.token ? res.token.slice(0, 25) + '...' : 'NONE');
    console.log('==================================================\n');
  } catch (err) {
    console.error('Login verification failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

verifyLogin();
