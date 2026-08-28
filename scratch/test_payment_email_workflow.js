require('dotenv').config();
const prisma = require('../server/src/config/prisma');
const emailService = require('../server/src/services/emailService');
const paymentService = require('../server/src/services/paymentService');
const reservationService = require('../server/src/services/reservationService');

async function runEmailWorkflowTests() {
  console.log('====================================================');
  console.log(' AUTOMATED PAYMENT EMAIL NOTIFICATION TEST SUITE');
  console.log('====================================================\n');

  let allPassed = true;

  // Spied email calls array
  const emailCalls = [];

  // Intercept nodemailer transport.sendMail
  const transport = emailService.getTransporter();
  const originalSendMail = transport.sendMail;
  transport.sendMail = async function(mailOptions) {
    emailCalls.push({
      to: mailOptions.to,
      subject: mailOptions.subject,
      timestamp: new Date()
    });
    return originalSendMail.call(this, mailOptions);
  };

  const property = await prisma.property.findFirst();
  const guest = await prisma.user.findFirst({ where: { role: 'GUEST' } }) || await prisma.user.findFirst();
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } }) || guest;

  if (!property || !guest) {
    console.error('Test pre-requisites missing (Property or Guest missing in DB)');
    process.exit(1);
  }

  const createdReservationIds = [];

  const getCallsBySubjectSubstring = (substr) => emailCalls.filter(c => c.subject.toLowerCase().includes(substr.toLowerCase()));
  const clearSpyCalls = () => { emailCalls.length = 0; };

  try {
    // ----------------------------------------------------
    // TEST 1: Stripe Payment Success
    // ----------------------------------------------------
    console.log('--- TEST 1: Stripe Payment Success Email Dispatches ---');
    clearSpyCalls();

    const resStripe = await prisma.reservation.create({
      data: {
        propertyId: property.id,
        guestId: guest.id,
        hostId: property.hostId,
        checkInDate: new Date('2028-05-01'),
        checkOutDate: new Date('2028-05-05'),
        guestCount: 2,
        totalNights: 4,
        baseTotal: 400.00,
        grandTotal: 500.00,
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

    // Allow async non-blocking email promises to settle
    await new Promise(r => setTimeout(r, 1000));

    const stripeGuestEmail = getCallsBySubjectSubstring('Payment Received — Awaiting Verification');
    const stripeAdminEmail = getCallsBySubjectSubstring('[ACTION REQUIRED] Online Payment Received');
    const stripeHostConfirmEmail = getCallsBySubjectSubstring('Reservation Confirmed for');
    const stripeHostEarningEmail = getCallsBySubjectSubstring('Host Earning Credited');

    if (
      stripeGuestEmail.length === 1 &&
      stripeAdminEmail.length === 1 &&
      stripeHostConfirmEmail.length === 0 &&
      stripeHostEarningEmail.length === 0
    ) {
      console.log('  [PASS] Test 1: Stripe payment success sent Guest Payment Received (1), Admin Alert (1), Host Confirm (0), Host Earning (0)');
    } else {
      console.error('  [FAIL] Test 1 mismatch:', { guest: stripeGuestEmail.length, admin: stripeAdminEmail.length, host: stripeHostConfirmEmail.length, earning: stripeHostEarningEmail.length });
      console.error('  Captured calls:', emailCalls);
      allPassed = false;
    }

    // ----------------------------------------------------
    // TEST 2: Duplicate Stripe Webhook Idempotency
    // ----------------------------------------------------
    console.log('\n--- TEST 2: Duplicate Stripe Webhook Email Idempotency ---');
    const callsCountBeforeDup = emailCalls.length;

    await paymentService.handlePaymentWebhook({
      gateway: 'STRIPE',
      transactionId: `STRIPE_TX_TEST_${resStripe.id.slice(0, 8)}`,
      reservationId: resStripe.id,
      status: 'COMPLETED'
    });
    await new Promise(r => setTimeout(r, 1000));

    const callsCountAfterDup = emailCalls.length;
    if (callsCountAfterDup === callsCountBeforeDup) {
      console.log('  [PASS] Test 2: Duplicate Stripe webhook sent 0 additional emails (Strictly Idempotent)');
    } else {
      console.error(`  [FAIL] Test 2: Expected ${callsCountBeforeDup} total calls, got ${callsCountAfterDup}`);
      allPassed = false;
    }

    // ----------------------------------------------------
    // TEST 3: PayPal Capture Success
    // ----------------------------------------------------
    console.log('\n--- TEST 3: PayPal Capture Success Email Dispatches ---');
    clearSpyCalls();

    const paypalOrder = await paymentService.createPayPalOrder({
      propertyId: property.id,
      guestId: guest.id,
      checkInDate: '2028-06-01',
      checkOutDate: '2028-06-05',
      guestCount: 2
    });
    createdReservationIds.push(paypalOrder.reservationId);
    await new Promise(r => setTimeout(r, 600)); // allow background creation emails to settle
    clearSpyCalls(); // clear creation emails

    await paymentService.capturePayPalOrder({
      orderId: paypalOrder.orderId,
      reservationId: paypalOrder.reservationId,
      userId: guest.id
    });
    await new Promise(r => setTimeout(r, 1000));

    const paypalGuestEmail = getCallsBySubjectSubstring('Payment Received — Awaiting Verification');
    const paypalAdminEmail = getCallsBySubjectSubstring('[ACTION REQUIRED] Online Payment Received');
    const paypalHostConfirmEmail = getCallsBySubjectSubstring('Reservation Confirmed for');
    const paypalHostEarningEmail = getCallsBySubjectSubstring('Host Earning Credited');

    if (
      paypalGuestEmail.length === 1 &&
      paypalAdminEmail.length === 1 &&
      paypalHostConfirmEmail.length === 0 &&
      paypalHostEarningEmail.length === 0
    ) {
      console.log('  [PASS] Test 3: PayPal capture sent Guest Payment Received (1), Admin Alert (1), Host Confirm (0), Host Earning (0)');
    } else {
      console.error('  [FAIL] Test 3 mismatch:', { guest: paypalGuestEmail.length, admin: paypalAdminEmail.length, host: paypalHostConfirmEmail.length, earning: paypalHostEarningEmail.length });
      allPassed = false;
    }

    // ----------------------------------------------------
    // TEST 4: Duplicate PayPal Capture Idempotency
    // ----------------------------------------------------
    console.log('\n--- TEST 4: Duplicate PayPal Capture Email Idempotency ---');
    const paypalCountBeforeDup = emailCalls.length;

    await paymentService.capturePayPalOrder({
      orderId: paypalOrder.orderId,
      reservationId: paypalOrder.reservationId,
      userId: guest.id
    });
    await new Promise(r => setTimeout(r, 1000));

    if (emailCalls.length === paypalCountBeforeDup) {
      console.log('  [PASS] Test 4: Duplicate PayPal capture sent 0 additional emails (Strictly Idempotent)');
    } else {
      console.error('  [FAIL] Test 4 duplicate emails triggered!');
      allPassed = false;
    }

    // ----------------------------------------------------
    // TEST 5: Pay Later Proof Submission Emails
    // ----------------------------------------------------
    console.log('\n--- TEST 5: Pay Later Proof Submission Emails ---');
    clearSpyCalls();

    const payLater = await paymentService.createPayLaterReservation({
      propertyId: property.id,
      guestId: guest.id,
      checkInDate: '2028-07-01',
      checkOutDate: '2028-07-05',
      guestCount: 2
    });
    createdReservationIds.push(payLater.reservationId);
    await new Promise(r => setTimeout(r, 600)); // allow background creation emails to settle
    clearSpyCalls(); // clear creation emails

    // Create tiny dummy WebP buffer for payment proof submission
    const dummyWebpBase64 = 'UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAQAcJaQAA3AA/v38gAA=';
    await reservationService.submitGuestPaymentProof(
      payLater.reservationId,
      { filename: 'receipt.webp', mimeType: 'image/webp', base64Data: dummyWebpBase64 },
      { transactionId: 'TX_PL_123', paymentNote: 'Test receipt' },
      guest
    );
    await new Promise(r => setTimeout(r, 1000));

    const plGuestProofEmail = getCallsBySubjectSubstring('Payment Proof Received');
    const plAdminProofEmail = getCallsBySubjectSubstring('[ACTION REQUIRED] New Payment Proof Submitted');
    const plOnlineEmail = getCallsBySubjectSubstring('Payment Received — Awaiting Verification');

    if (
      plGuestProofEmail.length === 1 &&
      plAdminProofEmail.length === 1 &&
      plOnlineEmail.length === 0
    ) {
      console.log('  [PASS] Test 5: Pay Later proof submitted sent Proof Received (1), Admin Alert (1), Online Payment Email (0)');
    } else {
      console.error('  [FAIL] Test 5 mismatch:', { guestProof: plGuestProofEmail.length, adminProof: plAdminProofEmail.length, onlineEmail: plOnlineEmail.length });
      allPassed = false;
    }

    // ----------------------------------------------------
    // TEST 6, 7 & 8: Admin Approval Confirmation Emails (Stripe, PayPal, Pay Later)
    // ----------------------------------------------------
    console.log('\n--- TEST 6, 7 & 8: Admin Approval Email Dispatches ---');
    clearSpyCalls();

    await reservationService.verifyPaymentProofAdmin(resStripe.id, admin);
    await new Promise(r => setTimeout(r, 1000));

    const stripeApproveGuest = getCallsBySubjectSubstring('Reservation Confirmed!');
    const stripeApproveHost = getCallsBySubjectSubstring('Reservation Confirmed for');
    const stripeApproveEarning = getCallsBySubjectSubstring('Host Earning Credited');

    if (stripeApproveGuest.length === 1 && stripeApproveHost.length === 1 && stripeApproveEarning.length === 1) {
      console.log('  [PASS] Test 6: Admin approval after Stripe sent Guest Confirmed (1), Host Confirmed (1), Host Earning Credited (1)');
    } else {
      console.error('  [FAIL] Test 6 mismatch:', { guest: stripeApproveGuest.length, host: stripeApproveHost.length, earning: stripeApproveEarning.length });
      allPassed = false;
    }

    clearSpyCalls();
    await reservationService.verifyPaymentProofAdmin(paypalOrder.reservationId, admin);
    await new Promise(r => setTimeout(r, 1000));

    const paypalApproveGuest = getCallsBySubjectSubstring('Reservation Confirmed!');
    const paypalApproveHost = getCallsBySubjectSubstring('Reservation Confirmed for');
    const paypalApproveEarning = getCallsBySubjectSubstring('Host Earning Credited');

    if (paypalApproveGuest.length === 1 && paypalApproveHost.length === 1 && paypalApproveEarning.length === 1) {
      console.log('  [PASS] Test 7: Admin approval after PayPal sent Guest Confirmed (1), Host Confirmed (1), Host Earning Credited (1)');
    } else {
      console.error('  [FAIL] Test 7 mismatch:', { guest: paypalApproveGuest.length, host: paypalApproveHost.length, earning: paypalApproveEarning.length });
      allPassed = false;
    }

    clearSpyCalls();
    await reservationService.verifyPaymentProofAdmin(payLater.reservationId, admin);
    await new Promise(r => setTimeout(r, 1000));

    const plApproveGuest = getCallsBySubjectSubstring('Reservation Confirmed!');
    const plApproveHost = getCallsBySubjectSubstring('Reservation Confirmed for');
    const plApproveEarning = getCallsBySubjectSubstring('Host Earning Credited');

    if (plApproveGuest.length === 1 && plApproveHost.length === 1 && plApproveEarning.length === 1) {
      console.log('  [PASS] Test 8: Admin approval after Pay Later sent Guest Confirmed (1), Host Confirmed (1), Host Earning Credited (1)');
    } else {
      console.error('  [FAIL] Test 8 mismatch:', { guest: plApproveGuest.length, host: plApproveHost.length, earning: plApproveEarning.length });
      allPassed = false;
    }

    // ----------------------------------------------------
    // TEST 9: Duplicate Admin Approval Email Idempotency
    // ----------------------------------------------------
    console.log('\n--- TEST 9: Duplicate Admin Approval Email Idempotency ---');
    clearSpyCalls();

    await reservationService.verifyPaymentProofAdmin(resStripe.id, admin);
    await new Promise(r => setTimeout(r, 1000));

    if (emailCalls.length === 0) {
      console.log('  [PASS] Test 9: Duplicate Admin approval on verified reservation sent 0 additional emails');
    } else {
      console.error(`  [FAIL] Test 9: Sent ${emailCalls.length} unexpected emails on duplicate approval!`, emailCalls);
      allPassed = false;
    }

    // ----------------------------------------------------
    // TEST 10: Admin Rejection Email
    // ----------------------------------------------------
    console.log('\n--- TEST 10: Admin Rejection Email Workflow ---');
    clearSpyCalls();

    const rejRes = await prisma.reservation.create({
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
        status: 'PENDING_PAYMENT'
      }
    });
    createdReservationIds.push(rejRes.id);

    await reservationService.rejectPaymentProofAdmin(rejRes.id, 'Illegible document image', admin);
    await new Promise(r => setTimeout(r, 1000));

    const rejGuestEmail = getCallsBySubjectSubstring('Action Required: Payment Proof Status Update');
    const rejHostEmail = getCallsBySubjectSubstring('Reservation Confirmed');
    const rejEarningEmail = getCallsBySubjectSubstring('Host Earning');

    if (rejGuestEmail.length === 1 && rejHostEmail.length === 0 && rejEarningEmail.length === 0) {
      console.log('  [PASS] Test 10: Admin rejection sent Guest Rejection Email (1), Host Confirm (0), Host Earning (0)');
    } else {
      console.error('  [FAIL] Test 10 mismatch:', { guestRej: rejGuestEmail.length, host: rejHostEmail.length, earning: rejEarningEmail.length });
      allPassed = false;
    }

    // ----------------------------------------------------
    // TEST 11: SMTP Failure Safety
    // ----------------------------------------------------
    console.log('\n--- TEST 11: SMTP Failure Safety ---');
    clearSpyCalls();

    // Mock transport.sendMail to simulate SMTP network exception
    transport.sendMail = async function() {
      console.log('  [SMTP MOCK ERROR] Simulating SMTP network exception...');
      throw new Error('SMTP Connection Timeout');
    };

    const failTestRes = await prisma.reservation.create({
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
        status: 'PENDING_PAYMENT'
      }
    });
    createdReservationIds.push(failTestRes.id);

    // Call verifyPaymentProofAdmin during SMTP failure
    const approvalResult = await reservationService.verifyPaymentProofAdmin(failTestRes.id, admin);

    const failResCheck = await prisma.reservation.findUnique({
      where: { id: failTestRes.id },
      include: { hostEarning: true }
    });

    if (
      approvalResult.reservation.status === 'CONFIRMED' &&
      failResCheck.status === 'CONFIRMED' &&
      failResCheck.paymentVerificationStatus === 'VERIFIED' &&
      failResCheck.hostEarning !== null
    ) {
      console.log('  [PASS] Test 11: SMTP failure did NOT crash API or roll back database transaction (Status=CONFIRMED, HostEarning=CREATED)');
    } else {
      console.error('  [FAIL] Test 11: SMTP failure corrupted database state!');
      allPassed = false;
    }

  } catch (err) {
    console.error('[SUITE ERROR]', err);
    allPassed = false;
  } finally {
    // Restore original sendMail
    transport.sendMail = originalSendMail;

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
    console.log(` FINAL TEST SUITE RESULT: ${allPassed ? 'ALL 11 TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
    console.log(`====================================================`);
    if (!allPassed) process.exit(1);
  }
}

runEmailWorkflowTests();
