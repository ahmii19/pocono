require('dotenv').config();
const prisma = require('../server/src/config/prisma');

async function run() {
  const propertyId = '943710b5-de03-4d75-b119-85b58b8cf341';
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    include: { reservations: true }
  });

  console.log(`Property: "${property.title}" (${property.id})`);
  console.log(`Status: ${property.status}`);
  console.log(`Reservations count: ${property.reservations.length}`);
  for (const r of property.reservations) {
    console.log(`- Reservation ${r.id}: status=${r.status}, checkIn=${r.checkInDate.toISOString()}, checkOut=${r.checkOutDate.toISOString()}`);
  }

  await prisma.$disconnect();
}

run().catch(console.error);
