const prisma = require('../config/prisma');
const adminService = require('./adminService');

/**
 * Get Platform Commission Percentage (Default 10.0%)
 */
function getCommissionRate() {
  try {
    const settings = adminService.getSiteSettings();
    if (settings && settings.general && settings.general.platformCommissionPercent !== undefined) {
      const parsed = parseFloat(settings.general.platformCommissionPercent);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) return parsed;
    }
  } catch (e) {
    // fallback
  }
  return 10.0; // 10% default
}

/**
 * Create or Update Host Earning on Reservation Confirmation/Status Change (Idempotent)
 */
async function syncReservationEarning(reservationId, targetStatus) {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: { property: true }
  });

  if (!reservation) return null;

  const currentStatus = String(targetStatus || reservation.status).toUpperCase();

  // If status is CONFIRMED
  if (currentStatus === 'CONFIRMED') {
    const commissionRate = getCommissionRate();
    const grossAmount = Number(reservation.grandTotal || 0);
    const commissionAmount = Number((grossAmount * (commissionRate / 100)).toFixed(2));
    const netAmount = Number((grossAmount - commissionAmount).toFixed(2));

    const existing = await prisma.hostEarning.findUnique({
      where: { reservationId }
    });

    if (existing) {
      return prisma.hostEarning.update({
        where: { reservationId },
        data: {
          grossAmount,
          commissionRate,
          commissionAmount,
          netAmount,
          hostId: reservation.hostId,
          propertyId: reservation.propertyId
        }
      });
    }

    const newEarning = await prisma.hostEarning.create({
      data: {
        reservationId: reservation.id,
        hostId: reservation.hostId,
        propertyId: reservation.propertyId,
        grossAmount,
        commissionRate,
        commissionAmount,
        netAmount,
        status: 'PENDING'
      }
    });

    try {
      const emailService = require('./emailService');
      const host = await prisma.user.findUnique({ where: { id: reservation.hostId }, select: { id: true, firstName: true, lastName: true, email: true } });
      emailService.sendHostEarningCreatedEmail({
        earning: newEarning,
        host,
        property: reservation.property
      }).catch(err => console.error('[EMAIL SERVICE] sendHostEarningCreatedEmail error:', err.message));
    } catch (e) {
      console.error('[EMAIL SERVICE] Failed to trigger host earning email:', e.message);
    }

    return newEarning;
  }

  // If status is COMPLETED -> transition PENDING earning to AVAILABLE
  if (currentStatus === 'COMPLETED') {
    const existing = await prisma.hostEarning.findUnique({ where: { reservationId } });
    if (existing && (existing.status === 'PENDING' || existing.status === 'AVAILABLE')) {
      return prisma.hostEarning.update({
        where: { reservationId },
        data: {
          status: 'AVAILABLE',
          availableAt: existing.availableAt || new Date()
        }
      });
    } else if (!existing) {
      const commissionRate = getCommissionRate();
      const grossAmount = Number(reservation.grandTotal || 0);
      const commissionAmount = Number((grossAmount * (commissionRate / 100)).toFixed(2));
      const netAmount = Number((grossAmount - commissionAmount).toFixed(2));

      return prisma.hostEarning.create({
        data: {
          reservationId: reservation.id,
          hostId: reservation.hostId,
          propertyId: reservation.propertyId,
          grossAmount,
          commissionRate,
          commissionAmount,
          netAmount,
          status: 'AVAILABLE',
          availableAt: new Date()
        }
      });
    }
  }

  // If status is CANCELLED or REFUNDED -> transition earning to CANCELLED only if payment verification is REJECTED or status is REFUNDED
  if (currentStatus === 'CANCELLED' || currentStatus === 'REFUNDED') {
    const existing = await prisma.hostEarning.findUnique({ where: { reservationId } });
    if (existing && existing.status !== 'PAID') {
      if (reservation.paymentVerificationStatus === 'REJECTED' || currentStatus === 'REFUNDED') {
        return prisma.hostEarning.update({
          where: { reservationId },
          data: { status: 'CANCELLED' }
        });
      }
    }
  }

  return null;
}

/**
 * Get Host Earnings List with Filters & Pagination
 */
async function getHostEarnings(hostId, params = {}) {
  const { status, propertyId, startDate, endDate, limit = 20, page = 1 } = params;
  const take = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
  const skip = (Math.max(parseInt(page) || 1, 1) - 1) * take;

  const where = { hostId };

  if (status && status !== 'ALL') {
    where.status = status.toUpperCase();
  }

  if (propertyId && propertyId !== 'ALL') {
    where.propertyId = propertyId;
  }

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  const [total, earnings] = await Promise.all([
    prisma.hostEarning.count({ where }),
    prisma.hostEarning.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      skip,
      include: {
        property: { select: { id: true, title: true, slug: true, images: { take: 1, orderBy: { displayOrder: 'asc' } } } },
        reservation: { select: { id: true, checkInDate: true, checkOutDate: true, guestCount: true, totalNights: true, status: true } }
      }
    })
  ]);

  return { total, page: Math.max(parseInt(page) || 1, 1), totalPages: Math.ceil(total / take) || 1, data: earnings };
}

/**
 * Get Host Earning Summary Aggregation
 */
async function getHostEarningSummary(hostId) {
  const earnings = await prisma.hostEarning.findMany({
    where: { hostId },
    select: { status: true, netAmount: true, grossAmount: true, commissionAmount: true }
  });

  let totalEarnings = 0;
  let pendingEarnings = 0;
  let availableEarnings = 0;
  let paidEarnings = 0;
  let totalGross = 0;
  let totalCommission = 0;

  for (const e of earnings) {
    const net = Number(e.netAmount || 0);
    const gross = Number(e.grossAmount || 0);
    const comm = Number(e.commissionAmount || 0);

    if (e.status !== 'CANCELLED') {
      totalEarnings += net;
      totalGross += gross;
      totalCommission += comm;
    }

    if (e.status === 'PENDING') pendingEarnings += net;
    if (e.status === 'AVAILABLE') availableEarnings += net;
    if (e.status === 'PAID') paidEarnings += net;
  }

  return {
    totalEarnings: Number(totalEarnings.toFixed(2)),
    pendingEarnings: Number(pendingEarnings.toFixed(2)),
    availableEarnings: Number(availableEarnings.toFixed(2)),
    paidEarnings: Number(paidEarnings.toFixed(2)),
    totalGross: Number(totalGross.toFixed(2)),
    totalCommission: Number(totalCommission.toFixed(2)),
    count: earnings.length
  };
}

/**
 * Get Single Host Earning by ID with Host Authorization Check
 */
async function getHostEarningById(id, hostId, userRole = 'HOST') {
  const earning = await prisma.hostEarning.findUnique({
    where: { id },
    include: {
      property: true,
      reservation: {
        include: { guest: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } } }
      },
      host: { select: { id: true, firstName: true, lastName: true, email: true } }
    }
  });

  if (!earning) throw new Error('Host earning record not found');

  if (earning.hostId !== hostId && userRole !== 'ADMIN') {
    const error = new Error('Forbidden: You do not have permission to view this earning.');
    error.statusCode = 403;
    throw error;
  }

  return earning;
}

/**
 * Admin Get Global Earnings with Filters
 */
async function getAdminEarnings(params = {}) {
  const { hostId, propertyId, status, limit = 50, page = 1 } = params;
  const take = Math.min(Math.max(parseInt(limit) || 50, 1), 100);
  const skip = (Math.max(parseInt(page) || 1, 1) - 1) * take;

  const where = {};

  if (hostId && hostId !== 'ALL') where.hostId = hostId;
  if (propertyId && propertyId !== 'ALL') where.propertyId = propertyId;
  if (status && status !== 'ALL') where.status = status.toUpperCase();

  const [total, data] = await Promise.all([
    prisma.hostEarning.count({ where }),
    prisma.hostEarning.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      skip,
      include: {
        host: { select: { id: true, firstName: true, lastName: true, email: true } },
        property: { select: { id: true, title: true, slug: true } },
        reservation: { select: { id: true, checkInDate: true, checkOutDate: true, status: true } }
      }
    })
  ]);

  const allEarnings = await prisma.hostEarning.findMany({
    select: { status: true, netAmount: true, grossAmount: true, commissionAmount: true }
  });

  let totalPlatformRevenue = 0;
  let totalHostEarnings = 0;
  let pendingHostEarnings = 0;
  let availableHostEarnings = 0;
  let paidHostEarnings = 0;

  for (const e of allEarnings) {
    const net = Number(e.netAmount || 0);
    const comm = Number(e.commissionAmount || 0);

    if (e.status !== 'CANCELLED') {
      totalPlatformRevenue += comm;
      totalHostEarnings += net;
    }
    if (e.status === 'PENDING') pendingHostEarnings += net;
    if (e.status === 'AVAILABLE') availableHostEarnings += net;
    if (e.status === 'PAID') paidHostEarnings += net;
  }

  return {
    total,
    page: Math.max(parseInt(page) || 1, 1),
    totalPages: Math.ceil(total / take) || 1,
    summary: {
      totalPlatformRevenue: Number(totalPlatformRevenue.toFixed(2)),
      totalHostEarnings: Number(totalHostEarnings.toFixed(2)),
      pendingHostEarnings: Number(pendingHostEarnings.toFixed(2)),
      availableHostEarnings: Number(availableHostEarnings.toFixed(2)),
      paidHostEarnings: Number(paidHostEarnings.toFixed(2))
    },
    data
  };
}

/**
 * Admin Update Host Earning Status
 */
async function updateHostEarningStatusAdmin(id, status) {
  const allowed = ['PENDING', 'AVAILABLE', 'PAID', 'CANCELLED'];
  const uppercaseStatus = String(status).toUpperCase();

  if (!allowed.includes(uppercaseStatus)) {
    throw new Error(`Invalid status. Must be one of: ${allowed.join(', ')}`);
  }

  const existing = await prisma.hostEarning.findUnique({ where: { id } });
  if (!existing) throw new Error('Host earning record not found');

  const updateData = { status: uppercaseStatus };
  if (uppercaseStatus === 'PAID' && !existing.paidAt) {
    updateData.paidAt = new Date();
  }
  if (uppercaseStatus === 'AVAILABLE' && !existing.availableAt) {
    updateData.availableAt = new Date();
  }

  return prisma.hostEarning.update({
    where: { id },
    data: updateData
  });
}

module.exports = {
  getCommissionRate,
  syncReservationEarning,
  getHostEarnings,
  getHostEarningSummary,
  getHostEarningById,
  getAdminEarnings,
  updateHostEarningStatusAdmin
};
