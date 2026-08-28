require('dotenv').config();
const prisma = require('../server/src/config/prisma');
const paymentService = require('../server/src/services/paymentService');
const reservationService = require('../server/src/services/reservationService');
const invoiceService = require('../server/src/services/invoiceService');

async function runInvoiceStateTests() {
  console.log('====================================================');
  console.log(' AUTOMATED INVOICE STATE TRANSITION TEST SUITE');
  console.log('====================================================\n');

  let allPassed = true;
  const createdReservationIds = [];

  const property = await prisma.property.findFirst();
  const guest = await prisma.user.findFirst({ where: { role: 'GUEST' } }) || await prisma.user.findFirst();
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } }) || guest;

  if (!property || !guest) {
    console.error('Test pre-requisites missing (Property or Guest missing in DB)');
    process.exit(1);
  }

  try {
    // ----------------------------------------------------
    // TEST 1: PayPal Payment Capture Invoice State
    // ----------------------------------------------------
    console.log('--- TEST 1: PayPal Capture Invoice State ---');
    const paypalOrder = await paymentService.createPayPalOrder({
      propertyId: property.id,
      guestId: guest.id,
      checkInDate: '2029-01-01',
      checkOutDate: '2029-01-05',
      guestCount: 2
    });
    createdReservationIds.push(paypalOrder.reservationId);

    await paymentService.capturePayPalOrder({
      orderId: paypalOrder.orderId,
      reservationId: paypalOrder.reservationId,
      userId: guest.id
    });

    const paypalRes = await prisma.reservation.findUnique({
      where: { id: paypalOrder.reservationId },
      include: { payments: true, invoices: true, hostEarning: true }
    });

    const paypalInvoice = paypalRes.invoices[0];

    if (
      paypalRes.status === 'PENDING_PAYMENT' &&
      paypalRes.paymentVerificationStatus === 'SUBMITTED' &&
      paypalRes.payments[0]?.status === 'COMPLETED' &&
      paypalInvoice && paypalInvoice.paymentStatus === 0 && // 0 = PENDING
      paypalRes.hostEarning === null
    ) {
      console.log('  [PASS] Test 1: PayPal capture set Reservation=PENDING_PAYMENT, Verification=SUBMITTED, Payment=COMPLETED, Invoice=PENDING (0), HostEarning=NULL');
    } else {
      console.error('  [FAIL] Test 1 invoice state mismatch:', {
        resStatus: paypalRes.status,
        verification: paypalRes.paymentVerificationStatus,
        paymentStatus: paypalRes.payments[0]?.status,
        invoiceStatus: paypalInvoice ? paypalInvoice.paymentStatus : 'MISSING',
        hostEarning: paypalRes.hostEarning
      });
      allPassed = false;
    }

    // ----------------------------------------------------
    // TEST 2: Duplicate PayPal Capture Idempotency
    // ----------------------------------------------------
    console.log('\n--- TEST 2: Duplicate PayPal Capture Invoice Idempotency ---');
    await paymentService.capturePayPalOrder({
      orderId: paypalOrder.orderId,
      reservationId: paypalOrder.reservationId,
      userId: guest.id
    });

    const dupPaypalRes = await prisma.reservation.findUnique({
      where: { id: paypalOrder.reservationId },
      include: { invoices: true, hostEarning: true }
    });
    const dupPaypalInvoice = dupPaypalRes.invoices[0];

    if (
      dupPaypalRes.status === 'PENDING_PAYMENT' &&
      dupPaypalInvoice && dupPaypalInvoice.paymentStatus === 0 &&
      dupPaypalRes.hostEarning === null
    ) {
      console.log('  [PASS] Test 2: Duplicate PayPal capture left Invoice=PENDING (0), Reservation=PENDING_PAYMENT, HostEarning=NULL');
    } else {
      console.error('  [FAIL] Test 2 duplicate mismatch:', dupPaypalInvoice);
      allPassed = false;
    }

    // ----------------------------------------------------
    // TEST 3: Stripe Payment Success Invoice State
    // ----------------------------------------------------
    console.log('\n--- TEST 3: Stripe Payment Success Invoice State ---');
    const resStripe = await prisma.reservation.create({
      data: {
        propertyId: property.id,
        guestId: guest.id,
        hostId: property.hostId,
        checkInDate: new Date('2029-02-01'),
        checkOutDate: new Date('2029-02-05'),
        guestCount: 2,
        totalNights: 4,
        baseTotal: 400.00,
        grandTotal: 500.00,
        status: 'PENDING_PAYMENT'
      }
    });
    createdReservationIds.push(resStripe.id);
    await invoiceService.createReservationInvoice(resStripe.id, guest.id, 500.00);

    await paymentService.handlePaymentWebhook({
      gateway: 'STRIPE',
      transactionId: `STRIPE_TX_TEST_${resStripe.id.slice(0, 8)}`,
      reservationId: resStripe.id,
      status: 'COMPLETED'
    });

    const stripeRes = await prisma.reservation.findUnique({
      where: { id: resStripe.id },
      include: { payments: true, invoices: true, hostEarning: true }
    });
    const stripeInvoice = stripeRes.invoices[0];

    if (
      stripeRes.status === 'PENDING_PAYMENT' &&
      stripeRes.paymentVerificationStatus === 'SUBMITTED' &&
      stripeRes.payments[0]?.status === 'COMPLETED' &&
      stripeInvoice && stripeInvoice.paymentStatus === 0 &&
      stripeRes.hostEarning === null
    ) {
      console.log('  [PASS] Test 3: Stripe webhook set Reservation=PENDING_PAYMENT, Verification=SUBMITTED, Payment=COMPLETED, Invoice=PENDING (0), HostEarning=NULL');
    } else {
      console.error('  [FAIL] Test 3 stripe mismatch:', stripeInvoice);
      allPassed = false;
    }

    // ----------------------------------------------------
    // TEST 4: Pay Later Initial Booking Invoice State
    // ----------------------------------------------------
    console.log('\n--- TEST 4: Pay Later Initial Booking Invoice State ---');
    const payLater = await paymentService.createPayLaterReservation({
      propertyId: property.id,
      guestId: guest.id,
      checkInDate: '2029-03-01',
      checkOutDate: '2029-03-05',
      guestCount: 2
    });
    createdReservationIds.push(payLater.reservationId);

    const plInitialRes = await prisma.reservation.findUnique({
      where: { id: payLater.reservationId },
      include: { payments: true, invoices: true, hostEarning: true }
    });
    const plInitialInvoice = plInitialRes.invoices[0];

    if (
      plInitialRes.status === 'PENDING_PAYMENT' &&
      plInitialRes.paymentVerificationStatus === 'NOT_SUBMITTED' &&
      plInitialRes.payments[0]?.status === 'PENDING' &&
      plInitialInvoice && plInitialInvoice.paymentStatus === 0 &&
      plInitialRes.hostEarning === null
    ) {
      console.log('  [PASS] Test 4: Pay Later initial state = PENDING_PAYMENT, NOT_SUBMITTED, Payment=PENDING, Invoice=PENDING (0), HostEarning=NULL');
    } else {
      console.error('  [FAIL] Test 4 pay later initial mismatch:', plInitialInvoice);
      allPassed = false;
    }

    // ----------------------------------------------------
    // TEST 5: Pay Later Proof Submission Invoice State
    // ----------------------------------------------------
    console.log('\n--- TEST 5: Pay Later Proof Submission Invoice State ---');
    const dummyWebpBase64 = 'UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAQAcJaQAA3AA/v38gAA=';
    await reservationService.submitGuestPaymentProof(
      payLater.reservationId,
      { filename: 'receipt.webp', mimeType: 'image/webp', base64Data: dummyWebpBase64 },
      { transactionId: 'TX_PL_TEST', paymentNote: 'Receipt note' },
      guest
    );

    const plProofRes = await prisma.reservation.findUnique({
      where: { id: payLater.reservationId },
      include: { invoices: true }
    });
    const plProofInvoice = plProofRes.invoices[0];

    if (
      plProofRes.status === 'PENDING_PAYMENT' &&
      plProofRes.paymentVerificationStatus === 'SUBMITTED' &&
      plProofInvoice && plProofInvoice.paymentStatus === 0
    ) {
      console.log('  [PASS] Test 5: Pay Later proof submitted set Verification=SUBMITTED, Invoice=PENDING (0)');
    } else {
      console.error('  [FAIL] Test 5 pay later proof mismatch:', plProofInvoice);
      allPassed = false;
    }

    // ----------------------------------------------------
    // TEST 6: Admin Approval After PayPal -> Invoice = PAID
    // ----------------------------------------------------
    console.log('\n--- TEST 6: Admin Approval After PayPal (Invoice = PAID) ---');
    await reservationService.verifyPaymentProofAdmin(paypalOrder.reservationId, admin);

    const paypalApproveRes = await prisma.reservation.findUnique({
      where: { id: paypalOrder.reservationId },
      include: { payments: true, invoices: true, hostEarning: true }
    });
    const paypalApprovedInvoice = paypalApproveRes.invoices[0];

    if (
      paypalApproveRes.status === 'CONFIRMED' &&
      paypalApproveRes.paymentVerificationStatus === 'VERIFIED' &&
      paypalApproveRes.payments[0]?.status === 'COMPLETED' &&
      paypalApprovedInvoice && paypalApprovedInvoice.paymentStatus === 1 && // 1 = PAID
      paypalApproveRes.hostEarning !== null
    ) {
      console.log('  [PASS] Test 6: Admin approval set Reservation=CONFIRMED, Verification=VERIFIED, Payment=COMPLETED, Invoice=PAID (1), HostEarning=CREATED');
    } else {
      console.error('  [FAIL] Test 6 paypal approval mismatch:', paypalApprovedInvoice);
      allPassed = false;
    }

    // ----------------------------------------------------
    // TEST 7: Admin Approval After Stripe -> Invoice = PAID
    // ----------------------------------------------------
    console.log('\n--- TEST 7: Admin Approval After Stripe (Invoice = PAID) ---');
    await reservationService.verifyPaymentProofAdmin(resStripe.id, admin);

    const stripeApproveRes = await prisma.reservation.findUnique({
      where: { id: resStripe.id },
      include: { payments: true, invoices: true, hostEarning: true }
    });
    const stripeApprovedInvoice = stripeApproveRes.invoices[0];

    if (
      stripeApproveRes.status === 'CONFIRMED' &&
      stripeApproveRes.paymentVerificationStatus === 'VERIFIED' &&
      stripeApprovedInvoice && stripeApprovedInvoice.paymentStatus === 1 &&
      stripeApproveRes.hostEarning !== null
    ) {
      console.log('  [PASS] Test 7: Admin approval set Reservation=CONFIRMED, Verification=VERIFIED, Payment=COMPLETED, Invoice=PAID (1), HostEarning=CREATED');
    } else {
      console.error('  [FAIL] Test 7 stripe approval mismatch:', stripeApprovedInvoice);
      allPassed = false;
    }

    // ----------------------------------------------------
    // TEST 8: Admin Approval After Pay Later -> Invoice = PAID
    // ----------------------------------------------------
    console.log('\n--- TEST 8: Admin Approval After Pay Later (Invoice = PAID) ---');
    await reservationService.verifyPaymentProofAdmin(payLater.reservationId, admin);

    const plApproveRes = await prisma.reservation.findUnique({
      where: { id: payLater.reservationId },
      include: { payments: true, invoices: true, hostEarning: true }
    });
    const plApprovedInvoice = plApproveRes.invoices[0];

    if (
      plApproveRes.status === 'CONFIRMED' &&
      plApproveRes.paymentVerificationStatus === 'VERIFIED' &&
      plApprovedInvoice && plApprovedInvoice.paymentStatus === 1 &&
      plApproveRes.hostEarning !== null
    ) {
      console.log('  [PASS] Test 8: Admin approval set Reservation=CONFIRMED, Verification=VERIFIED, Payment=COMPLETED, Invoice=PAID (1), HostEarning=CREATED');
    } else {
      console.error('  [FAIL] Test 8 pay later approval mismatch:', plApprovedInvoice);
      allPassed = false;
    }

    // ----------------------------------------------------
    // TEST 9: Duplicate Admin Approval Idempotency
    // ----------------------------------------------------
    console.log('\n--- TEST 9: Duplicate Admin Approval Idempotency ---');
    await reservationService.verifyPaymentProofAdmin(paypalOrder.reservationId, admin);

    const dupApproveRes = await prisma.reservation.findUnique({
      where: { id: paypalOrder.reservationId },
      include: { invoices: true }
    });
    const dupApprovedInvoice = dupApproveRes.invoices[0];
    const earningsCount = await prisma.hostEarning.count({ where: { reservationId: paypalOrder.reservationId } });

    if (
      dupApproveRes.status === 'CONFIRMED' &&
      dupApprovedInvoice && dupApprovedInvoice.paymentStatus === 1 &&
      earningsCount === 1
    ) {
      console.log('  [PASS] Test 9: Duplicate Admin approval left Invoice=PAID (1), Reservation=CONFIRMED, HostEarning count=1');
    } else {
      console.error('  [FAIL] Test 9 duplicate approval mismatch:', { invoice: dupApprovedInvoice, earningsCount });
      allPassed = false;
    }

  } catch (err) {
    console.error('[SUITE ERROR]', err);
    allPassed = false;
  } finally {
    console.log('\n[CLEANUP] Cleaning up test reservations from database...');
    for (const id of createdReservationIds) {
      try {
        await prisma.hostEarning.deleteMany({ where: { reservationId: id } });
        await prisma.invoice.deleteMany({ where: { reservationId: id } });
        await prisma.payment.deleteMany({ where: { reservationId: id } });
        await prisma.reservation.delete({ where: { id } });
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    console.log('[CLEANUP COMPLETE] Database restored.');

    console.log(`\n====================================================`);
    console.log(` FINAL TEST SUITE RESULT: ${allPassed ? 'ALL 9 TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
    console.log(`====================================================`);
    if (!allPassed) process.exit(1);
  }
}

runInvoiceStateTests();
