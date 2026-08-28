/**
 * STEP 3: SURGICAL DELETION — 3 Exact Test Invoices
 *
 * Deletes ONLY these 3 invoices by their exact full UUID.
 * All 3 are orphaned (no linked Reservation/Payment/HostEarning).
 * Each deletion is done individually with pre/post verification.
 *
 * Target full UUIDs (confirmed from discovery):
 *   E5059DA3 → e5059da3-83e3-4c99-81af-6fcc558394ed  $400  FAILED   2026-08-27
 *   2D06789E → 2d06789e-51c5-4e39-9842-e172bf01c991  $220  PAID     2026-08-25
 *   88AB8F55 → 88ab8f55-7201-4883-9bdd-3b7759b0b5cc  $1280 PENDING  2026-08-24
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const TARGET_INVOICES = [
  {
    shortRef: 'E5059DA3',
    fullId:   'e5059da3-83e3-4c99-81af-6fcc558394ed',
    amount:   400.00,
    status:   'FAILED',
    date:     '2026-08-27'
  },
  {
    shortRef: 'G2D06789E',
    shortRef: '2D06789E',
    fullId:   '2d06789e-51c5-4e39-9842-e172bf01c991',
    amount:   220.00,
    status:   'PAID',
    date:     '2026-08-25'
  },
  {
    shortRef: '88AB8F55',
    fullId:   '88ab8f55-7201-4883-9bdd-3b7759b0b5cc',
    amount:   1280.00,
    status:   'PENDING',
    date:     '2026-08-24'
  }
];

const STATUS_LABEL = { 0: 'PENDING', 1: 'PAID', 2: 'FAILED' };

function shortRef(uuid) {
  return uuid.replace(/-/g, '').slice(0, 8).toUpperCase();
}

async function main() {
  console.log('\n=======================================================');
  console.log(' SURGICAL INVOICE DELETION — 3 TEST INVOICES');
  console.log('=======================================================\n');

  // ── Pre-deletion count ───────────────────────────────────────────────────────
  const countBefore = await prisma.invoice.count();
  console.log(`Total invoices BEFORE deletion: ${countBefore}`);

  // ── Safety verification: confirm each target still matches expectations ───────
  console.log('\n--- Pre-deletion safety verification ---');
  for (const target of TARGET_INVOICES) {
    const inv = await prisma.invoice.findUnique({
      where: { id: target.fullId },
      select: {
        id: true,
        totalAmount: true,
        paymentStatus: true,
        createdAt: true,
        reservationId: true,
        userId: true
      }
    });

    if (!inv) {
      console.log(`⚠️  ${target.shortRef} (${target.fullId}): NOT FOUND — skipping.`);
      continue;
    }

    const actualAmount  = Number(inv.totalAmount).toFixed(2);
    const expectedAmount = target.amount.toFixed(2);
    const actualStatus  = STATUS_LABEL[inv.paymentStatus];
    const actualDate    = inv.createdAt.toISOString().slice(0, 10);
    const actualShort   = shortRef(inv.id);

    const amountOk  = actualAmount === expectedAmount;
    const statusOk  = actualStatus === target.status;
    const dateOk    = actualDate === target.date;
    const shortOk   = actualShort === target.shortRef;
    const noResLink = inv.reservationId === null;

    console.log(`\n  ${target.shortRef}:`);
    console.log(`    Short ref match : ${shortOk ? '✅' : '❌'} (${actualShort})`);
    console.log(`    Amount match    : ${amountOk ? '✅' : '❌'} ($${actualAmount} vs expected $${expectedAmount})`);
    console.log(`    Status match    : ${statusOk ? '✅' : '❌'} (${actualStatus} vs expected ${target.status})`);
    console.log(`    Date match      : ${dateOk ? '✅' : '❌'} (${actualDate} vs expected ${target.date})`);
    console.log(`    No reservation  : ${noResLink ? '✅ orphaned (safe)' : '❌ HAS LINKED RESERVATION — ABORT'}`);

    if (!amountOk || !statusOk || !dateOk || !shortOk || !noResLink) {
      console.error(`\n🚨 SAFETY CHECK FAILED for ${target.shortRef}. Aborting entire operation.`);
      await prisma.$disconnect();
      process.exit(1);
    }
  }

  console.log('\n✅ All safety checks passed. Proceeding with deletion.\n');

  // ── Surgical deletion — one by one ───────────────────────────────────────────
  const deleted = [];

  for (const target of TARGET_INVOICES) {
    try {
      const result = await prisma.invoice.delete({
        where: { id: target.fullId }
      });
      console.log(`✅ DELETED: ${target.shortRef} (${target.fullId}) — $${target.amount} ${target.status}`);
      deleted.push(target);
    } catch (err) {
      console.error(`❌ FAILED to delete ${target.shortRef}: ${err.message}`);
      // Continue with remaining deletions — do not abort mid-cleanup
    }
  }

  // ── Post-deletion verification ────────────────────────────────────────────────
  console.log('\n--- Post-deletion verification ---');
  const countAfter = await prisma.invoice.count();
  console.log(`Total invoices AFTER deletion: ${countAfter}`);
  console.log(`Deleted: ${countBefore - countAfter} invoices\n`);

  for (const target of TARGET_INVOICES) {
    const exists = await prisma.invoice.findUnique({
      where: { id: target.fullId },
      select: { id: true }
    });
    if (exists) {
      console.log(`❌ ${target.shortRef} STILL EXISTS — deletion failed!`);
    } else {
      console.log(`✅ ${target.shortRef} confirmed GONE from database.`);
    }
  }

  // ── Confirm remaining invoices are untouched ──────────────────────────────────
  console.log('\n--- Remaining invoices (should be unchanged) ---');
  const remaining = await prisma.invoice.findMany({
    select: { id: true, totalAmount: true, paymentStatus: true, createdAt: true, invoiceType: true },
    orderBy: { createdAt: 'desc' }
  });
  remaining.forEach(inv => {
    const sr = shortRef(inv.id);
    const sl = STATUS_LABEL[inv.paymentStatus] || inv.paymentStatus;
    const wasTarget = TARGET_INVOICES.some(t => t.shortRef === sr);
    const tag = wasTarget ? ' ← ⚠️  THIS SHOULD NOT APPEAR' : '';
    console.log(`  ${sr}  $${Number(inv.totalAmount).toFixed(2)}  ${sl}  ${inv.createdAt.toISOString().slice(0,10)}  ${inv.invoiceType}${tag}`);
  });

  console.log(`\n=======================================================`);
  console.log(` CLEANUP COMPLETE`);
  console.log(`  Invoices before  : ${countBefore}`);
  console.log(`  Invoices deleted : ${deleted.length}`);
  console.log(`  Invoices after   : ${countAfter}`);
  console.log(`  Expected after   : ${countBefore - TARGET_INVOICES.length}`);
  const success = countAfter === (countBefore - TARGET_INVOICES.length);
  console.log(`  Status           : ${success ? '✅ SUCCESS' : '❌ MISMATCH — review above'}`);
  console.log(`=======================================================\n`);

  await prisma.$disconnect();
}

main().catch(e => {
  console.error('CLEANUP SCRIPT ERROR:', e.message);
  prisma.$disconnect();
  process.exit(1);
});
