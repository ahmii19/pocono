async function testJonasCabin() {
  console.log('=== TESTING GET /api/v1/properties/slug/jonas-cabin ===');
  const res = await fetch('http://127.0.0.1:5000/api/v1/properties/slug/jonas-cabin').then(r => r.json());
  console.log('Property Title:', res.data?.title);
  console.log('Property Images:', JSON.stringify(res.data?.images, null, 2));

  console.log('\n=== TESTING GET /api/v1/properties/slug/serhii-chalet ===');
  const res2 = await fetch('http://127.0.0.1:5000/api/v1/properties/slug/serhii-chalet').then(r => r.json());
  console.log('Property Title:', res2.data?.title);
  console.log('Property Images:', JSON.stringify(res2.data?.images, null, 2));
}

testJonasCabin().catch(console.error);
