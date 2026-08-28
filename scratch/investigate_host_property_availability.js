require('dotenv').config();
const prisma = require('../server/src/config/prisma');
const reservationService = require('../server/src/services/reservationService');
const hostService = require('../server/src/services/hostService');

async function runInvestigation() {
  console.log('====================================================');
  console.log(' FORENSIC INVESTIGATION: HOST PROPERTY AVAILABILITY');
  console.log('====================================================\n');

  // 1. Fetch properties from database
  const allProperties = await prisma.property.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      host: { select: { id: true, email: true, role: true } }
    }
  });

  console.log(`Total properties found in DB: ${allProperties.length}`);

  // Find a working existing property (e.g. status = PUBLISHED)
  const workingProperty = allProperties.find(p => p.status === 'PUBLISHED' && p.nightlyPrice > 0);

  console.log('\n--- WORKING EXISTING PROPERTY RECORD ---');
  if (workingProperty) {
    console.log(`ID:              ${workingProperty.id}`);
    console.log(`Title:           "${workingProperty.title}"`);
    console.log(`Slug:            ${workingProperty.slug}`);
    console.log(`Status:          ${workingProperty.status}`);
    console.log(`Host Email:      ${workingProperty.host?.email} (Role: ${workingProperty.host?.role})`);
    console.log(`Nightly Price:   $${workingProperty.nightlyPrice}`);
    console.log(`Weekend Price:   $${workingProperty.weekendPrice}`);
    console.log(`Cleaning Fee:    $${workingProperty.cleaningFee}`);
    console.log(`Min Stay Nights: ${workingProperty.minStayNights}`);
    console.log(`Max Guests:      ${workingProperty.maxGuests}`);
    console.log(`Bedrooms:        ${workingProperty.bedrooms}`);
    console.log(`Beds:            ${workingProperty.beds}`);
    console.log(`Bathrooms:       ${workingProperty.bathrooms}`);
    console.log(`CreatedAt:       ${workingProperty.createdAt}`);
  } else {
    console.log('No working property found.');
  }

  // 2. Create a fresh property using Host UI service (createHostProperty)
  console.log('\n--- CREATING FRESH HOST PROPERTY VIA hostService.createHostProperty ---');
  let hostUser = await prisma.user.findFirst({ where: { role: 'HOST' } });
  if (!hostUser) {
    hostUser = await prisma.user.create({
      data: {
        email: `test.host.investigate.${Date.now()}@example.com`,
        passwordHash: 'hashed_password',
        firstName: 'Investigate',
        lastName: 'Host',
        role: 'HOST'
      }
    });
  }

  const testTitle = `Host Availability Test Property ${Date.now()}`;
  const createdHostProp = await hostService.createHostProperty(hostUser.id, {
    title: testTitle,
    description: 'Testing availability check on host created property.',
    address: '123 Mountain View Rd',
    nightlyPrice: 250,
    weekendPrice: 300,
    cleaningFee: 75,
    maxGuests: 6,
    bedrooms: 3,
    beds: 4,
    bathrooms: 2,
    status: 'PUBLISHED'
  });

  console.log(`Created Host Property ID: ${createdHostProp.id}`);
  console.log(`Status: ${createdHostProp.status}`);

  // Fetch complete DB record of newly created host property
  const hostPropRecord = await prisma.property.findUnique({
    where: { id: createdHostProp.id }
  });

  console.log('\n--- NEW HOST PROPERTY RECORD IN DB ---');
  console.log(`ID:              ${hostPropRecord.id}`);
  console.log(`Title:           "${hostPropRecord.title}"`);
  console.log(`Slug:            ${hostPropRecord.slug}`);
  console.log(`Status:          ${hostPropRecord.status}`);
  console.log(`Nightly Price:   $${hostPropRecord.nightlyPrice}`);
  console.log(`Weekend Price:   $${hostPropRecord.weekendPrice}`);
  console.log(`Cleaning Fee:    $${hostPropRecord.cleaningFee}`);
  console.log(`Min Stay Nights: ${hostPropRecord.minStayNights}`);
  console.log(`Max Guests:      ${hostPropRecord.maxGuests}`);
  console.log(`Bedrooms:        ${hostPropRecord.bedrooms}`);
  console.log(`Beds:            ${hostPropRecord.beds}`);
  console.log(`Bathrooms:       ${hostPropRecord.bathrooms}`);
  console.log(`CreatedAt:       ${hostPropRecord.createdAt}`);

  // 3. Compare all property schema fields between working property and host property
  console.log('\n--- COMPARISON OF ALL PROPERTY FIELDS ---');
  const propertyKeys = Object.keys(hostPropRecord);
  for (const key of propertyKeys) {
    const workVal = workingProperty ? workingProperty[key] : 'N/A';
    const hostVal = hostPropRecord[key];
    if (workVal !== hostVal) {
      console.log(`FIELD: ${key.padEnd(20)} | Working: ${String(workVal).padEnd(25)} | Host Created: ${String(hostVal)}`);
    }
  }

  // 4. Test availability for both properties with SAME requested dates
  const checkInDate = '2026-09-10';
  const checkOutDate = '2026-09-13';
  const guestCount = 2;

  console.log(`\n--- TESTING AVAILABILITY (Dates: ${checkInDate} to ${checkOutDate}, Guests: ${guestCount}) ---`);

  if (workingProperty) {
    try {
      const workAvail = await reservationService.checkAvailability({
        propertyId: workingProperty.id,
        checkInDate,
        checkOutDate,
        guestCount
      });
      console.log(`[WORKING PROPERTY] isAvailable: ${workAvail.isAvailable} | TotalNights: ${workAvail.totalNights} | GrandTotal: $${workAvail.pricingBreakdown?.grandTotal}`);
    } catch (err) {
      console.log(`[WORKING PROPERTY ERROR] ${err.message}`);
    }
  }

  try {
    const hostAvail = await reservationService.checkAvailability({
      propertyId: createdHostProp.id,
      checkInDate,
      checkOutDate,
      guestCount
    });
    console.log(`[HOST PROPERTY]    isAvailable: ${hostAvail.isAvailable} | TotalNights: ${hostAvail.totalNights} | GrandTotal: $${hostAvail.pricingBreakdown?.grandTotal}`);
  } catch (err) {
    console.log(`[HOST PROPERTY ERROR] ${err.message}`);
  }

  // Cleanup test property
  await prisma.property.delete({ where: { id: createdHostProp.id } });
  console.log('\n[CLEANUP] Deleted temporary test property.');

  await prisma.$disconnect();
}

runInvestigation().catch(err => {
  console.error('[FATAL INVESTIGATION ERROR]', err);
  process.exit(1);
});
