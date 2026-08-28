require('dotenv').config();
const prisma = require('../server/src/config/prisma');

async function checkAll() {
  const properties = await prisma.property.findMany({
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      hostId: true,
      minStayNights: true,
      maxGuests: true,
      nightlyPrice: true,
      host: { select: { email: true, role: true } },
      reservations: {
        select: { id: true, status: true, checkInDate: true, checkOutDate: true }
      }
    }
  });

  console.log(`=== FULL DATABASE AUDIT OF ALL ${properties.length} PROPERTIES ===\n`);

  for (const p of properties) {
    console.log(`[${p.id}] "${p.title}" (${p.slug})`);
    console.log(`  Host: ${p.host?.email} (${p.host?.role}) | Status: ${p.status}`);
    console.log(`  MinStay: ${p.minStayNights} | MaxGuests: ${p.maxGuests} | Price: $${p.nightlyPrice}`);
    console.log(`  Reservations (${p.reservations.length}):`);
    for (const r of p.reservations) {
      console.log(`    - Res ${r.id.substring(0,8)} | status: ${r.status} | dates: ${r.checkInDate.toISOString().split('T')[0]} -> ${r.checkOutDate.toISOString().split('T')[0]}`);
    }
    console.log('');
  }

  await prisma.$disconnect();
}

checkAll().catch(console.error);
