const prisma = require('../server/src/config/prisma');
const messageService = require('../server/src/services/messageService');

async function runUnreadCountFlowTests() {
  console.log('==================================================');
  console.log(' UNREAD MESSAGE COUNT FLOW VERIFICATION SUITE');
  console.log('==================================================\n');

  try {
    // 1. Get an existing published property and host
    const property = await prisma.property.findFirst({
      where: { status: 'PUBLISHED' },
      include: { host: true }
    });

    if (!property) throw new Error('No published property found in PostgreSQL');

    const hostId = property.hostId;
    const hostUser = property.host || { id: hostId, role: 'HOST' };
    const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });

    // Create a temporary test guest
    const timeId = Date.now();
    const guestUser = await prisma.user.create({
      data: {
        email: `unread_test_guest_${timeId}@example.com`,
        passwordHash: 'dummy',
        firstName: 'UnreadTest',
        lastName: 'Guest',
        role: 'GUEST'
      }
    });

    console.log(`[SETUP COMPLETED]`);
    console.log(`  Property ID:  ${property.id}`);
    console.log(`  Host ID:      ${hostId}`);
    console.log(`  Guest ID:     ${guestUser.id}\n`);

    // STEP 1: Check initial Host unread count
    let initialHostThreads = await messageService.getUserThreads(hostUser);
    let initialHostUnread = initialHostThreads.reduce((sum, t) => sum + (t.unreadCount || 0), 0);
    console.log(`[INITIAL HOST STATE] Total Unread Messages: ${initialHostUnread}`);

    // STEP 2: Send Message 1 from Guest
    console.log('\n[TEST: Message 1 Sent from Guest]');
    const msg1Res = await messageService.sendMessage({
      propertyId: property.id,
      name: 'UnreadTest Guest',
      email: guestUser.email,
      messageText: 'Unread test message 1'
    }, guestUser);

    let updatedHostThreads1 = await messageService.getUserThreads(hostUser);
    let updatedHostUnread1 = updatedHostThreads1.reduce((sum, t) => sum + (t.unreadCount || 0), 0);
    console.log(`  Host Unread Count: ${initialHostUnread} -> ${updatedHostUnread1}`);

    if (updatedHostUnread1 !== initialHostUnread + 1) {
      throw new Error(`FAIL: Expected Host unread count to increment by 1 (expected ${initialHostUnread + 1}, got ${updatedHostUnread1})`);
    }
    console.log('  [PASS] Host unread count incremented cleanly (+1).\n');

    // STEP 3: Send Message 2 (New thread or additional message)
    console.log('[TEST: Message 2 Sent from Guest]');
    await messageService.sendMessage({
      propertyId: property.id,
      name: 'UnreadTest Guest',
      email: guestUser.email,
      messageText: 'Unread test message 2'
    }, guestUser);

    let updatedHostThreads2 = await messageService.getUserThreads(hostUser);
    let updatedHostUnread2 = updatedHostThreads2.reduce((sum, t) => sum + (t.unreadCount || 0), 0);
    console.log(`  Host Unread Count: ${updatedHostUnread1} -> ${updatedHostUnread2}`);

    if (updatedHostUnread2 !== updatedHostUnread1 + 1) {
      throw new Error(`FAIL: Expected Host unread count to increment by 1 (expected ${updatedHostUnread1 + 1}, got ${updatedHostUnread2})`);
    }
    console.log('  [PASS] Host unread count incremented cleanly (+1 again).\n');

    // STEP 4: Refetch / Reload simulation
    console.log('[TEST: Page Refresh / Reload Simulation]');
    let reloadedHostThreads = await messageService.getUserThreads(hostUser);
    let reloadedHostUnread = reloadedHostThreads.reduce((sum, t) => sum + (t.unreadCount || 0), 0);
    console.log(`  Reloaded Host Unread Count: ${reloadedHostUnread}`);

    if (reloadedHostUnread !== updatedHostUnread2) {
      throw new Error(`FAIL: Unread count changed upon reload! (expected ${updatedHostUnread2}, got ${reloadedHostUnread})`);
    }
    console.log('  [PASS] Unread count strictly preserved across page reload.\n');

    // STEP 5: Host Reads Thread 1
    console.log('[TEST: Host Reads Thread]');
    const threadToRead = msg1Res.threadId;
    await messageService.getThreadById(threadToRead, hostUser);

    let postReadHostThreads = await messageService.getUserThreads(hostUser);
    let postReadHostUnread = postReadHostThreads.reduce((sum, t) => sum + (t.unreadCount || 0), 0);
    console.log(`  Host Unread Count after reading thread: ${reloadedHostUnread} -> ${postReadHostUnread}`);

    if (postReadHostUnread >= reloadedHostUnread) {
      throw new Error(`FAIL: Unread count did not decrease after reading thread!`);
    }
    console.log('  [PASS] Unread count decremented cleanly after reading thread.\n');

    // STEP 6: Host sends reply -> Guest Unread Count test
    console.log('[TEST: Host replies -> Guest Unread Count]');
    let initialGuestThreads = await messageService.getUserThreads(guestUser);
    let initialGuestUnread = initialGuestThreads.reduce((sum, t) => sum + (t.unreadCount || 0), 0);

    await messageService.replyToThread(threadToRead, 'Host reply test message', hostUser);

    let updatedGuestThreads = await messageService.getUserThreads(guestUser);
    let updatedGuestUnread = updatedGuestThreads.reduce((sum, t) => sum + (t.unreadCount || 0), 0);
    console.log(`  Guest Unread Count: ${initialGuestUnread} -> ${updatedGuestUnread}`);

    if (updatedGuestUnread !== initialGuestUnread + 1) {
      throw new Error(`FAIL: Expected Guest unread count to increment by 1`);
    }
    console.log('  [PASS] Guest unread count incremented upon receiving Host reply.\n');

    // CLEANUP
    await prisma.message.deleteMany({ where: { threadId: threadToRead } });
    await prisma.messageThread.delete({ where: { id: threadToRead } });
    await prisma.user.delete({ where: { id: guestUser.id } });
    console.log('✅ Cleaned up temporary test data from database.');

    console.log('\n==================================================');
    console.log(' 🎉 ALL UNREAD COUNT FLOW TESTS PASSED!');
    console.log('==================================================\n');
  } catch (err) {
    console.error('\n❌ UNREAD COUNT FLOW TEST FAILED:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runUnreadCountFlowTests();
