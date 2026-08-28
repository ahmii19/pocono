require('dotenv').config();
const prisma = require('../server/src/config/prisma');
const paymentService = require('../server/src/services/paymentService');
const reservationService = require('../server/src/services/reservationService');

async function testPayLaterFlow() {
  console.log('====================================================');
  console.log(' TESTING PAY LATER PAYMENT METHOD INTEGRATION');
  console.log('====================================================\n');

  // 1. Get a guest and property
  const guest = await prisma.user.findFirst({ where: { role: 'GUEST' } });
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  const property = await prisma.property.findFirst({ where: { status: 'PUBLISHED' } });

  if (!guest || !admin || !property) {
    throw new Error('Required test data missing (guest, admin, or published property)');
  }

  console.log(`[TEST DATA] Guest: ${guest.email} | Property: "${property.title}" (${property.id})`);

  const checkInDate = '2026-11-20';
  const checkOutDate = '2026-11-23';

  // 2. Execute createPayLaterReservation
  console.log('\n--- 1. CREATING PAY LATER RESERVATION ---');
  const result = await paymentService.createPayLaterReservation({
    propertyId: property.id,
    guestId: guest.id,
    checkInDate,
    checkOutDate,
    guestCount: 2
  });

  console.log('[PAY LATER RESULT]', result);

  const reservation = await prisma.reservation.findUnique({
    where: { id: result.reservationId },
    include: { payments: true, invoices: true }
  });

  console.log(`[RESERVATION DB] Status: ${reservation.status} | UpfrontPaid: $${reservation.upfrontPaid} | BalanceDue: $${reservation.balanceDue}`);
  console.log(`[PAYMENT DB] Gateway: ${reservation.payments[0]?.gateway} | Status: ${reservation.payments[0]?.status} | TransactionId: ${reservation.payments[0]?.transactionId}`);
  console.log(`[INVOICE DB] Type: ${reservation.invoices[0]?.invoiceType} | PaymentStatus: ${reservation.invoices[0]?.paymentStatus}`);

  if (reservation.status !== 'PENDING_PAYMENT') throw new Error('Expected reservation status to be PENDING_PAYMENT');
  if (reservation.payments[0]?.gateway !== 'PAY_LATER') throw new Error('Expected payment gateway to be PAY_LATER');

  // 3. Test submitting payment proof
  console.log('\n--- 2. SUBMITTING PAYMENT PROOF ---');
  const dummyBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]);
  const proofSubmission = await reservationService.submitGuestPaymentProof(
    reservation.id,
    { filename: 'test-proof.jpg', mimeType: 'image/jpeg', base64Data: dummyBuffer.toString('base64') },
    { transactionId: 'TX_MANUAL_TEST_123', paymentNote: 'Paid via Zelle' },
    guest
  );

  console.log(`[PROOF SUBMITTED] ProofUrl: ${proofSubmission.paymentProofUrl} | Status: ${proofSubmission.paymentVerificationStatus}`);
  if (proofSubmission.paymentVerificationStatus !== 'SUBMITTED') throw new Error('Expected status SUBMITTED');

  // 4. Test Admin Verification
  console.log('\n--- 3. ADMIN VERIFYING PAYMENT PROOF ---');
  const verifyResult = await reservationService.verifyPaymentProofAdmin(reservation.id, admin);

  const finalRes = await prisma.reservation.findUnique({
    where: { id: reservation.id },
    include: { payments: true, invoices: true, hostEarning: true }
  });

  console.log(`[FINAL RESERVATION] Status: ${finalRes.status} | Verification: ${finalRes.paymentVerificationStatus}`);
  console.log(`[FINAL INVOICE] PaymentStatus: ${finalRes.invoices[0]?.paymentStatus} (1=PAID)`);
  console.log(`[HOST EARNING] Gross: $${finalRes.hostEarning?.grossAmount} | Net: $${finalRes.hostEarning?.netAmount} | Status: ${finalRes.hostEarning?.status}`);

  if (finalRes.status !== 'CONFIRMED') throw new Error('Expected reservation status to be CONFIRMED');
  if (finalRes.invoices[0]?.paymentStatus !== 1) throw new Error('Expected invoice paymentStatus to be 1 (PAID)');
  if (!finalRes.hostEarning) throw new Error('Expected hostEarning to be created');

  // 5. Cleanup test data
  console.log('\n--- 4. CLEANUP ---');
  await prisma.payment.deleteMany({ where: { reservationId: reservation.id } });
  await prisma.invoice.deleteMany({ where: { reservationId: reservation.id } });
  if (finalRes.hostEarning) {
    await prisma.hostEarning.delete({ where: { id: finalRes.hostEarning.id } });
  }
  await prisma.reservation.delete({ where: { id: reservation.id } });
  console.log('[CLEANUP COMPLETE] Removed test reservation, payment, invoice, and host earning records.');

  await prisma.$disconnect();
}

testPayLaterFlow().catch(err => {
  console.error('[TEST FAILURE]', err);
  process.exit(1);
});
