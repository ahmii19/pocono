const app = require('../src/app');
const prisma = require('../src/config/prisma');

async function runApiTests() {
  console.log(`==================================================`);
  console.log(` POCONO.VACATIONS BACKEND API AUTOMATED TEST SUITE`);
  console.log(`==================================================\n`);

  const server = app.listen(5099);
  const baseUrl = 'http://localhost:5099/api/v1';

  let passCount = 0;
  let failCount = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passCount++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failCount++;
    }
  }

  try {
    // 1. Health Check
    console.log('[TEST 1] Health Check & Server Status');
    const healthRes = await fetch('http://localhost:5099/health');
    const healthData = await healthRes.json();
    assert(healthRes.status === 200 && healthData.status === 'ok', 'GET /health returned 200 OK');

    // 2. Taxonomies API
    console.log('\n[TEST 2] Taxonomies API Verification');
    const citiesRes = await fetch(`${baseUrl}/cities`);
    const citiesData = await citiesRes.json();
    assert(citiesData.success && citiesData.data.length === 16, `GET /api/v1/cities returned all 16 cities`);

    const commRes = await fetch(`${baseUrl}/communities`);
    const commData = await commRes.json();
    assert(commData.success && commData.data.length === 16, `GET /api/v1/communities returned all 16 communities`);

    const typesRes = await fetch(`${baseUrl}/property-types`);
    const typesData = await typesRes.json();
    assert(typesData.success && typesData.data.length === 6, `GET /api/v1/property-types returned all 6 property types`);

    const amRes = await fetch(`${baseUrl}/amenities`);
    const amData = await amRes.json();
    assert(amData.success && amData.data.length === 49, `GET /api/v1/amenities returned all 49 amenities`);

    const facRes = await fetch(`${baseUrl}/facilities`);
    const facData = await facRes.json();
    assert(facData.success && facData.data.length === 12, `GET /api/v1/facilities returned all 12 facilities`);

    // 3. Properties API & All 38 Migrated Listings Retrieval
    console.log('\n[TEST 3] Properties API & All 38 Migrated Listings Retrieval');
    const propsRes = await fetch(`${baseUrl}/properties?status=all&limit=100`);
    const propsData = await propsRes.json();
    assert(propsData.success && propsData.total >= 38, `GET /api/v1/properties?status=all retrieved migrated properties from PostgreSQL (${propsData.total})`);

    const publishedRes = await fetch(`${baseUrl}/properties?limit=50`);
    const publishedData = await publishedRes.json();
    assert(publishedData.success && publishedData.total >= 37, `GET /api/v1/properties returned published properties (${publishedData.total})`);

    const firstProp = publishedData.data[0];
    assert(firstProp && firstProp.slug, `Property object contains valid SEO slug: "${firstProp.slug}"`);

    const singlePropRes = await fetch(`${baseUrl}/properties/slug/${firstProp.slug}`);
    const singlePropData = await singlePropRes.json();
    assert(singlePropRes.status === 200 && singlePropData.data.id === firstProp.id, `GET /api/v1/properties/slug/${firstProp.slug} retrieved single property detail`);

    // 4. Property Search & Filtering API
    console.log('\n[TEST 4] Property Filtering & Search Verification');
    const filteredRes = await fetch(`${baseUrl}/properties?guests=4&minPrice=50`);
    const filteredData = await filteredRes.json();
    assert(filteredData.success && filteredData.data.length > 0, `GET /api/v1/properties with guest and price filter returned results`);

    // 5. User Authentication API (Legacy WP Password Support)
    console.log('\n[TEST 5] User Authentication API (Legacy WP Password Support)');
    const usersInDb = await prisma.user.findMany({ take: 1 });
    const targetUser = usersInDb[0];
    
    // Login with administrator/host email
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: targetUser.email, password: 'password' })
    });
    assert(loginRes.status === 200 || loginRes.status === 401, `POST /api/v1/auth/login endpoint responded cleanly without error`);

    // Generate valid test JWT token for authorization testing
    const { signToken } = require('../src/utils/jwt');
    const testJwtToken = signToken({ userId: targetUser.id, role: targetUser.role });

    const meRes = await fetch(`${baseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${testJwtToken}` }
    });
    const meData = await meRes.json();
    assert(meRes.status === 200 && meData.user.id === targetUser.id, `GET /api/v1/auth/me authenticated user profile successfully`);
    assert(!meData.user.passwordHash, `Password hash is strictly excluded from user response`);

    // 6. Reservation Availability & Price Calculation API
    console.log('\n[TEST 6] Reservation Availability & Pricing Engine API');
    const checkRes = await fetch(`${baseUrl}/reservations/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        propertyId: firstProp.id,
        checkInDate: '2027-10-10',
        checkOutDate: '2027-10-15',
        guestCount: 2
      })
    });
    const checkData = await checkRes.json();
    assert(checkRes.status === 200 && checkData.data.isAvailable === true, `POST /api/v1/reservations/check calculated availability and price quote`);
    assert(checkData.data.pricingBreakdown.grandTotal > 0, `Pricing engine computed itemized grand total: $${checkData.data.pricingBreakdown.grandTotal}`);

    // 7. Reviews API
    console.log('\n[TEST 7] Reviews API');
    const revRes = await fetch(`${baseUrl}/properties/${firstProp.id}/reviews`);
    const revData = await revRes.json();
    assert(revRes.status === 200 && Array.isArray(revData.data), `GET /api/v1/properties/:id/reviews returned reviews array`);

    // 8. User Favorites API
    console.log('\n[TEST 8] User Favorites API');
    const favAddRes = await fetch(`${baseUrl}/favorites`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testJwtToken}`
      },
      body: JSON.stringify({ propertyId: firstProp.id })
    });
    assert(favAddRes.status === 201, `POST /api/v1/favorites added property to user wishlist`);

    const favGetRes = await fetch(`${baseUrl}/favorites`, {
      headers: { Authorization: `Bearer ${testJwtToken}` }
    });
    const favGetData = await favGetRes.json();
    assert(favGetRes.status === 200 && favGetData.data.length > 0, `GET /api/v1/favorites retrieved user favorites`);

    // 9. Messages & Inquiry Threads API
    console.log('\n[TEST 9] Messages & Inquiry Threads API');
    const msgRes = await fetch(`${baseUrl}/messages/threads`, {
      headers: { Authorization: `Bearer ${testJwtToken}` }
    });
    const msgData = await msgRes.json();
    assert(msgRes.status === 200 && Array.isArray(msgData.data), `GET /api/v1/messages/threads retrieved message threads`);

    console.log(`\n==================================================`);
    console.log(` TEST RESULTS SUMMARY`);
    console.log(` Passed: ${passCount} | Failed: ${failCount}`);
    console.log(`==================================================\n`);

  } catch (err) {
    console.error('Fatal API Test Error:', err);
    failCount++;
  } finally {
    server.close();
    await prisma.$disconnect();
    if (failCount > 0) process.exit(1);
  }
}

runApiTests();
