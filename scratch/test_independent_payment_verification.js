require('dotenv').config();
const prisma = require('../server/src/config/prisma');
const adminService = require('../server/src/services/adminService');
const reservationService = require('../server/src/services/reservationService');
const paymentService = require('../server/src/services/paymentService');

async function runIndependentVerificationTests() {
  console.log('====================================================');
  console.log(' AUTOMATED INDEPENDENT PAYMENT VERIFICATION TEST SUITE');
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
    // TEST 1: Approve payment via verifyPaymentProofAdmin (Full Confirmation Workflow)
    // ----------------------------------------------------
    console.log('--- TEST 1: Approve payment (Full Confirmation Workflow) ---');
    const res1 = await prisma.reservation.create({
      data: {
        propertyId: property.id,
        guestId: guest.id,
        hostId: property.hostId,
        checkInDate: new Date('2029-05-01'),
        checkOutDate: new Date('2029-05-05'),
        guestCount: 2,
        totalNights: 4,
        baseTotal: 400.00,
        grandTotal: 500.00,
        status: 'PENDING_PAYMENT',
        paymentVerificationStatus: 'SUBMITTED'
      }
    });
    createdReservationIds.push(res1.id);

    await reservationService.verifyPaymentProofAdmin(res1.id, admin);

    const approved1 = await prisma.reservation.findUnique({
      where: { id: res1.id },
      include: { hostEarning: true }
    });

    if (
      approved1.status === 'CONFIRMED' &&
      approved1.paymentVerificationStatus === 'VERIFIED' &&
      approved1.hostEarning !== null
    ) {
      console.log('  [PASS] Test 1: Full approval set status=CONFIRMED, paymentVerificationStatus=VERIFIED, HostEarning=CREATED');
    } else {
      console.error('  [FAIL] Test 1 approval mismatch:', approved1);
      allPassed = false;
    }

    // ----------------------------------------------------
    // TEST 2: Manual verification VERIFIED -> REJECTED (Reservation status remains CONFIRMED)
    // ----------------------------------------------------
    console.log('\n--- TEST 2: Manual verification VERIFIED -> REJECTED ---');
    const updated2 = await adminService.updatePaymentVerificationStatusAdmin(res1.id, 'REJECTED', admin);

    const check2 = await prisma.reservation.findUnique({
      where: { id: res1.id },
      include: { hostEarning: true }
    });

    if (
      check2.paymentVerificationStatus === 'REJECTED' &&
      check2.status === 'CONFIRMED' &&
      check2.hostEarning !== null
    ) {
      console.log('  [PASS] Test 2: Manual VERIFIED->REJECTED set verification=REJECTED while Reservation remained CONFIRMED, HostEarning preserved');
    } else {
      console.error('  [FAIL] Test 2 manual edit mismatch:', check2);
      allPassed = false;
    }

    // ----------------------------------------------------
    // TEST 3: Manual verification REJECTED -> VERIFIED (Reservation status remains unchanged)
    // ----------------------------------------------------
    console.log('\n--- TEST 3: Manual verification REJECTED -> VERIFIED ---');
    await adminService.updatePaymentVerificationStatusAdmin(res1.id, 'VERIFIED', admin);

    const check3 = await prisma.reservation.findUnique({ where: { id: res1.id } });

    if (
      check3.paymentVerificationStatus === 'VERIFIED' &&
      check3.status === 'CONFIRMED'
    ) {
      console.log('  [PASS] Test 3: Manual REJECTED->VERIFIED set verification=VERIFIED while Reservation status remained unchanged');
    } else {
      console.error('  [FAIL] Test 3 manual edit mismatch:', check3);
      allPassed = false;
    }

    // ----------------------------------------------------
    // TEST 4, 5, 6 & 7: Confirmed booking cancellation (VERIFIED & COMPLETED & PAID & HostEarning preserved)
    // ----------------------------------------------------
    console.log('\n--- TESTS 4-7: Confirmed booking cancellation ---');
    // Ensure invoice and payment record exist for res1
    await prisma.payment.create({
      data: {
        reservationId: res1.id,
        userId: guest.id,
        gateway: 'STRIPE',
        status: 'COMPLETED',
        amount: 500.00,
        currency: 'USD'
      }
    });

    await prisma.invoice.create({
      data: {
        reservationId: res1.id,
        userId: guest.id,
        invoiceType: 'Reservation',
        totalAmount: 500.00,
        paymentStatus: 1 // PAID
      }
    });

    await adminService.updateReservationStatus(res1.id, 'CANCELLED');

    const check4 = await prisma.reservation.findUnique({
      where: { id: res1.id },
      include: { payments: true, invoices: true, hostEarning: true }
    });

    if (
      check4.status === 'CANCELLED' &&
      check4.paymentVerificationStatus === 'VERIFIED' &&
      check4.payments[0]?.status === 'COMPLETED' &&
      check4.invoices[0]?.paymentStatus === 1 &&
      check4.hostEarning !== null
    ) {
      console.log('  [PASS] Tests 4-7: Status=CANCELLED, verification remained VERIFIED, Payment remained COMPLETED, Invoice remained PAID, HostEarning preserved');
    } else {
      console.error('  [FAIL] Tests 4-7 cancellation side effect error:', check4);
      allPassed = false;
    }

    // ----------------------------------------------------
    // TEST 8: Manual verification change does NOT create HostEarning
    // ----------------------------------------------------
    console.log('\n--- TEST 8: Manual verification change does NOT create HostEarning ---');
    const res8 = await prisma.reservation.create({
      data: {
        propertyId: property.id,
        guestId: guest.id,
        hostId: property.hostId,
        checkInDate: new Date('2029-06-01'),
        checkOutDate: new Date('2029-06-05'),
        guestCount: 2,
        totalNights: 4,
        baseTotal: 400.00,
        grandTotal: 500.00,
        status: 'PENDING_PAYMENT',
        paymentVerificationStatus: 'SUBMITTED'
      }
    });
    createdReservationIds.push(res8.id);

    await adminService.updatePaymentVerificationStatusAdmin(res8.id, 'VERIFIED', admin);

    const check8 = await prisma.reservation.findUnique({
      where: { id: res8.id },
      include: { hostEarning: true }
    });

    if (
      check8.paymentVerificationStatus === 'VERIFIED' &&
      check8.status === 'PENDING_PAYMENT' &&
      check8.hostEarning === null
    ) {
      console.log('  [PASS] Test 8: Manual verification change set verification=VERIFIED without altering status (PENDING_PAYMENT) or creating HostEarning');
    } else {
      console.error('  [FAIL] Test 8 unexpected HostEarning or status change:', check8);
      allPassed = false;
    }

    // ----------------------------------------------------
    // TEST 12: Duplicate manual verification update (Idempotency)
    // ----------------------------------------------------
    console.log('\n--- TEST 12: Duplicate manual verification update idempotency ---');
    await adminService.updatePaymentVerificationStatusAdmin(res8.id, 'VERIFIED', admin);

    const check12 = await prisma.reservation.findUnique({
      where: { id: res8.id },
      include: { hostEarning: true }
    });

    if (
      check12.paymentVerificationStatus === 'VERIFIED' &&
      check12.status === 'PENDING_PAYMENT' &&
      check12.hostEarning === null
    ) {
      console.log('  [PASS] Test 12: Duplicate manual verification update was safely idempotent with 0 side effects');
    } else {
      console.error('  [FAIL] Test 12 duplicate manual update mismatch:', check12);
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
    console.log(` FINAL TEST SUITE RESULT: ${allPassed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
    console.log(`====================================================`);
    if (!allPassed) process.exit(1);
  }
}

runIndependentVerificationTests();
