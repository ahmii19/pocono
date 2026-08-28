/**
 * INVOICE LIFECYCLE TEST SUITE
 * Tests all 14 key business rules for the modern reservation invoice system
 *
 * Run: node scratch/test_invoice_lifecycle.js
 */

const prisma = require('../server/src/config/prisma');
const invoiceService = require('../server/src/services/invoiceService');

// ─── Utilities ────────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;

function assert(description, actual, expected) {
  if (actual === expected) {
    console.log(`  ✅ PASS: ${description}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${description}`);
    console.error(`     Expected: ${JSON.stringify(expected)}`);
    console.error(`     Actual:   ${JSON.stringify(actual)}`);
    failed++;
  }
}

function assertTruthy(description, actual) {
  if (actual) {
    console.log(`  ✅ PASS: ${description} (${JSON.stringify(actual)})`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${description} — expected truthy, got: ${JSON.stringify(actual)}`);
    failed++;
  }
}

function assertNull(description, actual) {
  if (actual === null || actual === undefined) {
    console.log(`  ✅ PASS: ${description}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${description} — expected null/undefined, got: ${JSON.stringify(actual)}`);
    failed++;
  }
}

// ─── Test Data ────────────────────────────────────────────────────────────────
let createdInvoiceId = null;
let testReservationId = null;
let testGuestId = null;
let testGrandTotal = 1234.56;

async function run() {
  console.log('\n=================================================');
  console.log(' INVOICE LIFECYCLE TEST SUITE');
  console.log('=================================================\n');

  // ── Safety Baseline ──────────────────────────────────────────────────────
  console.log('📊 SECTION 0: Legacy Data Safety Baseline');
  const legacyCount = await prisma.invoice.count({ where: { wpInvoiceId: { not: null } } });
  assert('Legacy WordPress invoices count remains 6', legacyCount, 6);

  const totalResCount = await prisma.reservation.count();
  assert('Existing reservation count is unchanged (19)', totalResCount, 19);

  // Get a real guest user and reservation for testing
  const testReservation = await prisma.reservation.findFirst({
    orderBy: { createdAt: 'asc' },
    include: { guest: true }
  });

  if (!testReservation) {
    console.error('❌ FATAL: No reservation found for testing. Aborting.');
    process.exit(1);
  }
  testReservationId = testReservation.id;
  testGuestId = testReservation.guestId;
  testGrandTotal = Number(testReservation.grandTotal);

  console.log(`\n   Using test reservation: ${testReservationId.substring(0, 8)} (grand total: $${testGrandTotal})`);

  // ── Test 1: createReservationInvoice (find-or-create) ─────────────────────
  console.log('\n📋 SECTION 1: createReservationInvoice');

  // First, clean up any test invoice that might already exist for this reservation
  await prisma.invoice.deleteMany({
    where: { reservationId: testReservationId, invoiceType: 'Reservation' }
  });

  const inv1 = await invoiceService.createReservationInvoice(testReservationId, testGuestId, testGrandTotal);
  createdInvoiceId = inv1.id;

  assertTruthy('Created invoice has an ID', inv1.id);
  assert('Invoice type is Reservation', inv1.invoiceType, 'Reservation');
  assert('Invoice paymentStatus is 0 (PENDING)', inv1.paymentStatus, 0);
  assert('Invoice userId matches guest', inv1.userId, testGuestId);
  assert('Invoice reservationId matches', inv1.reservationId, testReservationId);
  assert('Invoice wpInvoiceId is null (modern)', inv1.wpInvoiceId, null);
  assert(`Invoice totalAmount matches grandTotal ($${testGrandTotal})`, Number(inv1.totalAmount), testGrandTotal);

  // ── Test 2: Idempotency — calling create again returns same invoice ────────
  console.log('\n📋 SECTION 2: createReservationInvoice Idempotency');
  const inv2 = await invoiceService.createReservationInvoice(testReservationId, testGuestId, testGrandTotal);
  assert('Second create returns same invoice ID (idempotent)', inv2.id, createdInvoiceId);

  const invoiceCountForRes = await prisma.invoice.count({
    where: { reservationId: testReservationId, invoiceType: 'Reservation' }
  });
  assert('Only 1 Reservation invoice per reservation', invoiceCountForRes, 1);

  // ── Test 3: getInvoiceByReservationId ─────────────────────────────────────
  console.log('\n📋 SECTION 3: getInvoiceByReservationId');
  const mockUser = { id: testGuestId, role: 'GUEST' };
  const inv3 = await invoiceService.getInvoiceByReservationId(testReservationId, mockUser);
  assertTruthy('getInvoiceByReservationId returns invoice', inv3);
  assert('Retrieved invoice has correct type', inv3.invoiceType, 'Reservation');
  assert('Retrieved invoice has correct userId', inv3.userId, testGuestId);

  // Null for unknown reservation
  const invNull = await invoiceService.getInvoiceByReservationId('00000000-0000-0000-0000-000000000000', mockUser);
  assertNull('Unknown reservationId returns null', invNull);

  // ── Test 4: markInvoicePaid ───────────────────────────────────────────────
  console.log('\n📋 SECTION 4: markInvoicePaid');
  const invPaid = await invoiceService.markInvoicePaid(testReservationId, 'manual_payment_proof', 'TXN-TEST-001');
  assert('Invoice paymentStatus is now 1 (PAID)', invPaid.paymentStatus, 1);
  assert('Invoice paymentGateway is set', invPaid.paymentGateway, 'manual_payment_proof');
  assert('Invoice paymentReference is set', invPaid.paymentReference, 'TXN-TEST-001');

  // ── Test 5: markInvoicePaid Idempotency ───────────────────────────────────
  console.log('\n📋 SECTION 5: markInvoicePaid Idempotency');
  const invPaid2 = await invoiceService.markInvoicePaid(testReservationId, 'different_gateway', 'TXN-TEST-002');
  assert('Already-PAID invoice returns same record without overwriting (idempotent)', invPaid2.paymentStatus, 1);
  assert('Payment gateway unchanged after idempotent call', invPaid2.paymentGateway, 'manual_payment_proof');

  // ── Test 6: getUserInvoices ───────────────────────────────────────────────
  console.log('\n📋 SECTION 6: getUserInvoices');
  const userInvoices = await invoiceService.getUserInvoices(testGuestId);
  assertTruthy('getUserInvoices returns array', Array.isArray(userInvoices));
  const hasOurInvoice = userInvoices.some(i => i.id === createdInvoiceId);
  assertTruthy('getUserInvoices includes the test invoice', hasOurInvoice);

  // ── Test 7: getInvoiceById ─────────────────────────────────────────────────
  console.log('\n📋 SECTION 7: getInvoiceById');
  const inv7 = await invoiceService.getInvoiceById(createdInvoiceId, mockUser);
  assertTruthy('getInvoiceById returns invoice', inv7);
  assert('getInvoiceById returns correct ID', inv7.id, createdInvoiceId);

  // Test admin override
  const adminUser = { id: 'admin-any', role: 'ADMIN' };
  const inv7Admin = await invoiceService.getInvoiceById(createdInvoiceId, adminUser);
  assertTruthy('Admin can get any invoice by ID', inv7Admin);

  // ── Test 8: Legacy Invoices Are Untouched ────────────────────────────────
  console.log('\n📋 SECTION 8: Legacy Data Integrity');
  const legacyInvoices = await prisma.invoice.findMany({ where: { wpInvoiceId: { not: null } } });
  assert('Legacy invoice count still 6', legacyInvoices.length, 6);
  const allLegacyAreMembership = legacyInvoices.every(i => i.invoiceType === 'Membership');
  assert('All legacy invoices are Membership type', allLegacyAreMembership, true);
  const allLegacyArePaid = legacyInvoices.every(i => i.paymentStatus === 1);
  assert('All legacy invoices retain paymentStatus = 1 (PAID)', allLegacyArePaid, true);

  // ── Cleanup ────────────────────────────────────────────────────────────────
  console.log('\n🧹 CLEANUP: Removing test invoice');
  await prisma.invoice.delete({ where: { id: createdInvoiceId } });
  const cleanupCheck = await prisma.invoice.count({ where: { id: createdInvoiceId } });
  assert('Test invoice cleaned up successfully', cleanupCheck, 0);

  // Final legacy check after cleanup
  const finalLegacyCount = await prisma.invoice.count({ where: { wpInvoiceId: { not: null } } });
  assert('Legacy invoice count still 6 after cleanup', finalLegacyCount, 6);

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n=================================================');
  console.log(` RESULTS: ${passed} PASSED  /  ${failed} FAILED`);
  console.log('=================================================\n');

  if (failed > 0) process.exit(1);
  else process.exit(0);
}

run().catch(e => {
  console.error('\n🔥 FATAL ERROR:', e.message);
  console.error(e.stack);
  process.exit(1);
});
