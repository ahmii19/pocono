const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const prisma = require('../server/src/config/prisma');

async function auditHashes() {
  const uploadsBase = 'd:/AHMED PROJECTS/pocono/pocono/wp-content/uploads';
  console.log('=== CRITICAL AUDIT: PHYSICAL FILE HASHES AND PROVENANCE ===');
  console.log('Target Directory:', uploadsBase);

  // Get PostgreSQL PropertyImage records
  const dbImages = await prisma.propertyImage.findMany({
    include: { property: { select: { wpPostId: true, title: true, slug: true } } }
  });

  console.log(`Auditing ${dbImages.length} PropertyImage records...\n`);

  const fileReport = [];
  const hashCounts = new Map();

  for (const img of dbImages) {
    const url = img.imageUrl;
    let relPath = '';
    if (url.includes('/wp-content/uploads/')) {
      relPath = url.split('/wp-content/uploads/')[1];
    } else {
      relPath = url;
    }

    const fullPath = path.join(uploadsBase, relPath);
    const exists = fs.existsSync(fullPath);

    let fileSize = 0;
    let sha256 = 'N/A';

    if (exists) {
      const buf = fs.readFileSync(fullPath);
      fileSize = buf.length;
      sha256 = crypto.createHash('sha256').update(buf).digest('hex');
      hashCounts.set(sha256, (hashCounts.get(sha256) || 0) + 1);
    }

    fileReport.push({
      propertyTitle: img.property?.title,
      slug: img.property?.slug,
      wpPostId: img.property?.wpPostId,
      relPath,
      exists,
      fileSize,
      sha256
    });
  }

  console.log('=== FILE HASH REPORT ===');
  fileReport.forEach((r, i) => {
    console.log(`[${i+1}] ${r.propertyTitle} (${r.slug})`);
    console.log(`    File: wp-content/uploads/${r.relPath}`);
    console.log(`    Exists: ${r.exists} | Size: ${r.fileSize} bytes`);
    console.log(`    SHA256: ${r.sha256}\n`);
  });

  console.log('=== SUMMARY OF SHA256 HASH DISTRIBUTION ===');
  console.log(`Unique Hashes Found: ${hashCounts.size}`);
  hashCounts.forEach((count, hash) => {
    console.log(`Hash: ${hash.slice(0, 16)}... | Shared by ${count} files`);
  });

  return { fileReport, uniqueHashesCount: hashCounts.size };
}

auditHashes().catch(console.error).finally(() => prisma.$disconnect());
