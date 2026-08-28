const http = require('http');

const routes = [
  '/',
  '/admin/users',
  '/host/dashboard',
  '/messages',
  '/dashboard',
  '/host/properties/new'
];

async function checkRoute(route) {
  return new Promise((resolve) => {
    http.get(`http://localhost:3000${route}`, (res) => {
      console.log(`[HTTP ${res.statusCode}] GET ${route}`);
      resolve(res.statusCode);
    }).on('error', (err) => {
      console.error(`[ERROR] GET ${route}:`, err.message);
      resolve(500);
    });
  });
}

async function testAll() {
  console.log('Testing Next.js frontend compilation & route responses...');
  for (const route of routes) {
    await checkRoute(route);
  }
}

testAll();
