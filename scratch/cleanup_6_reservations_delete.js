/**
 * TARGETED BULK CLEANUP SCRIPT — DELETE EXACTLY 6 RESERVATIONS & DEPENDENTS
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();

const TARGET_RESERVATION_IDS = [
  "b0779757-b435-48a9-b916-2eb77d32a209",
  "302f5db5-edea-45ed-b33d-b2474c1ed1cd",
  "cda3ed19-201d-4bd6-9e92-f36e87f8941d",
  "e6b3dee9-b649-4c90-86c6-583a75eff913",
  "7955037e-b075-4616-9e03-4ce1bd5b21c9",
  "4e3c7059-2979-4b73-9768-bb9718d89653"
];

const TARGET_PROPERTY_ID = '644a339c-2ebe-4fd6-a671-60633ddb7cc9';
const TARGET_GUEST_ID = '64fa56e9-baeb-4532-b85a-afcaf53e7eb6';

async function runCleanup() {
  console.log('====================================================');
  console.log(' TARGETED CLEANUP OF 6 RESERVATIONS & DEPENDENTS');
  console.log('====================================================\n');

  // Pre-cleanup Counts
  const totalReservationsBefore = await prisma.reservation.count();
  const guestReservationsBefore = await prisma.reservation.count({ where: { guestId: TARGET_GUEST_ID } });
  const totalInvoicesBefore = await prisma.invoice.count();
  const totalPaymentsBefore = await prisma.payment.count();
  const totalHostEarningsBefore = await prisma.hostEarning.count();

  console.log('--- PRE-CLEANUP DATABASE COUNTS ---');
  console.log(`Total Reservations in DB : ${totalReservationsBefore}`);
  console.log(`Guest Hargada Reservations: ${guestReservationsBefore}`);
  console.log(`Total Invoices in DB     : ${totalInvoicesBefore}`);
  console.log(`Total Payments in DB     : ${totalPaymentsBefore}`);
  console.log(`Total HostEarnings in DB : ${totalHostEarningsBefore}\n`);

  // Verify all 6 target reservations exist and match guest/property restrictions
  const targetRes = await prisma.reservation.findMany({
    where: { id: { in: TARGET_RESERVATION_IDS } }
  });

  if (targetRes.length !== 6) {
    throw new Error(`Expected to find 6 reservations, but found ${targetRes.length}. Aborting.`);
  }

  // Safety check: Ensure every single target reservation belongs strictly to the target list
  for (const r of targetRes) {
    if (!TARGET_RESERVATION_IDS.includes(r.id)) {
      throw new Error(`Safety Violation: Found unexpected reservation ${r.id}. Aborting.`);
    }
  }

  // Find related proof files to clean up from disk if any
  let deletedProofsCount = 0;
  targetRes.forEach(r => {
    if (r.paymentProofUrl) {
      deletedProofsCount++;
      const relativePath = r.paymentProofUrl.replace(/^\//, '');
      const fullDiskPath = path.join(__dirname, '..', 'public', relativePath);
      if (fs.existsSync(fullDiskPath)) {
        try {
          fs.unlinkSync(fullDiskPath);
          console.log(`  [FILE DELETED] Payment proof file: ${fullDiskPath}`);
        } catch (e) {
          console.warn(`  [FILE WARN] Could not delete proof file: ${e.message}`);
        }
      }
    }
  });

  // Step 1: Explicitly delete Invoices related to target reservations
  const invoicesToDelete = await prisma.invoice.findMany({
    where: { reservationId: { in: TARGET_RESERVATION_IDS } },
    select: { id: true, totalAmount: true }
  });
  const deletedInvoiceIds = invoicesToDelete.map(i => i.id);

  const deletedInvoices = await prisma.invoice.deleteMany({
    where: { reservationId: { in: TARGET_RESERVATION_IDS } }
  });
  console.log(`\n✅ Deleted ${deletedInvoices.count} Invoices (IDs: ${deletedInvoiceIds.join(', ')})`);

  // Step 2: Explicitly delete HostEarnings related to target reservations
  const earningsToDelete = await prisma.hostEarning.findMany({
    where: { reservationId: { in: TARGET_RESERVATION_IDS } },
    select: { id: true }
  });
  const deletedEarningIds = earningsToDelete.map(e => e.id);

  const deletedEarnings = await prisma.hostEarning.deleteMany({
    where: { reservationId: { in: TARGET_RESERVATION_IDS } }
  });
  console.log(`✅ Deleted ${deletedEarnings.count} HostEarnings (IDs: ${deletedEarningIds.join(', ')})`);

  // Step 3: Explicitly delete Payments related to target reservations
  const paymentsToDelete = await prisma.payment.findMany({
    where: { reservationId: { in: TARGET_RESERVATION_IDS } },
    select: { id: true }
  });
  const deletedPaymentIds = paymentsToDelete.map(p => p.id);

  const deletedPayments = await prisma.payment.deleteMany({
    where: { reservationId: { in: TARGET_RESERVATION_IDS } }
  });
  console.log(`✅ Deleted ${deletedPayments.count} Payments (IDs: ${deletedPaymentIds.join(', ')})`);

  // Step 4: Delete the 6 Target Reservations
  const deletedReservations = await prisma.reservation.deleteMany({
    where: { id: { in: TARGET_RESERVATION_IDS } }
  });
  console.log(`✅ Deleted ${deletedReservations.count} Reservations (IDs: ${TARGET_RESERVATION_IDS.join(', ')})\n`);

  // Post-cleanup Counts & Verification
  const totalReservationsAfter = await prisma.reservation.count();
  const guestReservationsAfter = await prisma.reservation.count({ where: { guestId: TARGET_GUEST_ID } });
  const totalInvoicesAfter = await prisma.invoice.count();
  const totalPaymentsAfter = await prisma.payment.count();
  const totalHostEarningsAfter = await prisma.hostEarning.count();

  const propertyStillExists = await prisma.property.findUnique({ where: { id: TARGET_PROPERTY_ID } });
  const guestStillExists = await prisma.user.findUnique({ where: { id: TARGET_GUEST_ID } });

  console.log('====================================================');
  console.log(' POST-CLEANUP VERIFICATION & METRICS');
  console.log('====================================================');
  console.log(`Total Reservations BEFORE : ${totalReservationsBefore}`);
  console.log(`Total Reservations AFTER  : ${totalReservationsAfter} (Diff: ${totalReservationsBefore - totalReservationsAfter})`);
  console.log(`Guest Reservations BEFORE : ${guestReservationsBefore}`);
  console.log(`Guest Reservations AFTER  : ${guestReservationsAfter} (Diff: ${guestReservationsBefore - guestReservationsAfter})`);
  console.log(`Total Invoices AFTER      : ${totalInvoicesAfter} (Diff: ${totalInvoicesBefore - totalInvoicesAfter})`);
  console.log(`Total Payments AFTER      : ${totalPaymentsAfter} (Diff: ${totalPaymentsBefore - totalPaymentsAfter})`);
  console.log(`Total HostEarnings AFTER  : ${totalHostEarningsAfter} (Diff: ${totalHostEarningsBefore - totalHostEarningsAfter})`);
  console.log(`Property Preserved        : ${propertyStillExists ? 'YES (' + propertyStillExists.title + ')' : 'NO'}`);
  console.log(`Guest Account Preserved   : ${guestStillExists ? 'YES (' + guestStillExists.firstName + ' <' + guestStillExists.email + '>)' : 'NO'}`);
  console.log('====================================================\n');

  // Verify none of the 6 target reservations remain
  const remainingTargets = await prisma.reservation.findMany({
    where: { id: { in: TARGET_RESERVATION_IDS } }
  });
  console.log(`Target Reservations Remaining: ${remainingTargets.length} (EXPECTED: 0)`);

  await prisma.$disconnect();
}

runCleanup().catch(e => {
  console.error('Cleanup Execution Error:', e);
  prisma.$disconnect();
  process.exit(1);
});
