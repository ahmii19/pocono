/**
 * FINAL DISCOVERY — All 3 invoices have resId=none (no reservation linked).
 * This script confirms full details then performs safe surgical deletion.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Confirmed from discovery run:
// E5059DA3 → e5059da3-83e3-4c99-81af-6fcc558394ed  $400 FAILED  2026-08-27
// 2D06789E → must resolve
// 88AB8F55 → must resolve
const TARGET_SHORT_REFS = ['E5059DA3', '2D06789E', '88AB8F55'];

function shortRef(uuid) {
  return uuid.replace(/-/g, '').slice(0, 8).toUpperCase();
}

const STATUS_LABEL = { 0: 'PENDING', 1: 'PAID', 2: 'FAILED' };

async function main() {
  console.log('\n=======================================================');
  console.log(' FINAL DEPENDENCY INSPECTION (READ-ONLY)');
  console.log('=======================================================\n');

  const totalBefore = await prisma.invoice.count();
  console.log(`Total invoices in DB (BEFORE cleanup): ${totalBefore}\n`);

  // Fetch all invoices (no startsWith — filter in JS)
  const allInvoices = await prisma.invoice.findMany({
    select: {
      id: true,
      totalAmount: true,
      paymentStatus: true,
      createdAt: true,
      reservationId: true,
      userId: true,
      invoiceType: true,
      paymentGateway: true,
      paymentReference: true
    }
  });

  const found = [];

  for (const ref of TARGET_SHORT_REFS) {
    const match = allInvoices.find(i => shortRef(i.id) === ref);
    if (!match) {
      console.log(`⚠️  ${ref}: NOT FOUND.\n`);
      continue;
    }

    // Fetch with relations — using correct Payment field names from schema
    const full = await prisma.invoice.findUnique({
      where: { id: match.id },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        reservation: {
          include: {
            property: { select: { id: true, title: true } },
            guest: { select: { id: true, firstName: true, lastName: true, email: true } },
            payments: {
              select: {
                id: true,
                amount: true,
                gateway: true,
                status: true,
                transactionId: true,
                currency: true,
                createdAt: true
              }
            },
            hostEarning: {
              select: {
                id: true,
                netAmount: true,
                grossAmount: true,
                commissionAmount: true,
                status: true,
                createdAt: true
              }
            }
          }
        }
      }
    });

    const sr = shortRef(full.id);
    const statusLabel = STATUS_LABEL[full.paymentStatus] || String(full.paymentStatus);
    const res = full.reservation;

    console.log(`╔════════════════════════════════════════════════════╗`);
    console.log(`║  INVOICE: ${sr}                                ║`);
    console.log(`╚════════════════════════════════════════════════════╝`);
    console.log(`  Full Invoice ID   : ${full.id}`);
    console.log(`  Total Amount      : $${Number(full.totalAmount).toFixed(2)}`);
    console.log(`  Payment Status    : ${statusLabel} (${full.paymentStatus})`);
    console.log(`  Invoice Type      : ${full.invoiceType}`);
    console.log(`  Payment Gateway   : ${full.paymentGateway || 'none'}`);
    console.log(`  Payment Reference : ${full.paymentReference || 'none'}`);
    console.log(`  Created At        : ${full.createdAt.toISOString().slice(0, 10)}`);
    console.log(`  User ID           : ${full.userId}`);
    console.log(`  User Name         : ${full.user?.firstName} ${full.user?.lastName}`);
    console.log(`  User Email        : ${full.user?.email}`);
    console.log(`  Reservation ID    : ${full.reservationId || 'NONE — orphaned invoice'}`);

    if (!res) {
      console.log(`  ✅ No linked Reservation → SAFE TO DELETE INVOICE ONLY`);
    } else {
      console.log(`\n  [Reservation: ${res.id}]`);
      console.log(`    Status          : ${res.status}`);
      console.log(`    Verify Status   : ${res.paymentVerificationStatus}`);
      console.log(`    Property        : ${res.property?.title} (${res.propertyId})`);
      console.log(`    Guest           : ${res.guest?.firstName} ${res.guest?.lastName} <${res.guest?.email}>`);
      console.log(`    Grand Total     : $${Number(res.grandTotal).toFixed(2)}`);
      console.log(`    Payments count  : ${res.payments?.length || 0}`);
      console.log(`    HostEarning     : ${res.hostEarning ? res.hostEarning.id : 'none'}`);
    }

    found.push({ ref, sr, full, hasReservation: !!res });
    console.log('');
  }

  console.log('\n=======================================================');
  console.log(` SUMMARY: ${found.length} invoices ready for cleanup`);
  console.log('=======================================================\n');

  let allOrphaned = true;
  found.forEach(({ ref, sr, full, hasReservation }) => {
    const sl = STATUS_LABEL[full.paymentStatus] || String(full.paymentStatus);
    console.log(`  ${ref} → ${full.id}`);
    console.log(`    $${Number(full.totalAmount).toFixed(2)} | ${sl} | ${full.createdAt.toISOString().slice(0,10)}`);
    console.log(`    Linked Reservation: ${hasReservation ? '⚠️  YES — needs careful handling' : '✅ NONE — orphaned invoice'}`);
    if (hasReservation) allOrphaned = false;
  });
  console.log('');
  if (allOrphaned) {
    console.log('  ✅ ALL 3 invoices have no linked reservation.');
    console.log('  ✅ Safe to delete invoice records only — no cascading data to worry about.');
  } else {
    console.log('  ⚠️  Some invoices have linked reservations — review above before deleting.');
  }

  await prisma.$disconnect();
}

main().catch(e => {
  console.error('ERROR:', e.message);
  prisma.$disconnect();
  process.exit(1);
});
