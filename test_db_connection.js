const { Client } = require('pg');
const fs = require('fs');

async function testPostgresConnection() {
  const passwordsToTry = [
    process.env.PGPASSWORD,
    'postgres',
    'admin',
    'root',
    '123456',
    'password',
    ''
  ].filter(p => p !== undefined);

  let connectedClient = null;
  let successfulPassword = null;

  for (const password of passwordsToTry) {
    const client = new Client({
      host: 'localhost',
      port: 5432,
      user: 'postgres',
      password: password,
      database: 'postgres',
      connectionTimeoutMillis: 3000,
    });

    try {
      await client.connect();
      connectedClient = client;
      successfulPassword = password;
      console.log(`[SUCCESS] Connected to PostgreSQL on localhost:5432 with user 'postgres'!`);
      break;
    } catch (err) {
      // password failed or connection refused
    }
  }

  if (!connectedClient) {
    console.error(`[ERROR] Could not connect to PostgreSQL with default passwords. Please provide your postgres password.`);
    process.exit(1);
  }

  try {
    // Check if 'pocono' database exists
    const res = await connectedClient.query("SELECT 1 FROM pg_database WHERE datname = 'pocono'");
    if (res.rows.length === 0) {
      console.log(`[INFO] Database 'pocono' does not exist. Creating database 'pocono'...`);
      await connectedClient.query('CREATE DATABASE pocono');
      console.log(`[SUCCESS] Database 'pocono' created successfully!`);
    } else {
      console.log(`[INFO] Database 'pocono' already exists.`);
    }

    await connectedClient.end();

    // Create .env file with DATABASE_URL
    const dbUrl = `postgresql://postgres:${encodeURIComponent(successfulPassword)}@localhost:5432/pocono?schema=public`;
    fs.writeFileSync('.env', `DATABASE_URL="${dbUrl}"\n`);
    console.log(`[SUCCESS] Configured .env with DATABASE_URL: postgresql://postgres:*****@localhost:5432/pocono?schema=public`);

  } catch (err) {
    console.error(`[ERROR] Database operation failed:`, err.message);
    if (connectedClient) await connectedClient.end();
    process.exit(1);
  }
}

testPostgresConnection();
