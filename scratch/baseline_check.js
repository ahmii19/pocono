const prisma = require('../server/src/config/prisma');
async function baseline() {
  const [r,i,p,h] = await Promise.all([
    prisma.reservation.count(),
    prisma.invoice.count(),
    prisma.payment.count(),
    prisma.hostEarning.count()
  ]);
  const legacy = await prisma.invoice.findMany({
    where: { wpInvoiceId: { not: null } },
    select: { id: true, wpInvoiceId: true, invoiceType: true, paymentStatus: true, totalAmount: true, userId: true }
  });
  console.log('BASELINE:');
  console.log('Reservations:', r);
  console.log('Invoices:', i);
  console.log('Payments:', p);
  console.log('HostEarnings:', h);
  console.log('Legacy invoices:', JSON.stringify(legacy, null, 2));
  process.exit(0);
}
baseline().catch(e => { console.error(e); process.exit(1); });
