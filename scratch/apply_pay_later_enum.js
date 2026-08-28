require('dotenv').config();
const prisma = require('../server/src/config/prisma');

async function main() {
  console.log('Adding PAY_LATER to PaymentGateway enum safely via PostgreSQL ALTER TYPE...');
  try {
    await prisma.$executeRawUnsafe(`ALTER TYPE "PaymentGateway" ADD VALUE IF NOT EXISTS 'PAY_LATER'`);
    console.log('Successfully added PAY_LATER to PaymentGateway enum!');
  } catch (err) {
    if (err.message.includes('already exists')) {
      console.log('PAY_LATER already exists in PaymentGateway enum.');
    } else {
      console.error('Error adding PAY_LATER to PaymentGateway enum:', err.message);
    }
  }
  await prisma.$disconnect();
}

main().catch(console.error);
