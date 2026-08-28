require('dotenv').config();
const prisma = require('../server/src/config/prisma');
const reservationService = require('../server/src/services/reservationService');

async function runDetailedAudit() {
  console.log('====================================================');
  console.log(' DEEP AUDIT: ALL PROPERTIES & RESERVATIONS IN DB');
  console.log('====================================================\n');

  const properties = await prisma.property.findMany({
    include: {
      host: { select: { id: true, email: true, role: true } },
      reservations: true
    }
  });

  console.log(`Found ${properties.length} total properties in DB.\n`);

  const checkInDate = '2026-09-10';
  const checkOutDate = '2026-09-13';
  const start = new Date(checkInDate);
  const end = new Date(checkOutDate);

  for (const p of properties) {
    console.log(`----------------------------------------------------`);
    console.log(`Property ID: ${p.id}`);
    console.log(`Title:       "${p.title}"`);
    console.log(`Slug:        ${p.slug}`);
    console.log(`Status:      ${p.status}`);
    console.log(`Host:        ${p.host?.email} (${p.host?.role})`);
    console.log(`MinStay:     ${p.minStayNights} | MaxGuests: ${p.maxGuests} | NightlyPrice: $${p.nightlyPrice}`);
    console.log(`Total Reservations in DB: ${p.reservations.length}`);

    // Check reservations for this property
    for (const r of p.reservations) {
      console.log(`   - Reservation ${r.id.substring(0,8)} | Status: ${r.status} | CheckIn: ${r.checkInDate.toISOString().split('T')[0]} | CheckOut: ${r.checkOutDate.toISOString().split('T')[0]}`);
    }

    // Check availability test
    try {
      const result = await reservationService.checkAvailability({
        propertyId: p.id,
        checkInDate,
        checkOutDate,
        guestCount: 2
      });

      console.log(`--> Availability Result (2026-09-10 to 2026-09-13): isAvailable = ${result.isAvailable}`);
    } catch (err) {
      console.log(`--> Availability Check FAILED: Error = "${err.message}"`);
    }
  }

  await prisma.$disconnect();
}

runDetailedAudit().catch(console.error);
