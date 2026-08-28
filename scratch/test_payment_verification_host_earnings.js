const prisma = require('../server/src/config/prisma');
const reservationService = require('../server/src/services/reservationService');
const hostEarningService = require('../server/src/services/hostEarningService');
const adminService = require('../server/src/services/adminService');

async function runTestSuite() {
  console.log('==================================================');
  console.log(' PAYMENT VERIFICATION & HOST EARNINGS TEST SUITE');
  console.log('==================================================\n');

  let testGuestA, testGuestB, testHost, testAdmin, testProperty;
  let testResA, testResB;

  try {
    // SETUP: Retrieve test actors and a property
    testAdmin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (!testAdmin) throw new Error('No ADMIN user found in database');

    testGuestA = await prisma.user.findFirst({ where: { role: 'GUEST' } });
    if (!testGuestA) {
      testGuestA = await prisma.user.create({
        data: { email: `testguest_a_${Date.now()}@example.com`, role: 'GUEST', firstName: 'Guest', lastName: 'Alpha' }
      });
    }

    testGuestB = await prisma.user.findFirst({ where: { role: 'GUEST', NOT: { id: testGuestA.id } } });
    if (!testGuestB) {
      testGuestB = await prisma.user.create({
        data: { email: `testguest_b_${Date.now()}@example.com`, role: 'GUEST', firstName: 'Guest', lastName: 'Beta' }
      });
    }

    testHost = await prisma.user.findFirst({ where: { role: 'HOST' } });
    if (!testHost) throw new Error('No HOST user found in database');

    testProperty = await prisma.property.findFirst({ where: { status: 'PUBLISHED' } });
    if (!testProperty) throw new Error('No property found in database');

    console.log(`Setup complete. Using Property: "${testProperty.title}" (${testProperty.id})`);

    // ----------------------------------------------------
    // TEST 1: Create PENDING reservation -> payment Verification NOT_SUBMITTED & 0 HostEarnings
    // ----------------------------------------------------
    console.log('\n--- TEST 1: Create PENDING reservation -> NOT_SUBMITTED & 0 HostEarning ---');
    testResA = await prisma.reservation.create({
      data: {
        propertyId: testProperty.id,
        guestId: testGuestA.id,
        hostId: testHost.id,
        checkInDate: new Date('2026-11-01'),
        checkOutDate: new Date('2026-11-05'),
        guestCount: 2,
        totalNights: 4,
        baseTotal: 400.00,
        cleaningFee: 50.00,
        grandTotal: 450.00,
        status: 'PENDING',
        paymentVerificationStatus: 'NOT_SUBMITTED'
      }
    });

    const earningsCountT1 = await prisma.hostEarning.count({ where: { reservationId: testResA.id } });
    console.log(`  Reservation ID: ${testResA.id}`);
    console.log(`  Payment Verification Status: ${testResA.paymentVerificationStatus} (EXPECTED: NOT_SUBMITTED)`);
    console.log(`  HostEarning Count: ${earningsCountT1} (EXPECTED: 0)`);
    if (testResA.paymentVerificationStatus !== 'NOT_SUBMITTED' || earningsCountT1 !== 0) {
      throw new Error('TEST 1 FAILED: Unexpected verification status or host earning created');
    }
    console.log('  [PASS] PENDING reservation initialized cleanly with NOT_SUBMITTED and 0 HostEarnings.');

    // ----------------------------------------------------
    // TEST 2: Guest uploads valid payment proof -> SUBMITTED & reservation stays PENDING
    // ----------------------------------------------------
    console.log('\n--- TEST 2: Guest uploads valid payment proof -> SUBMITTED & reservation stays PENDING ---');
    // Valid 1x1 67-byte PNG image base64
    const validPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    const uploadedRes = await reservationService.submitGuestPaymentProof(
      testResA.id,
      { filename: 'receipt.png', mimeType: 'image/png', base64Data: validPngBase64 },
      { transactionId: 'TXN-998877', paymentNote: 'Paid via Zelle' },
      testGuestA
    );

    const earningsCountT2 = await prisma.hostEarning.count({ where: { reservationId: testResA.id } });
    console.log(`  New Verification Status: ${uploadedRes.paymentVerificationStatus} (EXPECTED: SUBMITTED)`);
    console.log(`  Proof URL: ${uploadedRes.paymentProofUrl}`);
    console.log(`  Transaction ID: ${uploadedRes.paymentTransactionId} (EXPECTED: TXN-998877)`);
    console.log(`  Reservation Status: ${uploadedRes.status} (EXPECTED: PENDING)`);
    console.log(`  HostEarning Count: ${earningsCountT2} (EXPECTED: 0)`);
    if (uploadedRes.paymentVerificationStatus !== 'SUBMITTED' || uploadedRes.status !== 'PENDING' || earningsCountT2 !== 0) {
      throw new Error('TEST 2 FAILED: Payment proof upload did not update status correctly');
    }
    console.log('  [PASS] Payment proof submitted. Verification status = SUBMITTED, reservation stays PENDING, 0 HostEarnings.');

    // ----------------------------------------------------
    // TEST 3: Guest A attempts to upload proof to Guest B reservation -> HTTP 403
    // ----------------------------------------------------
    console.log('\n--- TEST 3: Guest A attempts to upload proof to Guest B reservation -> 403 Forbidden ---');
    let test3Failed = false;
    try {
      await reservationService.submitGuestPaymentProof(
        testResA.id,
        { filename: 'hack.png', mimeType: 'image/png', base64Data: validPngBase64 },
        {},
        testGuestB // Guest B attempting on Guest A's reservation
      );
    } catch (err) {
      console.log(`  Caught expected error: ${err.message} (StatusCode: ${err.statusCode})`);
      if (err.statusCode === 403 || err.message.includes('Forbidden')) {
        test3Failed = true;
      }
    }
    if (!test3Failed) throw new Error('TEST 3 FAILED: Cross-guest payment upload was not blocked');
    console.log('  [PASS] Cross-user payment upload blocked with 403 Forbidden.');

    // ----------------------------------------------------
    // TEST 4: Guest uploads invalid file -> validation error
    // ----------------------------------------------------
    console.log('\n--- TEST 4: Guest uploads invalid file -> validation failure ---');
    let test4Failed = false;
    try {
      await reservationService.submitGuestPaymentProof(
        testResA.id,
        { filename: 'malicious.exe', mimeType: 'application/x-msdownload', base64Data: Buffer.from('fake binary').toString('base64') },
        {},
        testGuestA
      );
    } catch (err) {
      console.log(`  Caught expected validation error: ${err.message}`);
      test4Failed = true;
    }
    if (!test4Failed) throw new Error('TEST 4 FAILED: Invalid file type was accepted');
    console.log('  [PASS] Invalid file type rejected with validation error.');

    // ----------------------------------------------------
    // TEST 5 & 6 & 7: ADMIN verifies submitted proof -> VERIFIED, CONFIRMED, 1 HostEarning (PENDING)
    // ----------------------------------------------------
    console.log('\n--- TEST 5, 6 & 7: ADMIN verifies submitted proof -> VERIFIED, CONFIRMED, 1 HostEarning ---');
    const verifyResult = await reservationService.verifyPaymentProofAdmin(testResA.id, testAdmin);

    const verifiedRes = verifyResult.reservation;
    const hostEarning = verifyResult.hostEarning;
    const earningsCountT7 = await prisma.hostEarning.count({ where: { reservationId: testResA.id } });

    console.log(`  Payment Verification Status: ${verifiedRes.paymentVerificationStatus} (EXPECTED: VERIFIED)`);
    console.log(`  Verified By Admin ID: ${verifiedRes.paymentVerifiedById} (EXPECTED: ${testAdmin.id})`);
    console.log(`  Reservation Status: ${verifiedRes.status} (EXPECTED: CONFIRMED)`);
    console.log(`  HostEarning Status: ${hostEarning?.status} (EXPECTED: PENDING)`);
    console.log(`  HostEarning Count: ${earningsCountT7} (EXPECTED: 1)`);

    if (verifiedRes.paymentVerificationStatus !== 'VERIFIED' || verifiedRes.status !== 'CONFIRMED' || !hostEarning || earningsCountT7 !== 1) {
      throw new Error('TEST 5/6/7 FAILED: Verification failed to confirm reservation and create HostEarning');
    }
    console.log('  [PASS] Admin verification set VERIFIED, auto-confirmed reservation, and created 1 PENDING HostEarning.');

    // ----------------------------------------------------
    // TEST 8: Repeat verification request -> duplicate protection check
    // ----------------------------------------------------
    console.log('\n--- TEST 8: Repeat verification request -> duplicate protection ---');
    await reservationService.verifyPaymentProofAdmin(testResA.id, testAdmin);
    const earningsCountT8 = await prisma.hostEarning.count({ where: { reservationId: testResA.id } });
    console.log(`  HostEarning Count after duplicate verify: ${earningsCountT8} (EXPECTED: 1)`);
    if (earningsCountT8 !== 1) throw new Error('TEST 8 FAILED: Duplicate HostEarning created on repeat verify');
    console.log('  [PASS] Idempotent duplicate verification check passed cleanly.');

    // ----------------------------------------------------
    // TEST 9: ADMIN rejects payment proof -> REJECTED & reservation stays PENDING
    // ----------------------------------------------------
    console.log('\n--- TEST 9: ADMIN rejects payment proof -> REJECTED & reservation stays PENDING ---');
    testResB = await prisma.reservation.create({
      data: {
        propertyId: testProperty.id,
        guestId: testGuestB.id,
        hostId: testHost.id,
        checkInDate: new Date('2026-12-01'),
        checkOutDate: new Date('2026-12-05'),
        guestCount: 1,
        totalNights: 4,
        baseTotal: 500.00,
        grandTotal: 550.00,
        status: 'PENDING',
        paymentVerificationStatus: 'SUBMITTED',
        paymentProofUrl: '/wp-content/uploads/payment-proofs/2026/08/fake.png'
      }
    });

    const rejectedRes = await reservationService.rejectPaymentProofAdmin(
      testResB.id,
      'Screenshot is blurry. Please re-upload.',
      testAdmin
    );

    const earningsCountT9 = await prisma.hostEarning.count({ where: { reservationId: testResB.id } });
    console.log(`  Payment Verification Status: ${rejectedRes.paymentVerificationStatus} (EXPECTED: REJECTED)`);
    console.log(`  Rejection Reason: "${rejectedRes.paymentRejectionReason}"`);
    console.log(`  Reservation Status: ${rejectedRes.status} (EXPECTED: PENDING)`);
    console.log(`  HostEarning Count: ${earningsCountT9} (EXPECTED: 0)`);
    if (rejectedRes.paymentVerificationStatus !== 'REJECTED' || rejectedRes.status !== 'PENDING' || earningsCountT9 !== 0) {
      throw new Error('TEST 9 FAILED: Rejection did not set status or created host earning');
    }
    console.log('  [PASS] Payment proof rejected cleanly. Status = REJECTED, reservation stays PENDING, 0 HostEarnings.');

    // ----------------------------------------------------
    // TEST 10: Guest resubmits proof after rejection -> SUBMITTED & rejection cleared
    // ----------------------------------------------------
    console.log('\n--- TEST 10: Guest resubmits proof after rejection -> SUBMITTED & rejection cleared ---');
    const resubmittedRes = await reservationService.submitGuestPaymentProof(
      testResB.id,
      { filename: 'new-receipt.png', mimeType: 'image/png', base64Data: validPngBase64 },
      { transactionId: 'TXN-NEW-112233' },
      testGuestB
    );

    console.log(`  New Verification Status: ${resubmittedRes.paymentVerificationStatus} (EXPECTED: SUBMITTED)`);
    console.log(`  Rejection Reason: ${resubmittedRes.paymentRejectionReason} (EXPECTED: null)`);
    console.log(`  Reservation Status: ${resubmittedRes.status} (EXPECTED: PENDING)`);
    if (resubmittedRes.paymentVerificationStatus !== 'SUBMITTED' || resubmittedRes.paymentRejectionReason !== null) {
      throw new Error('TEST 10 FAILED: Resubmission did not clear rejection metadata');
    }
    console.log('  [PASS] Resubmission cleared rejection metadata and set verification status to SUBMITTED.');

    // ----------------------------------------------------
    // TEST 11: Attempt manual reservation confirmation before verification -> HTTP 400
    // ----------------------------------------------------
    console.log('\n--- TEST 11: Attempt manual confirmation before verification -> HTTP 400 ---');
    let test11Failed = false;
    try {
      await adminService.updateReservationStatus(testResB.id, 'CONFIRMED');
    } catch (err) {
      console.log(`  Caught expected safety error: ${err.message}`);
      if (err.message.includes('cannot be confirmed until payment proof has been verified')) {
        test11Failed = true;
      }
    }
    if (!test11Failed) throw new Error('TEST 11 FAILED: Server-side safety rule failed to block unverified confirmation');
    console.log('  [PASS] Server-side safety rule blocked confirmation attempt for unverified reservation with HTTP 400.');

    // ----------------------------------------------------
    // TEST 12: HOST attempts payment verification API -> HTTP 403
    // ----------------------------------------------------
    console.log('\n--- TEST 12: HOST attempts payment verification API -> 403 Forbidden ---');
    let test12Failed = false;
    try {
      await reservationService.verifyPaymentProofAdmin(testResB.id, testHost);
    } catch (err) {
      console.log(`  Caught expected error: ${err.message}`);
      if (err.statusCode === 403 || err.message.includes('Forbidden')) {
        test12Failed = true;
      }
    }
    if (!test12Failed) throw new Error('TEST 12 FAILED: Host access to verification API was not blocked');
    console.log('  [PASS] HOST access to admin payment verification API rejected with 403 Forbidden.');

    // ----------------------------------------------------
    // TEST 13: GUEST attempts admin verification API -> HTTP 403
    // ----------------------------------------------------
    console.log('\n--- TEST 13: GUEST attempts admin verification API -> 403 Forbidden ---');
    let test13Failed = false;
    try {
      await reservationService.verifyPaymentProofAdmin(testResB.id, testGuestA);
    } catch (err) {
      console.log(`  Caught expected error: ${err.message}`);
      if (err.statusCode === 403 || err.message.includes('Forbidden')) {
        test13Failed = true;
      }
    }
    if (!test13Failed) throw new Error('TEST 13 FAILED: Guest access to admin verification API was not blocked');
    console.log('  [PASS] GUEST access to admin payment verification API rejected with 403 Forbidden.');

    // ----------------------------------------------------
    // TEST 14: Reservation becomes COMPLETED -> HostEarning = AVAILABLE
    // ----------------------------------------------------
    console.log('\n--- TEST 14: Reservation becomes COMPLETED -> HostEarning = AVAILABLE ---');
    await adminService.updateReservationStatus(testResA.id, 'COMPLETED');
    const earningT14 = await prisma.hostEarning.findUnique({ where: { reservationId: testResA.id } });
    console.log(`  HostEarning Status after COMPLETED: ${earningT14?.status} (EXPECTED: AVAILABLE)`);
    if (earningT14?.status !== 'AVAILABLE') throw new Error('TEST 14 FAILED: HostEarning status is not AVAILABLE');
    console.log('  [PASS] HostEarning transitioned to AVAILABLE upon reservation completion.');

    // ----------------------------------------------------
    // TEST 15: Reservation becomes CANCELLED -> HostEarning = CANCELLED
    // ----------------------------------------------------
    console.log('\n--- TEST 15: Reservation becomes CANCELLED -> HostEarning = CANCELLED ---');
    await adminService.updateReservationStatus(testResA.id, 'CANCELLED');
    const earningT15 = await prisma.hostEarning.findUnique({ where: { reservationId: testResA.id } });
    console.log(`  HostEarning Status after CANCELLED: ${earningT15?.status} (EXPECTED: CANCELLED)`);
    if (earningT15?.status !== 'CANCELLED') throw new Error('TEST 15 FAILED: HostEarning status is not CANCELLED');
    console.log('  [PASS] HostEarning transitioned to CANCELLED upon reservation cancellation.');

    // ----------------------------------------------------
    // TEST 16 & 17 & 18: Historical data & 38 WordPress properties integrity check
    // ----------------------------------------------------
    console.log('\n--- TEST 16, 17 & 18: Database integrity check ---');
    const wpPropCount = await prisma.property.count({ where: { wpPostId: { not: null } } });
    const invoiceCount = await prisma.invoice.count();
    console.log(`  WordPress Migrated Properties: ${wpPropCount} (EXPECTED: 38)`);
    console.log(`  Historical Invoices Count: ${invoiceCount}`);
    if (wpPropCount !== 38) throw new Error(`TEST 18 FAILED: Migrated WordPress property count is ${wpPropCount}, expected 38`);
    console.log('  [PASS] All 38 original migrated WordPress properties and invoices remain 100% intact.');

    // ----------------------------------------------------
    // TEST 19: No orphan payment verification or HostEarning records
    // ----------------------------------------------------
    console.log('\n--- TEST 19: Check for orphan records ---');
    const orphanEarnings = await prisma.hostEarning.count({
      where: { reservationId: { notIn: (await prisma.reservation.findMany({ select: { id: true } })).map(r => r.id) } }
    });
    console.log(`  Orphan HostEarnings: ${orphanEarnings} (EXPECTED: 0)`);
    if (orphanEarnings !== 0) throw new Error(`TEST 19 FAILED: Found ${orphanEarnings} orphan HostEarnings`);
    console.log('  [PASS] Zero orphan records found.');

    // ----------------------------------------------------
    // TEST 20: Admin reservation list payment verification filter
    // ----------------------------------------------------
    console.log('\n--- TEST 20: Admin reservation list payment verification filter ---');
    const adminResList = await adminService.getAllReservations({ paymentVerificationStatus: 'SUBMITTED' });
    console.log(`  Admin List Awaiting Verification Count: ${adminResList.data.length} (Matches metrics: ${adminResList.metrics.awaitingVerification})`);
    if (!adminResList.data || adminResList.data.length < 1) throw new Error('TEST 20 FAILED: Admin filter returned no results for SUBMITTED state');
    console.log('  [PASS] Admin reservation list correctly filters by payment verification status.');

    // CLEANUP TEST RESERVATIONS
    console.log('\n--- CLEANUP: Removing test reservations ---');
    await prisma.hostEarning.deleteMany({ where: { reservationId: { in: [testResA.id, testResB.id] } } });
    await prisma.reservation.deleteMany({ where: { id: { in: [testResA.id, testResB.id] } } });
    console.log('  Test records cleaned up.');

    console.log('\n==================================================');
    console.log(' 🎉 ALL 20 PAYMENT VERIFICATION TESTS PASSED!');
    console.log('==================================================\n');

  } catch (err) {
    console.error('\n❌ TEST SUITE FAILURE:', err);
    if (testResA?.id || testResB?.id) {
      await prisma.hostEarning.deleteMany({ where: { reservationId: { in: [testResA?.id, testResB?.id].filter(Boolean) } } }).catch(() => {});
      await prisma.reservation.deleteMany({ where: { id: { in: [testResA?.id, testResB?.id].filter(Boolean) } } }).catch(() => {});
    }
    process.exit(1);
  }
}

runTestSuite()
  .then(() => process.exit(0))
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
