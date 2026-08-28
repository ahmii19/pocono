const prisma = require('../config/prisma');

// ----------------------------------------------------------------
// GUEST: Get all invoices belonging to authenticated user
// ----------------------------------------------------------------
async function getUserInvoices(userId) {
  return prisma.invoice.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      reservation: {
        select: {
          id: true,
          status: true,
          checkInDate: true,
          checkOutDate: true,
          totalNights: true,
          grandTotal: true,
          paymentVerificationStatus: true,
          property: {
            select: {
              id: true,
              title: true,
              slug: true,
              images: { take: 1, orderBy: { displayOrder: 'asc' }, select: { imageUrl: true } }
            }
          }
        }
      }
    }
  });
}

// ----------------------------------------------------------------
// Get single invoice by ID — owner or admin only
// ----------------------------------------------------------------
async function getInvoiceById(id, user) {
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
      reservation: {
        include: {
          property: {
            select: {
              id: true,
              title: true,
              slug: true,
              address: true,
              images: { take: 1, select: { imageUrl: true } }
            }
          },
          guest: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
          host: { select: { id: true, firstName: true, lastName: true, email: true } }
        }
      }
    }
  });

  if (!invoice) throw new Error('Invoice not found');

  if (invoice.userId !== user.id && user.role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }

  return invoice;
}

// ----------------------------------------------------------------
// Get invoice by reservationId — owner or admin only
// ----------------------------------------------------------------
async function getInvoiceByReservationId(reservationId, user) {
  const invoice = await prisma.invoice.findFirst({
    where: { reservationId, invoiceType: 'Reservation' },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
      reservation: {
        include: {
          property: { select: { id: true, title: true, slug: true, address: true } },
          guest: { select: { id: true, firstName: true, lastName: true, email: true } }
        }
      }
    }
  });

  if (!invoice) return null;

  if (invoice.userId !== user.id && user.role !== 'ADMIN') {
    const err = new Error('Forbidden');
    err.statusCode = 403;
    throw err;
  }

  return invoice;
}

// ----------------------------------------------------------------
// Create reservation invoice (IDEMPOTENT — find-or-create)
// Creates invoiceType=Reservation, paymentStatus=0 (PENDING)
// wpInvoiceId is always null for modern reservation invoices.
// ----------------------------------------------------------------
async function createReservationInvoice(reservationId, userId, grandTotal) {
  // Idempotency check: never create a second Reservation invoice for same reservation
  const existing = await prisma.invoice.findFirst({
    where: { reservationId, invoiceType: 'Reservation' }
  });

  if (existing) return existing;

  return prisma.invoice.create({
    data: {
      userId,
      reservationId,
      invoiceType: 'Reservation',
      totalAmount: grandTotal,
      paymentStatus: 0,        // 0 = PENDING
      paymentGateway: null,
      paymentReference: null
      // wpInvoiceId intentionally omitted → null (modern invoice)
    }
  });
}

// ----------------------------------------------------------------
// Mark invoice as PAID — called on payment verification/gateway success
// ----------------------------------------------------------------
async function markInvoicePaid(reservationId, paymentGateway, paymentReference) {
  const invoice = await prisma.invoice.findFirst({
    where: { reservationId, invoiceType: 'Reservation' }
  });

  if (!invoice) {
    // Invoice may not yet exist for legacy/online-payment flows where reservation
    // is created directly. Create it first if we can find the reservation.
    const reservation = await prisma.reservation.findUnique({ where: { id: reservationId } });
    if (!reservation) return null;

    return prisma.invoice.create({
      data: {
        userId: reservation.guestId,
        reservationId,
        invoiceType: 'Reservation',
        totalAmount: reservation.grandTotal,
        paymentStatus: 1,   // PAID immediately (online gateway flow)
        paymentGateway: paymentGateway || null,
        paymentReference: paymentReference || null
      }
    });
  }

  // Already PAID → idempotent, skip update
  if (invoice.paymentStatus === 1) return invoice;

  return prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      paymentStatus: 1,
      paymentGateway: paymentGateway || invoice.paymentGateway,
      paymentReference: paymentReference || invoice.paymentReference
    }
  });
}

// ----------------------------------------------------------------
// Mark invoice as FAILED (cancellation / refund path)
// Does NOT automatically call this — must be explicitly invoked.
// ----------------------------------------------------------------
async function markInvoiceFailed(reservationId) {
  const invoice = await prisma.invoice.findFirst({
    where: { reservationId, invoiceType: 'Reservation' }
  });

  if (!invoice || invoice.paymentStatus === 2) return invoice;

  return prisma.invoice.update({
    where: { id: invoice.id },
    data: { paymentStatus: 2 }
  });
}

module.exports = {
  getUserInvoices,
  getInvoiceById,
  getInvoiceByReservationId,
  createReservationInvoice,
  markInvoicePaid,
  markInvoiceFailed
};

