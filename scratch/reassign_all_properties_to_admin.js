/**
 * BULK PROPERTY OWNERSHIP REASSIGNMENT SCRIPT
 * ─────────────────────────────────────────────────────────────────────────────
 * Target Admin : ahmedkhanghaleja4@gmail.com
 * Target UUID  : 76b1858f-00b4-4ef9-86e5-ab9891f2166a
 *
 * Changes ONLY: properties.host_id
 *
 * Does NOT change:
 *   - reservations.host_id   (stored historical ownership)
 *   - host_earnings.host_id  (stored historical earnings)
 *   - Any other table
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const TARGET_EMAIL    = 'ahmedkhanghaleja4@gmail.com';
const TARGET_USER_ID  = '76b1858f-00b4-4ef9-86e5-ab9891f2166a';

async function main() {
  console.log('====================================================');
  console.log(' BULK PROPERTY OWNERSHIP REASSIGNMENT');
  console.log(`  Target: ${TARGET_EMAIL}`);
  console.log(`  ID    : ${TARGET_USER_ID}`);
  console.log('====================================================\n');

  // ── 1. Verify target admin ─────────────────────────────────────────────────
  const adminUser = await prisma.user.findUnique({
    where: { id: TARGET_USER_ID },
    select: { id: true, email: true, firstName: true, lastName: true, role: true, status: true }
  });

  if (!adminUser) {
    throw new Error(`ABORT: User ID ${TARGET_USER_ID} not found.`);
  }
  if (adminUser.email !== TARGET_EMAIL) {
    throw new Error(`ABORT: ID ${TARGET_USER_ID} belongs to ${adminUser.email}, not ${TARGET_EMAIL}.`);
  }
  if (adminUser.role !== 'ADMIN') {
    throw new Error(`ABORT: User role is "${adminUser.role}", not ADMIN.`);
  }
  if (adminUser.status !== 'ACTIVE') {
    throw new Error(`ABORT: User status is "${adminUser.status}", not ACTIVE.`);
  }
  console.log(`✅ Target admin verified: ${adminUser.firstName} ${adminUser.lastName} <${adminUser.email}> [${adminUser.role}/${adminUser.status}]\n`);

  // ── 2. Pre-update snapshot ──────────────────────────────────────────────────
  const allProperties = await prisma.property.findMany({
    select: { id: true, title: true, hostId: true, status: true }
  });

  const totalBefore = allProperties.length;
  const alreadyTarget  = allProperties.filter(p => p.hostId === TARGET_USER_ID).length;
  const otherOwners    = allProperties.filter(p => p.hostId !== TARGET_USER_ID).length;
  const nullOwner      = allProperties.filter(p => !p.hostId).length;

  // Owner distribution map
  const ownerCounts = {};
  for (const p of allProperties) {
    const k = p.hostId || 'NULL';
    ownerCounts[k] = (ownerCounts[k] || 0) + 1;
  }

  // Fetch user info for each distinct host
  const distinctHostIds = [...new Set(allProperties.map(p => p.hostId).filter(Boolean))];
  const hosts = await prisma.user.findMany({
    where: { id: { in: distinctHostIds } },
    select: { id: true, email: true, role: true, firstName: true, lastName: true }
  });
  const hostMap = Object.fromEntries(hosts.map(h => [h.id, h]));

  // Related entity counts (for verification baseline)
  const totalReservationsBefore = await prisma.reservation.count();
  const totalInvoicesBefore     = await prisma.invoice.count();
  const totalPaymentsBefore     = await prisma.payment.count();
  const totalHostEarningsBefore = await prisma.hostEarning.count();

  console.log('--- PRE-UPDATE SNAPSHOT ────────────────────────────');
  console.log(`  Total Properties         : ${totalBefore}`);
  console.log(`  Already assigned to target admin: ${alreadyTarget}`);
  console.log(`  Assigned to other owners : ${otherOwners}`);
  console.log(`  Null / no owner          : ${nullOwner}`);
  console.log('\n  Owner Distribution:');
  for (const [hid, count] of Object.entries(ownerCounts)) {
    const h = hostMap[hid];
    const label = h ? `${h.firstName} ${h.lastName} <${h.email}> [${h.role}]` : 'NULL';
    const marker = hid === TARGET_USER_ID ? ' ◀ TARGET' : '';
    console.log(`    ${hid.slice(0,8)}... → ${label} | ${count} properties${marker}`);
  }
  console.log(`\n  Total Reservations (baseline) : ${totalReservationsBefore}`);
  console.log(`  Total Invoices     (baseline) : ${totalInvoicesBefore}`);
  console.log(`  Total Payments     (baseline) : ${totalPaymentsBefore}`);
  console.log(`  Total HostEarnings (baseline) : ${totalHostEarningsBefore}`);
  console.log('─────────────────────────────────────────────────────\n');

  // ── 3. Safety gate: if already all assigned, skip ──────────────────────────
  if (alreadyTarget === totalBefore) {
    console.log('ℹ️  All properties are already assigned to the target admin. No update required.\n');
    await prisma.$disconnect();
    return;
  }

  // ── 4. Bulk update inside a transaction ────────────────────────────────────
  console.log('Executing bulk update inside Prisma transaction...');

  const updateResult = await prisma.$transaction(async (tx) => {
    const result = await tx.property.updateMany({
      where: {
        hostId: { not: TARGET_USER_ID }  // Only update properties NOT already assigned
      },
      data: {
        hostId: TARGET_USER_ID
      }
    });
    return result;
  });

  console.log(`\n✅ Transaction committed — updated ${updateResult.count} property records.\n`);

  // ── 5. Post-update verification ────────────────────────────────────────────
  const propertiesAfter       = await prisma.property.findMany({ select: { id: true, hostId: true, status: true } });
  const totalAfter            = propertiesAfter.length;
  const assignedToTarget      = propertiesAfter.filter(p => p.hostId === TARGET_USER_ID).length;
  const remainingOtherOwners  = propertiesAfter.filter(p => p.hostId !== TARGET_USER_ID).length;

  const totalReservationsAfter = await prisma.reservation.count();
  const totalInvoicesAfter     = await prisma.invoice.count();
  const totalPaymentsAfter     = await prisma.payment.count();
  const totalHostEarningsAfter = await prisma.hostEarning.count();

  // Verify no historical data was touched
  const reservationsModified = totalReservationsBefore !== totalReservationsAfter;
  const invoicesModified     = totalInvoicesBefore !== totalInvoicesAfter;
  const paymentsModified     = totalPaymentsBefore !== totalPaymentsAfter;
  const earningsModified     = totalHostEarningsBefore !== totalHostEarningsAfter;
  const propertiesDeleted    = totalBefore !== totalAfter;
  const allAssigned          = assignedToTarget === totalAfter && remainingOtherOwners === 0;

  console.log('====================================================');
  console.log(' POST-UPDATE VERIFICATION REPORT');
  console.log('====================================================\n');

  console.log('--- BEFORE ---');
  console.log(`  Total Properties          : ${totalBefore}`);
  console.log(`  Assigned to target admin  : ${alreadyTarget}`);
  console.log(`  Other owners              : ${otherOwners}`);

  console.log('\n--- AFTER ---');
  console.log(`  Total Properties          : ${totalAfter}`);
  console.log(`  Assigned to target admin  : ${assignedToTarget}`);
  console.log(`  Remaining with other owners: ${remainingOtherOwners}`);

  console.log('\n--- SAFETY CHECKS ---');
  console.log(`  Reservations modified     : ${reservationsModified ? '❌ YES — UNEXPECTED' : '✅ NO'}`);
  console.log(`  Invoices modified         : ${invoicesModified     ? '❌ YES — UNEXPECTED' : '✅ NO'}`);
  console.log(`  Payments modified         : ${paymentsModified     ? '❌ YES — UNEXPECTED' : '✅ NO'}`);
  console.log(`  HostEarnings modified     : ${earningsModified     ? '❌ YES — UNEXPECTED' : '✅ NO'}`);
  console.log(`  Properties deleted        : ${propertiesDeleted    ? '❌ YES — UNEXPECTED' : '✅ NO'}`);

  console.log('\n--- FINAL RESULT ---');
  console.log(`  All properties assigned to target admin: ${allAssigned ? '✅ YES' : '❌ NO — CHECK ABOVE'}`);

  if (!allAssigned) {
    console.error('\n⚠️  Not all properties were reassigned. Check for foreign-key violations or errors above.');
    process.exitCode = 1;
  } else {
    console.log('\n✅ COMPLETE — All properties now owned by ahmedkhanghaleja4@gmail.com');
  }

  await prisma.$disconnect();
}

main().catch(e => {
  console.error('\nFATAL ERROR:', e.message);
  prisma.$disconnect();
  process.exit(1);
});
