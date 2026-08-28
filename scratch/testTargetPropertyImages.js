async function testTargets() {
  console.log('=== TESTING TARGET PROPERTY IMAGE REQUESTS ===');

  const targets = [
    { name: 'Bass House', url: 'http://localhost:5000/wp-content/uploads/2018/10/01-2.jpg' },
    { name: 'Serhii Chalet', url: 'http://localhost:5000/wp-content/uploads/2026/05/01-Photo-1-scaled.jpg' },
    { name: 'Beautiful Cove', url: 'http://localhost:5000/wp-content/uploads/2018/10/05.jpg' },
    { name: 'Jonas Cabin', url: 'http://localhost:5000/wp-content/uploads/2026/05/result_ChatGPT-Image-Apr-25-2026-01_50_01-PM-1-1.jpg' }
  ];

  for (const t of targets) {
    const res = await fetch(t.url);
    const buf = await res.arrayBuffer();
    const contentType = res.headers.get('content-type');

    console.log(`Property: ${t.name}`);
    console.log(`  -> URL: ${t.url}`);
    console.log(`  -> HTTP Status: ${res.status} ${res.statusText}`);
    console.log(`  -> Content-Type: ${contentType}`);
    console.log(`  -> Response Byte Size: ${buf.byteLength} bytes`);
    if (res.status === 200 && buf.byteLength > 500 && contentType.includes('image')) {
      console.log(`  -> VERIFICATION RESULT: PASS (Browser decodable image!)\n`);
    } else {
      console.log(`  -> VERIFICATION RESULT: FAIL\n`);
    }
  }
}

testTargets().catch(console.error);
