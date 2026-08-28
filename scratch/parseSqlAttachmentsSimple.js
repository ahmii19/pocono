const fs = require('fs');
const readline = require('readline');

async function parseSimple() {
  const sqlPath = 'd:/AHMED PROJECTS/pocono/pocono/pocono.sql';
  const fileStream = fs.createReadStream(sqlPath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  const attachedFiles = [];

  for await (const line of rl) {
    if (line.includes('_wp_attached_file')) {
      // INSERT INTO `wp_postmeta` VALUES ('123', '456', '_wp_attached_file', '2026/05/PV6_no-bg-_full1.png');
      const m = line.match(/VALUES \('\d+','(\d+)','_wp_attached_file','([^']*)'\);/);
      if (m) {
        attachedFiles.push({ postId: parseInt(m[1]), file: m[2] });
      }
    }
  }

  console.log('Parsed _wp_attached_file records count:', attachedFiles.length);
  attachedFiles.forEach(f => {
    console.log(`Post ID: ${f.postId} -> File: ${f.file}`);
  });
}

parseSimple().catch(console.error);
