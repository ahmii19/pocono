const prisma = require('../server/src/config/prisma');
const { signToken } = require('../server/src/utils/jwt');

async function runRateLimitTests() {
  console.log('==================================================');
  console.log(' RATE LIMITING & ENDPOINT STRESS TEST');
  console.log('==================================================\n');

  try {
    const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (!adminUser) throw new Error('No ADMIN user found in database');

    const adminToken = signToken({ userId: adminUser.id, role: adminUser.role, email: adminUser.email });

    const endpoints = [
      { name: 'GET /api/v1/cities', url: 'http://localhost:5000/api/v1/cities', auth: false },
      { name: 'GET /api/v1/communities', url: 'http://localhost:5000/api/v1/communities', auth: false },
      { name: 'GET /api/v1/property-types', url: 'http://localhost:5000/api/v1/property-types', auth: false },
      { name: 'GET /api/v1/admin/users?role=HOST', url: 'http://localhost:5000/api/v1/admin/users?role=HOST', auth: true },
      { name: 'GET /api/v1/admin/properties?limit=100', url: 'http://localhost:5000/api/v1/admin/properties?limit=100', auth: true }
    ];

    for (const ep of endpoints) {
      console.log(`Testing 50 rapid requests to: ${ep.name}...`);
      let successCount = 0;
      let rateLimitCount = 0;

      for (let i = 0; i < 50; i++) {
        const headers = {};
        if (ep.auth) headers['Authorization'] = `Bearer ${adminToken}`;
        
        const res = await fetch(ep.url, { headers });
        if (res.status === 200) {
          successCount++;
        } else if (res.status === 429) {
          rateLimitCount++;
        } else {
          console.error(`Unexpected status ${res.status} on iteration ${i+1}`);
        }
      }

      console.log(`  Result: ${successCount}/50 200 OK | ${rateLimitCount}/50 429 Too Many Requests`);
      if (rateLimitCount > 0) {
        throw new Error(`FAIL: Endpoint ${ep.name} got ${rateLimitCount} 429 Too Many Requests errors!`);
      }
      console.log(`  [PASS] 50 consecutive requests completed with 0 rate-limit errors.\n`);
    }

    console.log('==================================================');
    console.log(' 🎉 RATE LIMITING & ENDPOINT STRESS TEST PASSED!');
    console.log('==================================================\n');
  } catch (err) {
    console.error('\n❌ RATE LIMIT TEST FAILED:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runRateLimitTests();
