const fs = require('fs');
const path = require('path');
const prisma = require('../server/src/config/prisma');

async function checkDisk() {
  const sqlPath = 'd:/AHMED PROJECTS/pocono/pocono/pocono.sql';
  const sql = fs.readFileSync(sqlPath, 'utf8');

  // Parse thumbnail IDs
  const postThumbnails = new Map();
  const thumbMatches = sql.matchAll(/VALUES \('?\d+'?,\s*'(\d+)',\s*'_thumbnail_id',\s*'(\d+)'\);/g);
  for (const m of thumbMatches) {
    postThumbnails.set(parseInt(m[1]), parseInt(m[2]));
  }

  // Parse attached files
  const attachedFiles = new Map();
  const fileMatches = sql.matchAll(/VALUES \('?\d+'?,\s*'(\d+)',\s*'_wp_attached_file',\s*'([^']*)'\);/g);
  for (const m of fileMatches) {
    attachedFiles.set(parseInt(m[1]), m[2]);
  }

  const uploadsDir = 'd:/AHMED PROJECTS/pocono/pocono/wp-content/uploads';
  const dbProperties = await prisma.property.findMany({
    select: { id: true, wpPostId: true, title: true, slug: true }
  });

  console.log('=== CHECKING PHYSICAL DISK EXISTENCE FOR WORDPRESS FEATURED IMAGES ===\n');

  let foundCount = 0;
  let missingCount = 0;

  const propertyImageMap = [];

  for (const p of dbProperties) {
    const thumbId = postThumbnails.get(p.wpPostId);
    const relFile = thumbId ? attachedFiles.get(thumbId) : null;
    let diskPath = relFile ? path.join(uploadsDir, relFile) : null;
    let exists = diskPath ? fs.existsSync(diskPath) : false;

    // If exact thumbnail file is missing on disk, fallback to PV6_no-bg-_full1.png brand asset or check relative path
    let finalServeUrl = '';
    if (exists && relFile) {
      foundCount++;
      finalServeUrl = `http://localhost:5000/wp-content/uploads/${relFile}`;
    } else {
      missingCount++;
      // If thumbnail ID 4629 or similar exists in 2026/05
      finalServeUrl = 'http://localhost:5000/wp-content/uploads/2026/05/PV6_no-bg-_full1.png';
    }

    propertyImageMap.push({
      propertyId: p.id,
      wpPostId: p.wpPostId,
      slug: p.slug,
      title: p.title,
      thumbId: thumbId || null,
      relFile: relFile || null,
      existsOnDisk: exists,
      finalServeUrl
    });

    console.log(`Property: "${p.title}" (${p.slug})`);
    console.log(`  -> WP Attachment ID: ${thumbId || 'NONE'}`);
    console.log(`  -> WP Attached File: ${relFile || 'NONE'}`);
    console.log(`  -> Disk File Exists: ${exists ? 'YES [EXACT MATCH]' : 'NO [FALLBACK TO BRAND ASSET]'}`);
    console.log(`  -> Final Express URL: ${finalServeUrl}\n`);
  }

  console.log(`==================================================`);
  console.log(`Exact Physical Files Found on Disk: ${foundCount} / ${dbProperties.length}`);
  console.log(`Missing Files (Fallback to Brand Asset): ${missingCount} / ${dbProperties.length}`);
  console.log(`==================================================\n`);

  return propertyImageMap;
}

checkDisk().catch(console.error).finally(() => prisma.$disconnect());
