require('dotenv').config();
const prisma = require('../server/src/config/prisma');
const paymentService = require('../server/src/services/paymentService');
const reservationService = require('../server/src/services/reservationService');
const adminService = require('../server/src/services/adminService');

async function runTestSuite() {
  console.log('====================================================');
  console.log(' UNIFIED PAYMENT VERIFICATION WORKFLOW TEST SUITE');
  console.log('====================================================\n');

  let allPassed = true;

  // Fetch test property & guest/admin users
  const property = await prisma.property.findFirst();
  const guest = await prisma.user.findFirst({ where: { role: 'GUEST' } }) || await prisma.user.findFirst();
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } }) || guest;

  if (!property || !guest) {
    console.error('Test pre-requisites missing (Property or Guest missing in DB)');
    process.exit(1);
  }

  const createdReservationIds = [];

  try {
    // ----------------------------------------------------
    // TEST 1: Stripe Payment Webhook Success
    // ----------------------------------------------------
    console.log('--- TEST 1: Stripe Payment Success Workflow ---');
    const resStripe = await prisma.reservation.create({
      data: {
        propertyId: property.id,
        guestId: guest.id,
        hostId: property.hostId,
        checkInDate: new Date('2026-10-01'),
        checkOutDate: new Date('2026-10-05'),
        guestCount: 2,
        totalNights: 4,
        baseTotal: 400.00,
        cleaningFee: 50.00,
        cityFee: 10.00,
        taxesTotal: 46.00,
        securityDeposit: 100.00,
        grandTotal: 606.00,
        upfrontPaid: 0.00,
        balanceDue: 606.00,
        status: 'PENDING_PAYMENT'
      }
    });
    createdReservationIds.push(resStripe.id);

    await paymentService.handlePaymentWebhook({
      gateway: 'STRIPE',
      transactionId: `STRIPE_TX_TEST_${resStripe.id.slice(0, 8)}`,
      reservationId: resStripe.id,
      status: 'COMPLETED'
    });

    const stripeResUpdated = await prisma.reservation.findUnique({
      where: { id: resStripe.id },
      include: { payments: true, hostEarning: true }
    });

    if (
      stripeResUpdated.status === 'PENDING_PAYMENT' &&
      stripeResUpdated.paymentVerificationStatus === 'SUBMITTED' &&
      stripeResUpdated.payments[0]?.status === 'COMPLETED' &&
      stripeResUpdated.hostEarning === null
    ) {
      console.log('  [PASS] Stripe webhook set Reservation=PENDING_PAYMENT, Verification=SUBMITTED, Payment=COMPLETED, HostEarning=NULL');
    } else {
      console.error('  [FAIL] Stripe webhook state mismatch:', stripeResUpdated);
      allPassed = false;
    }

    // ----------------------------------------------------
    // TEST 2: Stripe Admin Approval
    // ----------------------------------------------------
    console.log('\n--- TEST 2: Stripe Admin Approval ---');
    await reservationService.verifyPaymentProofAdmin(resStripe.id, admin);

    const stripeResApproved = await prisma.reservation.findUnique({
      where: { id: resStripe.id },
      include: { hostEarning: true }
    });

    if (
      stripeResApproved.status === 'CONFIRMED' &&
      stripeResApproved.paymentVerificationStatus === 'VERIFIED' &&
      stripeResApproved.hostEarning !== null
    ) {
      console.log('  [PASS] Admin approval set Reservation=CONFIRMED, Verification=VERIFIED, HostEarning=CREATED');
    } else {
      console.error('  [FAIL] Stripe Admin approval mismatch:', stripeResApproved);
      allPassed = false;
    }

    // ----------------------------------------------------
    // TEST 3: PayPal Order Capture Success
    // ----------------------------------------------------
    console.log('\n--- TEST 3: PayPal Capture Success Workflow ---');
    const paypalOrderResult = await paymentService.createPayPalOrder({
      propertyId: property.id,
      guestId: guest.id,
      checkInDate: '2026-10-10',
      checkOutDate: '2026-10-14',
      guestCount: 2
    });
    createdReservationIds.push(paypalOrderResult.reservationId);

    await paymentService.capturePayPalOrder({
      orderId: paypalOrderResult.orderId,
      reservationId: paypalOrderResult.reservationId,
      userId: guest.id
    });

    const paypalResCaptured = await prisma.reservation.findUnique({
      where: { id: paypalOrderResult.reservationId },
      include: { payments: true, hostEarning: true }
    });

    if (
      paypalResCaptured.status === 'PENDING_PAYMENT' &&
      paypalResCaptured.paymentVerificationStatus === 'SUBMITTED' &&
      paypalResCaptured.payments[0]?.status === 'COMPLETED' &&
      paypalResCaptured.hostEarning === null
    ) {
      console.log('  [PASS] PayPal capture set Reservation=PENDING_PAYMENT, Verification=SUBMITTED, Payment=COMPLETED, HostEarning=NULL');
    } else {
      console.error('  [FAIL] PayPal capture state mismatch:', paypalResCaptured);
      allPassed = false;
    }

    // ----------------------------------------------------
    // TEST 4: PayPal Admin Approval
    // ----------------------------------------------------
    console.log('\n--- TEST 4: PayPal Admin Approval ---');
    await reservationService.verifyPaymentProofAdmin(paypalOrderResult.reservationId, admin);

    const paypalResApproved = await prisma.reservation.findUnique({
      where: { id: paypalOrderResult.reservationId },
      include: { hostEarning: true }
    });

    if (
      paypalResApproved.status === 'CONFIRMED' &&
      paypalResApproved.paymentVerificationStatus === 'VERIFIED' &&
      paypalResApproved.hostEarning !== null
    ) {
      console.log('  [PASS] PayPal Admin approval set Reservation=CONFIRMED, Verification=VERIFIED, HostEarning=CREATED');
    } else {
      console.error('  [FAIL] PayPal Admin approval mismatch:', paypalResApproved);
      allPassed = false;
    }

    // ----------------------------------------------------
    // TEST 5 & 6: Pay Later Workflow & Approval
    // ----------------------------------------------------
    console.log('\n--- TEST 5 & 6: Pay Later Workflow & Approval ---');
    const payLaterResult = await paymentService.createPayLaterReservation({
      propertyId: property.id,
      guestId: guest.id,
      checkInDate: '2026-10-20',
      checkOutDate: '2026-10-24',
      guestCount: 2
    });
    createdReservationIds.push(payLaterResult.reservationId);

    const payLaterInitial = await prisma.reservation.findUnique({
      where: { id: payLaterResult.reservationId },
      include: { hostEarning: true }
    });

    if (
      payLaterInitial.status === 'PENDING_PAYMENT' &&
      payLaterInitial.paymentVerificationStatus === 'NOT_SUBMITTED' &&
      payLaterInitial.hostEarning === null
    ) {
      console.log('  [PASS] Pay Later initial state = PENDING_PAYMENT, NOT_SUBMITTED, HostEarning=NULL');
    } else {
      console.error('  [FAIL] Pay Later initial mismatch:', payLaterInitial);
      allPassed = false;
    }

    await reservationService.verifyPaymentProofAdmin(payLaterResult.reservationId, admin);

    const payLaterApproved = await prisma.reservation.findUnique({
      where: { id: payLaterResult.reservationId },
      include: { hostEarning: true }
    });

    if (
      payLaterApproved.status === 'CONFIRMED' &&
      payLaterApproved.paymentVerificationStatus === 'VERIFIED' &&
      payLaterApproved.hostEarning !== null
    ) {
      console.log('  [PASS] Pay Later Admin approval set Reservation=CONFIRMED, Verification=VERIFIED, HostEarning=CREATED');
    } else {
      console.error('  [FAIL] Pay Later approval mismatch:', payLaterApproved);
      allPassed = false;
    }

    // ----------------------------------------------------
    // TEST 7: Duplicate Webhook Idempotency
    // ----------------------------------------------------
    console.log('\n--- TEST 7: Duplicate Webhook Idempotency ---');
    const dupRes = await prisma.reservation.create({
      data: {
        propertyId: property.id,
        guestId: guest.id,
        hostId: property.hostId,
        checkInDate: new Date('2026-11-01'),
        checkOutDate: new Date('2026-11-05'),
        guestCount: 2,
        totalNights: 4,
        baseTotal: 400.00,
        grandTotal: 500.00,
        status: 'PENDING_PAYMENT'
      }
    });
    createdReservationIds.push(dupRes.id);

    await paymentService.handlePaymentWebhook({ gateway: 'STRIPE', transactionId: 'TX_DUP_1', reservationId: dupRes.id, status: 'COMPLETED' });
    await paymentService.handlePaymentWebhook({ gateway: 'STRIPE', transactionId: 'TX_DUP_1', reservationId: dupRes.id, status: 'COMPLETED' });

    const dupResCheck = await prisma.reservation.findUnique({ where: { id: dupRes.id }, include: { hostEarning: true } });
    if (dupResCheck.hostEarning === null && dupResCheck.status === 'PENDING_PAYMENT') {
      console.log('  [PASS] Duplicate webhook handled safely without duplicate earnings or unexpected confirmation');
    } else {
      console.error('  [FAIL] Duplicate webhook mismatch:', dupResCheck);
      allPassed = false;
    }

    // ----------------------------------------------------
    // TEST 8: Duplicate Admin Approval Idempotency
    // ----------------------------------------------------
    console.log('\n--- TEST 8: Duplicate Admin Approval Idempotency ---');
    await reservationService.verifyPaymentProofAdmin(dupRes.id, admin);
    await reservationService.verifyPaymentProofAdmin(dupRes.id, admin);

    const dupEarningsCount = await prisma.hostEarning.count({ where: { reservationId: dupRes.id } });
    if (dupEarningsCount === 1) {
      console.log('  [PASS] Duplicate Admin approval created exactly 1 HostEarning record');
    } else {
      console.error(`  [FAIL] Expected 1 HostEarning record, got ${dupEarningsCount}`);
      allPassed = false;
    }

    // ----------------------------------------------------
    // TEST 9: Admin Rejection
    // ----------------------------------------------------
    console.log('\n--- TEST 9: Admin Rejection Workflow ---');
    const rejRes = await prisma.reservation.create({
      data: {
        propertyId: property.id,
        guestId: guest.id,
        hostId: property.hostId,
        checkInDate: new Date('2026-11-10'),
        checkOutDate: new Date('2026-11-15'),
        guestCount: 2,
        totalNights: 5,
        baseTotal: 500.00,
        grandTotal: 600.00,
        status: 'PENDING_PAYMENT'
      }
    });
    createdReservationIds.push(rejRes.id);

    await reservationService.rejectPaymentProofAdmin(rejRes.id, 'Unreadable proof image', admin);

    const rejResCheck = await prisma.reservation.findUnique({ where: { id: rejRes.id }, include: { hostEarning: true } });
    if (
      rejResCheck.paymentVerificationStatus === 'REJECTED' &&
      rejResCheck.status !== 'CONFIRMED' &&
      rejResCheck.hostEarning === null
    ) {
      console.log('  [PASS] Admin rejection set Verification=REJECTED, status=PENDING_PAYMENT, HostEarning=NULL');
    } else {
      console.error('  [FAIL] Admin rejection mismatch:', rejResCheck);
      allPassed = false;
    }

    // ----------------------------------------------------
    // TEST 10 & 11: Pay Later Expiration vs Paid Stripe/PayPal Safety
    // ----------------------------------------------------
    console.log('\n--- TEST 10 & 11: Expiration Safety ---');
    const pastDate = new Date(Date.now() - 3600 * 1000); // 1 hour ago

    // Unpaid Pay Later reservation past due
    const unpaidPayLater = await prisma.reservation.create({
      data: {
        propertyId: property.id,
        guestId: guest.id,
        hostId: property.hostId,
        checkInDate: new Date('2026-12-01'),
        checkOutDate: new Date('2026-12-05'),
        guestCount: 2,
        totalNights: 4,
        baseTotal: 400.00,
        grandTotal: 500.00,
        status: 'PENDING_PAYMENT',
        paymentVerificationStatus: 'NOT_SUBMITTED',
        paymentDueAt: pastDate
      }
    });
    createdReservationIds.push(unpaidPayLater.id);

    // Paid Stripe reservation awaiting verification (paymentVerificationStatus: SUBMITTED)
    const paidStripePendingVerif = await prisma.reservation.create({
      data: {
        propertyId: property.id,
        guestId: guest.id,
        hostId: property.hostId,
        checkInDate: new Date('2026-12-10'),
        checkOutDate: new Date('2026-12-15'),
        guestCount: 2,
        totalNights: 5,
        baseTotal: 500.00,
        grandTotal: 600.00,
        status: 'PENDING_PAYMENT',
        paymentVerificationStatus: 'SUBMITTED',
        paymentDueAt: pastDate
      }
    });
    createdReservationIds.push(paidStripePendingVerif.id);

    // Execute expiration
    await reservationService.expireOverdueReservations();

    const unpaidCheck = await prisma.reservation.findUnique({ where: { id: unpaidPayLater.id } });
    const paidCheck = await prisma.reservation.findUnique({ where: { id: paidStripePendingVerif.id } });

    if (unpaidCheck.status === 'CANCELLED') {
      console.log('  [PASS] Test 10: Unpaid Pay Later reservation auto-expired to CANCELLED');
    } else {
      console.error('  [FAIL] Test 10: Unpaid Pay Later failed to expire:', unpaidCheck);
      allPassed = false;
    }

    if (paidCheck.status === 'PENDING_PAYMENT') {
      console.log('  [PASS] Test 11: Paid Stripe/PayPal reservation in SUBMITTED state was NOT expired');
    } else {
      console.error('  [FAIL] Test 11: Paid Stripe/PayPal reservation was incorrectly expired:', paidCheck);
      allPassed = false;
    }

  } catch (err) {
    console.error('[SUITE ERROR]', err);
    allPassed = false;
  } finally {
    // Clean up test reservations
    console.log('\n[CLEANUP] Cleaning up test reservations from database...');
    for (const id of createdReservationIds) {
      try {
        await prisma.hostEarning.deleteMany({ where: { reservationId: id } });
        await prisma.invoice.deleteMany({ where: { reservationId: id } });
        await prisma.payment.deleteMany({ where: { reservationId: id } });
        await prisma.reservation.delete({ where: { id } });
      } catch (e) {
        // Ignore deletion errors
      }
    }
    console.log('[CLEANUP COMPLETE] Database restored.');

    console.log(`\n====================================================`);
    console.log(` FINAL TEST SUITE RESULT: ${allPassed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
    console.log(`====================================================`);
    if (!allPassed) process.exit(1);
  }
}

runTestSuite();
