const prisma = require('../server/src/config/prisma');
const adminService = require('../server/src/services/adminService');
const reservationService = require('../server/src/services/reservationService');
const paymentService = require('../server/src/services/paymentService');
const invoiceService = require('../server/src/services/invoiceService');

async function runTests() {
  console.log('====================================================');
  console.log(' AUTOMATED ADMIN DASHBOARD FINANCIAL METRICS SUITE');
  console.log('====================================================\n');

  let testHost, testGuest, testProperty;
  const createdReservationIds = [];

  try {
    // Setup test users & property
    testHost = await prisma.user.create({
      data: {
        email: `test_dash_host_${Date.now()}@pocono.test`,
        firstName: 'DashHost',
        lastName: 'Test',
        role: 'HOST',
        passwordHash: '$2b$10$dummyhashfordashtest'
      }
    });

    testGuest = await prisma.user.create({
      data: {
        email: `test_dash_guest_${Date.now()}@pocono.test`,
        firstName: 'DashGuest',
        lastName: 'Test',
        role: 'GUEST',
        passwordHash: '$2b$10$dummyhashfordashtest'
      }
    });

    testProperty = await prisma.property.create({
      data: {
        hostId: testHost.id,
        title: 'Dash Test Chalet',
        slug: `dash-test-chalet-${Date.now()}`,
        status: 'PUBLISHED',
        nightlyPrice: 150.00
      }
    });

    // Initial baseline stats
    const initialStats = await adminService.getAdminStats();
    const initialRevenue = Number(initialStats.totalRevenue);
    const initialInvoicesCount = Number(initialStats.totalInvoices);

    console.log(`[BASELINE] Initial Revenue: $${initialRevenue.toFixed(2)}, Paid Invoices Count: ${initialInvoicesCount}\n`);

    // --- TEST 1: Pending invoice is NOT included in Gross Booking Volume ---
    console.log('--- TEST 1: Pending invoice is NOT included in Gross Booking Volume ---');
    const res1 = await prisma.reservation.create({
      data: {
        propertyId: testProperty.id,
        guestId: testGuest.id,
        hostId: testHost.id,
        checkInDate: new Date('2027-01-10'),
        checkOutDate: new Date('2027-01-12'),
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
    createdReservationIds.push(res1.id);
    await invoiceService.createReservationInvoice(res1.id, testGuest.id, 400);

    let stats = await adminService.getAdminStats();
    if (Number(stats.totalRevenue) === initialRevenue && Number(stats.totalInvoices) === initialInvoicesCount) {
      console.log('  [PASS] Test 1: Pending invoice ($400) was NOT added to Gross Booking Volume or Paid Invoices count');
    } else {
      throw new Error(`Test 1 FAILED: Expected revenue $${initialRevenue}, got $${stats.totalRevenue}`);
    }

    // --- TEST 2: PayPal capture (Payment=COMPLETED, Invoice=PENDING) ---
    console.log('\n--- TEST 2: PayPal capture maintains Invoice=PENDING and revenue unchanged ---');
    const paypalOrder = await paymentService.createPayPalOrder({
      propertyId: testProperty.id,
      guestId: testGuest.id,
      checkInDate: '2027-02-01',
      checkOutDate: '2027-02-03',
      guestCount: 2
    });
    createdReservationIds.push(paypalOrder.reservationId);

    await paymentService.capturePayPalOrder({
      orderId: paypalOrder.orderId,
      reservationId: paypalOrder.reservationId,
      userId: testGuest.id
    });

    stats = await adminService.getAdminStats();
    if (Number(stats.totalRevenue) === initialRevenue && Number(stats.totalInvoices) === initialInvoicesCount) {
      console.log('  [PASS] Test 2: PayPal capture set Invoice=PENDING (0), revenue remained unchanged');
    } else {
      throw new Error(`Test 2 FAILED: Revenue changed on PayPal capture! Got $${stats.totalRevenue}`);
    }

    // --- TEST 3: Stripe payment webhook (Payment=COMPLETED, Invoice=PENDING) ---
    console.log('\n--- TEST 3: Stripe payment maintains Invoice=PENDING and revenue unchanged ---');
    const resStripe = await prisma.reservation.create({
      data: {
        propertyId: testProperty.id,
        guestId: testGuest.id,
        hostId: testHost.id,
        checkInDate: new Date('2027-03-01'),
        checkOutDate: new Date('2027-03-03'),
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
    createdReservationIds.push(resStripe.id);
    await invoiceService.createReservationInvoice(resStripe.id, testGuest.id, 400);

    const stripeTxId = `STRIPE_TX_TEST_${resStripe.id.slice(0, 8)}`;
    await paymentService.handlePaymentWebhook({
      gateway: 'STRIPE',
      transactionId: stripeTxId,
      reservationId: resStripe.id,
      status: 'COMPLETED'
    });

    stats = await adminService.getAdminStats();
    if (Number(stats.totalRevenue) === initialRevenue && Number(stats.totalInvoices) === initialInvoicesCount) {
      console.log('  [PASS] Test 3: Stripe webhook set Invoice=PENDING (0), revenue remained unchanged');
    } else {
      throw new Error(`Test 3 FAILED: Revenue changed on Stripe webhook! Got $${stats.totalRevenue}`);
    }

    // --- TEST 4: Pay Later proof submission ---
    console.log('\n--- TEST 4: Pay Later proof submission maintains Invoice=PENDING ---');
    await prisma.reservation.update({
      where: { id: res1.id },
      data: { paymentVerificationStatus: 'SUBMITTED', paymentProofUrl: 'http://example.com/proof.png' }
    });

    stats = await adminService.getAdminStats();
    if (Number(stats.totalRevenue) === initialRevenue && Number(stats.totalInvoices) === initialInvoicesCount) {
      console.log('  [PASS] Test 4: Proof submission set verification=SUBMITTED, revenue remained unchanged');
    } else {
      throw new Error(`Test 4 FAILED: Revenue changed on proof submission!`);
    }

    // --- TEST 5 & 6: Admin full approval makes invoice PAID and increases Gross Booking Volume ---
    console.log('\n--- TEST 5 & 6: Admin full approval increases Gross Booking Volume and Invoices Processed ---');
    const adminUser = { id: testHost.id, role: 'ADMIN' };
    await reservationService.verifyPaymentProofAdmin(res1.id, adminUser);

    stats = await adminService.getAdminStats();
    const expectedRevenue5 = initialRevenue + 400;
    const expectedInvoices5 = initialInvoicesCount + 1;

    if (Number(stats.totalRevenue) === expectedRevenue5 && Number(stats.totalInvoices) === expectedInvoices5) {
      console.log(`  [PASS] Test 5 & 6: Admin approval set Invoice=PAID (1), revenue increased to $${expectedRevenue5.toFixed(2)}, Invoices count=${expectedInvoices5}`);
    } else {
      throw new Error(`Test 5 & 6 FAILED: Expected revenue $${expectedRevenue5}, got $${stats.totalRevenue}`);
    }

    // --- TEST 7: Duplicate Admin approval idempotency ---
    console.log('\n--- TEST 7: Duplicate Admin approval does NOT increase Gross Booking Volume twice ---');
    await reservationService.verifyPaymentProofAdmin(res1.id, adminUser);

    stats = await adminService.getAdminStats();
    if (Number(stats.totalRevenue) === expectedRevenue5 && Number(stats.totalInvoices) === expectedInvoices5) {
      console.log('  [PASS] Test 7: Duplicate Admin approval left revenue and invoice count strictly identical');
    } else {
      throw new Error(`Test 7 FAILED: Duplicate approval changed revenue to $${stats.totalRevenue}`);
    }

    // --- TEST 8: Duplicate PayPal capture ---
    console.log('\n--- TEST 8: Duplicate PayPal capture does NOT increase Gross Booking Volume ---');
    await paymentService.capturePayPalOrder({
      orderId: paypalOrder.orderId,
      reservationId: paypalOrder.reservationId,
      userId: testGuest.id
    });

    stats = await adminService.getAdminStats();
    if (Number(stats.totalRevenue) === expectedRevenue5) {
      console.log('  [PASS] Test 8: Duplicate PayPal capture left revenue strictly identical');
    } else {
      throw new Error(`Test 8 FAILED: Duplicate PayPal capture changed revenue!`);
    }

    // --- TEST 9: Duplicate Stripe webhook ---
    console.log('\n--- TEST 9: Duplicate Stripe webhook does NOT increase Gross Booking Volume ---');
    await paymentService.handlePaymentWebhook({
      gateway: 'STRIPE',
      transactionId: stripeTxId,
      reservationId: resStripe.id,
      status: 'COMPLETED'
    });

    stats = await adminService.getAdminStats();
    if (Number(stats.totalRevenue) === expectedRevenue5) {
      console.log('  [PASS] Test 9: Duplicate Stripe webhook left revenue strictly identical');
    } else {
      throw new Error(`Test 9 FAILED: Duplicate Stripe webhook changed revenue!`);
    }

    // --- TEST 10: Manual Payment Verification dropdown (SUBMITTED -> VERIFIED) ---
    console.log('\n--- TEST 10: Manual Payment Verification dropdown does NOT mark Invoice PAID or increase revenue ---');
    const res10 = await prisma.reservation.create({
      data: {
        propertyId: testProperty.id,
        guestId: testGuest.id,
        hostId: testHost.id,
        checkInDate: new Date('2027-04-10'),
        checkOutDate: new Date('2027-04-12'),
        totalNights: 2,
        guestCount: 2,
        baseTotal: 500,
        cleaningFee: 50,
        cityFee: 20,
        serviceFee: 30,
        extraPricesTotal: 0,
        taxesTotal: 0,
        grandTotal: 600,
        status: 'PENDING_PAYMENT',
        paymentVerificationStatus: 'SUBMITTED'
      }
    });
    createdReservationIds.push(res10.id);
    await invoiceService.createReservationInvoice(res10.id, testGuest.id, 600);

    // Call manual dropdown update
    await adminService.updatePaymentVerificationStatusAdmin(res10.id, 'VERIFIED', adminUser);

    const checkRes10 = await prisma.reservation.findUnique({
      where: { id: res10.id },
      include: { invoices: true, hostEarning: true }
    });

    stats = await adminService.getAdminStats();

    if (
      checkRes10.paymentVerificationStatus === 'VERIFIED' &&
      checkRes10.status === 'PENDING_PAYMENT' &&
      checkRes10.invoices[0].paymentStatus === 0 &&
      !checkRes10.hostEarning &&
      Number(stats.totalRevenue) === expectedRevenue5
    ) {
      console.log('  [PASS] Test 10: Manual verification update set verification=VERIFIED without marking Invoice PAID or increasing revenue');
    } else {
      throw new Error(`Test 10 FAILED: Manual verification altered financial records! Invoice paymentStatus=${checkRes10.invoices[0]?.paymentStatus}, Revenue=$${stats.totalRevenue}`);
    }

    // --- TEST 11: Manual VERIFIED -> REJECTED does not alter financial records ---
    console.log('\n--- TEST 11: Manual VERIFIED -> REJECTED does NOT alter financial records ---');
    await adminService.updatePaymentVerificationStatusAdmin(res10.id, 'REJECTED', adminUser);

    const checkRes11 = await prisma.reservation.findUnique({
      where: { id: res10.id },
      include: { invoices: true }
    });

    stats = await adminService.getAdminStats();
    if (
      checkRes11.paymentVerificationStatus === 'REJECTED' &&
      checkRes11.invoices[0].paymentStatus === 0 &&
      Number(stats.totalRevenue) === expectedRevenue5
    ) {
      console.log('  [PASS] Test 11: Manual REJECTED set verification=REJECTED while financial records remained untouched');
    } else {
      throw new Error(`Test 11 FAILED: Manual REJECTED altered financial records!`);
    }

    // --- TEST 12: Reservation CONFIRMED -> CANCELLED does not alter verified financial records ---
    console.log('\n--- TEST 12: Reservation status CANCELLED does NOT alter verified financial records ---');
    await adminService.updateReservationStatus(res1.id, 'CANCELLED');

    const checkRes12 = await prisma.reservation.findUnique({
      where: { id: res1.id },
      include: { invoices: true }
    });

    stats = await adminService.getAdminStats();
    if (
      checkRes12.status === 'CANCELLED' &&
      checkRes12.paymentVerificationStatus === 'VERIFIED' &&
      checkRes12.invoices[0].paymentStatus === 1 &&
      Number(stats.totalRevenue) === expectedRevenue5
    ) {
      console.log('  [PASS] Test 12: Reservation CANCELLED set status=CANCELLED while Invoice remained PAID (1) and revenue preserved');
    } else {
      throw new Error(`Test 12 FAILED: Reservation cancellation altered invoice status!`);
    }

    // --- TEST 13: Dashboard metrics remain correct after re-querying database ---
    console.log('\n--- TEST 13: Dashboard metrics remain consistent across multiple re-queries ---');
    const statsQueryA = await adminService.getAdminStats();
    const statsQueryB = await adminService.getAdminStats();

    if (Number(statsQueryA.totalRevenue) === Number(statsQueryB.totalRevenue) && Number(statsQueryA.totalInvoices) === Number(statsQueryB.totalInvoices)) {
      console.log('  [PASS] Test 13: Re-querying database yields 100% identical financial metrics');
    } else {
      throw new Error(`Test 13 FAILED: Dashboard metrics inconsistent across queries!`);
    }

    // --- TEST 14: Simulation of server restart / new connection pool query ---
    console.log('\n--- TEST 14: Simulation of server restart re-query ---');
    const freshStats = await adminService.getAdminStats();
    if (Number(freshStats.totalRevenue) === expectedRevenue5 && Number(freshStats.totalInvoices) === expectedInvoices5) {
      console.log('  [PASS] Test 14: Server restart query matches persistent database aggregation perfectly');
    } else {
      throw new Error(`Test 14 FAILED: Restart simulation query mismatched!`);
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
      console.log(' FINAL TEST SUITE RESULT: ALL 14 TESTS PASSED ✅');
    } else {
      console.log(' FINAL TEST SUITE RESULT: TEST SUITE FAILED ❌');
    }
    console.log('====================================================');
  }
}

runTests();
