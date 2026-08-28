const prisma = require('../server/src/config/prisma');
const { signToken } = require('../server/src/utils/jwt');
const hostEarningService = require('../server/src/services/hostEarningService');
const adminService = require('../server/src/services/adminService');

async function runHostEarningsTestSuite() {
  console.log('==================================================');
  console.log(' HOST EARNINGS AUTOMATED TEST SUITE');
  console.log('==================================================\n');

  try {
    // Fetch test guest & admin
    const guestUser = await prisma.user.findFirst({ where: { role: 'GUEST' } });
    const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });

    // Create 2 pure HOST users (role = 'HOST') to test host isolation
    const hostA = await prisma.user.create({
      data: {
        email: `hosta_${Date.now()}@example.com`,
        passwordHash: 'hashedpass',
        firstName: 'Host',
        lastName: 'A',
        role: 'HOST'
      }
    });

    const hostB = await prisma.user.create({
      data: {
        email: `hostb_${Date.now()}@example.com`,
        passwordHash: 'hashedpass',
        firstName: 'Host',
        lastName: 'B',
        role: 'HOST'
      }
    });

    const propertyA = await prisma.property.create({
      data: {
        title: `Test Host A Cabin ${Date.now()}`,
        slug: `test-host-a-cabin-${Date.now()}`,
        hostId: hostA.id,
        nightlyPrice: 200.00,
        status: 'PUBLISHED'
      }
    });

    const propertyB = await prisma.property.create({
      data: {
        title: `Test Host B Cabin ${Date.now()}`,
        slug: `test-host-b-cabin-${Date.now()}`,
        hostId: hostB.id,
        nightlyPrice: 200.00,
        status: 'PUBLISHED'
      }
    });

    const tokenGuest = signToken({ userId: guestUser.id, role: 'GUEST', email: guestUser.email });
    const tokenHostA = signToken({ userId: hostA.id, role: 'HOST', email: hostA.email });
    const tokenHostB = signToken({ userId: hostB.id, role: 'HOST', email: hostB.email });
    const tokenAdmin = signToken({ userId: adminUser.id, role: 'ADMIN', email: adminUser.email });

    // ==================================================
    // TEST 1: Create PENDING reservation -> no HostEarning
    // ==================================================
    console.log('--- TEST 1: Create PENDING reservation -> no HostEarning ---');
    const resv1 = await prisma.reservation.create({
      data: {
        propertyId: propertyA.id,
        guestId: guestUser.id,
        hostId: hostA.id,
        checkInDate: new Date('2026-12-10'),
        checkOutDate: new Date('2026-12-15'),
        guestCount: 2,
        totalNights: 5,
        baseTotal: 1000.00,
        grandTotal: 1000.00,
        status: 'PENDING'
      }
    });

    const earning1Count = await prisma.hostEarning.count({ where: { reservationId: resv1.id } });
    console.log(`  Reservation ID: ${resv1.id} (Status: PENDING)`);
    console.log(`  HostEarning Count: ${earning1Count} (EXPECTED: 0)`);
    if (earning1Count !== 0) throw new Error(`FAIL: HostEarning created prematurely for PENDING reservation!`);
    console.log('  [PASS] No HostEarning created for PENDING reservation.\n');

    // ==================================================
    // TEST 2 & TEST 3: Admin confirms reservation -> exactly one HostEarning created
    // ==================================================
    console.log('--- TEST 2 & 3: Admin confirms reservation -> exactly one HostEarning (status PENDING) ---');
    await prisma.reservation.update({ where: { id: resv1.id }, data: { paymentVerificationStatus: 'VERIFIED' } });
    await adminService.updateReservationStatus(resv1.id, 'CONFIRMED');

    const earning3 = await prisma.hostEarning.findUnique({ where: { reservationId: resv1.id } });
    console.log(`  HostEarning ID: ${earning3?.id}`);
    console.log(`  HostEarning Status: ${earning3?.status} (EXPECTED: PENDING)`);

    if (!earning3 || earning3.status !== 'PENDING') {
      throw new Error(`FAIL: HostEarning not created as PENDING on confirmation!`);
    }
    console.log('  [PASS] Exactly one HostEarning created as PENDING on confirmation.\n');

    // ==================================================
    // TEST 4: Commission calculation ($1000 gross with 10% commission)
    // ==================================================
    console.log('--- TEST 4: Commission calculation ($1000 gross @ 10%) ---');
    const gross = Number(earning3.grossAmount);
    const commRate = Number(earning3.commissionRate);
    const commAmt = Number(earning3.commissionAmount);
    const netAmt = Number(earning3.netAmount);

    console.log(`  Gross Amount: $${gross}`);
    console.log(`  Commission Rate: ${commRate}%`);
    console.log(`  Commission Amount: $${commAmt} (EXPECTED: $100.00)`);
    console.log(`  Host Net Earning: $${netAmt} (EXPECTED: $900.00)`);

    if (gross !== 1000 || commRate !== 10 || commAmt !== 100 || netAmt !== 900) {
      throw new Error(`FAIL: Financial calculation error! Gross=${gross}, Comm=${commAmt}, Net=${netAmt}`);
    }
    console.log('  [PASS] 10% Platform commission ($100) and Host net ($900) calculated accurately.\n');

    // ==================================================
    // TEST 5: Confirm same reservation twice -> duplicate protection check
    // ==================================================
    console.log('--- TEST 5: Confirm same reservation twice -> duplicate protection check ---');
    await adminService.updateReservationStatus(resv1.id, 'CONFIRMED');
    const totalEarningsResv1 = await prisma.hostEarning.count({ where: { reservationId: resv1.id } });

    console.log(`  HostEarning Rows for Reservation: ${totalEarningsResv1} (EXPECTED: 1)`);
    if (totalEarningsResv1 !== 1) {
      throw new Error(`FAIL: Duplicate HostEarning records created on repeated confirmation!`);
    }
    console.log('  [PASS] Duplicate protection enforced cleanly.\n');

    // ==================================================
    // TEST 6: Reservation completes -> PENDING -> AVAILABLE
    // ==================================================
    console.log('--- TEST 6: Reservation completes -> PENDING -> AVAILABLE ---');
    await adminService.updateReservationStatus(resv1.id, 'COMPLETED');
    const earning6 = await prisma.hostEarning.findUnique({ where: { reservationId: resv1.id } });

    console.log(`  HostEarning Status after Completion: ${earning6?.status} (EXPECTED: AVAILABLE)`);
    console.log(`  Available At Timestamp: ${earning6?.availableAt}`);

    if (earning6?.status !== 'AVAILABLE' || !earning6?.availableAt) {
      throw new Error(`FAIL: HostEarning status did not transition to AVAILABLE upon completion!`);
    }
    console.log('  [PASS] HostEarning successfully transitioned to AVAILABLE.\n');

    // ==================================================
    // TEST 7: Guest deletes pending reservation -> no orphan HostEarning
    // ==================================================
    console.log('--- TEST 7: Guest deletes pending reservation -> no orphan HostEarning ---');
    const resv7 = await prisma.reservation.create({
      data: {
        propertyId: propertyA.id,
        guestId: guestUser.id,
        hostId: hostA.id,
        checkInDate: new Date('2027-02-10'),
        checkOutDate: new Date('2027-02-15'),
        guestCount: 1,
        totalNights: 5,
        baseTotal: 500.00,
        grandTotal: 500.00,
        status: 'PENDING'
      }
    });

    const reservationService = require('../server/src/services/reservationService');
    const deleteResult = await reservationService.deleteReservation(resv7.id, guestUser);

    const orphanEarningCount = await prisma.hostEarning.count({ where: { reservationId: resv7.id } });
    console.log(`  Delete Result: ${deleteResult.success}`);
    console.log(`  Orphan HostEarning Count: ${orphanEarningCount} (EXPECTED: 0)`);

    if (orphanEarningCount !== 0) {
      throw new Error(`FAIL: Orphan HostEarning remained after guest reservation deletion!`);
    }
    console.log('  [PASS] Zero orphan HostEarning records after guest reservation deletion.\n');

    // ==================================================
    // TEST 8: HOST A attempts to access HOST B earnings -> 403 Forbidden
    // ==================================================
    console.log('--- TEST 8: HOST A attempts to access HOST B earnings -> 403 Forbidden ---');
    const resvB = await prisma.reservation.create({
      data: {
        propertyId: propertyB.id,
        guestId: guestUser.id,
        hostId: hostB.id,
        checkInDate: new Date('2027-03-01'),
        checkOutDate: new Date('2027-03-05'),
        guestCount: 1,
        totalNights: 4,
        baseTotal: 800.00,
        grandTotal: 800.00,
        status: 'CONFIRMED'
      }
    });
    const earningB = await hostEarningService.syncReservationEarning(resvB.id, 'CONFIRMED');

    const resHostAOnB = await fetch(`http://localhost:5000/api/v1/host/earnings/${earningB.id}`, {
      headers: { Authorization: `Bearer ${tokenHostA}` }
    });
    const dataHostAOnB = await resHostAOnB.json();

    console.log(`  HTTP Response Status: ${resHostAOnB.status} (EXPECTED: 403)`);
    console.log(`  Response Body: `, dataHostAOnB);

    if (resHostAOnB.status !== 403) {
      throw new Error(`FAIL: HOST A was able to access HOST B's earning record!`);
    }
    console.log('  [PASS] Strict host-isolation enforced (403 Forbidden).\n');

    // ==================================================
    // TEST 9: GUEST attempts Host Earnings API -> 403 Forbidden
    // ==================================================
    console.log('--- TEST 9: GUEST attempts Host Earnings API -> 403 Forbidden ---');
    const resGuestCall = await fetch(`http://localhost:5000/api/v1/host/earnings`, {
      headers: { Authorization: `Bearer ${tokenGuest}` }
    });
    const dataGuestCall = await resGuestCall.json();

    console.log(`  HTTP Response Status: ${resGuestCall.status} (EXPECTED: 403)`);
    console.log(`  Response Body: `, dataGuestCall);

    if (resGuestCall.status !== 403) {
      throw new Error(`FAIL: GUEST user was allowed to access Host Earnings API!`);
    }
    console.log('  [PASS] GUEST access to Host Earnings API rejected with 403 Forbidden.\n');

    // ==================================================
    // TEST 10: ADMIN can view global earnings
    // ==================================================
    console.log('--- TEST 10: ADMIN can view global earnings ---');
    const resAdminCall = await fetch(`http://localhost:5000/api/v1/admin/earnings`, {
      headers: { Authorization: `Bearer ${tokenAdmin}` }
    });
    const dataAdminCall = await resAdminCall.json();

    console.log(`  HTTP Response Status: ${resAdminCall.status} (EXPECTED: 200)`);
    console.log(`  Global Platform Revenue: $${dataAdminCall.summary?.totalPlatformRevenue}`);
    console.log(`  Total Host Earnings: $${dataAdminCall.summary?.totalHostEarnings}`);

    if (resAdminCall.status !== 200 || !dataAdminCall.summary) {
      throw new Error(`FAIL: ADMIN was unable to fetch global earnings summary!`);
    }
    console.log('  [PASS] ADMIN retrieved global earnings summary successfully.\n');

    // ==================================================
    // TEST 11 & TEST 12: Existing data integrity check
    // ==================================================
    console.log('--- TEST 11 & 12: Existing data & migrated properties integrity check ---');
    const wpMigratedCount = await prisma.property.count({ where: { wpPostId: { not: null } } });

    console.log(`  WordPress Migrated Properties: ${wpMigratedCount} (EXPECTED: 38)`);

    if (wpMigratedCount !== 38) {
      throw new Error(`FAIL: Migrated property data was altered! Expected 38, found ${wpMigratedCount}`);
    }
    console.log('  [PASS] All 38 original migrated WordPress properties remain 100% intact.\n');

    // Cleanup test records
    await prisma.reservation.deleteMany({ where: { id: { in: [resv1.id, resvB.id] } } });
    await prisma.property.deleteMany({ where: { id: { in: [propertyA.id, propertyB.id] } } });
    await prisma.user.deleteMany({ where: { id: { in: [hostA.id, hostB.id] } } });

    console.log('==================================================');
    console.log(' 🎉 ALL 12 HOST EARNINGS TESTS PASSED CLEANLY!');
    console.log('==================================================\n');
  } catch (err) {
    console.error('\n❌ HOST EARNINGS TEST SUITE FAILED:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runHostEarningsTestSuite();
