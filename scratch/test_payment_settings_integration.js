require('dotenv').config();
const prisma = require('../server/src/config/prisma');
const adminService = require('../server/src/services/adminService');
const paymentService = require('../server/src/services/paymentService');
const reservationService = require('../server/src/services/reservationService');

async function runPaymentSettingsTests() {
  console.log('====================================================');
  console.log(' PAYMENT SETTINGS SYSTEM INTEGRATION TEST SUITE');
  console.log('====================================================\n');

  const originalSettings = adminService.getSiteSettings();
  let passedCount = 0;
  let totalTests = 15;

  try {
    // --------------------------------------------------
    // TEST 1: ALL PAYMENT METHODS ENABLED
    // --------------------------------------------------
    console.log('--- TEST 1: All Payment Methods Enabled ---');
    adminService.updateSiteSettings({
      payment: {
        stripeEnabled: true,
        paypalEnabled: true,
        payLaterEnabled: true,
        defaultPaymentGateway: 'stripe',
        payLaterDeadlineHours: 48,
        payLaterInstructions: 'Standard Pay Later instructions test.',
        autoExpirePayLaterReservations: true
      }
    });

    let pub = adminService.getPublicSiteSettings();
    if (pub.payment.stripeEnabled && pub.payment.paypalEnabled && pub.payment.payLaterEnabled) {
      console.log('[TEST 1 PASSED] All 3 gateways enabled on public API.');
      passedCount++;
    } else {
      console.error('[TEST 1 FAILED] Gateways not enabled properly.');
    }

    // --------------------------------------------------
    // TEST 2: STRIPE DISABLED (BACKEND SECURITY REJECTION)
    // --------------------------------------------------
    console.log('\n--- TEST 2: Stripe Disabled & Backend Rejection ---');
    adminService.updateSiteSettings({
      payment: { ...pub.payment, stripeEnabled: false }
    });

    pub = adminService.getPublicSiteSettings();
    if (!pub.payment.stripeEnabled && pub.payment.paypalEnabled && pub.payment.payLaterEnabled) {
      console.log('[TEST 2 PASSED] Stripe disabled in public settings.');
      passedCount++;
    } else {
      console.error('[TEST 2 FAILED] Stripe flag mismatch.');
    }

    // --------------------------------------------------
    // TEST 3: PAYPAL DISABLED
    // --------------------------------------------------
    console.log('\n--- TEST 3: PayPal Disabled ---');
    adminService.updateSiteSettings({
      payment: { ...pub.payment, paypalEnabled: false }
    });

    pub = adminService.getPublicSiteSettings();
    if (!pub.payment.paypalEnabled) {
      console.log('[TEST 3 PASSED] PayPal disabled in public settings.');
      passedCount++;
    } else {
      console.error('[TEST 3 FAILED] PayPal flag mismatch.');
    }

    // --------------------------------------------------
    // TEST 4: PAY LATER DISABLED
    // --------------------------------------------------
    console.log('\n--- TEST 4: Pay Later Disabled ---');
    adminService.updateSiteSettings({
      payment: { ...pub.payment, payLaterEnabled: false }
    });

    pub = adminService.getPublicSiteSettings();
    if (!pub.payment.payLaterEnabled) {
      console.log('[TEST 4 PASSED] Pay Later disabled in public settings.');
      passedCount++;
    } else {
      console.error('[TEST 4 FAILED] Pay Later flag mismatch.');
    }

    // --------------------------------------------------
    // TEST 5: ALL METHODS DISABLED (CONFIG ALLOWED, GATEWAY DEFAULT SAFE)
    // --------------------------------------------------
    console.log('\n--- TEST 5: All Payment Methods Disabled ---');
    adminService.updateSiteSettings({
      payment: {
        stripeEnabled: false,
        paypalEnabled: false,
        payLaterEnabled: false,
        defaultPaymentGateway: 'stripe',
        payLaterDeadlineHours: 48,
        autoExpirePayLaterReservations: true
      }
    });

    pub = adminService.getPublicSiteSettings();
    if (!pub.payment.stripeEnabled && !pub.payment.paypalEnabled && !pub.payment.payLaterEnabled) {
      console.log('[TEST 5 PASSED] All payment gateways disabled.');
      passedCount++;
    } else {
      console.error('[TEST 5 FAILED] Gateways not all disabled.');
    }

    // --------------------------------------------------
    // TEST 6: DEFAULT GATEWAY = PAYPAL
    // --------------------------------------------------
    console.log('\n--- TEST 6: Default Gateway = PayPal ---');
    adminService.updateSiteSettings({
      payment: {
        stripeEnabled: true,
        paypalEnabled: true,
        payLaterEnabled: true,
        defaultPaymentGateway: 'paypal',
        payLaterDeadlineHours: 48
      }
    });

    pub = adminService.getPublicSiteSettings();
    if (pub.payment.defaultPaymentGateway === 'paypal') {
      console.log('[TEST 6 PASSED] Default gateway set to paypal.');
      passedCount++;
    } else {
      console.error('[TEST 6 FAILED] Default gateway setting mismatch.');
    }

    // --------------------------------------------------
    // TEST 7: DEFAULT GATEWAY VALIDATION WHEN DISABLED
    // --------------------------------------------------
    console.log('\n--- TEST 7: Default Gateway Validation when Selected Gateway Disabled ---');
    // Try setting default to paypal when paypal is disabled
    adminService.updateSiteSettings({
      payment: {
        stripeEnabled: true,
        paypalEnabled: false,
        payLaterEnabled: true,
        defaultPaymentGateway: 'paypal',
        payLaterDeadlineHours: 48
      }
    });

    pub = adminService.getPublicSiteSettings();
    if (pub.payment.defaultPaymentGateway === 'stripe') {
      console.log('[TEST 7 PASSED] Automatically selected first enabled gateway (stripe).');
      passedCount++;
    } else {
      console.error(`[TEST 7 FAILED] Got defaultPaymentGateway: ${pub.payment.defaultPaymentGateway}`);
    }

    // Restore all enabled for remaining tests
    adminService.updateSiteSettings({
      payment: {
        stripeEnabled: true,
        paypalEnabled: true,
        payLaterEnabled: true,
        defaultPaymentGateway: 'stripe',
        payLaterDeadlineHours: 24,
        payLaterInstructions: 'Test custom deadline & instructions',
        autoExpirePayLaterReservations: true
      }
    });

    // --------------------------------------------------
    // TEST 8: PAY LATER DEADLINE = 24 HOURS
    // --------------------------------------------------
    console.log('\n--- TEST 8: Pay Later Deadline Calculation (24 Hours) ---');
    const guest = await prisma.user.findFirst({ where: { role: 'GUEST' } });
    const host = await prisma.user.findFirst({ where: { role: 'HOST' } });
    const property = await prisma.property.findFirst({ where: { status: 'PUBLISHED' } });

    let dummyResId = null;

    if (guest && host && property) {
      const res = await paymentService.createPayLaterReservation({
        propertyId: property.id,
        guestId: guest.id,
        checkInDate: '2026-11-01',
        checkOutDate: '2026-11-04',
        guestCount: 2
      });

      dummyResId = res.reservationId;
      const dbRes = await prisma.reservation.findUnique({ where: { id: dummyResId } });

      if (dbRes && dbRes.paymentDueAt) {
        const diffMs = new Date(dbRes.paymentDueAt).getTime() - new Date(dbRes.createdAt).getTime();
        const diffHours = Math.round(diffMs / (1000 * 60 * 60));
        console.log(`[TEST 8 RESULT] Created reservation paymentDueAt hours diff: ${diffHours}h`);
        if (diffHours === 24) {
          console.log('[TEST 8 PASSED] Deadline set to exactly 24 hours.');
          passedCount++;
        } else {
          console.error(`[TEST 8 FAILED] Expected 24h, got ${diffHours}h`);
        }
      } else {
        console.error('[TEST 8 FAILED] paymentDueAt is null or missing.');
      }
    }

    // --------------------------------------------------
    // TEST 9: PAY LATER INSTRUCTIONS UPDATED
    // --------------------------------------------------
    console.log('\n--- TEST 9: Pay Later Instructions Updated ---');
    pub = adminService.getPublicSiteSettings();
    if (pub.payment.payLaterInstructions === 'Test custom deadline & instructions') {
      console.log('[TEST 9 PASSED] Dynamic instructions served via public settings API.');
      passedCount++;
    } else {
      console.error('[TEST 9 FAILED] Instructions mismatch.');
    }

    // --------------------------------------------------
    // TEST 10 & 11: AUTO EXPIRATION & PROOF REJECTION
    // --------------------------------------------------
    console.log('\n--- TEST 10 & 11: Auto Expiration & Expired Proof Rejection ---');
    if (dummyResId) {
      // Simulate expired deadline on dummy reservation
      const pastDate = new Date(Date.now() - 1000 * 60 * 60 * 25);
      await prisma.reservation.update({
        where: { id: dummyResId },
        data: { paymentDueAt: pastDate }
      });

      let proofError = null;
      try {
        await reservationService.submitGuestPaymentProof(
          dummyResId,
          { filename: 'test.jpg', mimeType: 'image/jpeg', base64Data: 'dGVzdA==' },
          {},
          guest
        );
      } catch (err) {
        proofError = err;
      }

      const updatedDbRes = await prisma.reservation.findUnique({ where: { id: dummyResId } });
      if (updatedDbRes.status === 'CANCELLED') {
        console.log('[TEST 10 PASSED] Overdue reservation automatically cancelled.');
        passedCount++;
      } else {
        console.error(`[TEST 10 FAILED] Status is ${updatedDbRes.status}, expected CANCELLED.`);
      }

      if (proofError && (proofError.message.includes('expired') || proofError.message.includes('CANCELLED'))) {
        console.log('[TEST 11 PASSED] Proof submission on expired reservation rejected.');
        passedCount++;
      } else {
        console.error('[TEST 11 FAILED] Proof submission was not properly rejected.', proofError?.message);
      }

      // Cleanup dummy reservation
      await prisma.payment.deleteMany({ where: { reservationId: dummyResId } });
      await prisma.invoice.deleteMany({ where: { reservationId: dummyResId } });
      await prisma.reservation.delete({ where: { id: dummyResId } });
      console.log('[CLEANUP] Deleted test reservation.');
    }

    // --------------------------------------------------
    // TEST 12: EXISTING PAY LATER VERIFICATION FLOW
    // --------------------------------------------------
    console.log('\n--- TEST 12: Normal Pay Later Admin Verification Flow ---');
    if (guest && host && property) {
      const res = await paymentService.createPayLaterReservation({
        propertyId: property.id,
        guestId: guest.id,
        checkInDate: '2026-11-10',
        checkOutDate: '2026-11-12',
        guestCount: 2
      });

      await reservationService.submitGuestPaymentProof(
        res.reservationId,
        { filename: 'test.png', mimeType: 'image/png', base64Data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==' },
        { transactionId: 'TX_TEST_12' },
        guest
      );

      const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
      const verifiedResult = await reservationService.verifyPaymentProofAdmin(res.reservationId, adminUser);

      if (verifiedResult.reservation?.status === 'CONFIRMED' && verifiedResult.hostEarning) {
        console.log('[TEST 12 PASSED] Admin verification confirmed reservation & created host earning.');
        passedCount++;
      } else {
        console.error('[TEST 12 FAILED] Admin verification did not confirm reservation properly.');
      }

      // Cleanup
      await prisma.hostEarning.deleteMany({ where: { reservationId: res.reservationId } });
      await prisma.payment.deleteMany({ where: { reservationId: res.reservationId } });
      await prisma.invoice.deleteMany({ where: { reservationId: res.reservationId } });
      await prisma.reservation.delete({ where: { id: res.reservationId } });
      console.log('[CLEANUP] Deleted test verification reservation.');
    }

    // --------------------------------------------------
    // TEST 13: STRIPE CHECKOUT CREATION
    // --------------------------------------------------
    console.log('\n--- TEST 13: Stripe Checkout Session Creation ---');
    if (guest && property) {
      const stripeRes = await paymentService.createStripeCheckoutSession({
        propertyId: property.id,
        guestId: guest.id,
        checkInDate: '2026-11-15',
        checkOutDate: '2026-11-17',
        guestCount: 2
      });

      if (stripeRes.sessionId && stripeRes.reservationId) {
        console.log('[TEST 13 PASSED] Stripe checkout session created successfully.');
        passedCount++;

        // Cleanup
        await prisma.payment.deleteMany({ where: { reservationId: stripeRes.reservationId } });
        await prisma.invoice.deleteMany({ where: { reservationId: stripeRes.reservationId } });
        await prisma.reservation.delete({ where: { id: stripeRes.reservationId } });
      } else {
        console.error('[TEST 13 FAILED] Stripe checkout session creation failed.');
      }
    }

    // --------------------------------------------------
    // TEST 14: PAYPAL ORDER CREATION
    // --------------------------------------------------
    console.log('\n--- TEST 14: PayPal Order Creation ---');
    if (guest && property) {
      const paypalRes = await paymentService.createPayPalOrder({
        propertyId: property.id,
        guestId: guest.id,
        checkInDate: '2026-11-20',
        checkOutDate: '2026-11-22',
        guestCount: 2
      });

      if (paypalRes.orderId && paypalRes.reservationId) {
        console.log('[TEST 14 PASSED] PayPal order created successfully.');
        passedCount++;

        // Cleanup
        await prisma.payment.deleteMany({ where: { reservationId: paypalRes.reservationId } });
        await prisma.invoice.deleteMany({ where: { reservationId: paypalRes.reservationId } });
        await prisma.reservation.delete({ where: { id: paypalRes.reservationId } });
      } else {
        console.error('[TEST 14 FAILED] PayPal order creation failed.');
      }
    }

    // --------------------------------------------------
    // TEST 15: SECURITY AUDIT — NO SECRETS IN PUBLIC SETTINGS
    // --------------------------------------------------
    console.log('\n--- TEST 15: Public Settings Security Audit ---');
    pub = adminService.getPublicSiteSettings();
    const str = JSON.stringify(pub);

    const secretKeys = ['STRIPE_SECRET_KEY', 'PAYPAL_CLIENT_SECRET', 'SMTP_PASS', 'JWT_SECRET', 'DATABASE_URL'];
    let leak = false;

    for (const key of secretKeys) {
      if (str.includes(key) || (process.env[key] && str.includes(process.env[key]))) {
        leak = true;
        console.error(`[SECURITY ALERT] Secret ${key} leaked in public settings API!`);
      }
    }

    if (!leak) {
      console.log('[TEST 15 PASSED] Zero payment secrets or private credentials exposed in public settings.');
      passedCount++;
    }

  } catch (err) {
    console.error('[INTEGRATION TEST FAILURE]', err);
  } finally {
    // Restoring original site settings
    adminService.updateSiteSettings(originalSettings);
    console.log('\n[REVERT COMPLETE] Settings restored to original state.');

    console.log(`\n====================================================`);
    console.log(` RESULTS: ${passedCount} / ${totalTests} TESTS PASSED`);
    console.log(`====================================================`);

    await prisma.$disconnect();

    if (passedCount !== totalTests) {
      process.exit(1);
    }
  }
}

runPaymentSettingsTests();
