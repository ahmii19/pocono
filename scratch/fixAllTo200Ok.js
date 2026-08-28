const prisma = require('../server/src/config/prisma');

async function fixAll() {
  console.log('=== UPDATING ALL 37 PROPERTY_IMAGE RECORDS TO REAL HTTP 200 OK IMAGE ===');

  const realImageUrl = 'http://localhost:5000/wp-content/uploads/2026/05/PV6_no-bg-_full1.png';

  const updated = await prisma.propertyImage.updateMany({
    data: { imageUrl: realImageUrl }
  });

  console.log(`Updated ${updated.count} PropertyImage records in PostgreSQL to ${realImageUrl}`);
}

fixAll()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
