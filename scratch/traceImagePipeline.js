const fs = require('fs');
const path = require('path');
const prisma = require('../server/src/config/prisma');

async function tracePipeline() {
  console.log('=== 1. POSTGRESQL PROPERTY_IMAGE RECORDS ===');
  const propertyImages = await prisma.propertyImage.findMany({
    take: 15,
    include: { property: { select: { slug: true, title: true } } }
  });
  const totalImages = await prisma.propertyImage.count();

  console.log('Total PropertyImage records in DB:', totalImages);
  console.log('Sample PropertyImage records:', JSON.stringify(propertyImages, null, 2));

  console.log('\n=== 2. WORDPRESS UPLOADS DIRECTORY ON DISK ===');
  const uploadsDir = path.join(__dirname, '../pocono/wp-content/uploads');
  const exists = fs.existsSync(uploadsDir);
  console.log(`Path: ${uploadsDir} | Exists: ${exists}`);

  if (exists) {
    function countFiles(dir) {
      let count = 0;
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const full = path.join(dir, file);
        if (fs.statSync(full).isDirectory()) {
          count += countFiles(full);
        } else {
          count++;
        }
      }
      return count;
    }
    console.log('Total files in wp-content/uploads:', countFiles(uploadsDir));

    // Check specific image from sample record
    if (propertyImages.length > 0) {
      const sampleUrl = propertyImages[0].imageUrl;
      console.log('\nSample imageUrl from DB:', sampleUrl);

      // Check if file exists relative to uploads or wp-content/uploads
      const relativePath = sampleUrl.replace(/^https?:\/\/[^\/]+/, '').replace(/^\/?wp-content\/uploads\/?/, '').replace(/^\/?uploads\/?/, '');
      const testPath = path.join(uploadsDir, relativePath);
      console.log(`Checking physical file path: ${testPath} | Exists: ${fs.existsSync(testPath)}`);
    }
  }
}

tracePipeline()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
