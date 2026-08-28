const prisma = require('../server/src/config/prisma');
const hostEarningService = require('../server/src/services/hostEarningService');

async function backfillHostEarnings() {
  console.log('==================================================');
  console.log(' HOST EARNINGS BACKFILL SCRIPT');
  console.log('==================================================\n');

  const reservations = await prisma.reservation.findMany({
    where: {
      status: { in: ['CONFIRMED', 'COMPLETED'] }
    },
    include: {
      property: true,
      hostEarning: true
    }
  });

  console.log(`Found ${reservations.length} CONFIRMED/COMPLETED reservations to check.`);

  let createdCount = 0;
  let skippedCount = 0;

  for (const r of reservations) {
    if (r.hostEarning) {
      skippedCount++;
      continue;
    }

    const earning = await hostEarningService.syncReservationEarning(r.id, r.status);
    if (earning) {
      createdCount++;
      console.log(`  [CREATED] Reservation ID: ${r.id} | Status: ${r.status} -> Earning Status: ${earning.status} | Net: $${earning.netAmount}`);
    } else {
      skippedCount++;
    }
  }

  console.log('\n==================================================');
  console.log(` SUMMARY: ${createdCount} host earnings created, ${skippedCount} skipped.`);
  console.log('==================================================\n');
}

backfillHostEarnings()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Backfill failed:', err);
    process.exit(1);
  });
