require('dotenv').config();
const prisma = require('../server/src/config/prisma');
const adminService = require('../server/src/services/adminService');

async function runUserDeletionTests() {
  console.log('====================================================');
  console.log(' TESTING ADMIN USER DELETION WORKFLOW & INTEGRITY');
  console.log('====================================================\n');

  // Find an admin user for context
  const adminUser = await prisma.user.findFirst({
    where: { role: 'ADMIN' }
  });

  if (!adminUser) throw new Error('No admin user found!');

  console.log(`[ADMIN CONTEXT] Using Admin User: ${adminUser.email} (${adminUser.id})`);

  // TEST 5A: Self Deletion Protection
  console.log('\n[TEST 5A] Self-deletion protection...');
  try {
    await adminService.deleteUser(adminUser.id, adminUser);
    console.error('❌ FAIL: Admin self-deletion was allowed!');
  } catch (err) {
    console.log(`✅ PASS: Self-deletion blocked correctly -> "${err.message}"`);
  }

  // TEST 1: Create a Guest with historical activity (reservation)
  console.log('\n[TEST 1] Creating Guest with historical reservation...');
  const activeGuestEmail = `historical.guest.${Date.now()}@example.com`;
  const guestWithHistory = await prisma.user.create({
    data: {
      email: activeGuestEmail,
      passwordHash: 'hashed_pass',
      firstName: 'TestHistory',
      lastName: 'Guest',
      role: 'GUEST'
    }
  });

  // Attach a mock property and reservation to create historical activity
  const sampleProp = await prisma.property.findFirst({ where: { status: 'PUBLISHED' } });
  if (!sampleProp) throw new Error('No published property found for test reservation');

  const dummyReservation = await prisma.reservation.create({
    data: {
      guestId: guestWithHistory.id,
      hostId: sampleProp.hostId,
      propertyId: sampleProp.id,
      checkInDate: new Date('2026-10-01'),
      checkOutDate: new Date('2026-10-05'),
      totalNights: 4,
      guestCount: 2,
      baseTotal: 600.00,
      cleaningFee: 50.00,
      serviceFee: 30.00,
      grandTotal: 680.00,
      status: 'CONFIRMED'
    }
  });

  console.log(`[TEST 1 SETUP] Created Guest ${guestWithHistory.id} with Reservation ID: ${dummyReservation.id}`);

  // Admin deletes Guest with historical activity
  console.log('[TEST 1 EXECUTION] Admin deleting Guest with historical activity...');
  const softDeletedResult = await adminService.deleteUser(guestWithHistory.id, adminUser);

  console.log(`[TEST 1 RESULT] Soft-delete result:`, softDeletedResult);

  // Verify historical reservation still exists in DB
  const checkResv = await prisma.reservation.findUnique({ where: { id: dummyReservation.id } });
  if (checkResv && checkResv.guestId === guestWithHistory.id) {
    console.log('✅ PASS: Historical reservation preserved cleanly!');
  } else {
    console.error('❌ FAIL: Historical reservation was corrupted or deleted!');
  }

  // Verify anonymization
  const checkAnonymizedGuest = await prisma.user.findUnique({ where: { id: guestWithHistory.id } });
  if (
    checkAnonymizedGuest.status === 'DELETED' &&
    checkAnonymizedGuest.deletedAt &&
    checkAnonymizedGuest.email.startsWith('deleted_') &&
    checkAnonymizedGuest.firstName === 'Deleted' &&
    checkAnonymizedGuest.lastName === 'User'
  ) {
    console.log('✅ PASS: Guest profile anonymized correctly with status = DELETED!');
  } else {
    console.error('❌ FAIL: Anonymization state invalid!', checkAnonymizedGuest);
  }

  // TEST 2: Guest with messages but no reservation
  console.log('\n[TEST 2] Creating Guest with message thread...');
  const msgGuestEmail = `msg.guest.${Date.now()}@example.com`;
  const guestWithMsg = await prisma.user.create({
    data: {
      email: msgGuestEmail,
      passwordHash: 'hashed_pass',
      firstName: 'MsgGuest',
      lastName: 'User',
      role: 'GUEST'
    }
  });

  const dummyThread = await prisma.messageThread.create({
    data: {
      propertyId: sampleProp.id,
      senderId: guestWithMsg.id,
      receiverId: sampleProp.hostId
    }
  });

  console.log(`[TEST 2 SETUP] Created Guest ${guestWithMsg.id} with Thread ID: ${dummyThread.id}`);

  // Admin deletes Guest with messages
  console.log('[TEST 2 EXECUTION] Admin deleting Guest with message history...');
  const msgDeletedResult = await adminService.deleteUser(guestWithMsg.id, adminUser);

  console.log(`[TEST 2 RESULT] Soft-delete result:`, msgDeletedResult);

  const checkThread = await prisma.messageThread.findUnique({ where: { id: dummyThread.id } });
  if (checkThread) {
    console.log('✅ PASS: Message thread preserved cleanly!');
  } else {
    console.error('❌ FAIL: Message thread was lost!');
  }

  // TEST 3: Guest with zero historical activity -> Hard deletion
  console.log('\n[TEST 3] Creating Guest with zero historical activity...');
  const zeroActivityEmail = `zero.guest.${Date.now()}@example.com`;
  const cleanGuest = await prisma.user.create({
    data: {
      email: zeroActivityEmail,
      passwordHash: 'hashed_pass',
      firstName: 'CleanGuest',
      lastName: 'User',
      role: 'GUEST'
    }
  });

  console.log(`[TEST 3 SETUP] Created clean Guest ID: ${cleanGuest.id}`);
  const hardDeleteResult = await adminService.deleteUser(cleanGuest.id, adminUser);
  console.log(`[TEST 3 RESULT] Hard-delete result:`, hardDeleteResult);

  const checkCleanGuest = await prisma.user.findUnique({ where: { id: cleanGuest.id } });
  if (!checkCleanGuest) {
    console.log('✅ PASS: Clean guest hard-deleted successfully!');
  } else {
    console.error('❌ FAIL: Clean guest was not hard-deleted!');
  }

  // TEST 4: Host ownership protection
  console.log('\n[TEST 4] Testing Host ownership protection...');
  const hostUser = await prisma.user.findFirst({
    where: { properties: { some: {} } }
  });

  if (hostUser) {
    try {
      await adminService.deleteUser(hostUser.id, adminUser);
      console.error('❌ FAIL: Host deletion with properties was allowed!');
    } catch (err) {
      console.log(`✅ PASS: Host deletion blocked correctly -> "${err.message}"`);
    }
  }

  // CLEANUP TEST DATA
  console.log('\n[CLEANUP] Cleaning up test records...');
  await prisma.reservation.delete({ where: { id: dummyReservation.id } });
  await prisma.messageThread.delete({ where: { id: dummyThread.id } });
  await prisma.user.delete({ where: { id: guestWithHistory.id } });
  await prisma.user.delete({ where: { id: guestWithMsg.id } });

  console.log('\n====================================================');
  console.log(' ALL USER DELETION TESTS COMPLETED SUCCESSFULLY!');
  console.log('====================================================\n');

  await prisma.$disconnect();
}

runUserDeletionTests().catch(err => {
  console.error('[USER DELETION TEST FATAL ERROR]', err);
  process.exit(1);
});
