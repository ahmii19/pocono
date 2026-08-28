require('dotenv').config();
const emailService = require('../server/src/services/emailService');

async function testDummyHostResilience() {
  console.log('====================================================');
  console.log(' TESTING DUMMY HOST RESILIENCE FOR GUEST EMAIL');
  console.log('====================================================\n');

  const mockReservation = {
    id: 'test-res-dummy-host-99',
    checkInDate: new Date('2026-11-01'),
    checkOutDate: new Date('2026-11-05'),
    guestCount: 2,
    grandTotal: 500.00,
    status: 'PENDING_PAYMENT'
  };

  const mockGuest = { id: 'g1', email: 'revoluxemindset@gmail.com', firstName: 'Revoluxe', lastName: 'Guest' };
  const mockDummyHost = { id: 'h1', email: 'invalid-dummy-host-99999@nonexistent-domain-12345.org', firstName: 'DummyHost' };
  const mockProperty = { title: 'Pocono Lake House' };

  console.log('[TEST] Invoking sendBookingCreatedEmails with valid Guest email and dummy Host email...');

  const result = await emailService.sendBookingCreatedEmails({
    reservation: mockReservation,
    guest: mockGuest,
    host: mockDummyHost,
    property: mockProperty
  });

  console.log(`\n[TEST RESULT] Guest email success: ${result.guestSuccess}`);
  console.log(`[TEST RESULT] Host email success : ${result.hostSuccess}`);
  console.log('====================================================');
}

testDummyHostResilience().catch(err => {
  console.error('[TEST ERROR]', err);
  process.exit(1);
});
