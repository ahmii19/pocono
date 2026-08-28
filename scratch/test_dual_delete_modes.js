const prisma = require('../server/src/config/prisma');
const propertyService = require('../server/src/services/propertyService');
const messageService = require('../server/src/services/messageService');

async function runDualDeleteModeTests() {
  console.log('==================================================');
  console.log(' DUAL PROPERTY DELETE MODES (SOFT & PERMANENT) SUITE');
  console.log('==================================================\n');

  let testHost, testGuest, adminUser, propA, propB;

  try {
    const timeId = Date.now();

    // Setup Admin, Host, Guest
    adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (!adminUser) throw new Error('No ADMIN user found in PostgreSQL');

    testHost = await prisma.user.create({
      data: {
        email: `host_del_${timeId}@example.com`,
        passwordHash: 'dummy',
        firstName: 'HostDeleteTest',
        lastName: 'User',
        role: 'HOST'
      }
    });

    testGuest = await prisma.user.create({
      data: {
        email: `guest_del_${timeId}@example.com`,
        passwordHash: 'dummy',
        firstName: 'GuestDeleteTest',
        lastName: 'User',
        role: 'GUEST'
      }
    });

    console.log('[SETUP COMPLETE]');
    console.log(`  Admin ID: ${adminUser.id}`);
    console.log(`  Host ID:  ${testHost.id}`);
    console.log(`  Guest ID: ${testGuest.id}\n`);

    // ==================================================
    // TEST A: SOFT DELETE VERIFICATION
    // ==================================================
    console.log('--- TEST A: SOFT DELETE ---');
    propA = await prisma.property.create({
      data: {
        title: `Soft Delete Test Villa ${timeId}`,
        slug: `soft-delete-test-villa-${timeId}`,
        description: 'Property created to test soft delete',
        address: '100 Soft Delete Lane',
        nightlyPrice: 200,
        status: 'PUBLISHED',
        hostId: testHost.id
      }
    });

    // Add dependent records to Property A
    await prisma.propertyImage.create({ data: { propertyId: propA.id, imageUrl: '/test-img1.jpg', displayOrder: 1 } });
    await prisma.favorite.create({ data: { userId: testGuest.id, propertyId: propA.id } });
    const msgA = await messageService.sendMessage({
      propertyId: propA.id,
      name: 'Guest Tester',
      email: testGuest.email,
      messageText: 'Hello host, soft delete test message'
    }, testGuest);

    console.log(`  Created Property A (${propA.id}) with Image, Favorite, and Message Thread (${msgA.threadId})`);

    // Perform Soft Delete
    const softDelRes = await propertyService.deleteProperty(propA.id, adminUser, { deleteMode: 'soft' });
    console.log(`  Soft Delete Result Message: "${softDelRes.message}"`);

    // Verify Property A remains in DB with status = 'DELETED'
    const dbPropA = await prisma.property.findUnique({ where: { id: propA.id } });
    if (!dbPropA || dbPropA.status !== 'DELETED') {
      throw new Error(`FAIL: Property A was not soft deleted properly in DB (status: ${dbPropA?.status})`);
    }

    // Verify dependent records REMAIN in DB
    const imagesA = await prisma.propertyImage.count({ where: { propertyId: propA.id } });
    const favsA = await prisma.favorite.count({ where: { propertyId: propA.id } });
    const threadsA = await prisma.messageThread.count({ where: { propertyId: propA.id } });

    if (imagesA !== 1 || favsA !== 1 || threadsA !== 1) {
      throw new Error(`FAIL: Dependent records were lost during Soft Delete! (images: ${imagesA}, favs: ${favsA}, threads: ${threadsA})`);
    }
    console.log('  [PASS] Property A status set to DELETED; all dependent images, favorites, and messages preserved 100% in DB.');

    // Verify Public Listing Exclusion
    const publicList = await propertyService.getProperties({ status: 'PUBLISHED' });
    const foundInPublic = publicList.data.some(p => p.id === propA.id);
    if (foundInPublic) {
      throw new Error(`FAIL: Soft-deleted Property A appeared in public published property list!`);
    }
    console.log('  [PASS] Soft-deleted property is strictly excluded from public property listings.\n');

    // Admin Restoration Test
    console.log('[TEST A-RESTORE: Admin Property Restoration Test]');
    const restoredPropA = await propertyService.updatePropertyStatus(propA.id, 'PUBLISHED', adminUser);
    if (restoredPropA.status !== 'PUBLISHED') {
      throw new Error(`FAIL: Admin restoration failed to set property status to PUBLISHED`);
    }
    console.log('  [PASS] Admin successfully restored soft-deleted property to PUBLISHED live status.\n');

    // ==================================================
    // TEST B: PERMANENT DELETE VERIFICATION
    // ==================================================
    console.log('--- TEST B: PERMANENT DELETE ---');
    propB = await prisma.property.create({
      data: {
        title: `Permanent Delete Test Villa ${timeId}`,
        slug: `permanent-delete-test-villa-${timeId}`,
        description: 'Property created to test permanent delete',
        address: '200 Permanent Delete Way',
        nightlyPrice: 350,
        status: 'PUBLISHED',
        hostId: testHost.id
      }
    });

    // Add dependent records to Property B
    const imgB1 = await prisma.propertyImage.create({ data: { propertyId: propB.id, imageUrl: '/perm-img1.jpg', displayOrder: 1 } });
    const imgB2 = await prisma.propertyImage.create({ data: { propertyId: propB.id, imageUrl: '/perm-img2.jpg', displayOrder: 2 } });
    await prisma.favorite.create({ data: { userId: testGuest.id, propertyId: propB.id } });
    const msgB = await messageService.sendMessage({
      propertyId: propB.id,
      name: 'Guest Tester',
      email: testGuest.email,
      messageText: 'Hello host, permanent delete test message'
    }, testGuest);
    const reviewB = await prisma.review.create({
      data: {
        propertyId: propB.id,
        guestId: testGuest.id,
        rating: 5,
        comment: 'Great property before permanent delete'
      }
    });

    console.log(`  Created Property B (${propB.id}) with 2 Images, 1 Favorite, 1 Thread (${msgB.threadId}), 1 Review`);

    // Perform Permanent Delete by ADMIN
    const permDelRes = await propertyService.deleteProperty(propB.id, adminUser, { deleteMode: 'permanent' });
    console.log(`  Permanent Delete Result Message: "${permDelRes.message}"`);

    // Verify Property B is COMPLETELY REMOVED from DB
    const dbPropB = await prisma.property.findUnique({ where: { id: propB.id } });
    if (dbPropB !== null) {
      throw new Error(`FAIL: Property B still exists in DB after Permanent Delete!`);
    }

    // Verify all dependent records are 0
    const imagesB = await prisma.propertyImage.count({ where: { propertyId: propB.id } });
    const favsB = await prisma.favorite.count({ where: { propertyId: propB.id } });
    const threadsB = await prisma.messageThread.count({ where: { propertyId: propB.id } });
    const messagesB = await prisma.message.count({ where: { threadId: msgB.threadId } });
    const reviewsB = await prisma.review.count({ where: { propertyId: propB.id } });

    console.log(`  Post-Permanent Delete Counts -> Property: 0, Images: ${imagesB}, Favorites: ${favsB}, Threads: ${threadsB}, Messages: ${messagesB}, Reviews: ${reviewsB}`);

    if (imagesB !== 0 || favsB !== 0 || threadsB !== 0 || messagesB !== 0 || reviewsB !== 0) {
      throw new Error(`FAIL: Orphan dependent records remained after Permanent Delete!`);
    }
    console.log('  [PASS] Property B and ALL dependent images, favorites, message threads, messages, and reviews deleted 100% cleanly without orphans.\n');

    // ==================================================
    // TEST D: AUTHORIZATION CHECKS
    // ==================================================
    console.log('--- TEST D: AUTHORIZATION SECURITY CHECKS ---');
    // Non-admin HOST attempts Permanent Delete
    let hostPermAttemptError = null;
    try {
      await propertyService.deleteProperty(propA.id, testHost, { deleteMode: 'permanent' });
    } catch (err) {
      hostPermAttemptError = err;
    }

    if (!hostPermAttemptError || !hostPermAttemptError.message.includes('Only Administrators')) {
      throw new Error(`FAIL: Host was allowed to request Permanent Delete or wrong error returned!`);
    }
    console.log('  [PASS] Security Check Passed: Non-admin HOST blocked from requesting Permanent Delete (403 Forbidden).\n');

    // CLEANUP
    console.log('[CLEANUP: Removing test entities...]');
    await prisma.message.deleteMany({ where: { thread: { propertyId: propA.id } } });
    await prisma.messageThread.deleteMany({ where: { propertyId: propA.id } });
    await prisma.propertyImage.deleteMany({ where: { propertyId: propA.id } });
    await prisma.favorite.deleteMany({ where: { propertyId: propA.id } });
    await prisma.property.deleteMany({ where: { id: propA.id } });
    await prisma.user.deleteMany({ where: { id: { in: [testHost.id, testGuest.id] } } });
    console.log('✅ Temporary test data cleaned up.');

    console.log('\n==================================================');
    console.log(' 🎉 ALL DUAL PROPERTY DELETE MODE TESTS PASSED!');
    console.log('==================================================\n');
  } catch (err) {
    console.error('\n❌ DUAL DELETE MODES TEST FAILED:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runDualDeleteModeTests();
