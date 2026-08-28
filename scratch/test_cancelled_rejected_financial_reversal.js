const prisma = require('../server/src/config/prisma');
const adminService = require('../server/src/services/adminService');
const reservationService = require('../server/src/services/reservationService');
const invoiceService = require('../server/src/services/invoiceService');

async function runTests() {
  console.log('====================================================');
  console.log(' AUTOMATED CANCELLED + REJECTED REVERSAL TEST SUITE');
  console.log('====================================================\n');

  let testHost, testGuest, testProperty;
  const createdReservationIds = [];

  try {
    // Setup test host, guest, property
    testHost = await prisma.user.create({
      data: {
        email: `test_reversal_host_${Date.now()}@pocono.test`,
        firstName: 'RevHost',
        lastName: 'Test',
        role: 'HOST',
        passwordHash: '$2b$10$dummyhashfordashtest'
      }
    });

    testGuest = await prisma.user.create({
      data: {
        email: `test_reversal_guest_${Date.now()}@pocono.test`,
        firstName: 'RevGuest',
        lastName: 'Test',
        role: 'GUEST',
        passwordHash: '$2b$10$dummyhashfordashtest'
      }
    });

    testProperty = await prisma.property.create({
      data: {
        hostId: testHost.id,
        title: 'Reversal Test Property',
        slug: `reversal-test-${Date.now()}`,
        status: 'PUBLISHED',
        nightlyPrice: 200.00
      }
    });

    const adminUser = { id: testHost.id, role: 'ADMIN' };

    // Baseline stats
    const initialStats = await adminService.getAdminStats();
    const initialRevenue = Number(initialStats.totalRevenue);
    const initialInvoicesCount = Number(initialStats.totalInvoices);

    console.log(`[BASELINE] Initial Revenue: $${initialRevenue.toFixed(2)}, Paid Invoices Count: ${initialInvoicesCount}\n`);

    // --- TEST 1: Normal approval (CONFIRMED + VERIFIED) ---
    console.log('--- TEST 1: Normal approval (CONFIRMED + VERIFIED) ---');
    const res1 = await prisma.reservation.create({
      data: {
        propertyId: testProperty.id,
        guestId: testGuest.id,
        hostId: testHost.id,
        checkInDate: new Date('2027-05-01'),
        checkOutDate: new Date('2027-05-03'),
        totalNights: 2,
        guestCount: 2,
        baseTotal: 400,
        cleaningFee: 50,
        cityFee: 20,
        serviceFee: 30,
        extraPricesTotal: 0,
        taxesTotal: 0,
        grandTotal: 500,
        status: 'PENDING_PAYMENT',
        paymentVerificationStatus: 'SUBMITTED'
      }
    });
    createdReservationIds.push(res1.id);
    await invoiceService.createReservationInvoice(res1.id, testGuest.id, 500);

    // Full approval
    await reservationService.verifyPaymentProofAdmin(res1.id, adminUser);

    let stats = await adminService.getAdminStats();
    const approvedRevenue = initialRevenue + 500;
    const approvedInvoices = initialInvoicesCount + 1;

    const checkRes1 = await prisma.reservation.findUnique({
      where: { id: res1.id },
      include: { invoices: true, hostEarning: true }
    });

    if (
      checkRes1.status === 'CONFIRMED' &&
      checkRes1.paymentVerificationStatus === 'VERIFIED' &&
      checkRes1.invoices[0].paymentStatus === 1 && // 1 = PAID
      checkRes1.hostEarning && checkRes1.hostEarning.status === 'PENDING' &&
      Number(stats.totalRevenue) === approvedRevenue &&
      Number(stats.totalInvoices) === approvedInvoices
    ) {
      console.log('  [PASS] Test 1: Full approval set CONFIRMED+VERIFIED, Invoice=PAID (1), HostEarning=PENDING, Revenue includes $500');
    } else {
      throw new Error(`Test 1 FAILED: Approval state mismatch! Got revenue $${stats.totalRevenue}`);
    }

    // --- TEST 2: CONFIRMED -> CANCELLED while still VERIFIED ---
    console.log('\n--- TEST 2: CONFIRMED -> CANCELLED while still VERIFIED ---');
    await adminService.updateReservationStatus(res1.id, 'CANCELLED');

    stats = await adminService.getAdminStats();
    const checkRes2 = await prisma.reservation.findUnique({
      where: { id: res1.id },
      include: { invoices: true, hostEarning: true }
    });

    if (
      checkRes2.status === 'CANCELLED' &&
      checkRes2.paymentVerificationStatus === 'VERIFIED' &&
      checkRes2.invoices[0].paymentStatus === 1 && // Remains PAID
      checkRes2.hostEarning && checkRes2.hostEarning.status === 'PENDING' && // Preserved
      Number(stats.totalRevenue) === approvedRevenue &&
      Number(stats.totalInvoices) === approvedInvoices
    ) {
      console.log('  [PASS] Test 2: CANCELLED + VERIFIED kept Invoice=PAID (1), HostEarning preserved, Revenue included');
    } else {
      throw new Error(`Test 2 FAILED: Financial records altered prematurely on CANCELLED+VERIFIED!`);
    }

    // --- TEST 3: Then VERIFIED -> REJECTED (Triggers Reversal) ---
    console.log('\n--- TEST 3: VERIFIED -> REJECTED while CANCELLED triggers Financial Reversal ---');
    await adminService.updatePaymentVerificationStatusAdmin(res1.id, 'REJECTED', adminUser);

    stats = await adminService.getAdminStats();
    const checkRes3 = await prisma.reservation.findUnique({
      where: { id: res1.id },
      include: { invoices: true, hostEarning: true }
    });

    if (
      checkRes3.status === 'CANCELLED' &&
      checkRes3.paymentVerificationStatus === 'REJECTED' &&
      checkRes3.invoices[0].paymentStatus === 2 && // 2 = FAILED / REVERSED
      checkRes3.hostEarning && checkRes3.hostEarning.status === 'CANCELLED' &&
      Number(stats.totalRevenue) === initialRevenue && // Excluded $500
      Number(stats.totalInvoices) === initialInvoicesCount // Excluded 1 invoice
    ) {
      console.log(`  [PASS] Test 3: CANCELLED + REJECTED set Invoice=FAILED (2), HostEarning=CANCELLED, Revenue reduced to $${initialRevenue.toFixed(2)}, Invoices count=${initialInvoicesCount}`);
    } else {
      throw new Error(`Test 3 FAILED: Reversal mismatch! Invoice paymentStatus=${checkRes3.invoices[0].paymentStatus}, Revenue=$${stats.totalRevenue}`);
    }

    // --- TEST 4: Reverse Order (VERIFIED -> REJECTED first, then CONFIRMED -> CANCELLED) ---
    console.log('\n--- TEST 4: Reverse order (REJECTED first while CONFIRMED, then CANCELLED) ---');
    const res4 = await prisma.reservation.create({
      data: {
        propertyId: testProperty.id,
        guestId: testGuest.id,
        hostId: testHost.id,
        checkInDate: new Date('2027-06-01'),
        checkOutDate: new Date('2027-06-03'),
        totalNights: 2,
        guestCount: 2,
        baseTotal: 600,
        cleaningFee: 50,
        cityFee: 20,
        serviceFee: 30,
        extraPricesTotal: 0,
        taxesTotal: 0,
        grandTotal: 700,
        status: 'PENDING_PAYMENT',
        paymentVerificationStatus: 'SUBMITTED'
      }
    });
    createdReservationIds.push(res4.id);
    await invoiceService.createReservationInvoice(res4.id, testGuest.id, 700);

    // Approve res4
    await reservationService.verifyPaymentProofAdmin(res4.id, adminUser);

    // Step A: VERIFIED -> REJECTED while CONFIRMED
    await adminService.updatePaymentVerificationStatusAdmin(res4.id, 'REJECTED', adminUser);

    let stats4 = await adminService.getAdminStats();
    const checkRes4A = await prisma.reservation.findUnique({
      where: { id: res4.id },
      include: { invoices: true, hostEarning: true }
    });

    if (
      checkRes4A.status === 'CONFIRMED' &&
      checkRes4A.paymentVerificationStatus === 'REJECTED' &&
      checkRes4A.invoices[0].paymentStatus === 1 && // Invoice remains PAID while CONFIRMED
      checkRes4A.hostEarning && checkRes4A.hostEarning.status === 'PENDING'
    ) {
      console.log('  [PASS] Test 4 Step A: CONFIRMED + REJECTED preserved Invoice=PAID (1) until cancelled');
    } else {
      throw new Error(`Test 4 Step A FAILED: Invoice altered prematurely on CONFIRMED+REJECTED!`);
    }

    // Step B: CONFIRMED -> CANCELLED (Triggers Reversal)
    await adminService.updateReservationStatus(res4.id, 'CANCELLED');

    stats4 = await adminService.getAdminStats();
    const checkRes4B = await prisma.reservation.findUnique({
      where: { id: res4.id },
      include: { invoices: true, hostEarning: true }
    });

    if (
      checkRes4B.status === 'CANCELLED' &&
      checkRes4B.paymentVerificationStatus === 'REJECTED' &&
      checkRes4B.invoices[0].paymentStatus === 2 && // 2 = FAILED / REVERSED
      checkRes4B.hostEarning && checkRes4B.hostEarning.status === 'CANCELLED' &&
      Number(stats4.totalRevenue) === initialRevenue &&
      Number(stats4.totalInvoices) === initialInvoicesCount
    ) {
      console.log('  [PASS] Test 4 Step B: Order-independent reversal succeeded! Result matches Test 3 100%');
    } else {
      throw new Error(`Test 4 Step B FAILED: Reversal failed in reverse order!`);
    }

    // --- TEST 5: Duplicate CANCELLED + REJECTED Idempotency ---
    console.log('\n--- TEST 5: Duplicate CANCELLED + REJECTED idempotency ---');
    await adminService.updateReservationStatus(res4.id, 'CANCELLED');
    await adminService.updatePaymentVerificationStatusAdmin(res4.id, 'REJECTED', adminUser);

    const stats5 = await adminService.getAdminStats();
    if (Number(stats5.totalRevenue) === initialRevenue && Number(stats5.totalInvoices) === initialInvoicesCount) {
      console.log('  [PASS] Test 5: Duplicate save on CANCELLED+REJECTED executed 0 extra subtractions (100% idempotent)');
    } else {
      throw new Error(`Test 5 FAILED: Duplicate save altered revenue!`);
    }

    // --- TEST 6: Manual REJECTED on unpaid PENDING_PAYMENT reservation ---
    console.log('\n--- TEST 6: Manual REJECTED on unpaid PENDING_PAYMENT reservation ---');
    const res6 = await prisma.reservation.create({
      data: {
        propertyId: testProperty.id,
        guestId: testGuest.id,
        hostId: testHost.id,
        checkInDate: new Date('2027-07-01'),
        checkOutDate: new Date('2027-07-03'),
        totalNights: 2,
        guestCount: 2,
        baseTotal: 300,
        cleaningFee: 50,
        cityFee: 20,
        serviceFee: 30,
        extraPricesTotal: 0,
        taxesTotal: 0,
        grandTotal: 400,
        status: 'PENDING_PAYMENT',
        paymentVerificationStatus: 'NOT_SUBMITTED'
      }
    });
    createdReservationIds.push(res6.id);
    await invoiceService.createReservationInvoice(res6.id, testGuest.id, 400);

    await adminService.updatePaymentVerificationStatusAdmin(res6.id, 'REJECTED', adminUser);

    const stats6 = await adminService.getAdminStats();
    if (Number(stats6.totalRevenue) === initialRevenue && Number(stats6.totalInvoices) === initialInvoicesCount) {
      console.log('  [PASS] Test 6: Manual REJECTED on unpaid reservation left revenue and paid invoice count unchanged');
    } else {
      throw new Error(`Test 6 FAILED: Unpaid reservation rejection altered revenue!`);
    }

    // --- TEST 7: CANCELLED + VERIFIED does NOT reverse financial records ---
    console.log('\n--- TEST 7: CANCELLED + VERIFIED does NOT reverse financial records ---');
    const res7 = await prisma.reservation.create({
      data: {
        propertyId: testProperty.id,
        guestId: testGuest.id,
        hostId: testHost.id,
        checkInDate: new Date('2027-08-01'),
        checkOutDate: new Date('2027-08-03'),
        totalNights: 2,
        guestCount: 2,
        baseTotal: 300,
        cleaningFee: 50,
        cityFee: 20,
        serviceFee: 30,
        extraPricesTotal: 0,
        taxesTotal: 0,
        grandTotal: 400,
        status: 'PENDING_PAYMENT',
        paymentVerificationStatus: 'SUBMITTED'
      }
    });
    createdReservationIds.push(res7.id);
    await invoiceService.createReservationInvoice(res7.id, testGuest.id, 400);

    // Approve res7
    await reservationService.verifyPaymentProofAdmin(res7.id, adminUser);
    // Cancel res7 but keep VERIFIED
    await adminService.updateReservationStatus(res7.id, 'CANCELLED');

    const stats7 = await adminService.getAdminStats();
    const expectedRevenue7 = initialRevenue + 400;
    const expectedInvoices7 = initialInvoicesCount + 1;

    if (Number(stats7.totalRevenue) === expectedRevenue7 && Number(stats7.totalInvoices) === expectedInvoices7) {
      console.log('  [PASS] Test 7: CANCELLED + VERIFIED preserved Invoice=PAID (1) and revenue');
    } else {
      throw new Error(`Test 7 FAILED: CANCELLED+VERIFIED altered revenue!`);
    }

    // --- TEST 8: Separate paid reservation remains unaffected ---
    console.log('\n--- TEST 8: Separate paid reservation remains unaffected by res1/res4 reversal ---');
    const checkRes7 = await prisma.reservation.findUnique({
      where: { id: res7.id },
      include: { invoices: true, hostEarning: true }
    });

    if (
      checkRes7.invoices[0].paymentStatus === 1 &&
      checkRes7.hostEarning && checkRes7.hostEarning.status === 'PENDING'
    ) {
      console.log('  [PASS] Test 8: Unrelated paid reservation #res7 remained 100% intact');
    } else {
      throw new Error(`Test 8 FAILED: Unrelated paid reservation was altered!`);
    }

    // --- TEST 9: Dashboard metrics match DB aggregates strictly ---
    console.log('\n--- TEST 9: Dashboard metrics match DB aggregates strictly ---');
    const dbRevenueAgg = await prisma.invoice.aggregate({
      _sum: { totalAmount: true },
      where: { paymentStatus: 1 }
    });
    const dbInvoiceCount = await prisma.invoice.count({ where: { paymentStatus: 1 } });

    const stats9 = await adminService.getAdminStats();
    if (
      Number(stats9.totalRevenue) === Number(dbRevenueAgg._sum.totalAmount || 0) &&
      Number(stats9.totalInvoices) === dbInvoiceCount
    ) {
      console.log('  [PASS] Test 9: getAdminStats() matches DB SUM(totalAmount WHERE paymentStatus=1) and COUNT() 100%');
    } else {
      throw new Error(`Test 9 FAILED: Dashboard metrics mismatched DB query!`);
    }

    // --- TEST 10: Persistence across database re-query ---
    console.log('\n--- TEST 10: Persistence across database re-query ---');
    const freshStats = await adminService.getAdminStats();
    if (Number(freshStats.totalRevenue) === expectedRevenue7 && Number(freshStats.totalInvoices) === expectedInvoices7) {
      console.log('  [PASS] Test 10: Database state is 100% persistent across queries');
    } else {
      throw new Error(`Test 10 FAILED: Re-query state mismatched!`);
    }

  } catch (err) {
    console.error('\n❌ TEST SUITE FAILURE:', err.message);
    process.exitCode = 1;
  } finally {
    // CLEANUP
    console.log('\n[CLEANUP] Cleaning up test data from database...');
    for (const resId of createdReservationIds) {
      await prisma.hostEarning.deleteMany({ where: { reservationId: resId } }).catch(() => {});
      await prisma.invoice.deleteMany({ where: { reservationId: resId } }).catch(() => {});
      await prisma.payment.deleteMany({ where: { reservationId: resId } }).catch(() => {});
      await prisma.reservation.delete({ where: { id: resId } }).catch(() => {});
    }

    if (testProperty) await prisma.property.delete({ where: { id: testProperty.id } }).catch(() => {});
    if (testGuest) await prisma.user.delete({ where: { id: testGuest.id } }).catch(() => {});
    if (testHost) await prisma.user.delete({ where: { id: testHost.id } }).catch(() => {});

    console.log('[CLEANUP COMPLETE] Database restored.\n');
    console.log('====================================================');
    if (!process.exitCode) {
      console.log(' FINAL TEST SUITE RESULT: ALL 10 TESTS PASSED ✅');
    } else {
      console.log(' FINAL TEST SUITE RESULT: TEST SUITE FAILED ❌');
    }
    console.log('====================================================');
  }
}

runTests();
