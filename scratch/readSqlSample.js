const fs = require('fs');
const readline = require('readline');

async function readSample() {
  const fileStream = fs.createReadStream('d:/AHMED PROJECTS/pocono/pocono/pocono.sql');
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  for await (const line of rl) {
    if (line.includes('INSERT INTO `wp_terms`') || line.includes('INSERT INTO `wp_term_taxonomy`') || line.includes('INSERT INTO `wp_term_relationships`')) {
      console.log('LINE:', line.slice(0, 150));
    }
  }
}

readSample().catch(console.error);
