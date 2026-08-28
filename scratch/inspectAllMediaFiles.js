const fs = require('fs');
const path = require('path');
const prisma = require('../server/src/config/prisma');

async function inspectAllMedia() {
  const uploadsDir = path.join(__dirname, '../pocono/wp-content/uploads');

  console.log('=== ALL PHYSICAL FILES IN WP-CONTENT/UPLOADS ===');
  function getAllFiles(dirPath, arrayOfFiles = []) {
    const files = fs.readdirSync(dirPath);
    files.forEach(file => {
      const fullPath = path.join(dirPath, file);
      if (fs.statSync(fullPath).isDirectory()) {
        getAllFiles(fullPath, arrayOfFiles);
      } else {
        const rel = path.relative(uploadsDir, fullPath).replace(/\\/g, '/');
        arrayOfFiles.push(rel);
      }
    });
    return arrayOfFiles;
  }

  const physicalFiles = getAllFiles(uploadsDir);
  console.log(`Found ${physicalFiles.length} physical media files in wp-content/uploads:`);
  console.log(physicalFiles.slice(0, 35));

  console.log('\n=== ALL DB PROPERTY_IMAGE RECORDS ===');
  const dbImages = await prisma.propertyImage.findMany({
    include: { property: { select: { slug: true, title: true } } }
  });

  console.log(`Found ${dbImages.length} PropertyImage records in DB:`);
  dbImages.forEach(img => {
    console.log(`ID ${img.id} | Property: ${img.property?.slug} | URL: ${img.imageUrl}`);
  });
}

inspectAllMedia()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
