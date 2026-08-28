const prisma = require('../server/src/config/prisma');
const messageService = require('../server/src/services/messageService');

async function runRealHttpTest() {
  console.log('==================================================');
  console.log(' REAL HTTP ADMIN PERMANENT & SOFT DELETE TEST');
  console.log('==================================================\n');

  try {
    // 1. Initial WP Property Count Check
    const initialWpCount = await prisma.property.count({
      where: { wpPostId: { not: null } }
    });
    console.log(`[WP MIGRATED PROPERTIES CHECK] Initial Count: ${initialWpCount}`);
    if (initialWpCount !== 38) {
      throw new Error(`CRITICAL: Expected 38 migrated WP properties, found ${initialWpCount}`);
    }
    console.log('  [PASS] 38 original migrated WP properties verified intact.\n');

    // 2. Fetch Users & Admin Token
    const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    const hostUser = await prisma.user.findFirst({ where: { role: 'HOST' } });
    const guestUser = await prisma.user.findFirst({ where: { role: 'GUEST' } });

    const { signToken } = require('../server/src/utils/jwt');
    const token = signToken({ userId: adminUser.id, role: adminUser.role, email: adminUser.email });

    console.log(`[ADMIN LOGIN SUCCESS] Token generated for ${adminUser.email}\n`);

    // ==================================================
    // TEST 1: REAL HTTP PERMANENT DELETE
    // ==================================================
    console.log('--- TEST 1: REAL HTTP PERMANENT DELETE ---');
    const timeA = Date.now();
    const propA = await prisma.property.create({
      data: {
        title: `Real HTTP Perm Delete Property ${timeA}`,
        slug: `real-http-perm-delete-property-${timeA}`,
        description: 'Test real HTTP permanent delete endpoint',
        address: '123 Real Perm Delete St',
        nightlyPrice: 300,
        status: 'PUBLISHED',
        hostId: hostUser.id
      }
    });

    // Add dependents to Property A
    const imgA1 = await prisma.propertyImage.create({ data: { propertyId: propA.id, imageUrl: '/perm-a1.jpg', displayOrder: 1 } });
    const imgA2 = await prisma.propertyImage.create({ data: { propertyId: propA.id, imageUrl: '/perm-a2.jpg', displayOrder: 2 } });
    const favA = await prisma.favorite.create({ data: { userId: guestUser.id, propertyId: propA.id } });
    const msgA = await messageService.sendMessage({
      propertyId: propA.id,
      name: 'Real HTTP Tester',
      email: guestUser.email,
      messageText: 'Permanent delete real HTTP test message 1'
    }, guestUser);
    const revA = await prisma.review.create({
      data: {
        propertyId: propA.id,
        guestId: guestUser.id,
        rating: 5,
        comment: 'Permanent delete real HTTP review'
      }
    });

    console.log(`  Created Property A: "${propA.title}" (${propA.id})`);
    console.log(`  Created Dependents: 2 Images, 1 Favorite, 1 MessageThread (${msgA.threadId}), 1 Message, 1 Review`);

    const targetUrlA = `http://localhost:5000/api/v1/admin/properties/${propA.id}?deleteMode=permanent`;
    console.log(`\n  Executing HTTP DELETE: ${targetUrlA}`);

    const resA = await fetch(targetUrlA, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ deleteMode: 'permanent' })
    });

    const dataA = await resA.json();
    console.log(`  HTTP Response Status: ${resA.status}`);
    console.log(`  HTTP Response Body:  `, dataA);

    if (!resA.ok || dataA.success !== true) {
      throw new Error(`FAIL: HTTP request returned error: ${JSON.stringify(dataA)}`);
    }

    // Direct PostgreSQL Verification for Property A
    console.log('\n  Checking PostgreSQL database directly...');
    const sqlResA = await prisma.$queryRaw`SELECT id, title, status FROM properties WHERE id = ${propA.id}::uuid`;
    const countImagesA = await prisma.propertyImage.count({ where: { propertyId: propA.id } });
    const countThreadsA = await prisma.messageThread.count({ where: { propertyId: propA.id } });
    const countMessagesA = await prisma.message.count({ where: { threadId: msgA.threadId } });
    const countFavsA = await prisma.favorite.count({ where: { propertyId: propA.id } });
    const countReviewsA = await prisma.review.count({ where: { propertyId: propA.id } });

    console.log(`  Direct SQL Query Result for Property A:`, sqlResA);
    console.log(`  PostgreSQL Property Rows: ${sqlResA.length} (EXPECTED: 0)`);
    console.log(`  Dependent Images:         ${countImagesA} (EXPECTED: 0)`);
    console.log(`  Dependent MessageThreads: ${countThreadsA} (EXPECTED: 0)`);
    console.log(`  Dependent Messages:       ${countMessagesA} (EXPECTED: 0)`);
    console.log(`  Dependent Favorites:      ${countFavsA} (EXPECTED: 0)`);
    console.log(`  Dependent Reviews:        ${countReviewsA} (EXPECTED: 0)`);

    if (sqlResA.length !== 0) {
      throw new Error(`FAIL: Property row still exists in PostgreSQL after HTTP Permanent Delete! Status was set to ${sqlResA[0].status}!`);
    }

    if (countImagesA !== 0 || countThreadsA !== 0 || countMessagesA !== 0 || countFavsA !== 0 || countReviewsA !== 0) {
      throw new Error(`FAIL: Orphan dependent records remained after HTTP Permanent Delete!`);
    }

    console.log('  [PASS] Permanent Delete physically removed property row and all dependents from PostgreSQL.\n');

    // ==================================================
    // TEST 2: REAL HTTP SOFT DELETE
    // ==================================================
    console.log('--- TEST 2: REAL HTTP SOFT DELETE ---');
    const timeB = Date.now();
    const propB = await prisma.property.create({
      data: {
        title: `Real HTTP Soft Delete Property ${timeB}`,
        slug: `real-http-soft-delete-property-${timeB}`,
        description: 'Test real HTTP soft delete endpoint',
        address: '456 Real Soft Delete Ave',
        nightlyPrice: 250,
        status: 'PUBLISHED',
        hostId: hostUser.id
      }
    });

    await prisma.propertyImage.create({ data: { propertyId: propB.id, imageUrl: '/soft-b1.jpg', displayOrder: 1 } });
    await prisma.favorite.create({ data: { userId: guestUser.id, propertyId: propB.id } });

    console.log(`  Created Property B: "${propB.title}" (${propB.id})`);

    const targetUrlB = `http://localhost:5000/api/v1/admin/properties/${propB.id}?deleteMode=soft`;
    console.log(`\n  Executing HTTP DELETE: ${targetUrlB}`);

    const resB = await fetch(targetUrlB, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ deleteMode: 'soft' })
    });

    const dataB = await resB.json();
    console.log(`  HTTP Response Status: ${resB.status}`);
    console.log(`  HTTP Response Body:  `, dataB);

    if (!resB.ok || dataB.success !== true) {
      throw new Error(`FAIL: HTTP request returned error: ${JSON.stringify(dataB)}`);
    }

    // Direct PostgreSQL Verification for Property B
    console.log('\n  Checking PostgreSQL database directly...');
    const sqlResB = await prisma.$queryRaw`SELECT id, title, status FROM properties WHERE id = ${propB.id}::uuid`;
    const countImagesB = await prisma.propertyImage.count({ where: { propertyId: propB.id } });

    console.log(`  Direct SQL Query Result for Property B:`, sqlResB);
    console.log(`  PostgreSQL Property Rows: ${sqlResB.length} (EXPECTED: 1)`);
    console.log(`  Property Status in DB:    "${sqlResB[0]?.status}" (EXPECTED: DELETED)`);
    console.log(`  Preserved Dependent Images: ${countImagesB} (EXPECTED: 1)`);

    if (sqlResB.length !== 1 || sqlResB[0].status !== 'DELETED') {
      throw new Error(`FAIL: Soft delete did not preserve property row or set status to DELETED!`);
    }

    if (countImagesB !== 1) {
      throw new Error(`FAIL: Soft delete lost dependent image records!`);
    }

    console.log('  [PASS] Soft Delete safely preserved property row and data in PostgreSQL with status = DELETED.\n');

    // Cleanup Property B
    await prisma.propertyImage.deleteMany({ where: { propertyId: propB.id } });
    await prisma.favorite.deleteMany({ where: { propertyId: propB.id } });
    await prisma.property.delete({ where: { id: propB.id } });

    // Final WP Property Count Check
    const finalWpCount = await prisma.property.count({
      where: { wpPostId: { not: null } }
    });
    console.log(`[WP MIGRATED PROPERTIES CHECK] Final Count: ${finalWpCount}`);
    if (finalWpCount !== 38) {
      throw new Error(`CRITICAL: Migrated WP property count changed to ${finalWpCount}! Expected 38.`);
    }
    console.log('  [PASS] All 38 original migrated WP properties remain 100% untouched.\n');

    console.log('==================================================');
    console.log(' 🎉 REAL HTTP ADMIN PERMANENT & SOFT DELETE TEST PASSED!');
    console.log('==================================================\n');
  } catch (err) {
    console.error('\n❌ REAL HTTP TEST FAILED:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runRealHttpTest();
