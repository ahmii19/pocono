const fs = require('fs');
const path = require('path');

function scanAllDiskFiles() {
  const uploadsDir = 'd:/AHMED PROJECTS/pocono/pocono/wp-content/uploads';
  console.log('=== SCANNING ALL FILES IN WP-CONTENT/UPLOADS ===');

  const files = [];
  function walk(dir) {
    const list = fs.readdirSync(dir);
    for (const f of list) {
      const full = path.join(dir, f);
      if (fs.statSync(full).isDirectory()) {
        walk(full);
      } else {
        const rel = path.relative(uploadsDir, full).replace(/\\/g, '/');
        files.push(rel);
      }
    }
  }

  walk(uploadsDir);
  console.log(`Total files found on disk: ${files.length}`);
  files.forEach((f, i) => {
    console.log(` [${i + 1}] ${f}`);
  });
}

scanAllDiskFiles();
