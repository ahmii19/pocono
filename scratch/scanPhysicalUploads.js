const fs = require('fs');
const path = require('path');

function scanUploads() {
  const uploadsDir = 'd:/AHMED PROJECTS/pocono/pocono/wp-content/uploads';
  console.log('=== SCANNING PHYSICAL FILES IN UPLOADS DIR ===');
  console.log('Path:', uploadsDir);

  const images = [];

  function walk(dir) {
    const files = fs.readdirSync(dir);
    for (const f of files) {
      const full = path.join(dir, f);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        walk(full);
      } else {
        const ext = path.extname(f).toLowerCase();
        if (['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext)) {
          const rel = path.relative(uploadsDir, full).replace(/\\/g, '/');
          images.push({
            filename: f,
            relativePath: rel,
            fullPath: full,
            sizeBytes: stat.size
          });
        }
      }
    }
  }

  walk(uploadsDir);

  console.log(`Found ${images.length} physical image files:`);
  images.forEach((img, i) => {
    console.log(` [${i+1}] ${img.relativePath} (${(img.sizeBytes / 1024).toFixed(1)} KB)`);
  });

  return images;
}

scanUploads();
