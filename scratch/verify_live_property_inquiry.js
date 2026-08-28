const prisma = require('../server/src/config/prisma');
const http = require('http');

async function verifyLivePropertyInquiry() {
  console.log('==================================================');
  console.log(' LIVE PROPERTY INQUIRY END-TO-END VERIFICATION');
  console.log('==================================================\n');

  try {
    // 1. Fetch an actual existing property from the database
    const property = await prisma.property.findFirst({
      where: { status: 'PUBLISHED' },
      include: { host: true }
    });

    if (!property) {
      throw new Error('No published property found in PostgreSQL database.');
    }

    console.log(`[REAL PROPERTY LOADED]`);
    console.log(`  Property ID:   ${property.id}`);
    console.log(`  Title:         "${property.title}"`);
    console.log(`  Slug:          "${property.slug}"`);
    console.log(`  Host ID:       ${property.hostId}`);
    console.log(`  Host Name:     ${property.host ? `${property.host.firstName || ''} ${property.host.lastName || ''}`.trim() : 'N/A'}`);
    console.log(`  Host Role:     ${property.host ? property.host.role : 'NULL'}\n`);

    // 2. Perform HTTP POST request to http://localhost:5000/api/v1/messages
    const payload = JSON.stringify({
      propertyId: property.id,
      name: 'Test User',
      email: 'test_live_inquiry@example.com',
      message: 'Test property inquiry message from Contact Host form'
    });

    console.log(`[HTTP REQUEST DETAILS]`);
    console.log(`  Method:  POST`);
    console.log(`  URL:     http://localhost:5000/api/v1/messages`);
    console.log(`  Payload: ${payload}\n`);

    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const response = await new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => resolve({ status: res.statusCode, body }));
      });
      req.on('error', reject);
      req.write(payload);
      req.end();
    });

    console.log(`[HTTP RESPONSE DETAILS]`);
    console.log(`  Status Code: ${response.status}`);
    console.log(`  Body:        ${response.body}\n`);

    if (response.status !== 201 && response.status !== 200) {
      throw new Error(`FAIL: Server responded with status ${response.status}: ${response.body}`);
    }

    const resJson = JSON.parse(response.body);
    const threadId = resJson.data.threadId;

    // 3. Inspect PostgreSQL database records created
    const threadInDb = await prisma.messageThread.findUnique({
      where: { id: threadId },
      include: {
        property: { select: { title: true } },
        sender: { select: { email: true, firstName: true, role: true } },
        receiver: { select: { id: true, email: true, firstName: true, role: true } },
        messages: { orderBy: { createdAt: 'desc' } }
      }
    });

    console.log(`[DATABASE THREAD VERIFICATION]`);
    console.log(`  Thread ID:           ${threadInDb.id}`);
    console.log(`  Property Title:      "${threadInDb.property?.title}"`);
    console.log(`  Sender Email:        ${threadInDb.sender?.email} (Role: ${threadInDb.sender?.role})`);
    console.log(`  Resolved Receiver:   ${threadInDb.receiver?.email} (ID: ${threadInDb.receiver?.id}, Role: ${threadInDb.receiver?.role})`);
    console.log(`  Messages Count:      ${threadInDb.messages.length}`);
    console.log(`  Latest Message Text: "${threadInDb.messages[0]?.messageText}"\n`);

    // 4. Verify Host Dashboard visibility
    const messageService = require('../server/src/services/messageService');
    const hostThreads = await messageService.getUserThreads({ id: property.hostId, role: property.host ? property.host.role : 'HOST' });
    const isVisibleToHost = hostThreads.some(t => t.id === threadId);
    console.log(`[HOST DASHBOARD VERIFICATION]`);
    console.log(`  Visible in Host Dashboard: ${isVisibleToHost ? 'YES ✅' : 'NO ❌'}\n`);

    // 5. Verify Admin Dashboard visibility
    const primaryAdmin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    const adminThreads = await messageService.getUserThreads(primaryAdmin);
    const isVisibleToAdmin = adminThreads.some(t => t.id === threadId);
    console.log(`[ADMIN DASHBOARD VERIFICATION]`);
    console.log(`  Visible in Admin Dashboard: ${isVisibleToAdmin ? 'YES ✅' : 'NO ❌'}\n`);

    // Clean up test thread and temporary guest user created for this verification
    await prisma.message.deleteMany({ where: { threadId } });
    await prisma.messageThread.delete({ where: { id: threadId } });
    await prisma.user.deleteMany({ where: { email: 'test_live_inquiry@example.com' } });
    console.log('✅ Cleaned up temporary test inquiry record from database.');

    console.log('\n==================================================');
    console.log(' 🎉 LIVE INQUIRY VERIFICATION SUCCESSFUL!');
    console.log('==================================================\n');
  } catch (err) {
    console.error('\n❌ LIVE INQUIRY VERIFICATION FAILED:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifyLivePropertyInquiry();
