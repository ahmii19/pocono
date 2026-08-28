const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

p.property.findMany({
  where: {},
  select: {
    id: true,
    title: true,
    slug: true,
    latitude: true,
    longitude: true,
    address: true
  },
  take: 10
}).then(rows => {
  console.log('\n=== PROPERTY COORDINATES CHECK ===');
  rows.forEach(r => {
    const hasCoords = r.latitude != null && r.longitude != null;
    const lat = r.latitude ? Number(r.latitude) : null;
    const lng = r.longitude ? Number(r.longitude) : null;
    console.log(`[${hasCoords ? 'HAS COORDS' : 'NO COORDS '}] "${r.title}" | slug: ${r.slug} | lat: ${lat} | lng: ${lng} | address: ${r.address || 'N/A'}`);
  });
  p.$disconnect();
}).catch(e => {
  console.error('ERROR:', e.message);
  p.$disconnect();
});
