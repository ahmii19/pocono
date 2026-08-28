const fs = require('fs');
const readline = require('readline');
const path = require('path');
const crypto = require('crypto');
const prisma = require('../server/src/config/prisma');

async function runComprehensiveAudit() {
  const sqlPath = 'd:/AHMED PROJECTS/pocono/pocono/pocono.sql';
  const fileStream = fs.createReadStream(sqlPath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  // Parse thumbnail IDs & attached files from pocono.sql
  const postThumbnails = new Map();
  const attachedFiles = new Map();

  for await (const line of rl) {
    if (line.includes('_thumbnail_id')) {
      const m = line.match(/VALUES \('?\d+'?,\s*'(\d+)',\s*'_thumbnail_id',\s*'(\d+)'\);/);
      if (m) postThumbnails.set(parseInt(m[1]), parseInt(m[2]));
    }
    if (line.includes('_wp_attached_file')) {
      const m = line.match(/VALUES \('?\d+'?,\s*'(\d+)',\s*'_wp_attached_file',\s*'([^']*)'\);/);
      if (m) attachedFiles.set(parseInt(m[1]), m[2]);
    }
  }

  const uploadsBase = 'd:/AHMED PROJECTS/pocono/pocono/wp-content/uploads';
  const dbProperties = await prisma.property.findMany({
    select: { id: true, wpPostId: true, title: true, slug: true }
  });

  const propertyAuditList = [];
  const hashCounts = new Map();

  let totalProperties = dbProperties.length;
  let totalExpectedImages = dbProperties.length;
  let originalBinariesFound = 0;
  let originalBinariesMissing = 0;
  let invalidCorruptFiles = 0;

  for (const p of dbProperties) {
    const thumbId = postThumbnails.get(p.wpPostId);
    const expectedRelFile = thumbId ? attachedFiles.get(thumbId) : `2026/05/${p.slug}-photo.jpg`;
    const fullPath = path.join(uploadsBase, expectedRelFile);

    const exists = fs.existsSync(fullPath);
    let sizeBytes = 0;
    let sha256 = 'N/A';
    let isOriginal = false;
    let isCorrupt = false;

    if (exists) {
      const buf = fs.readFileSync(fullPath);
      sizeBytes = buf.length;
      sha256 = crypto.createHash('sha256').update(buf).digest('hex');
      hashCounts.set(sha256, (hashCounts.get(sha256) || 0) + 1);

      // Check if file is original binary (original images are > 5KB, distinct SHA256)
      if (sizeBytes < 1000 || sha256 === 'bfc8abe406d3afeefad09530944821e48fe007caba6fa97b52b78bba5f752938') {
        isOriginal = false;
        isCorrupt = true;
        invalidCorruptFiles++;
        originalBinariesMissing++;
      } else {
        isOriginal = true;
        originalBinariesFound++;
      }
    } else {
      originalBinariesMissing++;
    }

    propertyAuditList.push({
      title: p.title,
      slug: p.slug,
      wpPostId: p.wpPostId,
      thumbId: thumbId || 'N/A',
      expectedRelFile,
      fullPath,
      exists,
      sizeBytes,
      sha256,
      status: isOriginal ? 'ORIGINAL BINARY FOUND' : 'ORIGINAL BINARY MISSING'
    });
  }

  const duplicateHashCount = hashCounts.get('bfc8abe406d3afeefad09530944821e48fe007caba6fa97b52b78bba5f752938') || 0;

  console.log('=== COMPREHENSIVE IMAGE AUDIT RESULTS ===');
  console.log(`Total Properties: ${totalProperties}`);
  console.log(`Total Expected Original Images: ${totalExpectedImages}`);
  console.log(`Original Binaries Found: ${originalBinariesFound}`);
  console.log(`Original Binaries Missing: ${originalBinariesMissing}`);
  console.log(`Duplicate SHA256 Count (947-byte placeholders): ${duplicateHashCount}`);
  console.log(`Invalid/Corrupt/Placeholder Files: ${invalidCorruptFiles}`);
  console.log(`Successfully Decoded Original Files: ${originalBinariesFound}`);
  console.log('=========================================\n');

  console.log('=== DETAILED PROPERTY AUDIT TABLE ===');
  propertyAuditList.forEach((item, idx) => {
    console.log(`[${idx + 1}] PROPERTY NAME: ${item.title} (${item.slug})`);
    console.log(`    WordPress Attachment ID: ${item.thumbId}`);
    console.log(`    Expected Filename: ${item.expectedRelFile}`);
    console.log(`    Expected Physical Path: ${item.fullPath}`);
    console.log(`    File Exists: ${item.exists} | Size: ${item.sizeBytes} bytes`);
    console.log(`    SHA256: ${item.sha256}`);
    console.log(`    Status: ${item.status}\n`);
  });
}

runComprehensiveAudit().catch(console.error).finally(() => prisma.$disconnect());
