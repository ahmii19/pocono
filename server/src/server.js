require('dotenv').config();
const app = require('./app');
const prisma = require('./config/prisma');

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Verify PostgreSQL connectivity
    await prisma.$connect();
    console.log('[SUCCESS] PostgreSQL database connection established!');

    app.listen(PORT, () => {
      console.log(`==================================================`);
      console.log(` POCONO.VACATIONS BACKEND REST API SERVER ONLINE`);
      console.log(` Port: ${PORT}`);
      console.log(` Base URL: http://localhost:${PORT}/api/v1`);
      console.log(` Health Check: http://localhost:${PORT}/health`);
      console.log(`==================================================`);
    });
  } catch (err) {
    console.error('[FATAL] Database connection failed:', err);
    process.exit(1);
  }
}

startServer();
