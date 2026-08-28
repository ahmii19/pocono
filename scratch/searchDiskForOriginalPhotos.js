const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function scanEntireWorkspace() {
  const root = 'd:/AHMED PROJECTS/pocono';
  console.log('=== SEARCHING ENTIRE WORKSPACE FOR ORIGINAL PROPERTY IMAGES ===');
  console.log('Workspace Root:', root);

  const foundImages = [];

  function walk(dir) {
    if (dir.includes('node_modules') || dir.includes('.next') || dir.includes('.git')) return;
    try {
      const files = fs.readdirSync(dir);
      for (const f of files) {
        const full = path.join(dir, f);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
          walk(full);
        } else {
          const ext = path.extname(f).toLowerCase();
          if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
            const buf = fs.readFileSync(full);
            const sha256 = crypto.createHash('sha256').update(buf).digest('hex');
            foundImages.push({
              fullPath: full,
              relPath: path.relative(root, full),
              sizeBytes: stat.size,
              sha256
            });
          }
        }
      }
    } catch (e) {}
  }

  walk(root);

  console.log(`Found ${foundImages.length} image files across workspace:`);
  foundImages.forEach((img, i) => {
    console.log(` [${i + 1}] ${img.relPath} (${img.sizeBytes} bytes, Hash: ${img.sha256.slice(0, 12)})`);
  });

  return foundImages;
}

scanEntireWorkspace();
