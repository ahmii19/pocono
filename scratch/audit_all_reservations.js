require('dotenv').config();
const prisma = require('../server/src/config/prisma');

async function checkAllReservations() {
  console.log('--- READ-ONLY AUDIT: 5 MOST RECENT RESERVATIONS IN POSTGRESQL ---');
  
  const reservations = await prisma.reservation.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      property: { select: { id: true, title: true } },
      guest: { select: { id: true, firstName: true, lastName: true, email: true } },
      host: { select: { id: true, firstName: true, lastName: true, email: true } }
    }
  });

  console.log(`Total reservations returned: ${reservations.length}`);
  reservations.forEach((res, index) => {
    console.log(`\nReservation #${index + 1}:`);
    console.log('  ID          :', res.id);
    console.log('  Created At  :', res.createdAt);
    console.log('  Status      :', res.status);
    console.log('  Grand Total :', res.grandTotal);
    console.log('  Property    :', res.property ? res.property.title : 'N/A');
    console.log('  Guest Email :', res.guest ? res.guest.email : 'NULL');
    console.log('  Host Email  :', res.host ? res.host.email : 'NULL');
  });

  await prisma.$disconnect();
}

checkAllReservations();
