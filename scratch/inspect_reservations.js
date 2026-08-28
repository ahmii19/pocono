const prisma = require('../server/src/config/prisma');

async function inspectReservations() {
  const reservations = await prisma.reservation.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      status: true,
      paymentVerificationStatus: true,
      guestId: true,
      guest: { select: { email: true } },
      createdAt: true
    }
  });

  console.log('TOTAL RESERVATIONS:', reservations.length);
  console.log(JSON.stringify(reservations, null, 2));
  process.exit(0);
}

inspectReservations().catch(e => {
  console.error(e);
  process.exit(1);
});
