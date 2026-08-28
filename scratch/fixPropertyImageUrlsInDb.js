const prisma = require('../server/src/config/prisma');

async function fixImageUrls() {
  console.log('=== UPDATING POSTGRESQL PROPERTY_IMAGE RECORDS TO LOCAL EXPRESS URLs ===');

  const images = await prisma.propertyImage.findMany();
  console.log(`Found ${images.length} PropertyImage records in DB.`);

  let updatedCount = 0;

  for (const img of images) {
    let newUrl = img.imageUrl;

    // Convert external domain to local Express server URL
    if (newUrl.startsWith('https://demo01.gethomey.io/wp-content/uploads/')) {
      // Map to real physical brand image on disk
      newUrl = 'http://localhost:5000/wp-content/uploads/2026/05/PV6_no-bg-_full1.png';
    } else if (newUrl.startsWith('https://pocono.vacations/wp-content/uploads/')) {
      const relPath = newUrl.replace('https://pocono.vacations/wp-content/uploads/', '');
      newUrl = `http://localhost:5000/wp-content/uploads/${relPath}`;
    } else if (newUrl.startsWith('/wp-content/uploads/')) {
      newUrl = `http://localhost:5000${newUrl}`;
    }

    if (newUrl !== img.imageUrl) {
      await prisma.propertyImage.update({
        where: { id: img.id },
        data: { imageUrl: newUrl }
      });
      updatedCount++;
      console.log(`Updated ID ${img.id} -> ${newUrl}`);
    }
  }

  console.log(`\n==================================================`);
  console.log(`Image URLs Updated in PostgreSQL: ${updatedCount} / ${images.length}`);
  console.log(`==================================================\n`);
}

fixImageUrls()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
