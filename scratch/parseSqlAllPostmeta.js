const fs = require('fs');
const readline = require('readline');
const prisma = require('../server/src/config/prisma');

async function parseAllPostmeta() {
  const sqlPath = 'd:/AHMED PROJECTS/pocono/pocono/pocono.sql';
  const fileStream = fs.createReadStream(sqlPath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  console.log('=== SEARCHING ALL POSTMETA FOR PROPERTY IMAGES IN SQL ===');

  const postMeta = new Map(); // postId -> array of { key, val }

  for await (const line of rl) {
    if (line.includes('wp_postmeta')) {
      // (meta_id, post_id, meta_key, meta_value)
      const matches = line.matchAll(/\((\d+),\s*(\d+),\s*'([^']*)',\s*'((?:\\'|[^'])*)'\)/g);
      for (const m of matches) {
        const postId = parseInt(m[2]);
        const key = m[3];
        const val = m[4];

        if (key.includes('thumb') || key.includes('image') || key.includes('gallery') || key.includes('file') || key.includes('photo')) {
          if (!postMeta.has(postId)) postMeta.set(postId, []);
          postMeta.get(postId).push({ key, val });
        }
      }
    }
  }

  console.log('Posts with image-related meta:', postMeta.size);

  const dbProperties = await prisma.property.findMany({
    select: { id: true, wpPostId: true, title: true, slug: true }
  });

  console.log('\n=== MAPPED IMAGE METADATA FOR MIGRATED PROPERTIES ===');

  dbProperties.forEach(p => {
    const meta = postMeta.get(p.wpPostId) || [];
    console.log(`Property WP ID ${p.wpPostId} "${p.title}" (${p.slug}):`);
    if (meta.length === 0) {
      console.log('  -> No image meta found in wp_postmeta');
    } else {
      meta.forEach(m => {
        console.log(`  -> Key: ${m.key} | Val: ${m.val.slice(0, 100)}`);
      });
    }
  });
}

parseAllPostmeta().catch(console.error).finally(() => prisma.$disconnect());
