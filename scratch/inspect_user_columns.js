require('dotenv').config();
const prisma = require('../server/src/config/prisma');

async function inspectUserColumns() {
  console.log('Inspecting PostgreSQL columns for `users` table...');
  const columns = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'users'
    ORDER BY column_name;
  `);
  console.log('PostgreSQL `users` table columns:');
  console.table(columns);

  console.log('\nChecking all occurrences of user status or deletion across all tables...');
  const allTables = await prisma.$queryRawUnsafe(`
    SELECT table_name, column_name 
    FROM information_schema.columns 
    WHERE column_name LIKE '%status%' OR column_name LIKE '%delete%' OR column_name LIKE '%deleted%'
    ORDER BY table_name, column_name;
  `);
  console.table(allTables);

  await prisma.$disconnect();
}

inspectUserColumns().catch(console.error);
