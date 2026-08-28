const prisma = require('../server/src/config/prisma');

async function reconcileInvoiceData() {
  console.log('==================================================');
  console.log(' INVOICE DATA RECONCILIATION AUDIT (READ-ONLY)');
  console.log('==================================================\n');

  // 1. Database Counts
  const totalReservations = await prisma.reservation.count();
  const totalInvoices = await prisma.invoice.count();
  const totalPayments = await prisma.payment.count();
  const totalHostEarnings = await prisma.hostEarning.count();
  const totalUsers = await prisma.user.count();

  console.log('--- 1. DATABASE COUNTS ---');
  console.log(`Total Reservations: ${totalReservations}`);
  console.log(`Total Invoices:     ${totalInvoices}`);
  console.log(`Total Payments:     ${totalPayments}`);
  console.log(`Total HostEarnings: ${totalHostEarnings}`);
  console.log(`Total Users:        ${totalUsers}\n`);

  // 2. Reservation <-> Invoice Mapping
  const allReservations = await prisma.reservation.findMany({
    include: {
      invoices: true,
      guest: { select: { id: true, email: true, firstName: true, lastName: true } }
    }
  });

  const resvWithOneInv = allReservations.filter(r => r.invoices.length === 1);
  const resvWithZeroInv = allReservations.filter(r => r.invoices.length === 0);
  const resvWithMultiInv = allReservations.filter(r => r.invoices.length > 1);

  const allInvoices = await prisma.invoice.findMany({
    include: {
      reservation: {
        include: {
          guest: { select: { id: true, email: true } },
          host: { select: { id: true, email: true } },
          property: { select: { id: true, title: true } }
        }
      },
      user: { select: { id: true, email: true, role: true } }
    }
  });

  const invNoResv = allInvoices.filter(i => !i.reservationId);
  const invWithResv = allInvoices.filter(i => !!i.reservationId);
  const invUserMismatch = allInvoices.filter(i => i.reservation && i.userId !== i.reservation.guestId);

  console.log('--- 2. RESERVATION <-> INVOICE MAPPING ---');
  console.log(`Reservations with exactly 1 Invoice:  ${resvWithOneInv.length}`);
  console.log(`Reservations with 0 Invoices:         ${resvWithZeroInv.length}`);
  console.log(`Reservations with >1 Invoices:        ${resvWithMultiInv.length}`);
  console.log(`Invoices with no reservation:         ${invNoResv.length}`);
  console.log(`Invoices with active reservation:     ${invWithResv.length}`);
  console.log(`Invoices where userId != guestId:     ${invUserMismatch.length}\n`);

  // Print Details of Invoices with no reservation or user mismatch
  if (invNoResv.length > 0) {
    console.log('  [Invoices without Reservation Detail]:');
    invNoResv.forEach(i => {
      console.log(`    - Invoice ID: ${i.id} | wpInvoiceId: ${i.wpInvoiceId} | Type: ${i.invoiceType} | User: ${i.user?.email} (${i.userId}) | Amount: $${i.totalAmount}`);
    });
  }

  if (invUserMismatch.length > 0) {
    console.log('\n  [Invoices where Invoice.userId != Reservation.guestId]:');
    invUserMismatch.forEach(i => {
      console.log(`    - Invoice ID: ${i.id} | wpInvoiceId: ${i.wpInvoiceId}`);
      console.log(`      Invoice.userId: ${i.userId} (${i.user?.email})`);
      console.log(`      Reservation.guestId: ${i.reservation.guestId} (${i.reservation.guest?.email})`);
      console.log(`      Reservation.hostId: ${i.reservation.hostId} (${i.reservation.host?.email})`);
      console.log(`      Note: Is Invoice assigned to Host or Buyer in WordPress metadata?`);
    });
  }

  // 3. Historical vs New Invoice Analysis
  const wpInvoices = allInvoices.filter(i => i.wpInvoiceId !== null);
  const newInvoices = allInvoices.filter(i => i.wpInvoiceId === null);

  console.log('\n--- 3. HISTORICAL VS NEW INVOICE ANALYSIS ---');
  console.log(`WordPress Migrated Invoices (wpInvoiceId != null): ${wpInvoices.length}`);
  console.log(`New Modern Invoices (wpInvoiceId == null):         ${newInvoices.length}`);

  console.log('\n  Full List of Invoices in DB:');
  allInvoices.forEach((inv, idx) => {
    console.log(`  [${idx + 1}] ID: ${inv.id} | wpInvoiceId: ${inv.wpInvoiceId || 'N/A'} | Type: ${inv.invoiceType} | Status: ${inv.paymentStatus} (1=PAID,0=PENDING) | Amount: $${inv.totalAmount} | Gateway: ${inv.paymentGateway} | Ref: ${inv.paymentReference || 'N/A'} | User: ${inv.user?.email}`);
  });

  // 4. Reservation Status Breakdown vs Invoice Presence
  const resvByStatus = {};
  allReservations.forEach(r => {
    if (!resvByStatus[r.status]) resvByStatus[r.status] = [];
    resvByStatus[r.status].push(r);
  });

  console.log('\n--- 4. RESERVATION STATUS VS INVOICE BREAKDOWN ---');
  for (const [status, list] of Object.entries(resvByStatus)) {
    const withInv = list.filter(r => r.invoices.length > 0).length;
    const withoutInv = list.filter(r => r.invoices.length === 0).length;
    console.log(`  Status: ${status.padEnd(12)} | Total: ${list.length.toString().padStart(2)} | With Invoice: ${withInv.toString().padStart(2)} | Without Invoice: ${withoutInv.toString().padStart(2)}`);
  }

  // 5. Payment & Verification Inconsistency Analysis
  console.log('\n--- 5. INCONSISTENCY ANALYSIS ---');

  // Find Inconsistencies between Reservation, Invoice, Payment, and Verification
  const allPayments = await prisma.payment.findMany({
    include: {
      reservation: true
    }
  });

  const allHostEarnings = await prisma.hostEarning.findMany({
    include: {
      reservation: true
    }
  });

  let inconsistencies = [];

  for (const resv of allReservations) {
    const inv = resv.invoices[0];
    const pmt = allPayments.find(p => p.reservationId === resv.id);
    const earning = allHostEarnings.find(e => e.reservationId === resv.id);

    // Case A: CONFIRMED reservation without invoice
    if (resv.status === 'CONFIRMED' && !inv) {
      inconsistencies.push({
        type: 'CONFIRMED_RESV_WITHOUT_INVOICE',
        reservationId: resv.id,
        resvStatus: resv.status,
        verifStatus: resv.paymentVerificationStatus,
        grandTotal: resv.grandTotal
      });
    }

    // Case B: Invoice PAID but Reservation PENDING
    if (inv && inv.paymentStatus === 1 && resv.status === 'PENDING') {
      inconsistencies.push({
        type: 'INVOICE_PAID_RESV_PENDING',
        reservationId: resv.id,
        invoiceId: inv.id,
        invStatus: inv.paymentStatus,
        resvStatus: resv.status
      });
    }

    // Case C: Invoice PENDING but Reservation CONFIRMED
    if (inv && inv.paymentStatus === 0 && resv.status === 'CONFIRMED') {
      inconsistencies.push({
        type: 'INVOICE_PENDING_RESV_CONFIRMED',
        reservationId: resv.id,
        invoiceId: inv.id,
        invStatus: inv.paymentStatus,
        resvStatus: resv.status
      });
    }

    // Case D: Amount mismatch between Invoice and Reservation
    if (inv && parseFloat(inv.totalAmount) !== parseFloat(resv.grandTotal)) {
      inconsistencies.push({
        type: 'AMOUNT_MISMATCH_INV_VS_RESV',
        reservationId: resv.id,
        invoiceId: inv.id,
        invAmount: parseFloat(inv.totalAmount),
        resvGrandTotal: parseFloat(resv.grandTotal),
        diff: parseFloat(inv.totalAmount) - parseFloat(resv.grandTotal)
      });
    }

    // Case E: Amount mismatch between Payment and Reservation
    if (pmt && parseFloat(pmt.amount) !== parseFloat(resv.grandTotal)) {
      inconsistencies.push({
        type: 'AMOUNT_MISMATCH_PMT_VS_RESV',
        reservationId: resv.id,
        paymentId: pmt.id,
        pmtAmount: parseFloat(pmt.amount),
        resvGrandTotal: parseFloat(resv.grandTotal)
      });
    }

    // Case F: Amount mismatch between HostEarning gross (net + commission) and Reservation
    if (earning) {
      const grossEarning = parseFloat(earning.hostAmount) + parseFloat(earning.commissionAmount);
      if (Math.abs(grossEarning - parseFloat(resv.grandTotal)) > 0.01) {
        inconsistencies.push({
          type: 'AMOUNT_MISMATCH_EARNING_VS_RESV',
          reservationId: resv.id,
          earningId: earning.id,
          grossEarning,
          resvGrandTotal: parseFloat(resv.grandTotal)
        });
      }
    }
  }

  console.log(`Total Inconsistencies Identified: ${inconsistencies.length}`);
  inconsistencies.forEach((inc, idx) => {
    console.log(`  [${idx + 1}] Type: ${inc.type}`);
    console.log(`      Detail: ${JSON.stringify(inc)}`);
  });

  // 6. Duplicate Analysis
  console.log('\n--- 6. DUPLICATE INVOICE ANALYSIS ---');
  const wpIdCounts = {};
  allInvoices.forEach(i => {
    if (i.wpInvoiceId) {
      wpIdCounts[i.wpInvoiceId] = (wpIdCounts[i.wpInvoiceId] || 0) + 1;
    }
  });

  const duplicateWpIds = Object.keys(wpIdCounts).filter(k => wpIdCounts[k] > 1);
  console.log(`Duplicate wpInvoiceId records: ${duplicateWpIds.length}`);

  const resvInvCounts = {};
  allInvoices.forEach(i => {
    if (i.reservationId) {
      resvInvCounts[i.reservationId] = (resvInvCounts[i.reservationId] || 0) + 1;
    }
  });
  const duplicateResvInvoices = Object.keys(resvInvCounts).filter(k => resvInvCounts[k] > 1);
  console.log(`Reservations with >1 Invoice: ${duplicateResvInvoices.length}`);

  console.log('\n==================================================');
  console.log(' END OF RECONCILIATION AUDIT');
  console.log('==================================================\n');
}

reconcileInvoiceData()
  .then(() => process.exit(0))
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
