const prisma = require('../server/src/config/prisma');
const adminService = require('../server/src/services/adminService');
const propertyService = require('../server/src/services/propertyService');
const messageService = require('../server/src/services/messageService');

async function runFixVerification() {
  console.log('==================================================');
  console.log(' FIX PERMANENT DELETE BUG — VERIFICATION SUITE');
  console.log('==================================================\n');

  try {
    // STEP 1: Verify initial state of 38 migrated WordPress properties
    const initialWpCount = await prisma.property.count({
      where: { wpPostId: { not: null } }
    });
    console.log(`[INITIAL MIGRATED WP PROPERTIES CHECK] Count: ${initialWpCount}`);
    if (initialWpCount !== 38) {
      throw new Error(`CRITICAL: Migrated WP property count is ${initialWpCount}, expected 38!`);
    }
    console.log('  [PASS] All 38 migrated WP properties verified intact.\n');

    const totalBefore = await prisma.property.count();
    const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    const hostUser = await prisma.user.findFirst({ where: { role: 'HOST' } });
    const guestUser = await prisma.user.findFirst({ where: { role: 'GUEST' } });

    console.log(`[SETUP TEST ENTITY]`);
    console.log(`  Total Properties in DB before test: ${totalBefore}`);
    console.log(`  Admin User: ${adminUser.email} (${adminUser.id})`);
    console.log(`  Host User:  ${hostUser.email} (${hostUser.id})`);
    console.log(`  Guest User: ${guestUser.email} (${guestUser.id})\n`);

    // STEP 2: Create a NEW dedicated test property (NEVER touch original 38 WP properties)
    const timeId = Date.now();
    const testProp = await prisma.property.create({
      data: {
        title: `Test Permanent Delete Fix Property ${timeId}`,
        slug: `test-permanent-delete-fix-property-${timeId}`,
        description: 'Temporary test property to verify physical PostgreSQL deletion',
        address: '999 Permanent Delete Blvd',
        nightlyPrice: 299,
        status: 'PUBLISHED',
        hostId: hostUser.id
      }
    });

    console.log(`  Created Test Property: "${testProp.title}" (ID: ${testProp.id})`);

    // Add dependent records
    const img1 = await prisma.propertyImage.create({ data: { propertyId: testProp.id, imageUrl: '/test-p1.jpg', displayOrder: 1 } });
    const img2 = await prisma.propertyImage.create({ data: { propertyId: testProp.id, imageUrl: '/test-p2.jpg', displayOrder: 2 } });
    const fav = await prisma.favorite.create({ data: { userId: guestUser.id, propertyId: testProp.id } });
    const msg = await messageService.sendMessage({
      propertyId: testProp.id,
      name: 'Bug Tester',
      email: guestUser.email,
      messageText: 'Permanent delete fix verification message'
    }, guestUser);
    const rev = await prisma.review.create({
      data: {
        propertyId: testProp.id,
        guestId: guestUser.id,
        rating: 5,
        comment: 'Great property before permanent delete fix verification'
      }
    });

    console.log(`  Created Dependents -> Images: 2, Favorite: 1, Message Thread: 1 (${msg.threadId}), Messages: 1, Review: 1\n`);

    // Verify DB counts prior to permanent delete
    const propCountPre = await prisma.property.count({ where: { id: testProp.id } });
    const imgCountPre = await prisma.propertyImage.count({ where: { propertyId: testProp.id } });
    const threadCountPre = await prisma.messageThread.count({ where: { propertyId: testProp.id } });
    const msgCountPre = await prisma.message.count({ where: { threadId: msg.threadId } });
    const favCountPre = await prisma.favorite.count({ where: { propertyId: testProp.id } });
    const revCountPre = await prisma.review.count({ where: { propertyId: testProp.id } });

    console.log('--- PRE-DELETE DB STATE ---');
    console.log(`  Property row count: ${propCountPre}`);
    console.log(`  Image records:     ${imgCountPre}`);
    console.log(`  Message threads:   ${threadCountPre}`);
    console.log(`  Messages:          ${msgCountPre}`);
    console.log(`  Favorites:         ${favCountPre}`);
    console.log(`  Reviews:           ${revCountPre}\n`);

    // STEP 3: Execute Permanent Delete via adminService
    console.log('--- EXECUTING PERMANENT DELETE ---');
    const deleteResult = await adminService.deletePropertyAdmin(testProp.id, { deleteMode: 'permanent' });
    console.log(`  Delete Result:`, deleteResult);
    console.log(`  Returned deleteMode: "${deleteResult.deleteMode}"\n`);

    // STEP 4: Query PostgreSQL directly to verify physical deletion
    console.log('--- POST-DELETE DIRECT POSTGRESQL VERIFICATION ---');
    const dbRowsPost = await prisma.$queryRaw`SELECT id, title, status FROM properties WHERE id = ${testProp.id}::uuid`;
    console.log(`  Direct SQL Query (SELECT FROM properties WHERE id = '${testProp.id}'):`, dbRowsPost);

    const propCountPost = dbRowsPost.length;
    const imgCountPost = await prisma.propertyImage.count({ where: { propertyId: testProp.id } });
    const threadCountPost = await prisma.messageThread.count({ where: { propertyId: testProp.id } });
    const msgCountPost = await prisma.message.count({ where: { threadId: msg.threadId } });
    const favCountPost = await prisma.favorite.count({ where: { propertyId: testProp.id } });
    const revCountPost = await prisma.review.count({ where: { propertyId: testProp.id } });

    console.log(`  Property row count in DB: ${propCountPost} (EXPECTED: 0)`);
    console.log(`  Image records:            ${imgCountPost} (EXPECTED: 0)`);
    console.log(`  Message threads:          ${threadCountPost} (EXPECTED: 0)`);
    console.log(`  Messages:                 ${msgCountPost} (EXPECTED: 0)`);
    console.log(`  Favorites:                ${favCountPost} (EXPECTED: 0)`);
    console.log(`  Reviews:                  ${revCountPost} (EXPECTED: 0)`);

    if (propCountPost !== 0) {
      throw new Error(`FAIL: Property row still exists in PostgreSQL! status was set to DELETED instead of physical row deletion!`);
    }

    if (imgCountPost !== 0 || threadCountPost !== 0 || msgCountPost !== 0 || favCountPost !== 0 || revCountPost !== 0) {
      throw new Error(`FAIL: Dependent records remained in PostgreSQL after permanent delete!`);
    }

    console.log('  [PASS] Property row physically removed from PostgreSQL (0 rows returned).');
    console.log('  [PASS] All dependent records physically deleted (0 orphan records).\n');

    // STEP 5: Re-verify 38 migrated WordPress properties are untouched
    const finalWpCount = await prisma.property.count({
      where: { wpPostId: { not: null } }
    });
    console.log(`[FINAL MIGRATED WP PROPERTIES CHECK] Count: ${finalWpCount}`);
    if (finalWpCount !== 38) {
      throw new Error(`CRITICAL: Migrated WP property count changed to ${finalWpCount}! Expected 38.`);
    }
    console.log('  [PASS] All 38 original migrated WP properties remain 100% untouched.\n');

    // STEP 6: Verify Admin Total Listings metric (excludes DELETED)
    const stats = await adminService.getAdminStats();
    console.log(`[ADMIN STATS CHECK] Total Active Properties (excluding soft-deleted): ${stats.totalProperties}`);

    console.log('\n==================================================');
    console.log(' 🎉 PERMANENT DELETE BUG FIX VERIFIED 100% SUCCESS!');
    console.log('==================================================\n');
  } catch (err) {
    console.error('\n❌ FIX VERIFICATION FAILED:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runFixVerification();
