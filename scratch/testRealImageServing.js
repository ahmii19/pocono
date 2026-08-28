async function testServing() {
  const url = 'http://localhost:5000/wp-content/uploads/2026/05/PV6_no-bg-_full1.png';
  console.log('Testing GET', url);
  const res = await fetch(url);
  console.log('Status:', res.status, res.statusText);
  console.log('Content-Type:', res.headers.get('content-type'));
  const buffer = await res.arrayBuffer();
  console.log('Byte length returned:', buffer.byteLength);
}

testServing().catch(console.error);
