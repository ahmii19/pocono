const fs = require('fs');

const sql = fs.readFileSync('d:/AHMED PROJECTS/pocono/pocono/pocono.sql', 'utf8');

// Find all lines containing INSERT INTO
const insertLines = sql.split('\n').filter(l => l.includes('INSERT INTO'));
insertLines.forEach(l => {
  const tableNameMatch = l.match(/INSERT INTO `?([^`\s(]+)`?/);
  if (tableNameMatch) {
    console.log('Table:', tableNameMatch[1], '| Line length:', l.length);
  }
});
