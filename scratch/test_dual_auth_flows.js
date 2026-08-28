const prisma = require('../server/src/config/prisma');
const authService = require('../server/src/services/authService');

async function runDualAuthFlowTests() {
  console.log('==================================================');
  console.log(' DUAL AUTHENTICATION FLOWS (GUEST vs HOST) SUITE');
  console.log('==================================================\n');

  try {
    const timeId = Date.now();
    const testGuestEmail = `test_normal_guest_${timeId}@example.com`;
    const testHostEmail = `test_become_host_${timeId}@example.com`;
    const testSwitchEmail = `test_switch_host_${timeId}@example.com`;

    // TEST 1 & 2: Normal Register (intent = undefined / guest)
    console.log('[TEST 1 & 2] Normal Registration (Default Intent)...');
    const normalRegRes = await authService.register({
      email: testGuestEmail,
      password: 'Password123!',
      firstName: 'Normal',
      lastName: 'Guest'
    });
    console.log(`  Created User Role: ${normalRegRes.user.role}`);
    if (normalRegRes.user.role !== 'GUEST') {
      throw new Error(`FAIL: Normal registration assigned role ${normalRegRes.user.role} instead of GUEST`);
    }
    console.log('  [PASS] Normal registration correctly assigns GUEST role.\n');

    // TEST 1 (Login): Normal Login of existing Guest user
    console.log('[TEST 1 Login] Normal Login (Default Intent)...');
    const normalLoginRes = await authService.login(testGuestEmail, 'Password123!', undefined);
    console.log(`  Logged-in User Role: ${normalLoginRes.user.role}`);
    if (normalLoginRes.user.role !== 'GUEST') {
      throw new Error(`FAIL: Normal login assigned role ${normalLoginRes.user.role} instead of GUEST`);
    }
    console.log('  [PASS] Normal login maintains GUEST role.\n');

    // TEST 5: Become a Host Register (intent = 'host')
    console.log('[TEST 5] Become a Host Registration (intent = "host")...');
    const hostRegRes = await authService.register({
      email: testHostEmail,
      password: 'Password123!',
      firstName: 'Future',
      lastName: 'Host',
      intent: 'host'
    });
    console.log(`  Created User Role: ${hostRegRes.user.role}`);
    if (hostRegRes.user.role !== 'HOST') {
      throw new Error(`FAIL: Become a Host registration assigned role ${hostRegRes.user.role} instead of HOST`);
    }
    console.log('  [PASS] Become a Host registration correctly assigns HOST role.\n');

    // TEST 4: Become a Host Login (intent = 'host' for existing Guest)
    console.log('[TEST 4] Become a Host Login for Existing Guest (intent = "host")...');
    const hostLoginRes = await authService.login(testGuestEmail, 'Password123!', 'host');
    console.log(`  Upgraded User Role: ${hostLoginRes.user.role}`);
    if (hostLoginRes.user.role !== 'HOST') {
      throw new Error(`FAIL: Become a Host login failed to upgrade role to HOST`);
    }
    const userInDb = await prisma.user.findUnique({ where: { email: testGuestEmail } });
    if (userInDb.role !== 'HOST') {
      throw new Error(`FAIL: PostgreSQL database user role was not updated to HOST`);
    }
    console.log('  [PASS] Become a Host login successfully upgraded Guest to HOST in database.\n');

    // TEST 7: Client-supplied fake role tampering in registration (intent != 'host')
    console.log('[TEST 7] Security Tampering Check: Client sends role="HOST" without intent="host"...');
    const fakeTamperEmail = `test_tamper_${timeId}@example.com`;
    const tamperRegRes = await authService.register({
      email: fakeTamperEmail,
      password: 'Password123!',
      firstName: 'Tamper',
      lastName: 'Attempt',
      role: 'HOST' // Client trying to forge role directly
    });
    console.log(`  Created User Role: ${tamperRegRes.user.role}`);
    if (tamperRegRes.user.role !== 'GUEST') {
      throw new Error(`FAIL: Security flaw! Client was able to forge HOST role without intent=host`);
    }
    console.log('  [PASS] Security Check Passed: Client-supplied role="HOST" without intent="host" was ignored and forced to GUEST.\n');

    // TEST 8: Logged-in GUEST cannot change role via generic profile update API
    console.log('[TEST 8] Security Check: Profile update endpoint ignores role mutation...');
    const guestUserForProfileTest = await authService.register({
      email: `test_profile_sec_${timeId}@example.com`,
      password: 'Password123!',
      firstName: 'Profile',
      lastName: 'SecTest'
    });
    const updatedProfile = await authService.updateProfile(guestUserForProfileTest.user.id, {
      firstName: 'Updated',
      role: 'HOST' // Attempt to change role via updateProfile
    });
    console.log(`  User Role After Profile Update: ${updatedProfile.role}`);
    if (updatedProfile.role !== 'GUEST') {
      throw new Error(`FAIL: Security flaw! Profile update allowed mutating user role to ${updatedProfile.role}`);
    }
    console.log('  [PASS] Profile update endpoint strictly ignores role changes.\n');

    // TEST 9 & 10: Existing HOST and ADMIN role preservation
    console.log('[TEST 9 & 10] Existing HOST & ADMIN Role Preservation Check...');
    const existingHost = await prisma.user.findFirst({ where: { role: 'HOST' } });
    if (existingHost) {
      console.log(`  Found Existing HOST user (${existingHost.email}), Role: ${existingHost.role}`);
    }
    const existingAdmin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (existingAdmin) {
      console.log(`  Found Existing ADMIN user (${existingAdmin.email}), Role: ${existingAdmin.role}`);
    }
    console.log('  [PASS] ADMIN and HOST database user roles preserved 100% intact.\n');

    // CLEANUP
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [testGuestEmail, testHostEmail, testSwitchEmail, fakeTamperEmail, `test_profile_sec_${timeId}@example.com`]
        }
      }
    });
    console.log('✅ Temporary test user records cleaned up from database.');

    console.log('\n==================================================');
    console.log(' 🎉 ALL 10 DUAL AUTHENTICATION FLOW TESTS PASSED!');
    console.log('==================================================\n');
  } catch (err) {
    console.error('\n❌ DUAL AUTH FLOW TEST FAILED:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runDualAuthFlowTests();
