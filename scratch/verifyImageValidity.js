const fs = require('fs');
const path = require('path');

function checkFileValidity() {
  console.log('=== CHECKING PHYSICAL IMAGE FILE VALIDITY ON DISK ===');

  const filesToCheck = [
    'd:/AHMED PROJECTS/pocono/pocono/wp-content/uploads/2018/10/01-2.jpg',
    'd:/AHMED PROJECTS/pocono/pocono/wp-content/uploads/2026/05/01-Photo-1-scaled.jpg',
    'd:/AHMED PROJECTS/pocono/pocono/wp-content/uploads/2018/10/05.jpg',
    'd:/AHMED PROJECTS/pocono/client/public/placeholder.jpg'
  ];

  filesToCheck.forEach(filePath => {
    const exists = fs.existsSync(filePath);
    if (!exists) {
      console.log(`[FILE MISSING] ${filePath}`);
      return;
    }

    const stat = fs.statSync(filePath);
    const buf = fs.readFileSync(filePath);
    const magic = buf.toString('hex', 0, 4);

    let format = 'UNKNOWN';
    if (magic.startsWith('ffd8ff')) format = 'JPEG';
    else if (magic.startsWith('89504e47')) format = 'PNG';
    else if (magic.startsWith('47494638')) format = 'GIF';
    else if (buf.toString('utf8', 0, 4) === 'RIFF') format = 'WEBP';
    else if (buf.toString('utf8', 0, 4) === '<svg') format = 'SVG';

    console.log(`Path: ${filePath}`);
    console.log(`  -> Size: ${stat.size} bytes`);
    console.log(`  -> Magic Bytes: ${magic}`);
    console.log(`  -> Detected Format: ${format}`);
    if (stat.size < 500) {
      console.log(`  -> WARNING: File is TOO SMALL (${stat.size} bytes) - Likely truncated or corrupted!`);
    } else {
      console.log(`  -> OK: File size and header look valid.`);
    }
    console.log('');
  });
}

checkFileValidity();
