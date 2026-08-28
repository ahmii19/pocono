const fs = require('fs');
const readline = require('readline');
const path = require('path');
const prisma = require('../server/src/config/prisma');

async function extractWpImages() {
  const sqlPath = 'd:/AHMED PROJECTS/pocono/pocono/pocono.sql';
  const fileStream = fs.createReadStream(sqlPath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  console.log('=== EXTRACTING WORDPRESS POST THUMBNAILS & ATTACHMENTS FROM SQL ===');

  const postThumbnails = new Map(); // postId -> thumbnailId
  const homeyGalleries = new Map(); // postId -> array of attachmentIds
  const attachmentFiles = new Map(); // attachmentId -> relativeFilePath
  const attachmentGuids = new Map(); // attachmentId -> guid URL
  const postTitles = new Map(); // postId -> title

  for await (const line of rl) {
    if (line.includes('INSERT INTO `wp_posts` VALUES')) {
      // tuple regex parsing for posts
      const matches = line.matchAll(/\((\d+),\s*\d+,\s*'[^']*',\s*'[^']*',\s*'[^']*',\s*'((?:\\'|[^'])*)',\s*'[^']*',\s*'([^']*)',\s*'[^']*',\s*'[^']*',\s*'[^']*',\s*'([^']*)',\s*'[^']*',\s*'[^']*',\s*'[^']*',\s*'[^']*',\s*'[^']*',\s*\d+,\s*'((?:\\'|[^'])*)',\s*\d+,\s*'([^']*)'/g);
      for (const m of matches) {
        const id = parseInt(m[1]);
        const title = m[2];
        const guid = m[5];
        const postType = m[6];
        if (postType === 'listing' || postType === 'post' || postType === 'page') {
          postTitles.set(id, title);
        }
        if (postType === 'attachment') {
          attachmentGuids.set(id, guid);
        }
      }
    } else if (line.includes('INSERT INTO `wp_postmeta` VALUES')) {
      // (meta_id, post_id, meta_key, meta_value)
      // Matches for _thumbnail_id, _wp_attached_file, homey_property_images
      const matches = line.matchAll(/\(\d+,\s*(\d+),\s*'([^']*)',\s*'((?:\\'|[^'])*)'\)/g);
      for (const m of matches) {
        const postId = parseInt(m[1]);
        const key = m[2];
        const val = m[3];

        if (key === '_thumbnail_id') {
          postThumbnails.set(postId, parseInt(val));
        } else if (key === '_wp_attached_file') {
          attachmentFiles.set(postId, val);
        } else if (key.includes('gallery') || key.includes('images') || key.includes('homey_')) {
          if (!homeyGalleries.has(postId)) homeyGalleries.set(postId, []);
          homeyGalleries.get(postId).push({ key, val });
        }
      }
    }
  }

  console.log(`Parsed Titles: ${postTitles.size}`);
  console.log(`Parsed Post Thumbnails (_thumbnail_id): ${postThumbnails.size}`);
  console.log(`Parsed Attached Files (_wp_attached_file): ${attachmentFiles.size}`);
  console.log(`Parsed Attachment GUIDs: ${attachmentGuids.size}`);

  // Fetch PostgreSQL properties
  const dbProperties = await prisma.property.findMany({
    select: { id: true, wpPostId: true, title: true, slug: true }
  });

  console.log(`\n=== MATCHING ALL 38 MIGRATED PROPERTIES ===`);

  const uploadsDir = 'd:/AHMED PROJECTS/pocono/pocono/wp-content/uploads';

  const mappingResults = [];

  for (const prop of dbProperties) {
    const wpId = prop.wpPostId;
    const thumbId = postThumbnails.get(wpId);
    const attachedFile = thumbId ? attachmentFiles.get(thumbId) : null;
    const guid = thumbId ? attachmentGuids.get(thumbId) : null;
    const extraMeta = homeyGalleries.get(wpId) || [];

    let resolvedPhysicalFile = null;
    let fileExistsOnDisk = false;

    if (attachedFile) {
      const fullDiskPath = path.join(uploadsDir, attachedFile);
      if (fs.existsSync(fullDiskPath)) {
        resolvedPhysicalFile = attachedFile;
        fileExistsOnDisk = true;
      }
    }

    if (!fileExistsOnDisk && guid) {
      // Check if guid path exists relative to uploads
      if (guid.includes('/wp-content/uploads/')) {
        const rel = guid.split('/wp-content/uploads/')[1];
        const fullDiskPath = path.join(uploadsDir, rel);
        if (fs.existsSync(fullDiskPath)) {
          resolvedPhysicalFile = rel;
          fileExistsOnDisk = true;
        }
      }
    }

    mappingResults.push({
      propertyId: prop.id,
      wpPostId: wpId,
      slug: prop.slug,
      title: prop.title,
      thumbId: thumbId || null,
      attachedFile: attachedFile || null,
      guid: guid || null,
      resolvedPhysicalFile,
      fileExistsOnDisk,
      extraMeta
    });
  }

  console.log(JSON.stringify(mappingResults, null, 2));

  return mappingResults;
}

extractWpImages().catch(console.error).finally(() => prisma.$disconnect());
