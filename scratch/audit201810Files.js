const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function audit201810() {
  const dir = 'd:/AHMED PROJECTS/pocono/pocono/wp-content/uploads/2018/10';
  console.log('=== READ-ONLY AUDIT: D:\\AHMED PROJECTS\\pocono\\pocono\\wp-content\\uploads\\2018\\10\\ ===');

  if (!fs.existsSync(dir)) {
    console.log(`Directory does not exist: ${dir}`);
    return;
  }

  const files = fs.readdirSync(dir);
  console.log(`Total files in 2018/10: ${files.length}\n`);

  const fileDetails = [];
  const hashCounts = new Map();
  let count947 = 0;
  let countOver10KB = 0;

  files.forEach(f => {
    const fullPath = path.join(dir, f);
    const stat = fs.statSync(fullPath);
    if (!stat.isFile()) return;

    const buf = fs.readFileSync(fullPath);
    const size = stat.size;
    const hash = crypto.createHash('sha256').update(buf).digest('hex');

    hashCounts.set(hash, (hashCounts.get(hash) || 0) + 1);

    if (size === 947) count947++;
    if (size > 10240) countOver10KB++;

    fileDetails.push({
      filename: f,
      size,
      hash
    });
  });

  // Sort by size descending for top 20 largest
  const sortedBySize = [...fileDetails].sort((a, b) => b.size - a.size);

  console.log('=== SUMMARY METRICS ===');
  console.log(`1. Total files: ${fileDetails.length}`);
  console.log(`2. Files that are exactly 947 bytes: ${count947}`);
  console.log(`3. Files larger than 10 KB (>10,240 bytes): ${countOver10KB}`);
  console.log(`4. Unique SHA256 hashes count: ${hashCounts.size}\n`);

  console.log('=== TOP 20 LARGEST FILES IN 2018/10 ===');
  sortedBySize.slice(0, 20).forEach((f, idx) => {
    console.log(`[${idx + 1}] ${f.filename} | Size: ${f.size} bytes | SHA256: ${f.hash}`);
  });

  console.log('\n=== ALL FILES IN 2018/10 ===');
  fileDetails.forEach((f, idx) => {
    console.log(`[${idx + 1}] ${f.filename} | Size: ${f.size} bytes | SHA256: ${f.hash}`);
  });
}

audit201810();
