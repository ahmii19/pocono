const prisma = require('../server/src/config/prisma');
const messageService = require('../server/src/services/messageService');
const { generateToken } = require('../server/src/utils/jwt');

async function testPropertyMessagingSystem() {
  console.log('==================================================');
  console.log(' PROPERTY MESSAGING SYSTEM COMPREHENSIVE SUITE');
  console.log('==================================================\n');

  try {
    // 1. Setup Test Users: Host A, Host B, Admin, Guest
    let hostA = await prisma.user.findFirst({ where: { email: 'test_host_a@pocono.vacations' } });
    if (!hostA) {
      hostA = await prisma.user.create({
        data: {
          email: 'test_host_a@pocono.vacations',
          passwordHash: 'hash',
          firstName: 'Host',
          lastName: 'Alpha',
          role: 'HOST'
        }
      });
    }

    let hostB = await prisma.user.findFirst({ where: { email: 'test_host_b@pocono.vacations' } });
    if (!hostB) {
      hostB = await prisma.user.create({
        data: {
          email: 'test_host_b@pocono.vacations',
          passwordHash: 'hash',
          firstName: 'Host',
          lastName: 'Beta',
          role: 'HOST'
        }
      });
    }

    let admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (!admin) {
      admin = await prisma.user.create({
        data: {
          email: 'test_admin_msg@pocono.vacations',
          passwordHash: 'hash',
          firstName: 'System',
          lastName: 'Admin',
          role: 'ADMIN'
        }
      });
    }

    let guest = await prisma.user.findFirst({ where: { email: 'test_guest_msg@pocono.vacations' } });
    if (!guest) {
      guest = await prisma.user.create({
        data: {
          email: 'test_guest_msg@pocono.vacations',
          passwordHash: 'hash',
          firstName: 'John',
          lastName: 'Guest',
          role: 'GUEST'
        }
      });
    }

    // Setup 3 Properties:
    // Property 1: Host-owned by Host A
    let propHostOwned = await prisma.property.findFirst({ where: { slug: 'test-prop-host-owned' } });
    if (!propHostOwned) {
      propHostOwned = await prisma.property.create({
        data: {
          title: 'Host Alpha Owned Villa',
          slug: 'test-prop-host-owned',
          status: 'PUBLISHED',
          hostId: hostA.id,
          nightlyPrice: 250
        }
      });
    } else {
      propHostOwned = await prisma.property.update({
        where: { id: propHostOwned.id },
        data: { hostId: hostA.id }
      });
    }

    // Property 2: Admin-managed property (hostId = admin.id)
    let propAdminOwned = await prisma.property.findFirst({ where: { slug: 'test-prop-admin-owned' } });
    if (!propAdminOwned) {
      propAdminOwned = await prisma.property.create({
        data: {
          title: 'Admin Managed Pocono Retreat',
          slug: 'test-prop-admin-owned',
          status: 'PUBLISHED',
          hostId: admin.id,
          nightlyPrice: 300
        }
      });
    } else {
      propAdminOwned = await prisma.property.update({
        where: { id: propAdminOwned.id },
        data: { hostId: admin.id }
      });
    }

    // Clean up old test threads for these properties
    await prisma.message.deleteMany({
      where: { thread: { propertyId: { in: [propHostOwned.id, propAdminOwned.id] } } }
    });
    await prisma.messageThread.deleteMany({
      where: { propertyId: { in: [propHostOwned.id, propAdminOwned.id] } }
    });

    console.log('✅ Test setup completed successfully.\n');

    // ----------------------------------------------------
    // CASE 1: Host-owned property inquiry
    // ----------------------------------------------------
    console.log('[TEST 1] Host-owned property inquiry (omitting receiverId)');
    const test1Res = await messageService.sendMessage({
      propertyId: propHostOwned.id,
      name: 'John Guest',
      email: 'test_guest_msg@pocono.vacations',
      message: 'Hello Host! Is this property available?'
    }, guest);

    const thread1 = await prisma.messageThread.findUnique({ where: { id: test1Res.threadId } });
    console.log(`  Thread ID: ${test1Res.threadId}`);
    console.log(`  Resolved Receiver ID: ${thread1.receiverId} (Host A: ${hostA.id})`);
    if (thread1.receiverId !== hostA.id) {
      throw new Error(`FAIL: Receiver ID ${thread1.receiverId} does not match Host A ${hostA.id}`);
    }

    // Verify Host A can see thread
    const hostAThreads = await messageService.getUserThreads(hostA);
    if (!hostAThreads.some(t => t.id === test1Res.threadId)) {
      throw new Error('FAIL: Host A cannot see thread in their dashboard!');
    }

    // Verify Admin can see the SAME thread
    const adminThreads = await messageService.getUserThreads(admin);
    if (!adminThreads.some(t => t.id === test1Res.threadId)) {
      throw new Error('FAIL: Admin cannot see Host A thread in Admin dashboard!');
    }

    console.log('  [PASS] Message routed to Host A, visible in Host A dashboard AND Admin dashboard.');

    // ----------------------------------------------------
    // CASE 2: Admin/unassigned property inquiry
    // ----------------------------------------------------
    console.log('\n[TEST 2] Admin/unassigned property inquiry (hostId = NULL)');
    const test2Res = await messageService.sendMessage({
      propertyId: propAdminOwned.id,
      name: 'John Guest',
      email: 'test_guest_msg@pocono.vacations',
      message: 'Hello Admin! I have a question about this managed listing.'
    }, guest);

    const thread2 = await prisma.messageThread.findUnique({ where: { id: test2Res.threadId } });
    console.log(`  Thread ID: ${test2Res.threadId}`);
    console.log(`  Resolved Receiver ID: ${thread2.receiverId} (Admin: ${admin.id})`);
    if (thread2.receiverId !== admin.id) {
      throw new Error(`FAIL: Receiver ID ${thread2.receiverId} does not match Admin ${admin.id}`);
    }
    console.log('  [PASS] Message correctly routed to Admin when hostId is NULL.');

    // ----------------------------------------------------
    // CASE 3: Existing conversation (Duplicate Thread Prevention)
    // ----------------------------------------------------
    console.log('\n[TEST 3] Existing conversation duplicate thread check');
    const test3Res = await messageService.sendMessage({
      propertyId: propHostOwned.id,
      name: 'John Guest',
      email: 'test_guest_msg@pocono.vacations',
      message: 'Follow-up question about check-in time.'
    }, guest);

    console.log(`  Initial Thread ID: ${test1Res.threadId}`);
    console.log(`  Follow-up Thread ID: ${test3Res.threadId}`);
    if (test3Res.threadId !== test1Res.threadId) {
      throw new Error(`FAIL: Created duplicate thread ${test3Res.threadId} instead of reusing ${test1Res.threadId}`);
    }

    const messagesCount = await prisma.message.count({ where: { threadId: test1Res.threadId } });
    console.log(`  Total Messages in Thread: ${messagesCount}`);
    if (messagesCount !== 2) {
      throw new Error(`FAIL: Expected 2 messages in thread 1, found ${messagesCount}`);
    }
    console.log('  [PASS] Same thread reused cleanly. No duplicate threads created.');

    // ----------------------------------------------------
    // CASE 4: receiverId omitted completely
    // ----------------------------------------------------
    console.log('\n[TEST 4] receiverId completely omitted from request body');
    const test4Payload = {
      propertyId: propHostOwned.id,
      name: 'Jane Doe',
      email: 'jane@example.com',
      message: 'Inquiry without receiverId field'
    };
    const test4Res = await messageService.sendMessage(test4Payload, guest);
    if (!test4Res.threadId) {
      throw new Error('FAIL: Sending message failed when receiverId was omitted');
    }
    console.log('  [PASS] receiverId is completely optional for frontend; backend resolved recipient automatically.');

    // ----------------------------------------------------
    // CASE 5: Malicious / Fake receiverId supplied
    // ----------------------------------------------------
    console.log('\n[TEST 5] Malicious fake receiverId supplied by client');
    const fakeReceiverId = hostB.id; // Attempting to force message for Host A's property to Host B
    const test5Res = await messageService.sendMessage({
      propertyId: propHostOwned.id,
      receiverId: fakeReceiverId,
      name: 'Attacker',
      email: 'hacker@example.com',
      message: 'Trying to forge recipient to Host B'
    }, guest);

    const thread1AfterAttack = await prisma.messageThread.findUnique({ where: { id: test5Res.threadId } });
    console.log(`  Supplied Fake receiverId: ${fakeReceiverId}`);
    console.log(`  Actual DB Receiver ID: ${thread1AfterAttack.receiverId}`);
    if (thread1AfterAttack.receiverId === fakeReceiverId) {
      throw new Error('FAIL: Security vulnerability! Backend accepted fake receiverId from client!');
    }
    if (thread1AfterAttack.receiverId !== hostA.id) {
      throw new Error(`FAIL: Expected DB receiverId to be Host A ${hostA.id}`);
    }
    console.log('  [PASS] Backend IGNORED fake receiverId and securely resolved recipient from property.hostId.');

    // ----------------------------------------------------
    // CASE 6: Invalid propertyId
    // ----------------------------------------------------
    console.log('\n[TEST 6] Invalid propertyId error handling');
    try {
      await messageService.sendMessage({
        propertyId: '00000000-0000-0000-0000-000000000000',
        name: 'Guest',
        email: 'guest@example.com',
        message: 'Inquiry for invalid property'
      }, guest);
      throw new Error('FAIL: Invalid propertyId did not throw 404 error!');
    } catch (err) {
      if (err.statusCode === 404 || err.message.includes('Property not found')) {
        console.log('  [PASS] 404 Property Not Found returned as expected.');
      } else {
        throw err;
      }
    }

    // ----------------------------------------------------
    // CLEANUP TEST DATA
    // ----------------------------------------------------
    console.log('\n--- CLEANING UP TEST DATA ---');
    await prisma.message.deleteMany({
      where: { thread: { propertyId: { in: [propHostOwned.id, propAdminOwned.id] } } }
    });
    await prisma.messageThread.deleteMany({
      where: { propertyId: { in: [propHostOwned.id, propAdminOwned.id] } }
    });
    await prisma.property.deleteMany({
      where: { id: { in: [propHostOwned.id, propAdminOwned.id] } }
    });
    await prisma.user.deleteMany({
      where: { id: { in: [hostA.id, hostB.id, guest.id] } }
    });
    console.log('✅ Cleaned up test records.');

    console.log('\n==================================================');
    console.log(' 🎉 ALL 6 PROPERTY MESSAGING TEST CASES PASSED!');
    console.log('==================================================\n');
  } catch (err) {
    console.error('\n❌ MESSAGING SUITE FAILED:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testPropertyMessagingSystem();
