const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '../prisma/schema.prisma');
console.log(fs.readFileSync(schemaPath, 'utf8'));
