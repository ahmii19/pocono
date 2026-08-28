require('dotenv').config();
const prisma = require('../server/src/config/prisma');

async function auditReservations() {
  console.log('--- RECENT RESERVATIONS BY PAYMENT METHOD ---');
  
  const reservations = await prisma.reservation.findMany({
    take: 30,
    orderBy: { createdAt: 'desc' },
    include: {
      payments: true,
      invoices: true
    }
  });

  reservations.forEach(r => {
    const pGateway = r.payments[0]?.gateway || 'UNKNOWN';
    console.log(`ID: ${r.id.slice(0, 8)} | Gateway: ${pGateway} | Status: ${r.status} | PayVerifStatus: ${r.paymentVerificationStatus || 'N/A'} | PaymentStatus: ${r.payments[0]?.status || 'N/A'} | Created: ${r.createdAt.toISOString()}`);
  });

  await prisma.$disconnect();
}

auditReservations();
