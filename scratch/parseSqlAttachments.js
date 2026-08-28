const fs = require('fs');
const readline = require('readline');

async function parseAttachments() {
  const sqlPath = 'd:/AHMED PROJECTS/pocono/pocono/pocono.sql';
  const fileStream = fs.createReadStream(sqlPath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  const attachments = new Map(); // postId -> { id, parentId, title, guid, attachedFile }

  for await (const line of rl) {
    if (line.includes('INSERT INTO `wp_posts` VALUES')) {
      // (id, author, date, date_gmt, content, title, excerpt, status, comment_status, ping_status, password, name, to_ping, pinged, modified, modified_gmt, content_filtered, parent, guid, menu_order, post_type, mime_type, comment_count)
      const matches = line.matchAll(/\((\d+),\s*\d+,\s*'[^']*',\s*'[^']*',\s*'[^']*',\s*'([^']*)',\s*'[^']*',\s*'([^']*)',\s*'[^']*',\s*'[^']*',\s*'[^']*',\s*'([^']*)',\s*'[^']*',\s*'[^']*',\s*'[^']*',\s*'[^']*',\s*'[^']*',\s*(\d+),\s*'([^']*)',\s*\d+,\s*'([^']*)'/g);
      for (const m of matches) {
        const id = parseInt(m[1]);
        const title = m[2];
        const status = m[3];
        const name = m[4];
        const parentId = parseInt(m[5]);
        const guid = m[6];
        const postType = m[7];
        if (postType === 'attachment') {
          attachments.set(id, { id, parentId, title, guid, name });
        }
      }
    } else if (line.includes('INSERT INTO `wp_postmeta` VALUES')) {
      // (meta_id, post_id, meta_key, meta_value)
      const matches = line.matchAll(/\(\d+,\s*(\d+),\s*'_wp_attached_file',\s*'([^']*)'\)/g);
      for (const m of matches) {
        const postId = parseInt(m[1]);
        const file = m[2];
        if (attachments.has(postId)) {
          attachments.get(postId).attachedFile = file;
        } else {
          attachments.set(postId, { id: postId, attachedFile: file });
        }
      }
    }
  }

  console.log(`Parsed ${attachments.size} attachment posts from pocono.sql:`);
  Array.from(attachments.values()).forEach((att, i) => {
    console.log(` [${i+1}] ID ${att.id} | Parent ${att.parentId || 'N/A'} | AttachedFile: ${att.attachedFile} | GUID: ${att.guid}`);
  });

  return attachments;
}

parseAttachments().catch(console.error);
