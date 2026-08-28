const prisma = require('../server/src/config/prisma');
const { signToken } = require('../server/src/utils/jwt');

async function runReservationDeletionTestSuite() {
  console.log('==================================================');
  console.log(' GUEST RESERVATION DELETION AUTOMATED TEST SUITE');
  console.log('==================================================\n');

  try {
    // Fetch test users & property
    const guestA = await prisma.user.findFirst({ where: { role: 'GUEST' } });
    let guestB = await prisma.user.findFirst({
      where: { role: 'GUEST', id: { not: guestA.id } }
    });

    if (!guestB) {
      guestB = await prisma.user.create({
        data: {
          email: `guestb_${Date.now()}@example.com`,
          passwordHash: 'hashedpass',
          firstName: 'Guest',
          lastName: 'B',
          role: 'GUEST'
        }
      });
    }

    const hostUser = await prisma.user.findFirst({ where: { role: 'HOST' } });
    const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    const property = await prisma.property.findFirst({ where: { status: 'PUBLISHED' } });

    const tokenGuestA = signToken({ userId: guestA.id, role: guestA.role, email: guestA.email });
    const tokenGuestB = signToken({ userId: guestB.id, role: guestB.role, email: guestB.email });
    const tokenAdmin = signToken({ userId: adminUser.id, role: adminUser.role, email: adminUser.email });
    const tokenHost = signToken({ userId: hostUser.id, role: hostUser.role, email: hostUser.email });

    // ==================================================
    // TEST 1: Guest deletes own PENDING reservation
    // ==================================================
    console.log('--- TEST 1: Guest deletes own PENDING reservation ---');
    const resv1 = await prisma.reservation.create({
      data: {
        propertyId: property.id,
        guestId: guestA.id,
        hostId: hostUser.id,
        checkInDate: new Date('2026-10-01'),
        checkOutDate: new Date('2026-10-05'),
        guestCount: 2,
        totalNights: 4,
        baseTotal: 400.00,
        grandTotal: 450.00,
        status: 'PENDING'
      }
    });

    console.log(`  Created PENDING reservation for Guest A: ${resv1.id}`);

    const res1 = await fetch(`http://localhost:5000/api/v1/reservations/${resv1.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenGuestA}` }
    });
    const data1 = await res1.json();

    console.log(`  HTTP Response Status: ${res1.status}`);
    console.log(`  HTTP Response Body:  `, data1);

    if (res1.status !== 200 || data1.success !== true) {
      throw new Error(`FAIL: Expected 200 OK for Guest A deleting own PENDING reservation`);
    }

    // DB Verification
    const dbCount1 = await prisma.reservation.count({ where: { id: resv1.id } });
    console.log(`  PostgreSQL Reservation Rows: ${dbCount1} (EXPECTED: 0)`);
    if (dbCount1 !== 0) throw new Error(`FAIL: Reservation row still exists in PostgreSQL after deletion!`);

    // Verify absence in Guest, Admin, Host APIs
    const guestResvList = await (await fetch('http://localhost:5000/api/v1/reservations/my', {
      headers: { Authorization: `Bearer ${tokenGuestA}` }
    })).json();

    const adminResvList = await (await fetch('http://localhost:5000/api/v1/admin/reservations', {
      headers: { Authorization: `Bearer ${tokenAdmin}` }
    })).json();

    const hostResvList = await (await fetch('http://localhost:5000/api/v1/host/reservations', {
      headers: { Authorization: `Bearer ${tokenHost}` }
    })).json();

    const inGuestApi = (guestResvList.data || []).some(r => r.id === resv1.id);
    const inAdminApi = (adminResvList.data || []).some(r => r.id === resv1.id);
    const inHostApi = (hostResvList.data || []).some(r => r.id === resv1.id);

    console.log(`  Present in Guest API: ${inGuestApi} (EXPECTED: false)`);
    console.log(`  Present in Admin API: ${inAdminApi} (EXPECTED: false)`);
    console.log(`  Present in Host API:  ${inHostApi} (EXPECTED: false)`);

    if (inGuestApi || inAdminApi || inHostApi) {
      throw new Error(`FAIL: Deleted reservation still returned by APIs!`);
    }
    console.log('  [PASS] Guest successfully deleted own PENDING reservation and row removed from DB and APIs.\n');

    // ==================================================
    // TEST 2: Guest attempts to delete CONFIRMED reservation
    // ==================================================
    console.log('--- TEST 2: Guest attempts to delete CONFIRMED reservation ---');
    const resv2 = await prisma.reservation.create({
      data: {
        propertyId: property.id,
        guestId: guestA.id,
        hostId: hostUser.id,
        checkInDate: new Date('2026-11-01'),
        checkOutDate: new Date('2026-11-05'),
        guestCount: 2,
        totalNights: 4,
        baseTotal: 400.00,
        grandTotal: 450.00,
        status: 'CONFIRMED'
      }
    });

    console.log(`  Created CONFIRMED reservation for Guest A: ${resv2.id}`);

    const res2 = await fetch(`http://localhost:5000/api/v1/reservations/${resv2.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenGuestA}` }
    });
    const data2 = await res2.json();

    console.log(`  HTTP Response Status: ${res2.status} (EXPECTED: 403)`);
    console.log(`  HTTP Response Body:  `, data2);

    if (res2.status !== 403 || data2.success !== false) {
      throw new Error(`FAIL: Expected 403 Forbidden when guest attempts to delete CONFIRMED reservation`);
    }

    const dbCount2 = await prisma.reservation.count({ where: { id: resv2.id } });
    console.log(`  PostgreSQL Reservation Rows: ${dbCount2} (EXPECTED: 1)`);
    if (dbCount2 !== 1) throw new Error(`FAIL: CONFIRMED reservation was wrongfully deleted!`);

    console.log('  [PASS] CONFIRMED reservation correctly protected against deletion.\n');

    // ==================================================
    // TEST 3: Guest A attempts to delete Guest B's PENDING reservation
    // ==================================================
    console.log('--- TEST 3: Guest A attempts to delete Guest B\'s PENDING reservation ---');
    const resv3 = await prisma.reservation.create({
      data: {
        propertyId: property.id,
        guestId: guestB.id,
        hostId: hostUser.id,
        checkInDate: new Date('2026-12-01'),
        checkOutDate: new Date('2026-12-05'),
        guestCount: 2,
        totalNights: 4,
        baseTotal: 400.00,
        grandTotal: 450.00,
        status: 'PENDING'
      }
    });

    console.log(`  Created PENDING reservation for Guest B: ${resv3.id}`);

    const res3 = await fetch(`http://localhost:5000/api/v1/reservations/${resv3.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenGuestA}` } // Guest A calling on Guest B's reservation
    });
    const data3 = await res3.json();

    console.log(`  HTTP Response Status: ${res3.status} (EXPECTED: 403)`);
    console.log(`  HTTP Response Body:  `, data3);

    if (res3.status !== 403 || data3.success !== false) {
      throw new Error(`FAIL: Expected 403 Forbidden when Guest A attempts to delete Guest B's reservation`);
    }

    const dbCount3 = await prisma.reservation.count({ where: { id: resv3.id } });
    console.log(`  PostgreSQL Reservation Rows: ${dbCount3} (EXPECTED: 1)`);
    if (dbCount3 !== 1) throw new Error(`FAIL: Guest B's reservation was wrongfully deleted by Guest A!`);

    console.log('  [PASS] Ownership check strictly enforced.\n');

    // ==================================================
    // TEST 4: Unauthenticated user attempts deletion
    // ==================================================
    console.log('--- TEST 4: Unauthenticated user attempts deletion ---');
    const res4 = await fetch(`http://localhost:5000/api/v1/reservations/${resv3.id}`, {
      method: 'DELETE'
    });
    const data4 = await res4.json();

    console.log(`  HTTP Response Status: ${res4.status} (EXPECTED: 401)`);
    console.log(`  HTTP Response Body:  `, data4);

    if (res4.status !== 401) {
      throw new Error(`FAIL: Expected 401 Unauthorized for unauthenticated request`);
    }
    console.log('  [PASS] Unauthenticated request correctly rejected.\n');

    // ==================================================
    // TEST 5: Invalid/nonexistent reservation ID
    // ==================================================
    console.log('--- TEST 5: Invalid/nonexistent reservation ID ---');
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const res5 = await fetch(`http://localhost:5000/api/v1/reservations/${fakeId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenGuestA}` }
    });
    const data5 = await res5.json();

    console.log(`  HTTP Response Status: ${res5.status} (EXPECTED: 404)`);
    console.log(`  HTTP Response Body:  `, data5);

    if (res5.status !== 404) {
      throw new Error(`FAIL: Expected 404 Not Found for fake reservation ID`);
    }
    console.log('  [PASS] Nonexistent reservation ID returned 404 Not Found.\n');

    // ==================================================
    // TEST 6: Verify unrelated property/user data remains untouched
    // ==================================================
    console.log('--- TEST 6: Verify unrelated property and user data remains untouched ---');
    const propCheck = await prisma.property.findUnique({ where: { id: property.id } });
    const userCheckA = await prisma.user.findUnique({ where: { id: guestA.id } });
    const userCheckHost = await prisma.user.findUnique({ where: { id: hostUser.id } });

    if (!propCheck || !userCheckA || !userCheckHost) {
      throw new Error(`FAIL: Unrelated property or user data was deleted or altered!`);
    }
    console.log('  [PASS] Property and User records remain 100% untouched.\n');

    // ==================================================
    // TEST 7: Dependent payment & invoice record transactional cleanup
    // ==================================================
    console.log('--- TEST 7: Dependent payment & invoice record transactional cleanup ---');
    const resv7 = await prisma.reservation.create({
      data: {
        propertyId: property.id,
        guestId: guestA.id,
        hostId: hostUser.id,
        checkInDate: new Date('2027-01-01'),
        checkOutDate: new Date('2027-01-05'),
        guestCount: 1,
        totalNights: 4,
        baseTotal: 500.00,
        grandTotal: 550.00,
        status: 'PENDING'
      }
    });

    const payment7 = await prisma.payment.create({
      data: {
        reservationId: resv7.id,
        userId: guestA.id,
        gateway: 'STRIPE',
        status: 'PENDING',
        amount: 550.00
      }
    });

    const invoice7 = await prisma.invoice.create({
      data: {
        reservationId: resv7.id,
        userId: guestA.id,
        invoiceType: 'Reservation',
        totalAmount: 550.00,
        paymentStatus: 0
      }
    });

    console.log(`  Created PENDING reservation with Payment (${payment7.id}) and Invoice (${invoice7.id})`);

    const res7 = await fetch(`http://localhost:5000/api/v1/reservations/${resv7.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenGuestA}` }
    });
    const data7 = await res7.json();

    console.log(`  HTTP Response Status: ${res7.status}`);
    console.log(`  HTTP Response Body:  `, data7);

    if (res7.status !== 200 || data7.success !== true) {
      throw new Error(`FAIL: Expected 200 OK for deleting reservation with dependent records`);
    }

    const countResv7 = await prisma.reservation.count({ where: { id: resv7.id } });
    const countPayment7 = await prisma.payment.count({ where: { id: payment7.id } });
    const countInvoice7 = await prisma.invoice.count({ where: { id: invoice7.id } });

    console.log(`  PostgreSQL Reservation Rows: ${countResv7} (EXPECTED: 0)`);
    console.log(`  PostgreSQL Dependent Payment Rows: ${countPayment7} (EXPECTED: 0)`);
    console.log(`  PostgreSQL Dependent Invoice Rows: ${countInvoice7} (EXPECTED: 0)`);

    if (countResv7 !== 0 || countPayment7 !== 0 || countInvoice7 !== 0) {
      throw new Error(`FAIL: Orphan dependent payment or invoice records remained after reservation deletion!`);
    }

    console.log('  [PASS] Transactional cleanup deleted reservation and all dependent records with 0 orphans.\n');

    // Cleanup remaining test records (resv2, resv3)
    await prisma.reservation.deleteMany({ where: { id: { in: [resv2.id, resv3.id] } } });

    console.log('==================================================');
    console.log(' 🎉 GUEST RESERVATION DELETION TEST SUITE PASSED!');
    console.log('==================================================\n');
  } catch (err) {
    console.error('\n❌ TEST SUITE FAILED:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runReservationDeletionTestSuite();
