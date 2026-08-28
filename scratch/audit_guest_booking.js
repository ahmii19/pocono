require('dotenv').config();
const prisma = require('../server/src/config/prisma');

async function checkBooking() {
  console.log('--- READ-ONLY BOOKING AUDIT FOR revoluxemindset@gmail.com ---');
  
  const user = await prisma.user.findUnique({
    where: { email: 'revoluxemindset@gmail.com' }
  });

  if (!user) {
    console.log('User not found!');
    return;
  }

  const reservations = await prisma.reservation.findMany({
    where: { guestId: user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      property: { select: { id: true, title: true, hostId: true } },
      guest: { select: { id: true, firstName: true, lastName: true, email: true } },
      host: { select: { id: true, firstName: true, lastName: true, email: true } }
    }
  });

  console.log(`Found ${reservations.length} reservation(s) for guest ${user.email}:`);
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

checkBooking();
