const { Client } = require('pg');
require('dotenv').config();

async function applyMigration() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  console.log('[DB MIGRATION] Connected to PostgreSQL database.');

  try {
    await client.query(`
      ALTER TABLE "reservations"
      ADD COLUMN IF NOT EXISTS "payment_due_at" TIMESTAMPTZ;
    `);
    console.log('[DB MIGRATION SUCCESS] Added payment_due_at column to reservations table.');
  } catch (err) {
    console.error('[DB MIGRATION ERROR]', err);
  } finally {
    await client.end();
  }
}

applyMigration();
