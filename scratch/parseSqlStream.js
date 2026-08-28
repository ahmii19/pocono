const fs = require('fs');
const prisma = require('../server/src/config/prisma');

async function parseSqlStream() {
  const sqlPath = 'd:/AHMED PROJECTS/pocono/pocono/pocono.sql';
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('SQL File Size:', (sql.length / (1024 * 1024)).toFixed(2), 'MB');

  // Match all wp_posts entries: (id, author, date, date_gmt, content, title, excerpt, status, comment_status, ping_status, password, name, to_ping, pinged, modified, modified_gmt, content_filtered, parent, guid, menu_order, post_type, mime_type, comment_count)
  const postsMap = new Map(); // id -> { id, title, post_type, parent }
  const attachmentsMap = new Map(); // id -> { id, title, parent, guid }

  // Search wp_posts table INSERT block
  const postsInsertMatch = sql.match(/INSERT INTO `wp_posts` VALUES\s*([\s\S]*?);/);
  if (postsInsertMatch) {
    const raw = postsInsertMatch[1];
    // Regex for post tuples
    const tupleRegex = /\((\d+),\s*\d+,\s*'[^']*',\s*'[^']*',\s*'[\s\S]*?',\s*'((?:\\'|[^'])*)',\s*'[\s\S]*?',\s*'([^']*)',\s*'[^']*',\s*'[^']*',\s*'[^']*',\s*'((?:\\'|[^'])*)',\s*'[^']*',\s*'[^']*',\s*'[^']*',\s*'[^']*',\s*'[^']*',\s*(\d+),\s*'((?:\\'|[^'])*)',\s*\d+,\s*'([^']*)'/g;
    let m;
    while ((m = tupleRegex.exec(raw)) !== null) {
      const id = parseInt(m[1]);
      const title = m[2];
      const name = m[3];
      const parent = parseInt(m[4]);
      const guid = m[5];
      const postType = m[6];

      postsMap.set(id, { id, title, name, parent, guid, postType });
      if (postType === 'attachment') {
        attachmentsMap.set(id, { id, title, parent, guid });
      }
    }
  }

  console.log('Total wp_posts parsed:', postsMap.size);
  console.log('Total attachments parsed:', attachmentsMap.size);

  // Match all wp_postmeta entries
  const thumbnailMap = new Map(); // postId -> thumbnailId
  const galleryMap = new Map(); // postId -> array of attachmentIds
  const attachedFileMap = new Map(); // attachmentId -> file path

  const postmetaInsertMatch = sql.match(/INSERT INTO `wp_postmeta` VALUES\s*([\s\S]*?);/);
  if (postmetaInsertMatch) {
    const raw = postmetaInsertMatch[1];
    const tupleRegex = /\(\d+,\s*(\d+),\s*'((?:\\'|[^'])*)',\s*'((?:\\'|[^'])*)'\)/g;
    let m;
    while ((m = tupleRegex.exec(raw)) !== null) {
      const postId = parseInt(m[1]);
      const key = m[2];
      const val = m[3];

      if (key === '_thumbnail_id') {
        thumbnailMap.set(postId, parseInt(val));
      } else if (key === '_wp_attached_file') {
        attachedFileMap.set(postId, val);
      } else if (key.includes('gallery') || key.includes('images') || key.includes('homey_')) {
        if (!galleryMap.has(postId)) galleryMap.set(postId, []);
        galleryMap.get(postId).push({ key, val });
      }
    }
  }

  console.log('_thumbnail_id count:', thumbnailMap.size);
  console.log('_wp_attached_file count:', attachedFileMap.size);
  console.log('gallery/images meta count:', galleryMap.size);

  // Get PostgreSQL properties
  const dbProperties = await prisma.property.findMany({
    select: { id: true, wpPostId: true, title: true, slug: true }
  });

  console.log('\n=== COMPLETE WORDPRESS IMAGE MAPPING FOR ALL 38 MIGRATED PROPERTIES ===');

  const mappings = [];

  for (const prop of dbProperties) {
    const wpId = prop.wpPostId;
    const thumbId = thumbnailMap.get(wpId);
    const thumbFile = thumbId ? attachedFileMap.get(thumbId) : null;
    const galleryMeta = galleryMap.get(wpId) || [];

    // Also check if any attachment has parent == wpId
    const childAttachments = Array.from(attachmentsMap.values()).filter(a => a.parent === wpId);
    const childFiles = childAttachments.map(a => ({
      attachmentId: a.id,
      file: attachedFileMap.get(a.id),
      guid: a.guid
    }));

    mappings.push({
      propertyId: prop.id,
      wpPostId: wpId,
      slug: prop.slug,
      title: prop.title,
      thumbId: thumbId || null,
      thumbFile: thumbFile || null,
      childFiles,
      galleryMeta
    });
  }

  console.log(JSON.stringify(mappings, null, 2));

  return mappings;
}

parseSqlStream().catch(console.error).finally(() => prisma.$disconnect());
