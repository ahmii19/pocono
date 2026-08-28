const fs = require('fs');
const readline = require('readline');
const prisma = require('../server/src/config/prisma');

async function findThumbnails() {
  const sqlPath = 'd:/AHMED PROJECTS/pocono/pocono/pocono.sql';
  const fileStream = fs.createReadStream(sqlPath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  const postThumbnails = new Map(); // postId -> thumbnailId
  const attachedFiles = new Map(); // attachmentId -> relativeFilePath

  for await (const line of rl) {
    if (line.includes('_thumbnail_id')) {
      // INSERT INTO `wp_postmeta` VALUES ('123', '4628', '_thumbnail_id', '4638');
      const m = line.match(/VALUES \('?\d+'?,\s*'(\d+)',\s*'_thumbnail_id',\s*'(\d+)'\);/);
      if (m) {
        postThumbnails.set(parseInt(m[1]), parseInt(m[2]));
      }
    }
    if (line.includes('_wp_attached_file')) {
      // INSERT INTO `wp_postmeta` VALUES ('123', '4638', '_wp_attached_file', '2026/05/42-Photo-41-Medium.jpg');
      const m = line.match(/VALUES \('?\d+'?,\s*'(\d+)',\s*'_wp_attached_file',\s*'([^']*)'\);/);
      if (m) {
        attachedFiles.set(parseInt(m[1]), m[2]);
      }
    }
  }

  console.log('Parsed _thumbnail_id records:', postThumbnails.size);
  console.log('Parsed _wp_attached_file records:', attachedFiles.size);

  const dbProperties = await prisma.property.findMany({
    select: { id: true, wpPostId: true, title: true, slug: true }
  });

  console.log('\n=== MATCHED PROPERTY FEATURED IMAGES ===');
  dbProperties.forEach(p => {
    const thumbId = postThumbnails.get(p.wpPostId);
    const file = thumbId ? attachedFiles.get(thumbId) : null;
    console.log(`WP ID ${p.wpPostId} "${p.title}" (${p.slug}):`);
    console.log(`  -> Thumbnail ID: ${thumbId || 'NONE'} | File: ${file || 'NONE'}`);
  });
}

findThumbnails().catch(console.error).finally(() => prisma.$disconnect());
