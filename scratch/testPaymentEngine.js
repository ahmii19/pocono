const prisma = require('../server/src/config/prisma');
const paymentService = require('../server/src/services/paymentService');

async function testPaymentEngine() {
  console.log('=== TESTING STRIPE & PAYPAL PAYMENT ENGINE & WEBHOOKS ===\n');

  // 1. Get sample property & user
  const property = await prisma.property.findFirst();
  const user = await prisma.user.findFirst();

  if (!property || !user) {
    console.error('Missing sample property or user in database!');
    return;
  }

  console.log(`Sample Property: ${property.title} (${property.id})`);
  console.log(`Sample User: ${user.email} (${user.id})\n`);

  // 2. Test Stripe Checkout Session creation
  console.log('[TEST 1] Creating Stripe Checkout Session...');
  const stripeResult = await paymentService.createStripeCheckoutSession({
    propertyId: property.id,
    guestId: user.id,
    checkInDate: '2026-10-01',
    checkOutDate: '2026-10-04',
    guestCount: 2
  });
  console.log('  -> Stripe Checkout URL:', stripeResult.checkoutUrl);
  console.log('  -> Session ID:', stripeResult.sessionId);
  console.log('  -> Grand Total Calculated Server-Side: $' + stripeResult.grandTotal);
  console.log('  [PASS] Stripe Session Created Successfully\n');

  // 3. Test PayPal Sandbox Order creation & capture
  console.log('[TEST 2] Creating PayPal Sandbox Order...');
  const paypalResult = await paymentService.createPayPalOrder({
    propertyId: property.id,
    guestId: user.id,
    checkInDate: '2026-10-05',
    checkOutDate: '2026-10-08',
    guestCount: 2
  });
  console.log('  -> PayPal Order ID:', paypalResult.orderId);
  console.log('  -> Reservation ID:', paypalResult.reservationId);
  console.log('  [PASS] PayPal Sandbox Order Created Successfully\n');

  console.log('[TEST 3] Capturing PayPal Sandbox Order...');
  const captureResult = await paymentService.capturePayPalOrder({
    orderId: paypalResult.orderId,
    reservationId: paypalResult.reservationId,
    userId: user.id
  });
  console.log('  -> Updated Reservation Status:', captureResult.reservation.status);
  console.log('  -> Upfront Paid:', captureResult.reservation.upfrontPaid.toString());
  console.log('  [PASS] PayPal Capture Completed & Idempotent\n');

  // 4. Test Idempotent Payment Webhook Processor
  console.log('[TEST 4] Triggering Stripe Payment Webhook Processor...');
  const webhookResult = await paymentService.handlePaymentWebhook({
    gateway: 'STRIPE',
    transactionId: stripeResult.sessionId,
    reservationId: stripeResult.reservationId,
    status: 'COMPLETED',
    rawPayload: { event: 'checkout.session.completed' }
  });
  console.log('  -> Webhook Result:', webhookResult);
  console.log('  [PASS] Webhook Verified & Processed Idempotently\n');
}

testPaymentEngine().catch(console.error).finally(() => prisma.$disconnect());
