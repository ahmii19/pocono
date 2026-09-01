const prisma = require('../config/prisma');

async function checkAvailability(params) {
  const { propertyId, checkInDate, checkOutDate, guestCount = 1, selectedExtraPrices = [] } = params;

  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    include: { extraPrices: true }
  });

  if (!property) throw new Error('Property not found');

  const start = new Date(checkInDate);
  const end = new Date(checkOutDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error('Invalid dates provided');
  }

  if (start >= end) {
    throw new Error('Check-out date must be after check-in date');
  }

  const diffTime = Math.abs(end - start);
  const totalNights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (totalNights < property.minStayNights) {
    throw new Error(`Minimum stay required for this property is ${property.minStayNights} nights`);
  }

  // Check for overlapping confirmed reservations
  const overlapping = await prisma.reservation.findFirst({
    where: {
      propertyId,
      status: 'CONFIRMED',
      AND: [
        { checkInDate: { lt: end } },
        { checkOutDate: { gt: start } }
      ]
    }
  });

  const isAvailable = !overlapping;

  // Calculate pricing breakdown
  const nightlyRate = Number(property.nightlyPrice);
  const weekendRate = property.weekendPrice ? Number(property.weekendPrice) : nightlyRate;

  let baseTotal = 0;
  let curr = new Date(start);
  for (let i = 0; i < totalNights; i++) {
    const dayOfWeek = curr.getDay(); // 0 = Sun, 6 = Sat
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      baseTotal += weekendRate;
    } else {
      baseTotal += nightlyRate;
    }
    curr.setDate(curr.getDate() + 1);
  }

  const cleaningFee = Number(property.cleaningFee || 0);
  const cityFee = Number(property.cityFee || 0);
  const securityDeposit = Number(property.securityDeposit || 0);

  let extraGuestFeeTotal = 0;
  if (guestCount > property.maxGuests && property.allowExtraGuests) {
    const extraGuests = guestCount - property.maxGuests;
    extraGuestFeeTotal = extraGuests * Number(property.extraGuestFee || 0) * totalNights;
  }

  let extraPricesTotal = 0;
  if (Array.isArray(selectedExtraPrices) && property.extraPrices) {
    selectedExtraPrices.forEach(extraId => {
      const rule = property.extraPrices.find(ep => ep.id === Number(extraId));
      if (rule) {
        const p = Number(rule.price);
        if (rule.priceType === 'per_night' || rule.priceType === 'per_car') {
          extraPricesTotal += p * totalNights;
        } else if (rule.priceType === 'single_fee') {
          extraPricesTotal += p;
        } else if (rule.priceType === 'per_guest') {
          extraPricesTotal += p * guestCount;
        } else if (rule.priceType === 'per_night_per_guest') {
          extraPricesTotal += p * totalNights * guestCount;
        }
      }
    });
  }

  const subtotal = baseTotal + cleaningFee + cityFee + extraGuestFeeTotal + extraPricesTotal;
  const taxesTotal = subtotal * (Number(property.taxRate || 0) / 100);
  const grandTotal = subtotal + taxesTotal + securityDeposit;

  return {
    isAvailable,
    totalNights,
    pricingBreakdown: {
      nightlyRate,
      weekendRate,
      baseTotal,
      cleaningFee,
      cityFee,
      extraGuestFeeTotal,
      extraPricesTotal,
      subtotal,
      taxesTotal,
      securityDeposit,
      grandTotal
    }
  };
}

async function createReservation(data, guestId) {
  const quote = await checkAvailability({
    propertyId: data.propertyId,
    checkInDate: data.checkInDate,
    checkOutDate: data.checkOutDate,
    guestCount: data.guestCount,
    selectedExtraPrices: data.selectedExtraPrices
  });

  if (!quote.isAvailable) {
    throw new Error('Selected dates are no longer available');
  }

  const property = await prisma.property.findUnique({ where: { id: data.propertyId } });

  const reservation = await prisma.reservation.create({
    data: {
      propertyId: data.propertyId,
      guestId,
      hostId: property.hostId,
      checkInDate: new Date(data.checkInDate),
      checkOutDate: new Date(data.checkOutDate),
      guestCount: data.guestCount,
      totalNights: quote.totalNights,
      baseTotal: quote.pricingBreakdown.baseTotal,
      cleaningFee: quote.pricingBreakdown.cleaningFee,
      cityFee: quote.pricingBreakdown.cityFee,
      taxesTotal: quote.pricingBreakdown.taxesTotal,
      securityDeposit: quote.pricingBreakdown.securityDeposit,
      extraPricesTotal: quote.pricingBreakdown.extraPricesTotal,
      grandTotal: quote.pricingBreakdown.grandTotal,
      upfrontPaid: quote.pricingBreakdown.grandTotal, // Full or deposit payment
      balanceDue: 0.00,
      status: property.instantBook ? 'CONFIRMED' : 'PENDING'
    }
  });

  // Create reservation invoice (PENDING) immediately after reservation — idempotent
  try {
    const invoiceService = require('./invoiceService');
    await invoiceService.createReservationInvoice(
      reservation.id,
      guestId,
      reservation.grandTotal
    );
    // If instantBook, mark paid right away
    if (property.instantBook) {
      await invoiceService.markInvoicePaid(reservation.id, 'instant_book', null);
    }
  } catch (e) {
    console.error('[Invoice] Failed to create reservation invoice on booking:', e.message);
  }

  // Trigger Email Notifications (Guest Confirmation & Host Notification)
  try {
    const emailService = require('./emailService');
    const fullRes = await prisma.reservation.findUnique({
      where: { id: reservation.id },
      include: {
        guest: { select: { id: true, firstName: true, lastName: true, email: true } },
        host: { select: { id: true, firstName: true, lastName: true, email: true } },
        property: { select: { id: true, title: true, slug: true } }
      }
    });
    if (fullRes) {
      emailService.sendBookingCreatedEmails({
        reservation: fullRes,
        guest: fullRes.guest,
        host: fullRes.host,
        property: fullRes.property
      }).catch(err => console.error('[EMAIL SERVICE] sendBookingCreatedEmails error:', err.message));
    }
  } catch (e) {
    console.error('[EMAIL SERVICE] Failed to trigger booking emails:', e.message);
  }

  return reservation;
}

async function getUserReservations(userId, role) {
  const where = role === 'HOST' ? { hostId: userId } : { guestId: userId };
  return prisma.reservation.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      property: {
        select: {
          id: true,
          title: true,
          slug: true,
          images: { take: 1, orderBy: { displayOrder: 'asc' } }
        }
      },
      guest: { select: { id: true, firstName: true, lastName: true, email: true } },
      host: { select: { id: true, firstName: true, lastName: true, email: true } }
    }
  });
}

async function getReservationById(id, user) {
  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: {
      property: true,
      guest: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
      host: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
      invoices: true
    }
  });

  if (!reservation) throw new Error('Reservation not found');

  if (reservation.guestId !== user.id && reservation.hostId !== user.id && user.role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }

  return reservation;
}

async function cancelReservation(id, user) {
  const reservation = await prisma.reservation.findUnique({ where: { id } });
  if (!reservation) throw new Error('Reservation not found');

  if (reservation.guestId !== user.id && reservation.hostId !== user.id && user.role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }

  return prisma.reservation.update({
    where: { id },
    data: { status: 'CANCELLED' }
  });
}

async function deleteReservation(id, user) {
  const reservation = await prisma.reservation.findUnique({ where: { id } });
  if (!reservation) {
    const error = new Error('Reservation not found');
    error.statusCode = 404;
    throw error;
  }

  // Guest ownership check (guest can only delete their own reservation; ADMIN can delete any)
  if (reservation.guestId !== user.id && user.role !== 'ADMIN') {
    const error = new Error('Forbidden: You do not have permission to delete this reservation.');
    error.statusCode = 403;
    throw error;
  }

  // Status check: CONFIRMED or COMPLETED reservations cannot be deleted
  if (reservation.status === 'CONFIRMED' || reservation.status === 'COMPLETED') {
    const error = new Error('Confirmed reservations cannot be deleted.');
    error.statusCode = 403;
    throw error;
  }

  // Transactional physical deletion cleanly removing dependent records
  return prisma.$transaction(async (tx) => {
    // 1. Delete dependent payment records
    await tx.payment.deleteMany({ where: { reservationId: id } });

    // 2. Delete dependent invoice records
    await tx.invoice.deleteMany({ where: { reservationId: id } });

    // 3. Nullify reservation relation on reviews
    await tx.review.updateMany({
      where: { reservationId: id },
      data: { reservationId: null }
    });

    // 4. Physically delete reservation record from PostgreSQL
    const deleted = await tx.reservation.delete({ where: { id } });

    return {
      success: true,
      message: 'Reservation deleted successfully.',
      data: deleted
    };
  });
}

const path = require('path');
const fs = require('fs');

const MEDIA_ROOT = path.resolve(__dirname, '../../../client/public/wp-content/uploads');

async function expireOverdueReservations() {
  try {
    const adminService = require('./adminService');
    const settings = adminService.getPublicSiteSettings();
    if (settings.payment?.autoExpirePayLaterReservations === false) {
      return;
    }

    const now = new Date();
    const expiredReservations = await prisma.reservation.findMany({
      where: {
        status: 'PENDING_PAYMENT',
        paymentVerificationStatus: { in: ['NOT_SUBMITTED', 'REJECTED'] },
        paymentDueAt: { lt: now }
      }
    });

    if (expiredReservations.length > 0) {
      for (const res of expiredReservations) {
        await prisma.reservation.update({
          where: { id: res.id },
          data: { status: 'CANCELLED' }
        });
      }
    }
  } catch (e) {
    console.error('Error expiring overdue Pay Later reservations:', e.message);
  }
}

async function submitGuestPaymentProof(id, filePayload, metaPayload, user) {
  await expireOverdueReservations();

  const reservation = await prisma.reservation.findUnique({ where: { id } });
  if (!reservation) {
    const error = new Error('Reservation not found');
    error.statusCode = 404;
    throw error;
  }

  // 1. Guest Ownership Check
  if (reservation.guestId !== user.id) {
    const error = new Error('Forbidden: You can only upload payment proof for your own reservation.');
    error.statusCode = 403;
    throw error;
  }

  // 2. Reservation Status Eligibility Check
  if (reservation.status !== 'PENDING' && reservation.status !== 'PENDING_PAYMENT') {
    const error = new Error(`Payment proof cannot be submitted for reservation in ${reservation.status} status.`);
    error.statusCode = 400;
    throw error;
  }

  // 3. Payment Deadline Expiration Check
  if (reservation.paymentDueAt && new Date() > new Date(reservation.paymentDueAt)) {
    const adminService = require('./adminService');
    const settings = adminService.getPublicSiteSettings();
    if (settings.payment?.autoExpirePayLaterReservations !== false) {
      await prisma.reservation.update({
        where: { id },
        data: { status: 'CANCELLED' }
      });
      const error = new Error('Payment deadline has expired. Payment proof can no longer be submitted.');
      error.statusCode = 400;
      throw error;
    }
  }

  const { filename, mimeType, base64Data } = filePayload || {};
  if (!filename || !mimeType || !base64Data) {
    const error = new Error('Missing file data (filename, mimeType, and base64Data are required)');
    error.statusCode = 400;
    throw error;
  }

  // 3. Extension & MIME Validation
  const ext = path.extname(filename).toLowerCase();
  const allowedExts = ['.jpg', '.jpeg', '.png', '.webp'];
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  if (!allowedExts.includes(ext) || !allowedMimes.includes(mimeType.toLowerCase())) {
    const error = new Error('Invalid file type. Only JPG, JPEG, PNG, and WebP images are allowed.');
    error.statusCode = 400;
    throw error;
  }

  // 4. Buffer & Size Validation (Max 10MB)
  const buffer = Buffer.from(base64Data, 'base64');
  const maxBytes = 10 * 1024 * 1024;
  if (buffer.length > maxBytes) {
    const error = new Error('File size exceeds maximum allowed limit of 10MB.');
    error.statusCode = 400;
    throw error;
  }

  // 5. Binary Magic Bytes Validation
  let isValidBinary = false;
  if (ext === '.jpg' || ext === '.jpeg') {
    isValidBinary = buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
  } else if (ext === '.png') {
    isValidBinary = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
  } else if (ext === '.webp') {
    const headerStr = buffer.toString('utf8', 0, 12);
    isValidBinary = headerStr.startsWith('RIFF') && headerStr.endsWith('WEBP');
  }

  if (!isValidBinary) {
    const error = new Error('Corrupt image binary or mismatched file header.');
    error.statusCode = 400;
    throw error;
  }

  // 6. Save File to Disk under payment-proofs/YYYY/MM
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const targetDir = path.join(MEDIA_ROOT, 'payment-proofs', String(year), month);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const safeBase = path.basename(filename, ext).replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  const uniqueName = `proof-${reservation.id.substring(0, 8)}-${Date.now()}${ext}`;
  const targetFilePath = path.join(targetDir, uniqueName);

  fs.writeFileSync(targetFilePath, buffer);

  const relativeUrl = `/wp-content/uploads/payment-proofs/${year}/${month}/${uniqueName}`;
  const { transactionId, paymentNote } = metaPayload || {};

  // 7. Update Reservation Record
  const updated = await prisma.reservation.update({
    where: { id },
    data: {
      paymentVerificationStatus: 'SUBMITTED',
      paymentProofUrl: relativeUrl,
      paymentTransactionId: transactionId ? String(transactionId).trim() : null,
      paymentNote: paymentNote ? String(paymentNote).trim() : null,
      paymentSubmittedAt: now,
      paymentRejectedAt: null,
      paymentRejectedById: null,
      paymentRejectionReason: null
    },
    include: {
      property: { select: { id: true, title: true, slug: true } },
      guest: { select: { id: true, firstName: true, lastName: true, email: true } }
    }
  });

  try {
    const emailService = require('./emailService');
    emailService.sendPaymentProofSubmittedEmails({
      reservation: updated,
      guest: updated.guest,
      property: updated.property
    }).catch(err => console.error('[EMAIL SERVICE] sendPaymentProofSubmittedEmails error:', err.message));
  } catch (e) {
    console.error('[EMAIL SERVICE] Failed to trigger payment proof emails:', e.message);
  }

  return updated;
}

async function getPaymentProof(id, user) {
  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: {
      guest: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
      paymentVerifiedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      paymentRejectedBy: { select: { id: true, firstName: true, lastName: true, email: true } }
    }
  });

  if (!reservation) {
    const error = new Error('Reservation not found');
    error.statusCode = 404;
    throw error;
  }

  if (reservation.guestId !== user.id && user.role !== 'ADMIN') {
    const error = new Error('Forbidden: You do not have permission to view this payment proof.');
    error.statusCode = 403;
    throw error;
  }

  return {
    reservationId: reservation.id,
    paymentVerificationStatus: reservation.paymentVerificationStatus,
    paymentProofUrl: reservation.paymentProofUrl,
    paymentTransactionId: reservation.paymentTransactionId,
    paymentNote: reservation.paymentNote,
    paymentSubmittedAt: reservation.paymentSubmittedAt,
    paymentVerifiedAt: reservation.paymentVerifiedAt,
    paymentVerifiedBy: reservation.paymentVerifiedBy,
    paymentRejectedAt: reservation.paymentRejectedAt,
    paymentRejectedBy: reservation.paymentRejectedBy,
    paymentRejectionReason: reservation.paymentRejectionReason,
    guest: reservation.guest
  };
}

async function verifyPaymentProofAdmin(id, adminUser) {
  if (adminUser.role !== 'ADMIN') {
    const error = new Error('Forbidden: Admin access required.');
    error.statusCode = 403;
    throw error;
  }

  const reservation = await prisma.reservation.findUnique({ where: { id } });
  if (!reservation) {
    const error = new Error('Reservation not found');
    error.statusCode = 404;
    throw error;
  }

  const previousVerificationStatus = reservation.paymentVerificationStatus;
  const now = new Date();

  // Transactionally set paymentVerificationStatus = VERIFIED and status = CONFIRMED
  const updated = await prisma.reservation.update({
    where: { id },
    data: {
      paymentVerificationStatus: 'VERIFIED',
      paymentVerifiedAt: now,
      paymentVerifiedById: adminUser.id,
      status: 'CONFIRMED',
      upfrontPaid: reservation.grandTotal,
      balanceDue: 0.00
    },
    include: {
      property: { select: { id: true, title: true, slug: true } },
      guest: { select: { id: true, firstName: true, lastName: true, email: true } }
    }
  });

  // Update associated Payment record to COMPLETED
  await prisma.payment.updateMany({
    where: { reservationId: id },
    data: { status: 'COMPLETED' }
  });

  // Sync Host Earning immediately for CONFIRMED reservation
  let hostEarning = null;
  try {
    const hostEarningService = require('./hostEarningService');
    hostEarning = await hostEarningService.syncReservationEarning(id, 'CONFIRMED');
  } catch (e) {
    console.error('Error syncing host earning on payment verification:', e);
  }

  // Mark invoice as PAID (manual payment proof path)
  try {
    const invoiceService = require('./invoiceService');
    await invoiceService.markInvoicePaid(id, 'manual_payment_proof', reservation.paymentTransactionId || null);
  } catch (e) {
    console.error('[Invoice] Failed to mark invoice paid on verification:', e.message);
  }

  // Trigger confirmation emails ONLY on first-time approval (Idempotency Guard)
  if (previousVerificationStatus !== 'VERIFIED') {
    try {
      const emailService = require('./emailService');
      const fullRes = await prisma.reservation.findUnique({
        where: { id },
        include: {
          guest: { select: { id: true, firstName: true, lastName: true, email: true } },
          host: { select: { id: true, firstName: true, lastName: true, email: true } },
          property: { select: { id: true, title: true, slug: true } }
        }
      });
      if (fullRes) {
        emailService.sendPaymentVerificationResultEmails({
          reservation: fullRes,
          guest: fullRes.guest,
          host: fullRes.host,
          property: fullRes.property,
          status: 'VERIFIED'
        }).catch(err => console.error('[EMAIL SERVICE] sendPaymentVerificationResultEmails error:', err.message));
      }
    } catch (e) {
      console.error('[EMAIL SERVICE] Failed to trigger payment verification emails:', e.message);
    }
  }

  return {
    reservation: updated,
    hostEarning
  };
}

async function rejectPaymentProofAdmin(id, rejectionReason, adminUser) {
  if (adminUser.role !== 'ADMIN') {
    const error = new Error('Forbidden: Admin access required.');
    error.statusCode = 403;
    throw error;
  }

  if (!rejectionReason || !String(rejectionReason).trim()) {
    const error = new Error('Rejection reason is required.');
    error.statusCode = 400;
    throw error;
  }

  const reservation = await prisma.reservation.findUnique({ where: { id } });
  if (!reservation) {
    const error = new Error('Reservation not found');
    error.statusCode = 404;
    throw error;
  }

  const now = new Date();

  const updated = await prisma.reservation.update({
    where: { id },
    data: {
      paymentVerificationStatus: 'REJECTED',
      paymentRejectedAt: now,
      paymentRejectedById: adminUser.id,
      paymentRejectionReason: String(rejectionReason).trim(),
      status: 'PENDING'
    },
    include: {
      property: { include: { host: true } },
      guest: true,
      host: true
    }
  });

  try {
    const emailService = require('./emailService');
    emailService.sendReservationRejectedEmail({
      reservation: updated,
      guest: updated.guest,
      host: updated.host || (updated.property && updated.property.host),
      property: updated.property,
      reason: rejectionReason
    }).catch(err => console.error('[EMAIL SERVICE] sendReservationRejectedEmail error:', err.message));
  } catch (e) {
    console.error('[EMAIL SERVICE] Failed to trigger payment rejection emails:', e.message);
  }

  return updated;
}

module.exports = {
  checkAvailability,
  createReservation,
  getUserReservations,
  getReservationById,
  cancelReservation,
  deleteReservation,
  expireOverdueReservations,
  submitGuestPaymentProof,
  getPaymentProof,
  verifyPaymentProofAdmin,
  rejectPaymentProofAdmin
};
