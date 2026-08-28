require('dotenv').config();
const prisma = require('../server/src/config/prisma');
const reservationService = require('../server/src/services/reservationService');

async function runAudit() {
  console.log('====================================================');
  console.log(' AUDITING ALL HOST-CREATED PROPERTIES IN DATABASE');
  console.log('====================================================\n');

  // Find all properties owned by HOST users (or non-admin hosts)
  const properties = await prisma.property.findMany({
    include: {
      host: true,
      reservations: true,
      city: true,
      community: true,
      propertyType: true
    }
  });

  console.log(`Total properties in DB: ${properties.length}`);

  const checkInDate = '2026-10-01';
  const checkOutDate = '2026-10-04';

  for (const p of properties) {
    console.log(`\n----------------------------------------------------`);
    console.log(`Property ID:      ${p.id}`);
    console.log(`Title:            "${p.title}"`);
    console.log(`Slug:             "${p.slug}"`);
    console.log(`Status:           ${p.status}`);
    console.log(`Host Email:       ${p.host?.email} (Role: ${p.host?.role})`);
    console.log(`Nightly Price:    $${p.nightlyPrice}`);
    console.log(`Weekend Price:    ${p.weekendPrice ? '$' + p.weekendPrice : 'null'}`);
    console.log(`Cleaning Fee:     $${p.cleaningFee}`);
    console.log(`Min Stay Nights:  ${p.minStayNights}`);
    console.log(`Max Guests:       ${p.maxGuests}`);
    console.log(`City / Community: ${p.city?.name || 'null'} / ${p.community?.name || 'null'}`);
    console.log(`Property Type:    ${p.propertyType?.name || 'null'}`);
    console.log(`Reservations:     ${p.reservations.length}`);

    // Check availability
    try {
      const avail = await reservationService.checkAvailability({
        propertyId: p.id,
        checkInDate,
        checkOutDate,
        guestCount: 2
      });
      console.log(`Availability (2026-10-01 to 2026-10-04): isAvailable = ${avail.isAvailable}`);
      if (!avail.isAvailable) {
        console.log(`   REASON FOR UNAVAILABLE: Overlapping confirmed reservation(s):`);
        for (const r of p.reservations) {
          console.log(`   - Res ${r.id}: ${r.status} (${r.checkInDate.toISOString().split('T')[0]} to ${r.checkOutDate.toISOString().split('T')[0]})`);
        }
      }
    } catch (err) {
      console.log(`Availability Check FAILED with Error: "${err.message}"`);
    }
  }

  await prisma.$disconnect();
}

runAudit().catch(console.error);
