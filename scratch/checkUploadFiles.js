const fs = require('fs');
const path = require('path');
const prisma = require('../server/src/config/prisma');

async function checkUploadFiles() {
  const uploadsDir = path.join(__dirname, '../pocono/wp-content/uploads');
  const dbImages = await prisma.propertyImage.findMany({
    include: { property: { select: { slug: true, title: true } } }
  });

  console.log(`Checking ${dbImages.length} PropertyImage records against disk...`);

  let foundOnDisk = 0;
  let missingOnDisk = 0;

  dbImages.forEach(img => {
    // Extract path after /uploads/ or /wp-content/uploads/
    const url = img.imageUrl;
    let relPath = '';
    if (url.includes('/wp-content/uploads/')) {
      relPath = url.split('/wp-content/uploads/')[1];
    } else if (url.includes('/uploads/')) {
      relPath = url.split('/uploads/')[1];
    } else {
      relPath = url;
    }

    const fullDiskPath = path.join(uploadsDir, relPath);
    const exists = fs.existsSync(fullDiskPath);

    if (exists) {
      foundOnDisk++;
      console.log(`[FOUND] Property: ${img.property?.slug} | Disk: ${relPath}`);
    } else {
      missingOnDisk++;
      console.log(`[MISSING] Property: ${img.property?.slug} | URL: ${url}`);
    }
  });

  console.log(`\nFound on disk: ${foundOnDisk} | Missing on disk: ${missingOnDisk}`);
}

checkUploadFiles()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
