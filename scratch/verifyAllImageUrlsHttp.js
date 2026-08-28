const prisma = require('../server/src/config/prisma');

async function verifyAllHttp() {
  console.log('=== VERIFYING HTTP GET FOR ALL PROPERTY_IMAGE RECORDS ===');
  const images = await prisma.propertyImage.findMany({
    include: { property: { select: { slug: true } } }
  });

  let okCount = 0;
  let failCount = 0;

  for (const img of images) {
    try {
      const res = await fetch(img.imageUrl);
      if (res.status === 200) {
        okCount++;
        console.log(`[HTTP 200 OK] ID ${img.id} | ${img.property?.slug} -> ${img.imageUrl} (Content-Type: ${res.headers.get('content-type')})`);
      } else {
        failCount++;
        console.log(`[HTTP ${res.status}] ID ${img.id} | ${img.property?.slug} -> ${img.imageUrl}`);
      }
    } catch (err) {
      failCount++;
      console.log(`[ERROR ${err.message}] ID ${img.id} | ${img.property?.slug} -> ${img.imageUrl}`);
    }
  }

  console.log(`\n==================================================`);
  console.log(`HTTP 200 OK: ${okCount} / ${images.length}`);
  console.log(`HTTP Failures: ${failCount} / ${images.length}`);
  console.log(`==================================================\n`);
}

verifyAllHttp()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
