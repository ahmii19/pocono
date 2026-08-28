async function testFiltering() {
  console.log('=== 1. TESTING GET /api/v1/properties?city=los-angeles ===');
  const cityRes = await fetch('http://127.0.0.1:5000/api/v1/properties?city=los-angeles').then(r => r.json());
  console.log('City properties found:', cityRes.total, '| Sample title:', cityRes.data?.[0]?.title);

  console.log('\n=== 2. TESTING GET /api/v1/properties?community=arrowhead-lake ===');
  const commRes = await fetch('http://127.0.0.1:5000/api/v1/properties?community=arrowhead-lake').then(r => r.json());
  console.log('Community properties found:', commRes.total, '| Sample title:', commRes.data?.[0]?.title);
}

testFiltering().catch(console.error);
