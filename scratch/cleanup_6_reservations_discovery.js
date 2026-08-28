/**
 * DISCOVERY & INSPECTION SCRIPT FOR 6 TARGET RESERVATIONS
 * READ-ONLY — NO DELETIONS
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const TARGET_RESERVATION_IDS = [
  "b0779757-b435-48a9-b916-2eb77d32a209",
  "302f5db5-edea-45ed-b33d-b2474c1ed1cd",
  "cda3ed19-201d-4bd6-9e92-f36e87f8941d",
  "e6b3dee9-b649-4c90-86c6-583a75eff913",
  "7955037e-b075-4616-9e03-4ce1bd5b21c9",
  "4e3c7059-2979-4b73-9768-bb9718d89653"
];

async function inspect() {
  console.log('====================================================');
  console.log(' 6 TARGET RESERVATIONS DISCOVERY & INSPECTION');
  console.log('====================================================\n');

  // Check property existence
  const prop = await prisma.property.findUnique({
    where: { id: '644a339c-2ebe-4fd6-a671-60633ddb7cc9' }
  });
  console.log(`Property check: ${prop ? prop.title + ' (EXISTS)' : 'NOT FOUND'}`);

  // Check guest existence
  const guest = await prisma.user.findUnique({
    where: { id: '64fa56e9-baeb-4532-b85a-afcaf53e7eb6' }
  });
  console.log(`Guest check: ${guest ? guest.firstName + ' ' + guest.lastName + ' <' + guest.email + '> (EXISTS)' : 'NOT FOUND'}\n`);

  // Count total reservations in system
  const totalReservationsBefore = await prisma.reservation.count();
  console.log(`Total Reservations in Database: ${totalReservationsBefore}`);

  // Count guest reservations
  const guestReservationsCount = await prisma.reservation.count({
    where: { guestId: '64fa56e9-baeb-4532-b85a-afcaf53e7eb6' }
  });
  console.log(`Total Reservations for Guest Hargada: ${guestReservationsCount}\n`);

  let foundReservations = [];
  let foundInvoices = [];
  let foundPayments = [];
  let foundEarnings = [];
  let foundReviews = [];

  for (const id of TARGET_RESERVATION_IDS) {
    const res = await prisma.reservation.findUnique({
      where: { id },
      include: {
        invoices: true,
        payments: true,
        hostEarning: true,
        reviews: true,
        property: { select: { id: true, title: true } },
        guest: { select: { id: true, firstName: true, email: true } }
      }
    });

    if (!res) {
      console.log(`❌ Reservation ID ${id} NOT FOUND`);
      continue;
    }

    foundReservations.push(res);
    console.log(`----------------------------------------------------`);
    console.log(`Reservation ID : ${res.id}`);
    console.log(`Short Ref      : #${res.id.slice(0, 8)}`);
    console.log(`Grand Total    : $${Number(res.grandTotal).toFixed(2)}`);
    console.log(`Status         : ${res.status}`);
    console.log(`Verify Status  : ${res.paymentVerificationStatus}`);
    console.log(`Proof URL      : ${res.paymentProofUrl || 'NONE'}`);

    if (res.invoices && res.invoices.length > 0) {
      res.invoices.forEach(inv => {
        foundInvoices.push(inv);
        console.log(`  └─ Invoice   : ${inv.id} | $${Number(inv.totalAmount).toFixed(2)} | Status: ${inv.paymentStatus}`);
      });
    } else {
      console.log(`  └─ Invoices  : NONE`);
    }

    if (res.payments && res.payments.length > 0) {
      res.payments.forEach(p => {
        foundPayments.push(p);
        console.log(`  └─ Payment   : ${p.id} | $${Number(p.amount).toFixed(2)} | Gateway: ${p.gateway} | Status: ${p.status}`);
      });
    } else {
      console.log(`  └─ Payments  : NONE`);
    }

    if (res.hostEarning) {
      foundEarnings.push(res.hostEarning);
      console.log(`  └─ HostEarning: ${res.hostEarning.id} | Net: $${Number(res.hostEarning.netAmount).toFixed(2)} | Status: ${res.hostEarning.status}`);
    } else {
      console.log(`  └─ HostEarning: NONE`);
    }

    if (res.reviews && res.reviews.length > 0) {
      res.reviews.forEach(r => {
        foundReviews.push(r);
        console.log(`  └─ Review    : ${r.id}`);
      });
    }
  }

  console.log('\n====================================================');
  console.log(' DISCOVERY SUMMARY');
  console.log('====================================================');
  console.log(`Target Reservations Found : ${foundReservations.length} of 6`);
  console.log(`Target Invoices Found     : ${foundInvoices.length}`);
  console.log(`Target Payments Found     : ${foundPayments.length}`);
  console.log(`Target HostEarnings Found : ${foundEarnings.length}`);
  console.log(`Target Reviews Found      : ${foundReviews.length}`);
  console.log('====================================================\n');

  await prisma.$disconnect();
}

inspect().catch(e => {
  console.error('Inspection Error:', e);
  prisma.$disconnect();
  process.exit(1);
});
