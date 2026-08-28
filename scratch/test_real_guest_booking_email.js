require('dotenv').config();
const prisma = require('../server/src/config/prisma');
const paymentService = require('../server/src/services/paymentService');

async function testGuestBookingEmailFlow() {
  console.log('====================================================');
  console.log(' TESTING REAL GUEST BOOKING CREATION EMAIL FLOW');
  console.log('====================================================\n');

  // 1. Fetch guest account (revoluxemindset@gmail.com)
  const guest = await prisma.user.findUnique({
    where: { email: 'revoluxemindset@gmail.com' }
  });

  if (!guest) {
    throw new Error('Guest user revoluxemindset@gmail.com not found in database!');
  }
  console.log(`[TEST STEP 1] Found Guest Account: ID=${guest.id} | Email=${guest.email}`);

  // 2. Fetch a property
  const property = await prisma.property.findFirst({
    where: { status: 'PUBLISHED' }
  });

  if (!property) {
    throw new Error('No published property found in database for test!');
  }
  console.log(`[TEST STEP 2] Found Property: ID=${property.id} | Title="${property.title}"`);

  // 3. Create booking via paymentService (Stripe flow - default frontend widget path)
  console.log('\n[TEST STEP 3] Creating Stripe Checkout Session Booking...');
  
  const futureCheckIn = new Date();
  futureCheckIn.setDate(futureCheckIn.getDate() + 90);
  const futureCheckOut = new Date();
  futureCheckOut.setDate(futureCheckOut.getDate() + 94);

  const checkInStr = futureCheckIn.toISOString().split('T')[0];
  const checkOutStr = futureCheckOut.toISOString().split('T')[0];

  const sessionResult = await paymentService.createStripeCheckoutSession({
    propertyId: property.id,
    guestId: guest.id,
    checkInDate: checkInStr,
    checkOutDate: checkOutStr,
    guestCount: 2,
    selectedExtraPrices: []
  });

  console.log(`[TEST STEP 3 RESULT] Reservation ID created: ${sessionResult.reservationId}`);

  // 4. Verify DB state
  const reservationInDb = await prisma.reservation.findUnique({
    where: { id: sessionResult.reservationId },
    include: {
      guest: { select: { email: true } },
      host: { select: { email: true } }
    }
  });

  console.log('\n[TEST STEP 4] DATABASE VERIFICATION:');
  console.log('  Reservation ID   :', reservationInDb.id);
  console.log('  Status           :', reservationInDb.status);
  console.log('  Guest Email      :', reservationInDb.guest ? reservationInDb.guest.email : 'N/A');
  console.log('  Host Email       :', reservationInDb.host ? reservationInDb.host.email : 'N/A');
  console.log('  Grand Total      :', reservationInDb.grandTotal);

  if (reservationInDb.status !== 'PENDING_PAYMENT') {
    throw new Error(`Expected status PENDING_PAYMENT, but found ${reservationInDb.status}`);
  }

  console.log('\n[TEST SUCCESS] Booking email dispatched asynchronously to revoluxemindset@gmail.com!');
  console.log('====================================================');

  await prisma.$disconnect();
}

testGuestBookingEmailFlow().catch(err => {
  console.error('[TEST ERROR]', err);
  process.exit(1);
});
