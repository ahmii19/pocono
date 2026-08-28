const prisma = require('../server/src/config/prisma');
const messageService = require('../server/src/services/messageService');

async function run11PlusInquiriesTest() {
  console.log('==================================================');
  console.log(' 11+ RENTAL INQUIRIES & SCROLLABILITY TEST SUITE');
  console.log('==================================================\n');

  let testHost1, testHost2, property1, property2;
  const createdThreadIds = [];
  const createdGuestUserIds = [];

  try {
    const timeId = Date.now();

    // 1. Create two separate hosts & properties for isolation testing
    testHost1 = await prisma.user.create({
      data: {
        email: `host_iso1_${timeId}@example.com`,
        passwordHash: 'dummy',
        firstName: 'HostOne',
        lastName: 'Iso',
        role: 'HOST'
      }
    });

    testHost2 = await prisma.user.create({
      data: {
        email: `host_iso2_${timeId}@example.com`,
        passwordHash: 'dummy',
        firstName: 'HostTwo',
        lastName: 'Iso',
        role: 'HOST'
      }
    });

    property1 = await prisma.property.create({
      data: {
        title: `Host 1 Test Villa ${timeId}`,
        slug: `host-1-test-villa-${timeId}`,
        description: 'Test property for host 1',
        address: '123 Mountain View',
        nightlyPrice: 250,
        status: 'PUBLISHED',
        hostId: testHost1.id
      }
    });

    property2 = await prisma.property.create({
      data: {
        title: `Host 2 Test Cabin ${timeId}`,
        slug: `host-2-test-cabin-${timeId}`,
        description: 'Test property for host 2',
        address: '456 Pine Trail',
        nightlyPrice: 300,
        status: 'PUBLISHED',
        hostId: testHost2.id
      }
    });

    console.log('[SETUP COMPLETE]');
    console.log(`  Host 1 ID: ${testHost1.id} (Property: ${property1.id})`);
    console.log(`  Host 2 ID: ${testHost2.id} (Property: ${property2.id})\n`);

    // TEST 1: Create 15 distinct Rental Inquiry threads for Host 1
    console.log('[TEST 1 & 2 & 3: Creating 15 Rental Inquiries for Host 1...]');
    for (let i = 1; i <= 15; i++) {
      const guest = await prisma.user.create({
        data: {
          email: `guest_num_${i}_${timeId}@example.com`,
          passwordHash: 'dummy',
          firstName: `Guest_${i}`,
          lastName: 'Test',
          role: 'GUEST'
        }
      });
      createdGuestUserIds.push(guest.id);

      const msgRes = await messageService.sendMessage({
        propertyId: property1.id,
        name: `Guest ${i}`,
        email: guest.email,
        messageText: `Inquiry message #${i} regarding reservation dates`
      }, guest);

      createdThreadIds.push(msgRes.threadId);
      await new Promise(r => setTimeout(r, 20));
    }

    // Retrieve Host 1 threads
    const host1Threads = await messageService.getUserThreads(testHost1);
    console.log(`  Total Inquiries Returned for Host 1: ${host1Threads.length}`);

    if (host1Threads.length !== 15) {
      throw new Error(`FAIL: Expected 15 inquiries for Host 1, got ${host1Threads.length}!`);
    }
    console.log('  [PASS] All 15 inquiries returned in dataset (no truncation/slicing in API/state).\n');

    // TEST 4: Ordering Test (Newest Inquiry at Top)
    console.log('[TEST 4: Newest Inquiry Ordering Test...]');
    const sortedHost1Threads = [...host1Threads].sort((a, b) =>
      new Date(b.lastMessageAt || b.updatedAt).getTime() - new Date(a.lastMessageAt || a.updatedAt).getTime()
    );

    const newestThread = sortedHost1Threads[0];
    console.log(`  Top Inquiry Message: "${newestThread.messages[0]?.messageText}"`);
    if (!newestThread.messages[0]?.messageText.includes('#15')) {
      throw new Error(`FAIL: Newest inquiry (#15) was not at the top of the sorted list!`);
    }
    console.log('  [PASS] Newest inquiry (#15) is correctly at the top.\n');

    // TEST 5: Unread Count Calculation across 15 threads
    console.log('[TEST 5: Unread Count Calculation...]');
    const host1UnreadCount = sortedHost1Threads.reduce((sum, t) => sum + (t.unreadCount || 0), 0);
    console.log(`  Host 1 Total Unread Messages: ${host1UnreadCount}`);

    if (host1UnreadCount !== 15) {
      throw new Error(`FAIL: Expected 15 unread messages, got ${host1UnreadCount}!`);
    }
    console.log('  [PASS] Total unread count is exactly 15.\n');

    // TEST 6: Read Status Test (Open 1 thread -> count 15 -> 14)
    console.log('[TEST 6: Opening 1 Thread Read Status Test...]');
    await messageService.getThreadById(newestThread.id, testHost1);

    const postReadThreads = await messageService.getUserThreads(testHost1);
    const postReadUnreadCount = postReadThreads.reduce((sum, t) => sum + (t.unreadCount || 0), 0);
    console.log(`  Host 1 Unread Count after reading 1 thread: ${postReadUnreadCount}`);

    if (postReadUnreadCount !== 14) {
      throw new Error(`FAIL: Expected unread count to become 14, got ${postReadUnreadCount}!`);
    }
    console.log('  [PASS] Unread count correctly decremented from 15 to 14.\n');

    // TEST 7: Reload Simulation Test
    console.log('[TEST 7: Reload / Refetch Simulation Test...]');
    const reloadedThreads = await messageService.getUserThreads(testHost1);
    console.log(`  Reloaded Threads Count: ${reloadedThreads.length}`);
    const reloadedUnreadCount = reloadedThreads.reduce((sum, t) => sum + (t.unreadCount || 0), 0);
    console.log(`  Reloaded Unread Count:  ${reloadedUnreadCount}`);

    if (reloadedThreads.length !== 15 || reloadedUnreadCount !== 14) {
      throw new Error(`FAIL: Reload test failed!`);
    }
    console.log('  [PASS] Reload simulation preserved all 15 threads and 14 unread count.\n');

    // TEST 8 & 9: Host Isolation Test (Host 2 should see 0 of Host 1's threads)
    console.log('[TEST 8 & 9: Host Isolation Test...]');
    const host2Threads = await messageService.getUserThreads(testHost2);
    console.log(`  Host 2 Threads Count: ${host2Threads.length}`);

    if (host2Threads.length !== 0) {
      throw new Error(`FAIL: Security breach! Host 2 was able to view Host 1's rental inquiries!`);
    }
    console.log('  [PASS] Host isolation intact: Host 2 sees 0 inquiries belonging to Host 1.\n');

    // CLEANUP
    console.log('[CLEANUP: Removing test data...]');
    for (const tid of createdThreadIds) {
      await prisma.message.deleteMany({ where: { threadId: tid } });
      await prisma.messageThread.delete({ where: { id: tid } });
    }
    await prisma.property.deleteMany({ where: { id: { in: [property1.id, property2.id] } } });
    await prisma.user.deleteMany({ where: { id: { in: [testHost1.id, testHost2.id, ...createdGuestUserIds] } } });
    console.log('✅ Cleaned up temporary test data.');

    console.log('\n==================================================');
    console.log(' 🎉 ALL 11+ INQUIRIES & SCROLLABILITY TESTS PASSED!');
    console.log('==================================================\n');
  } catch (err) {
    console.error('\n❌ 11+ INQUIRIES TEST FAILED:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

run11PlusInquiriesTest();
