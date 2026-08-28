require('dotenv').config();
const prisma = require('../server/src/config/prisma');

async function runDdl() {
  console.log('Running DDL to add email_new_property_notifications to users table...');
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS email_new_property_notifications BOOLEAN DEFAULT TRUE;
    `);
    console.log('✅ DDL executed successfully!');
  } catch (err) {
    console.error('❌ DDL error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

runDdl();
