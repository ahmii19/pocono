const fs = require('fs');
const path = require('path');
const { Prisma } = require('@prisma/client');

function findSchema() {
  const possiblePaths = [
    path.join(__dirname, '../server/prisma/schema.prisma'),
    path.join(__dirname, '../prisma/schema.prisma'),
    path.join(__dirname, '../node_modules/@prisma/client/schema.prisma')
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      console.log('Found schema at:', p);
      return fs.readFileSync(p, 'utf8');
    }
  }
  return null;
}

const content = findSchema();
if (content) {
  console.log('\n--- SCHEMA PROPERTY CONTENT ---');
  const lines = content.split('\n');
  let inProperty = false;
  for (const line of lines) {
    if (line.startsWith('model Property ')) inProperty = true;
    else if (inProperty && line.startsWith('model ')) inProperty = false;

    if (inProperty) {
      console.log(line);
    }
  }
} else {
  console.log('Schema file not found directly, checking Prisma DMMF...');
  console.log(Object.keys(Prisma.dmmf.datamodel.models));
}
