const prisma = require('../config/prisma');
const fs = require('fs');
const path = require('path');

const SITE_SETTINGS_FILE = path.join(__dirname, '../data/siteSettings.json');
const HOMEPAGE_CONFIG_FILE = path.join(__dirname, '../data/homepageConfig.json');

async function getAdminStats() {
  const [
    totalProperties,
    publishedProperties,
    pendingProperties,
    draftProperties,
    rejectedProperties,
    deletedProperties,
    totalUsers,
    totalHosts,
    totalReservations,
    totalReviews,
    totalInvoices,
    revenueAgg
  ] = await Promise.all([
    prisma.property.count({ where: { status: { not: 'DELETED' } } }),
    prisma.property.count({ where: { status: 'PUBLISHED' } }),
    prisma.property.count({ where: { status: 'PENDING_REVIEW' } }),
    prisma.property.count({ where: { status: 'DRAFT' } }),
    prisma.property.count({ where: { status: 'REJECTED' } }),
    prisma.property.count({ where: { status: 'DELETED' } }),
    prisma.user.count(),
    prisma.user.count({ where: { role: 'HOST' } }),
    prisma.reservation.count(),
    prisma.review.count(),
    prisma.invoice.count({ where: { paymentStatus: 1 } }),
    prisma.invoice.aggregate({ _sum: { totalAmount: true }, where: { paymentStatus: 1 } })
  ]);

  return {
    totalProperties,
    publishedProperties,
    pendingProperties,
    draftProperties,
    rejectedProperties,
    deletedProperties,
    totalUsers,
    totalHosts,
    totalReservations,
    totalReviews,
    totalInvoices,
    totalRevenue: Number(revenueAgg._sum.totalAmount || 0)
  };
}

// ----------------------------------------------------
// USERS MANAGEMENT
// ----------------------------------------------------

async function getAllUsers(params = {}) {
  const { search, role, status } = params;
  let whereClauses = [];

  if (role && role !== 'ALL') {
    whereClauses.push(`u.role = '${role.toUpperCase().replace(/'/g, "''")}'`);
  }

  if (status && status !== 'ALL') {
    if (status.toUpperCase() === 'ACTIVE') {
      whereClauses.push(`(u.status = 'ACTIVE' OR u.status IS NULL)`);
    } else {
      whereClauses.push(`u.status = '${status.toUpperCase().replace(/'/g, "''")}'`);
    }
  }

  if (search) {
    const s = search.trim().replace(/'/g, "''");
    whereClauses.push(`(u.first_name ILIKE '%${s}%' OR u.last_name ILIKE '%${s}%' OR u.email ILIKE '%${s}%' OR u.phone ILIKE '%${s}%')`);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const rawUsers = await prisma.$queryRawUnsafe(`
    SELECT u.id, u.wp_user_id as "wpUserId", u.email, u.first_name as "firstName", u.last_name as "lastName",
           u.phone, u.role, COALESCE(u.status, 'ACTIVE') as "status", u.deleted_at as "deletedAt", u.avatar_url as "avatarUrl",
           u.created_at as "createdAt", u.updated_at as "updatedAt",
           (SELECT COUNT(*)::int FROM properties p WHERE p.host_id = u.id) as properties_count,
           (SELECT COUNT(*)::int FROM reservations r WHERE r.guest_id = u.id OR r.host_id = u.id) as reservations_count,
           (SELECT COUNT(*)::int FROM reviews rv WHERE rv.guest_id = u.id) as reviews_count,
           (SELECT COUNT(*)::int FROM invoices inv WHERE inv.user_id = u.id) as invoices_count
    FROM users u
    ${whereSql}
    ORDER BY u.created_at DESC;
  `);

  return rawUsers.map(u => ({
    id: u.id,
    wpUserId: u.wpUserId,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    phone: u.phone,
    role: u.role,
    status: u.status || 'ACTIVE',
    deletedAt: u.deletedAt,
    avatarUrl: u.avatarUrl,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
    _count: {
      properties: u.properties_count || 0,
      reservations: u.reservations_count || 0,
      reviews: u.reviews_count || 0,
      invoices: u.invoices_count || 0
    }
  }));
}

async function getUserById(id) {
  const rawUsers = await prisma.$queryRawUnsafe(`
    SELECT u.id, u.wp_user_id as "wpUserId", u.email, u.first_name as "firstName", u.last_name as "lastName",
           u.phone, u.role, COALESCE(u.status, 'ACTIVE') as "status", u.deleted_at as "deletedAt", u.avatar_url as "avatarUrl",
           u.bio, u.created_at as "createdAt", u.updated_at as "updatedAt",
           (SELECT COUNT(*)::int FROM properties p WHERE p.host_id = u.id) as properties_count,
           (SELECT COUNT(*)::int FROM reservations r WHERE r.guest_id = u.id OR r.host_id = u.id) as reservations_count,
           (SELECT COUNT(*)::int FROM reviews rv WHERE rv.guest_id = u.id) as reviews_count,
           (SELECT COUNT(*)::int FROM invoices inv WHERE inv.user_id = u.id) as invoices_count
    FROM users u
    WHERE u.id::text = '${id.replace(/'/g, "''")}';
  `);

  if (!rawUsers || rawUsers.length === 0) {
    throw new Error('User not found');
  }

  const u = rawUsers[0];

  const [properties, reservationsGuest, reviews] = await Promise.all([
    prisma.property.findMany({
      where: { hostId: u.id },
      select: { id: true, title: true, slug: true, status: true, nightlyPrice: true, isFeatured: true }
    }),
    prisma.reservation.findMany({
      where: { guestId: u.id },
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { property: { select: { id: true, title: true, slug: true } } }
    }),
    prisma.review.findMany({
      where: { guestId: u.id },
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { property: { select: { id: true, title: true } } }
    })
  ]);

  return {
    id: u.id,
    wpUserId: u.wpUserId,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    phone: u.phone,
    role: u.role,
    status: u.status || 'ACTIVE',
    deletedAt: u.deletedAt,
    avatarUrl: u.avatarUrl,
    bio: u.bio,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
    properties,
    reservationsGuest,
    reviews,
    _count: {
      properties: u.properties_count || 0,
      reservations: u.reservations_count || 0,
      reviews: u.reviews_count || 0,
      invoices: u.invoices_count || 0
    }
  };
}

async function updateUserProfile(userId, data) {
  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (!existing) throw new Error('User not found');
  if (existing.status === 'DELETED' || existing.deletedAt) {
    throw new Error('Cannot edit a deleted or anonymized user account.');
  }

  const updateData = {};
  if (data.firstName !== undefined) updateData.firstName = data.firstName;
  if (data.lastName !== undefined) updateData.lastName = data.lastName;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.bio !== undefined) updateData.bio = data.bio;

  if (data.email && data.email.toLowerCase() !== existing.email.toLowerCase()) {
    const emailOwner = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
    if (emailOwner && emailOwner.id !== userId) {
      throw new Error('Email address is already in use by another account.');
    }
    updateData.email = data.email.toLowerCase().trim();
  }

  return prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      wpUserId: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      role: true,
      status: true,
      createdAt: true
    }
  });
}

async function updateUserRole(userId, newRole, reqUser) {
  if (!['ADMIN', 'HOST', 'GUEST'].includes(newRole)) {
    throw new Error('Invalid role specified');
  }

  const targetUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!targetUser) throw new Error('User not found');
  if (targetUser.status === 'DELETED' || targetUser.deletedAt) {
    throw new Error('Cannot change role of a deleted user account.');
  }

  if (reqUser && targetUser.id === reqUser.id && targetUser.role === 'ADMIN' && newRole !== 'ADMIN') {
    throw new Error('Security Error: You cannot remove your own administrator privileges.');
  }

  if (targetUser.role === 'ADMIN' && newRole !== 'ADMIN') {
    const adminCount = await prisma.user.count({
      where: { role: 'ADMIN', OR: [{ status: { not: 'DELETED' } }, { status: null }] }
    });
    if (adminCount <= 1) {
      throw new Error('At least one administrator account must remain.');
    }
  }

  return prisma.user.update({
    where: { id: userId },
    data: { role: newRole },
    select: { id: true, email: true, role: true, status: true }
  });
}

async function deleteUser(userId, reqUser) {
  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      _count: {
        select: {
          properties: true,
          reservationsGuest: true,
          reservationsHost: true,
          reviews: true,
          invoices: true,
          sentMessages: true,
          threadsAsSender: true,
          threadsAsReceiver: true
        }
      }
    }
  });

  if (!targetUser) throw new Error('User not found');

  // Rule 1: Self-deletion check
  if (reqUser && targetUser.id === reqUser.id) {
    throw new Error('You cannot delete your own administrator account.');
  }

  // Rule 2: Last admin check
  if (targetUser.role === 'ADMIN') {
    const activeAdminCount = await prisma.user.count({
      where: {
        role: 'ADMIN',
        OR: [
          { status: { not: 'DELETED' } },
          { status: null }
        ]
      }
    });
    if (activeAdminCount <= 1) {
      throw new Error('At least one administrator account must remain.');
    }
  }

  // Rule 3: Property ownership check
  const propertyCount = targetUser._count?.properties || 0;
  if (propertyCount > 0) {
    throw new Error(`Cannot delete this user because they own ${propertyCount} properties. Reassign or remove these properties first.`);
  }

  // Check historical activity
  const historicalActivity = (targetUser._count?.reservationsGuest || 0) +
                             (targetUser._count?.reservationsHost || 0) +
                             (targetUser._count?.reviews || 0) +
                             (targetUser._count?.invoices || 0) +
                             (targetUser._count?.sentMessages || 0) +
                             (targetUser._count?.threadsAsSender || 0) +
                             (targetUser._count?.threadsAsReceiver || 0);

  if (historicalActivity > 0) {
    // Perform Safe Soft-Delete & Anonymization to preserve historical records
    const anonymizedEmail = `deleted_${targetUser.id.substring(0, 8)}_${Date.now()}@anonymized.local`;
    return prisma.user.update({
      where: { id: userId },
      data: {
        status: 'DELETED',
        deletedAt: new Date(),
        email: anonymizedEmail,
        firstName: 'Deleted',
        lastName: 'User',
        phone: null,
        bio: 'Account deleted by administrator.',
        avatarUrl: null
      },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        deletedAt: true
      }
    });
  }

  // If zero historical activity & zero properties, perform hard deletion
  return prisma.user.delete({
    where: { id: userId },
    select: { id: true, email: true, role: true }
  });
}

// ----------------------------------------------------
// RESERVATIONS MANAGEMENT
// ----------------------------------------------------

async function getAllReservations(params = {}) {
  const { search, status, checkInFrom, checkInTo } = params;
  const where = {};

  if (status && status !== 'ALL') {
    where.status = status.toUpperCase();
  }

  if (params.paymentVerificationStatus && params.paymentVerificationStatus !== 'ALL') {
    where.paymentVerificationStatus = params.paymentVerificationStatus.toUpperCase();
  }

  if (checkInFrom || checkInTo) {
    where.checkInDate = {};
    if (checkInFrom) where.checkInDate.gte = new Date(checkInFrom);
    if (checkInTo) where.checkInDate.lte = new Date(checkInTo);
  }

  if (search) {
    const searchTerm = search.trim();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(searchTerm);

    where.OR = [
      { property: { title: { contains: searchTerm, mode: 'insensitive' } } },
      { property: { slug: { contains: searchTerm, mode: 'insensitive' } } },
      { guest: { firstName: { contains: searchTerm, mode: 'insensitive' } } },
      { guest: { lastName: { contains: searchTerm, mode: 'insensitive' } } },
      { guest: { email: { contains: searchTerm, mode: 'insensitive' } } },
      { host: { firstName: { contains: searchTerm, mode: 'insensitive' } } },
      { host: { lastName: { contains: searchTerm, mode: 'insensitive' } } },
      { host: { email: { contains: searchTerm, mode: 'insensitive' } } }
    ];

    if (isUuid) {
      where.OR.push({ id: searchTerm });
    }
  }

  const [total, reservations, statusCounts, paymentVerificationCounts] = await Promise.all([
    prisma.reservation.count({ where }),
    prisma.reservation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            slug: true,
            images: { take: 1, select: { imageUrl: true } }
          }
        },
        guest: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        host: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        paymentVerifiedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        paymentRejectedBy: { select: { id: true, firstName: true, lastName: true, email: true } }
      }
    }),
    prisma.reservation.groupBy({
      by: ['status'],
      _count: { status: true }
    }),
    prisma.reservation.groupBy({
      by: ['paymentVerificationStatus'],
      _count: { paymentVerificationStatus: true }
    })
  ]);

  const metrics = {
    total: reservations.length,
    pending: 0,
    confirmed: 0,
    completed: 0,
    cancelled: 0,
    paid: 0,
    awaitingVerification: 0
  };

  statusCounts.forEach(sc => {
    const s = sc.status.toLowerCase();
    if (s in metrics) {
      metrics[s] = sc._count.status;
    }
  });

  const paymentMetrics = {
    NOT_SUBMITTED: 0,
    SUBMITTED: 0,
    VERIFIED: 0,
    REJECTED: 0
  };

  paymentVerificationCounts.forEach(pvc => {
    paymentMetrics[pvc.paymentVerificationStatus] = pvc._count.paymentVerificationStatus;
  });

  metrics.awaitingVerification = paymentMetrics.SUBMITTED;

  return {
    total,
    metrics,
    paymentMetrics,
    data: reservations
  };
}

async function getReservationById(id) {
  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: {
      property: {
        select: {
          id: true,
          title: true,
          slug: true,
          city: { select: { name: true } },
          community: { select: { name: true } },
          images: { take: 1, select: { imageUrl: true } }
        }
      },
      guest: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
      host: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
      paymentVerifiedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      paymentRejectedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      invoices: true,
      reviews: true
    }
  });

  if (!reservation) {
    throw new Error('Reservation not found');
  }

  return reservation;
}

async function updateReservationStatus(id, newStatus) {
  const allowedStatuses = ['PENDING', 'PENDING_PAYMENT', 'PAID', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'FAILED', 'REFUNDED'];
  const uppercaseStatus = String(newStatus).toUpperCase();

  if (!allowedStatuses.includes(uppercaseStatus)) {
    throw new Error(`Invalid reservation status specified. Allowed values: ${allowedStatuses.join(', ')}`);
  }

  const existing = await prisma.reservation.findUnique({ where: { id } });
  if (!existing) throw new Error('Reservation not found');

  if (uppercaseStatus === 'CONFIRMED' && existing.paymentVerificationStatus !== 'VERIFIED') {
    const error = new Error('Reservation cannot be confirmed until payment proof has been verified.');
    error.statusCode = 400;
    throw error;
  }

  const updated = await prisma.reservation.update({
    where: { id },
    data: { status: uppercaseStatus },
    include: {
      property: { select: { id: true, title: true, slug: true } },
      guest: { select: { id: true, firstName: true, lastName: true, email: true } }
    }
  });

  // Sync Host Earning asynchronously / transactionally
  try {
    const hostEarningService = require('./hostEarningService');
    await hostEarningService.syncReservationEarning(id, uppercaseStatus);
  } catch (e) {
    console.error('Error syncing host earning on reservation status change:', e);
  }

  // Sync Invoice PAID status when status becomes CONFIRMED
  if (uppercaseStatus === 'CONFIRMED') {
    try {
      const invoiceService = require('./invoiceService');
      await invoiceService.markInvoicePaid(id, 'admin_manual', null);
    } catch (e) {
      console.error('[Invoice] Failed to mark invoice paid on admin status update:', e.message);
    }
  }

  // Send cancellation email if transitioning to CANCELLED
  if (uppercaseStatus === 'CANCELLED' && existing.status !== 'CANCELLED') {
    try {
      const emailService = require('./emailService');
      const fullRes = await prisma.reservation.findUnique({
        where: { id },
        include: {
          guest: true,
          host: true,
          property: { include: { host: true } }
        }
      });
      if (fullRes) {
        emailService.sendReservationCancelledEmail({
          reservation: fullRes,
          guest: fullRes.guest,
          host: fullRes.host || (fullRes.property && fullRes.property.host),
          property: fullRes.property,
          reason: fullRes.paymentRejectionReason || null
        }).catch(err => console.error('[EMAIL ERROR] Failed to send cancellation email:', err.message));
      }
    } catch (e) {
      console.error('[EMAIL ERROR] Exception sending cancellation email:', e.message);
    }
  }

  // Financial Reconciliation check for CANCELLED + REJECTED combination
  await reconcileReservationFinancialState(id);

  return updated;
}

/**
 * Reconcile Financial Records (Invoice & HostEarning) for a Reservation
 * Order-independent & Idempotent.
 * When Reservation.status === 'CANCELLED' AND paymentVerificationStatus === 'REJECTED':
 * - Invoice paymentStatus is set to 2 (FAILED / REVERSED), which automatically excludes it from Gross Booking Volume and Invoices Processed.
 * - HostEarning status is set to 'CANCELLED' (if not already PAID or CANCELLED).
 */
async function reconcileReservationFinancialState(reservationId) {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: {
      invoices: { where: { invoiceType: 'Reservation' } },
      hostEarning: true,
      guest: true,
      host: true,
      property: true
    }
  });

  if (!reservation) return null;

  const { status, paymentVerificationStatus, invoices, hostEarning, guest, host, property } = reservation;

  // Reconcile financial records IF AND ONLY IF status is CANCELLED and verification is REJECTED
  if (status === 'CANCELLED' && paymentVerificationStatus === 'REJECTED') {
    const invoice = invoices[0];
    let invoiceReversed = false;

    // Reconcile Invoice if currently PAID (1) -> FAILED (2)
    if (invoice && invoice.paymentStatus === 1) {
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { paymentStatus: 2 } // 2 = FAILED / REVERSED
      });
      console.log(`[FINANCIAL RECONCILIATION] Invoice #${invoice.id} marked FAILED (2) for CANCELLED+REJECTED Reservation #${reservationId}`);
      invoiceReversed = true;
    }

    // Reconcile HostEarning if exists and not already PAID / CANCELLED
    if (hostEarning && hostEarning.status !== 'PAID' && hostEarning.status !== 'CANCELLED') {
      await prisma.hostEarning.update({
        where: { id: hostEarning.id },
        data: { status: 'CANCELLED' }
      });
      console.log(`[FINANCIAL RECONCILIATION] HostEarning #${hostEarning.id} marked CANCELLED for CANCELLED+REJECTED Reservation #${reservationId}`);
    }

    // Trigger Financial Reversal Email if invoice was just reversed
    if (invoiceReversed && guest) {
      try {
        const emailService = require('./emailService');
        emailService.sendFinancialReversalEmail({
          reservation,
          guest,
          host,
          property,
          invoice
        }).catch(err => console.error('[EMAIL ERROR] Failed to send financial reversal email:', err.message));
      } catch (e) {
        console.error('[EMAIL ERROR] Exception sending financial reversal email:', e.message);
      }
    }
  }

  return reservation;
}

async function updatePaymentVerificationStatusAdmin(id, newVerificationStatus, adminUser) {
  if (!adminUser || adminUser.role !== 'ADMIN') {
    const error = new Error('Forbidden: Admin access required.');
    error.statusCode = 403;
    throw error;
  }

  const allowedStatuses = ['NOT_SUBMITTED', 'SUBMITTED', 'VERIFIED', 'REJECTED'];
  const uppercaseStatus = String(newVerificationStatus).toUpperCase();

  if (!allowedStatuses.includes(uppercaseStatus)) {
    const error = new Error(`Invalid payment verification status specified. Allowed values: ${allowedStatuses.join(', ')}`);
    error.statusCode = 400;
    throw error;
  }

  const existing = await prisma.reservation.findUnique({ where: { id } });
  if (!existing) {
    const error = new Error('Reservation not found');
    error.statusCode = 404;
    throw error;
  }

  const now = new Date();
  const updateData = {
    paymentVerificationStatus: uppercaseStatus
  };

  if (uppercaseStatus === 'VERIFIED') {
    updateData.paymentVerifiedAt = now;
    updateData.paymentVerifiedById = adminUser.id;
  } else if (uppercaseStatus === 'REJECTED') {
    updateData.paymentRejectedAt = now;
    updateData.paymentRejectedById = adminUser.id;
  }

  const updated = await prisma.reservation.update({
    where: { id },
    data: updateData,
    include: {
      property: { select: { id: true, title: true, slug: true } },
      guest: { select: { id: true, firstName: true, lastName: true, email: true } },
      host: { select: { id: true, firstName: true, lastName: true, email: true } }
    }
  });

  // Financial Reconciliation check for CANCELLED + REJECTED combination
  await reconcileReservationFinancialState(id);

  if (uppercaseStatus === 'REJECTED') {
    try {
      const emailService = require('./emailService');
      const fullRes = await prisma.reservation.findUnique({
        where: { id },
        include: {
          guest: true,
          host: true,
          property: { include: { host: true } }
        }
      });
      if (fullRes) {
        emailService.sendReservationRejectedEmail({
          reservation: fullRes,
          guest: fullRes.guest,
          host: fullRes.host || (fullRes.property && fullRes.property.host),
          property: fullRes.property,
          reason: fullRes.paymentRejectionReason || null
        }).catch(err => console.error('[EMAIL ERROR] Failed to send rejection email:', err.message));
      }
    } catch (e) {
      console.error('[EMAIL ERROR] Exception sending rejection email:', e.message);
    }
  }

  return updated;
}

async function deleteReservation(id) {
  throw new Error('Hard-deletion of historical reservation records is prohibited. Update reservation status to CANCELLED instead.');
}

// ----------------------------------------------------
// REVIEWS MANAGEMENT (9F)
// ----------------------------------------------------

async function getAllReviews(params = {}) {
  const { search, rating, sort = 'newest' } = params;
  const where = {};

  if (rating && rating !== 'ALL') {
    where.rating = Number(rating);
  }

  if (search) {
    const searchTerm = search.trim();
    where.OR = [
      { comment: { contains: searchTerm, mode: 'insensitive' } },
      { property: { title: { contains: searchTerm, mode: 'insensitive' } } },
      { property: { slug: { contains: searchTerm, mode: 'insensitive' } } },
      { guest: { firstName: { contains: searchTerm, mode: 'insensitive' } } },
      { guest: { lastName: { contains: searchTerm, mode: 'insensitive' } } },
      { guest: { email: { contains: searchTerm, mode: 'insensitive' } } }
    ];
  }

  let orderBy = { createdAt: 'desc' };
  if (sort === 'oldest') orderBy = { createdAt: 'asc' };
  if (sort === 'highest') orderBy = { rating: 'desc' };
  if (sort === 'lowest') orderBy = { rating: 'asc' };

  const [total, reviews] = await Promise.all([
    prisma.review.count({ where }),
    prisma.review.findMany({
      where,
      orderBy,
      include: {
        property: { select: { id: true, title: true, slug: true } },
        guest: { select: { id: true, firstName: true, lastName: true, email: true } },
        reservation: { select: { id: true, checkInDate: true, checkOutDate: true } }
      }
    })
  ]);

  return {
    total,
    data: reviews
  };
}

async function getReviewById(id) {
  const reviewId = Number(id);
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    include: {
      property: { select: { id: true, title: true, slug: true } },
      guest: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
      reservation: { select: { id: true, checkInDate: true, checkOutDate: true, grandTotal: true } }
    }
  });

  if (!review) throw new Error('Review not found');
  return review;
}

async function deleteReview(id) {
  const reviewId = Number(id);
  return prisma.review.delete({
    where: { id: reviewId }
  });
}

// ----------------------------------------------------
// CITIES MANAGEMENT (9G)
// ----------------------------------------------------

async function getAllCities(params = {}) {
  const { search } = params;
  const where = {};

  if (search) {
    const searchTerm = search.trim();
    where.OR = [
      { name: { contains: searchTerm, mode: 'insensitive' } },
      { slug: { contains: searchTerm, mode: 'insensitive' } },
      { state: { contains: searchTerm, mode: 'insensitive' } }
    ];
  }

  return prisma.city.findMany({
    where,
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { properties: true, communities: true } }
    }
  });
}

async function getCityById(id) {
  const cityId = Number(id);
  const city = await prisma.city.findUnique({
    where: { id: cityId },
    include: {
      communities: { select: { id: true, name: true, slug: true } },
      properties: { select: { id: true, title: true, slug: true, status: true, nightlyPrice: true } },
      _count: { select: { properties: true, communities: true } }
    }
  });

  if (!city) throw new Error('City not found');
  return city;
}

async function createCity(data) {
  const { name, slug, state = 'PA', imageUrl } = data;
  if (!name) throw new Error('City name is required');

  const safeSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const existing = await prisma.city.findUnique({ where: { slug: safeSlug } });
  if (existing) throw new Error('City with this URL slug already exists');

  return prisma.city.create({
    data: { name, slug: safeSlug, state, imageUrl: imageUrl || null }
  });
}

async function updateCity(id, data) {
  const cityId = Number(id);
  const existing = await prisma.city.findUnique({ where: { id: cityId } });
  if (!existing) throw new Error('City not found');

  const updateData = {};
  if (data.name) updateData.name = data.name;
  if (data.state) updateData.state = data.state;
  if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;

  if (data.slug && data.slug !== existing.slug) {
    const slugOwner = await prisma.city.findUnique({ where: { slug: data.slug } });
    if (slugOwner && slugOwner.id !== cityId) {
      throw new Error('City with this URL slug already exists');
    }
    updateData.slug = data.slug;
  }

  return prisma.city.update({
    where: { id: cityId },
    data: updateData
  });
}

async function deleteCity(id) {
  const cityId = Number(id);
  const city = await prisma.city.findUnique({
    where: { id: cityId },
    include: { _count: { select: { properties: true, communities: true } } }
  });

  if (!city) throw new Error('City not found');

  if (city._count.properties > 0 || city._count.communities > 0) {
    throw new Error(`Cannot delete city "${city.name}" because it contains ${city._count.properties} properties and ${city._count.communities} communities. Reassign or remove attached listings first.`);
  }

  return prisma.city.delete({ where: { id: cityId } });
}

// ----------------------------------------------------
// COMMUNITIES MANAGEMENT (9H)
// ----------------------------------------------------

async function getAllCommunities(params = {}) {
  const { search, cityId } = params;
  const where = {};

  if (cityId) where.cityId = Number(cityId);

  if (search) {
    const searchTerm = search.trim();
    where.OR = [
      { name: { contains: searchTerm, mode: 'insensitive' } },
      { slug: { contains: searchTerm, mode: 'insensitive' } },
      { city: { name: { contains: searchTerm, mode: 'insensitive' } } }
    ];
  }

  return prisma.community.findMany({
    where,
    orderBy: { name: 'asc' },
    include: {
      city: { select: { id: true, name: true, slug: true } },
      _count: { select: { properties: true } }
    }
  });
}

async function getCommunityById(id) {
  const commId = Number(id);
  const community = await prisma.community.findUnique({
    where: { id: commId },
    include: {
      city: { select: { id: true, name: true, slug: true } },
      properties: { select: { id: true, title: true, slug: true, status: true, nightlyPrice: true } },
      _count: { select: { properties: true } }
    }
  });

  if (!community) throw new Error('Community not found');
  return community;
}

async function createCommunity(data) {
  const { name, slug, cityId, imageUrl } = data;
  if (!name) throw new Error('Community name is required');

  const safeSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const existing = await prisma.community.findUnique({ where: { slug: safeSlug } });
  if (existing) throw new Error('Community with this URL slug already exists');

  return prisma.community.create({
    data: {
      name,
      slug: safeSlug,
      cityId: cityId ? Number(cityId) : null,
      imageUrl: imageUrl || null
    }
  });
}

async function updateCommunity(id, data) {
  const commId = Number(id);
  const existing = await prisma.community.findUnique({ where: { id: commId } });
  if (!existing) throw new Error('Community not found');

  const updateData = {};
  if (data.name) updateData.name = data.name;
  if (data.cityId !== undefined) updateData.cityId = data.cityId ? Number(data.cityId) : null;
  if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;

  if (data.slug && data.slug !== existing.slug) {
    const slugOwner = await prisma.community.findUnique({ where: { slug: data.slug } });
    if (slugOwner && slugOwner.id !== commId) {
      throw new Error('Community with this URL slug already exists');
    }
    updateData.slug = data.slug;
  }

  return prisma.community.update({
    where: { id: commId },
    data: updateData
  });
}

async function deleteCommunity(id) {
  const commId = Number(id);
  const community = await prisma.community.findUnique({
    where: { id: commId },
    include: { _count: { select: { properties: true } } }
  });

  if (!community) throw new Error('Community not found');

  if (community._count.properties > 0) {
    throw new Error(`Cannot delete community "${community.name}" because it contains ${community._count.properties} properties. Reassign attached property listings first.`);
  }

  return prisma.community.delete({ where: { id: commId } });
}

// ----------------------------------------------------
// PROPERTY TYPES MANAGEMENT (9I)
// ----------------------------------------------------

async function getAllPropertyTypes(params = {}) {
  const { search } = params;
  const where = {};

  if (search) {
    const searchTerm = search.trim();
    where.OR = [
      { name: { contains: searchTerm, mode: 'insensitive' } },
      { slug: { contains: searchTerm, mode: 'insensitive' } }
    ];
  }

  return prisma.propertyType.findMany({
    where,
    orderBy: { name: 'asc' },
    include: { _count: { select: { properties: true } } }
  });
}

async function getPropertyTypeById(id) {
  const typeId = Number(id);
  const pt = await prisma.propertyType.findUnique({
    where: { id: typeId },
    include: {
      properties: { select: { id: true, title: true, slug: true, status: true, nightlyPrice: true } },
      _count: { select: { properties: true } }
    }
  });

  if (!pt) throw new Error('Property type not found');
  return pt;
}

async function createPropertyType(data) {
  const { name, slug } = data;
  if (!name) throw new Error('Property type name is required');

  const safeSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const existing = await prisma.propertyType.findUnique({ where: { slug: safeSlug } });
  if (existing) throw new Error('Property type with this slug already exists');

  return prisma.propertyType.create({
    data: { name, slug: safeSlug }
  });
}

async function updatePropertyType(id, data) {
  const typeId = Number(id);
  const existing = await prisma.propertyType.findUnique({ where: { id: typeId } });
  if (!existing) throw new Error('Property type not found');

  const updateData = {};
  if (data.name) updateData.name = data.name;

  if (data.slug && data.slug !== existing.slug) {
    const slugOwner = await prisma.propertyType.findUnique({ where: { slug: data.slug } });
    if (slugOwner && slugOwner.id !== typeId) {
      throw new Error('Property type with this slug already exists');
    }
    updateData.slug = data.slug;
  }

  return prisma.propertyType.update({
    where: { id: typeId },
    data: updateData
  });
}

async function deletePropertyType(id) {
  const typeId = Number(id);
  const pt = await prisma.propertyType.findUnique({
    where: { id: typeId },
    include: { _count: { select: { properties: true } } }
  });

  if (!pt) throw new Error('Property type not found');

  if (pt._count.properties > 0) {
    throw new Error(`Cannot delete property type "${pt.name}" because it is currently assigned to ${pt._count.properties} property listings. Reassign attached properties first.`);
  }

  return prisma.propertyType.delete({ where: { id: typeId } });
}

// ----------------------------------------------------
// AMENITIES & FACILITIES MANAGEMENT (9J)
// ----------------------------------------------------

async function getAllAmenities(params = {}) {
  const { search } = params;
  const where = {};

  if (search) {
    const searchTerm = search.trim();
    where.OR = [
      { name: { contains: searchTerm, mode: 'insensitive' } },
      { slug: { contains: searchTerm, mode: 'insensitive' } }
    ];
  }

  return prisma.amenity.findMany({
    where,
    orderBy: { name: 'asc' },
    include: { _count: { select: { properties: true } } }
  });
}

async function getAmenityById(id) {
  const amenityId = Number(id);
  const amenity = await prisma.amenity.findUnique({
    where: { id: amenityId },
    include: { _count: { select: { properties: true } } }
  });

  if (!amenity) throw new Error('Amenity not found');
  return amenity;
}

async function createAmenity(data) {
  const { name, slug, icon } = data;
  if (!name) throw new Error('Amenity name is required');

  const safeSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const existing = await prisma.amenity.findUnique({ where: { slug: safeSlug } });
  if (existing) throw new Error('Amenity with this slug already exists');

  return prisma.amenity.create({
    data: { name, slug: safeSlug, icon: icon || null }
  });
}

async function updateAmenity(id, data) {
  const amenityId = Number(id);
  const existing = await prisma.amenity.findUnique({ where: { id: amenityId } });
  if (!existing) throw new Error('Amenity not found');

  const updateData = {};
  if (data.name) updateData.name = data.name;
  if (data.icon !== undefined) updateData.icon = data.icon;

  if (data.slug && data.slug !== existing.slug) {
    const slugOwner = await prisma.amenity.findUnique({ where: { slug: data.slug } });
    if (slugOwner && slugOwner.id !== amenityId) {
      throw new Error('Amenity with this slug already exists');
    }
    updateData.slug = data.slug;
  }

  return prisma.amenity.update({
    where: { id: amenityId },
    data: updateData
  });
}

async function deleteAmenity(id) {
  const amenityId = Number(id);
  const amenity = await prisma.amenity.findUnique({
    where: { id: amenityId },
    include: { _count: { select: { properties: true } } }
  });

  if (!amenity) throw new Error('Amenity not found');

  if (amenity._count.properties > 0) {
    throw new Error(`Cannot delete amenity "${amenity.name}" because it is attached to ${amenity._count.properties} property listings. Remove from properties first.`);
  }

  return prisma.amenity.delete({ where: { id: amenityId } });
}

async function getAllFacilities(params = {}) {
  const { search } = params;
  const where = {};

  if (search) {
    const searchTerm = search.trim();
    where.OR = [
      { name: { contains: searchTerm, mode: 'insensitive' } },
      { slug: { contains: searchTerm, mode: 'insensitive' } }
    ];
  }

  return prisma.facility.findMany({
    where,
    orderBy: { name: 'asc' },
    include: { _count: { select: { properties: true } } }
  });
}

async function getFacilityById(id) {
  const facilityId = Number(id);
  const facility = await prisma.facility.findUnique({
    where: { id: facilityId },
    include: { _count: { select: { properties: true } } }
  });

  if (!facility) throw new Error('Facility not found');
  return facility;
}

async function createFacility(data) {
  const { name, slug, icon } = data;
  if (!name) throw new Error('Facility name is required');

  const safeSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const existing = await prisma.facility.findUnique({ where: { slug: safeSlug } });
  if (existing) throw new Error('Facility with this slug already exists');

  return prisma.facility.create({
    data: { name, slug: safeSlug, icon: icon || null }
  });
}

async function updateFacility(id, data) {
  const facilityId = Number(id);
  const existing = await prisma.facility.findUnique({ where: { id: facilityId } });
  if (!existing) throw new Error('Facility not found');

  const updateData = {};
  if (data.name) updateData.name = data.name;
  if (data.icon !== undefined) updateData.icon = data.icon;

  if (data.slug && data.slug !== existing.slug) {
    const slugOwner = await prisma.facility.findUnique({ where: { slug: data.slug } });
    if (slugOwner && slugOwner.id !== facilityId) {
      throw new Error('Facility with this slug already exists');
    }
    updateData.slug = data.slug;
  }

  return prisma.facility.update({
    where: { id: facilityId },
    data: updateData
  });
}

async function deleteFacility(id) {
  const facilityId = Number(id);
  const facility = await prisma.facility.findUnique({
    where: { id: facilityId },
    include: { _count: { select: { properties: true } } }
  });

  if (!facility) throw new Error('Facility not found');

  if (facility._count.properties > 0) {
    throw new Error(`Cannot delete facility "${facility.name}" because it is attached to ${facility._count.properties} property listings. Remove from properties first.`);
  }

  return prisma.facility.delete({ where: { id: facilityId } });
}

// ----------------------------------------------------
// INVOICES MANAGEMENT (9K)
// ----------------------------------------------------

async function getAllInvoices(params = {}) {
  const { search, status, type } = params;
  const where = {};

  if (status && status !== 'ALL') {
    where.paymentStatus = Number(status);
  }

  if (type && type !== 'ALL') {
    where.invoiceType = type;
  }

  if (search) {
    const searchTerm = search.trim();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(searchTerm);

    where.OR = [
      { user: { firstName: { contains: searchTerm, mode: 'insensitive' } } },
      { user: { lastName: { contains: searchTerm, mode: 'insensitive' } } },
      { user: { email: { contains: searchTerm, mode: 'insensitive' } } },
      { reservation: { property: { title: { contains: searchTerm, mode: 'insensitive' } } } }
    ];

    if (isUuid) {
      where.OR.push({ id: searchTerm });
      where.OR.push({ reservationId: searchTerm });
    }
  }

  const [total, invoices, paidCount, pendingCount, failedCount, sumAgg] = await Promise.all([
    prisma.invoice.count({ where }),
    prisma.invoice.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        reservation: {
          select: {
            id: true,
            status: true,
            checkInDate: true,
            checkOutDate: true,
            property: { select: { id: true, title: true, slug: true } }
          }
        }
      }
    }),
    prisma.invoice.count({ where: { ...where, paymentStatus: 1 } }),
    prisma.invoice.count({ where: { ...where, paymentStatus: 0 } }),
    prisma.invoice.count({ where: { ...where, paymentStatus: 2 } }),
    prisma.invoice.aggregate({ _sum: { totalAmount: true }, where: { ...where, paymentStatus: 1 } })
  ]);

  const metrics = {
    total: invoices.length,
    paid: paidCount,
    pending: pendingCount,
    failed: failedCount,
    totalRevenue: Number(sumAgg._sum.totalAmount || 0)
  };

  return {
    total,
    metrics,
    data: invoices
  };
}

async function getInvoiceById(id) {
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
      reservation: {
        include: {
          property: {
            select: {
              id: true,
              title: true,
              slug: true,
              images: { take: 1, select: { imageUrl: true } }
            }
          },
          guest: { select: { id: true, firstName: true, lastName: true, email: true } },
          host: { select: { id: true, firstName: true, lastName: true, email: true } }
        }
      }
    }
  });

  if (!invoice) throw new Error('Invoice not found');
  return invoice;
}

async function deleteInvoice(id) {
  throw new Error('Hard-deletion of historical financial invoice records is prohibited. Invoices must be retained for auditing integrity.');
}

// ----------------------------------------------------
// PHASE 9L — MESSAGES & CONTACT MESSAGES CMS
// ----------------------------------------------------

async function getAllThreads(params = {}) {
  const { search } = params;
  const where = {};

  if (search) {
    const searchTerm = search.trim();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(searchTerm);

    where.OR = [
      { sender: { firstName: { contains: searchTerm, mode: 'insensitive' } } },
      { sender: { lastName: { contains: searchTerm, mode: 'insensitive' } } },
      { sender: { email: { contains: searchTerm, mode: 'insensitive' } } },
      { receiver: { firstName: { contains: searchTerm, mode: 'insensitive' } } },
      { receiver: { lastName: { contains: searchTerm, mode: 'insensitive' } } },
      { receiver: { email: { contains: searchTerm, mode: 'insensitive' } } },
      { property: { title: { contains: searchTerm, mode: 'insensitive' } } },
      { messages: { some: { messageText: { contains: searchTerm, mode: 'insensitive' } } } }
    ];

    if (isUuid) {
      where.OR.push({ id: searchTerm });
    }
  }

  const [threads, totalUnreadCount] = await Promise.all([
    prisma.messageThread.findMany({
      where,
      orderBy: { lastMessageAt: 'desc' },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            slug: true,
            hostId: true,
            address: true,
            host: {
              select: { id: true, firstName: true, lastName: true, email: true, role: true }
            }
          }
        },
        sender: { select: { id: true, firstName: true, lastName: true, email: true, role: true, avatarUrl: true } },
        receiver: { select: { id: true, firstName: true, lastName: true, email: true, role: true, avatarUrl: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        _count: { select: { messages: true } }
      }
    }),
    prisma.message.count({ where: { readAt: null } })
  ]);

  const enrichedThreads = await Promise.all(
    threads.map(async (t) => {
      const unreadCount = await prisma.message.count({
        where: { threadId: t.id, readAt: null }
      });
      return {
        ...t,
        unreadCount
      };
    })
  );

  return {
    total: threads.length,
    metrics: {
      total: threads.length,
      unread: totalUnreadCount,
      read: threads.length - totalUnreadCount
    },
    data: enrichedThreads
  };
}

async function getThreadById(id) {
  const thread = await prisma.messageThread.findUnique({
    where: { id },
    include: {
      property: {
        select: {
          id: true,
          title: true,
          slug: true,
          hostId: true,
          address: true,
          host: {
            select: { id: true, firstName: true, lastName: true, email: true, role: true }
          }
        }
      },
      sender: { select: { id: true, firstName: true, lastName: true, email: true, role: true, avatarUrl: true } },
      receiver: { select: { id: true, firstName: true, lastName: true, email: true, role: true, avatarUrl: true } },
      messages: {
        orderBy: { createdAt: 'asc' },
        include: {
          sender: { select: { id: true, firstName: true, lastName: true, email: true, role: true, avatarUrl: true } }
        }
      }
    }
  });

  if (!thread) throw new Error('Message thread not found');
  return thread;
}

async function deleteThread(id) {
  return prisma.messageThread.delete({ where: { id } });
}

// Contact Messages Service Functions
async function getAllContactMessages(params = {}) {
  const { search, status } = params;
  const where = {};

  if (status && status !== 'ALL') {
    where.status = status.toUpperCase();
  }

  if (search) {
    const searchTerm = search.trim();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(searchTerm);

    where.OR = [
      { name: { contains: searchTerm, mode: 'insensitive' } },
      { email: { contains: searchTerm, mode: 'insensitive' } },
      { phone: { contains: searchTerm, mode: 'insensitive' } },
      { subject: { contains: searchTerm, mode: 'insensitive' } },
      { message: { contains: searchTerm, mode: 'insensitive' } }
    ];

    if (isUuid) {
      where.OR.push({ id: searchTerm });
    }
  }

  const [total, messages, newCount, readCount, repliedCount, archivedCount] = await Promise.all([
    prisma.contactMessage.count({ where }),
    prisma.contactMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    }),
    prisma.contactMessage.count({ where: { status: 'NEW' } }),
    prisma.contactMessage.count({ where: { status: 'READ' } }),
    prisma.contactMessage.count({ where: { status: 'REPLIED' } }),
    prisma.contactMessage.count({ where: { status: 'ARCHIVED' } })
  ]);

  return {
    total,
    metrics: {
      total,
      new: newCount,
      read: readCount,
      replied: repliedCount,
      archived: archivedCount
    },
    data: messages
  };
}

async function getContactMessageById(id) {
  const message = await prisma.contactMessage.findUnique({
    where: { id }
  });

  if (!message) throw new Error('Contact message not found');
  return message;
}

async function updateContactMessageStatus(id, newStatus) {
  const allowed = ['NEW', 'READ', 'REPLIED', 'ARCHIVED'];
  const uppercase = String(newStatus).toUpperCase();

  if (!allowed.includes(uppercase)) {
    throw new Error(`Invalid status specified. Allowed values: ${allowed.join(', ')}`);
  }

  return prisma.contactMessage.update({
    where: { id },
    data: { status: uppercase }
  });
}

async function deleteContactMessage(id) {
  return prisma.contactMessage.delete({ where: { id } });
}

// ----------------------------------------------------
// PHASE 9M — SITE SETTINGS CMS
// ----------------------------------------------------

function getSiteSettings() {
  try {
    if (fs.existsSync(SITE_SETTINGS_FILE)) {
      const data = fs.readFileSync(SITE_SETTINGS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Error reading siteSettings.json:', e);
  }
  return {
    general: { siteName: "Pocono.Vacations", siteDescription: "", contactEmail: "info@pocono.vacations", contactPhone: "(570) 555-0199", address: "Pocono Mountains, PA" },
    branding: { desktopLogoUrl: "/wp-content/uploads/2026/05/PV6_no-bg-_300.png", mobileLogoUrl: "/wp-content/uploads/2026/05/PV6_no-bg-_300.png", faviconUrl: "/favicon3.png", primaryColor: "#f15e75", secondaryColor: "#2b2b2b" },
    hero: { heroHeading: "Find Your Perfect Pocono Vacation Home", heroSubtitle: "Book direct & save on luxury chalets.", heroBgImage: "/wp-content/uploads/2018/10/video-thumb.png", searchEnabled: true },
    contact: { whatsAppNumber: "+15705550199", phoneNumber: "(570) 555-0199", contactEmail: "info@pocono.vacations", ctaText: "Book Direct & Save More" },
    social: { facebookUrl: "https://facebook.com/poconovacations", instagramUrl: "https://instagram.com/poconovacations", youtubeUrl: "https://youtube.com/poconovacations", twitterUrl: "https://twitter.com/poconovacations" },
    seo: { metaTitle: "Pocono.Vacations", metaDescription: "Discover authentic luxury chalets in the Poconos.", ogImageUrl: "/wp-content/uploads/2018/10/video-thumb.png" },
    footer: { footerText: "Your premier gateway to luxury mountain vacation rentals.", copyrightText: "© 2026 Pocono.Vacations. All Rights Reserved." },
    payment: {
      stripeEnabled: true,
      paypalEnabled: true,
      payLaterEnabled: true,
      defaultPaymentGateway: "stripe",
      payLaterDeadlineHours: 48,
      payLaterInstructions: "Please submit your payment proof after completing your reservation request. Your reservation will remain pending until payment verification is reviewed and approved.",
      autoExpirePayLaterReservations: true
    }
  };
}

function updateSiteSettings(newSettings) {
  const current = getSiteSettings();

  if (newSettings.payment) {
    const p = { ...current.payment, ...newSettings.payment };

    // Validate deadline hours: 1 to 720
    let hours = parseInt(p.payLaterDeadlineHours, 10);
    if (isNaN(hours) || hours < 1 || hours > 720) {
      throw new Error('Payment proof deadline must be between 1 and 720 hours.');
    }
    p.payLaterDeadlineHours = hours;

    // Validate default gateway vs enabled gateways
    const stripeOn = p.stripeEnabled !== false;
    const paypalOn = p.paypalEnabled !== false;
    const payLaterOn = p.payLaterEnabled !== false;

    const enabledGateways = [];
    if (stripeOn) enabledGateways.push('stripe');
    if (paypalOn) enabledGateways.push('paypal');
    if (payLaterOn) enabledGateways.push('pay_later');

    if (enabledGateways.length > 0) {
      if (!enabledGateways.includes(p.defaultPaymentGateway)) {
        p.defaultPaymentGateway = enabledGateways[0];
      }
    } else {
      p.defaultPaymentGateway = 'stripe';
    }

    newSettings.payment = p;
  }

  const merged = {
    ...current,
    ...newSettings,
    general: { ...current.general, ...newSettings.general },
    branding: { ...current.branding, ...newSettings.branding },
    hero: { ...current.hero, ...newSettings.hero },
    contact: { ...current.contact, ...newSettings.contact },
    social: { ...current.social, ...newSettings.social },
    seo: { ...current.seo, ...newSettings.seo },
    footer: { ...current.footer, ...newSettings.footer },
    payment: { ...current.payment, ...newSettings.payment }
  };

  try {
    const dir = path.dirname(SITE_SETTINGS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(SITE_SETTINGS_FILE, JSON.stringify(merged, null, 2), 'utf8');
  } catch (e) {
    console.warn('[SiteSettings] Cannot write to file on read-only filesystem:', e.message);
  }
  return merged;
}

function getPublicSiteSettings() {
  const raw = getSiteSettings();
  return {
    general: {
      siteName: raw.general?.siteName || "Pocono.Vacations",
      siteDescription: raw.general?.siteDescription || "",
      contactEmail: raw.general?.contactEmail || "info@pocono.vacations",
      contactPhone: raw.general?.contactPhone || "(570) 555-0199",
      address: raw.general?.address || "Pocono Mountains, PA"
    },
    branding: {
      desktopLogoUrl: raw.branding?.desktopLogoUrl || "/wp-content/uploads/2026/05/PV6_no-bg-_300.png",
      mobileLogoUrl: raw.branding?.mobileLogoUrl || "/wp-content/uploads/2026/05/PV6_no-bg-_300.png",
      faviconUrl: raw.branding?.faviconUrl || "/favicon3.png",
      primaryColor: raw.branding?.primaryColor || "#f15e75",
      secondaryColor: raw.branding?.secondaryColor || "#2b2b2b"
    },
    hero: {
      heroHeading: raw.hero?.heroHeading || "Find Your Perfect Pocono Vacation Home",
      heroSubtitle: raw.hero?.heroSubtitle || "Book direct & save on luxury chalets.",
      heroBgImage: raw.hero?.heroBgImage || "/wp-content/uploads/2018/10/video-thumb.png",
      searchEnabled: raw.hero?.searchEnabled !== false
    },
    contact: {
      whatsAppNumber: raw.contact?.whatsAppNumber || "+15705550199",
      phoneNumber: raw.contact?.phoneNumber || "(570) 555-0199",
      contactEmail: raw.contact?.contactEmail || "info@pocono.vacations",
      ctaText: raw.contact?.ctaText || "Book Direct & Save More"
    },
    social: {
      facebookUrl: raw.social?.facebookUrl || "https://facebook.com/poconovacations",
      instagramUrl: raw.social?.instagramUrl || "https://instagram.com/poconovacations",
      youtubeUrl: raw.social?.youtubeUrl || "https://youtube.com/poconovacations",
      twitterUrl: raw.social?.twitterUrl || "https://twitter.com/poconovacations"
    },
    seo: {
      metaTitle: raw.seo?.metaTitle || "Pocono.Vacations",
      metaDescription: raw.seo?.metaDescription || "Discover authentic luxury chalets in the Poconos.",
      ogImageUrl: raw.seo?.ogImageUrl || "/wp-content/uploads/2018/10/video-thumb.png"
    },
    footer: {
      footerText: raw.footer?.footerText || "Your premier gateway to luxury mountain vacation rentals.",
      copyrightText: raw.footer?.copyrightText || "© 2026 Pocono.Vacations. All Rights Reserved."
    },
    payment: {
      stripeEnabled: raw.payment?.stripeEnabled !== false,
      paypalEnabled: raw.payment?.paypalEnabled !== false,
      payLaterEnabled: raw.payment?.payLaterEnabled !== false,
      defaultPaymentGateway: raw.payment?.defaultPaymentGateway || "stripe",
      payLaterDeadlineHours: typeof raw.payment?.payLaterDeadlineHours === 'number' ? raw.payment.payLaterDeadlineHours : parseInt(raw.payment?.payLaterDeadlineHours || 48, 10) || 48,
      payLaterInstructions: raw.payment?.payLaterInstructions || "Please submit your payment proof after completing your reservation request. Your reservation will remain pending until payment verification is reviewed and approved.",
      autoExpirePayLaterReservations: raw.payment?.autoExpirePayLaterReservations !== false
    }
  };
}

// ----------------------------------------------------
// PHASE 9N — HOMEPAGE CMS
// ----------------------------------------------------

function getHomepageConfig() {
  try {
    if (fs.existsSync(HOMEPAGE_CONFIG_FILE)) {
      const data = fs.readFileSync(HOMEPAGE_CONFIG_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Error reading homepageConfig.json:', e);
  }
  return {
    hero: { enabled: true, heading: "Find Your Perfect Pocono Vacation Home", subtitle: "Book direct & save", bgImage: "/wp-content/uploads/2026/08/hero-bg.jpg", searchEnabled: true, searchButtonText: "Search", whereToStayLabel: "Where to stay?", arriveLabel: "Arrive", departLabel: "Depart", guestsLabel: "Guests" },
    featuredHomes: { enabled: true, title: "Featured Vacation Homes", subtitle: "Handpicked luxury rentals", selectedPropertyIds: [], displayOrder: 1 },
    trendingDestinations: { enabled: true, title: "Trending Destinations", subtitle: "Explore top communities", selectedCityIds: [], displayOrder: 2 },
    trendingExperiences: { enabled: true, title: "Trending Experiences", subtitle: "Unforgettable outdoor adventures", cards: [], displayOrder: 3 },
    hearFromOurGuests: { enabled: true, title: "Hear From Our Guests", subtitle: "Authentic guest reviews", selectedReviewIds: [], displayOrder: 4 },
    ourPartners: { enabled: true, title: "Our Trusted Partners", displayOrder: 5 },
    whyBookDirect: { enabled: true, title: "Why Book Direct With Us?", subtitle: "Exclusive benefits", cards: [], displayOrder: 6 },
    cta: { enabled: true, heading: "Ready to Plan Your Pocono Getaway?", description: "Browse our homes", buttonText: "Explore All Homes", buttonUrl: "/properties", displayOrder: 7 }
  };
}

function updateHomepageConfig(newConfig) {
  const current = getHomepageConfig();
  const merged = { ...current, ...newConfig };
  try {
    const dir = path.dirname(HOMEPAGE_CONFIG_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(HOMEPAGE_CONFIG_FILE, JSON.stringify(merged, null, 2), 'utf8');
  } catch (e) {
    console.warn('[HomepageConfig] Cannot write to file on read-only filesystem:', e.message);
  }
  return merged;
}

async function deleteProperty(id) {
  return prisma.property.delete({
    where: { id }
  });
}

// ----------------------------------------------------
// FULL ADMIN PROPERTY MANAGEMENT
// ----------------------------------------------------

async function getAllPropertiesAdmin(params = {}) {
  const {
    search,
    status,
    hostId,
    isFeatured,
    city,
    community,
    propertyType,
    page = 1,
    limit = 50
  } = params;

  const where = {};

  if (status && status.toUpperCase() !== 'ALL') {
    where.status = status.toUpperCase();
  }

  if (hostId && hostId !== 'ALL') {
    where.hostId = hostId;
  }

  if (isFeatured !== undefined && isFeatured !== 'all') {
    where.isFeatured = isFeatured === 'true' || isFeatured === true || isFeatured === 'featured';
  }

  if (city) {
    where.city = isNaN(Number(city)) ? { slug: city } : { id: Number(city) };
  }

  if (community) {
    where.community = isNaN(Number(community)) ? { slug: community } : { id: Number(community) };
  }

  if (propertyType) {
    where.propertyType = isNaN(Number(propertyType)) ? { slug: propertyType } : { id: Number(propertyType) };
  }

  if (search) {
    const s = search.trim();
    where.OR = [
      { title: { contains: s, mode: 'insensitive' } },
      { slug: { contains: s, mode: 'insensitive' } },
      { address: { contains: s, mode: 'insensitive' } },
      { host: { firstName: { contains: s, mode: 'insensitive' } } },
      { host: { lastName: { contains: s, mode: 'insensitive' } } },
      { host: { email: { contains: s, mode: 'insensitive' } } }
    ];
  }

  const pageNum = Math.max(1, Number(page));
  const take = Math.min(100, Math.max(1, Number(limit)));
  const skip = (pageNum - 1) * take;

  const [total, data] = await Promise.all([
    prisma.property.count({ where }),
    prisma.property.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: {
        city: { select: { id: true, name: true, slug: true } },
        community: { select: { id: true, name: true, slug: true } },
        propertyType: { select: { id: true, name: true, slug: true } },
        images: { orderBy: { displayOrder: 'asc' } },
        host: { select: { id: true, firstName: true, lastName: true, email: true, role: true, avatarUrl: true } },
        _count: {
          select: {
            reservations: true,
            reviews: true
          }
        }
      }
    })
  ]);

  return {
    total,
    page: pageNum,
    limit: take,
    totalPages: Math.ceil(total / take),
    data
  };
}

async function getPropertyByIdAdmin(id) {
  const property = await prisma.property.findUnique({
    where: { id },
    include: {
      city: { select: { id: true, name: true, slug: true } },
      community: { select: { id: true, name: true, slug: true } },
      propertyType: { select: { id: true, name: true, slug: true } },
      cancellationPolicy: true,
      images: { orderBy: { displayOrder: 'asc' } },
      amenities: { include: { amenity: true } },
      facilities: { include: { facility: true } },
      host: { select: { id: true, firstName: true, lastName: true, email: true, role: true, phone: true, avatarUrl: true } },
      _count: {
        select: {
          reservations: true,
          reviews: true
        }
      }
    }
  });

  if (!property) throw new Error('Property not found');
  return property;
}

async function createPropertyAdmin(data, adminUser) {
  const {
    title,
    description,
    address,
    cityId,
    communityId,
    propertyTypeId,
    hostId,
    nightlyPrice,
    weekendPrice,
    maxGuests,
    bedrooms,
    beds,
    bathrooms,
    cleaningFee,
    status = 'PUBLISHED',
    isFeatured = false
  } = data;

  if (!title || !nightlyPrice) {
    throw new Error('Title and nightly price are required.');
  }

  let baseSlug = title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'property';
  let uniqueSlug = baseSlug;
  let count = 1;

  while (await prisma.property.findUnique({ where: { slug: uniqueSlug } })) {
    uniqueSlug = `${baseSlug}-${count++}`;
  }

  const assignedHostId = hostId || adminUser.id;

  const property = await prisma.property.create({
    data: {
      hostId: assignedHostId,
      title,
      slug: uniqueSlug,
      description: description || '',
      address: address || '',
      cityId: cityId ? Number(cityId) : null,
      communityId: communityId ? Number(communityId) : null,
      propertyTypeId: propertyTypeId ? Number(propertyTypeId) : null,
      nightlyPrice: parseFloat(nightlyPrice),
      weekendPrice: weekendPrice ? parseFloat(weekendPrice) : null,
      maxGuests: maxGuests ? Number(maxGuests) : 1,
      bedrooms: bedrooms ? Number(bedrooms) : 1,
      beds: beds ? Number(beds) : 1,
      bathrooms: bathrooms ? parseFloat(bathrooms) : 1.0,
      cleaningFee: cleaningFee ? parseFloat(cleaningFee) : 0.0,
      status: status.toUpperCase(),
      isFeatured: isFeatured === true || isFeatured === 'true'
    },
    include: {
      city: { select: { id: true, name: true } },
      community: { select: { id: true, name: true } },
      propertyType: { select: { id: true, name: true } },
      host: { select: { id: true, firstName: true, lastName: true, email: true } }
    }
  });

  try {
    const emailService = require('./emailService');
    emailService.notifyNewPropertyPublished(property.id, null, property.status);
  } catch (e) {
    console.error('[PROPERTY EMAIL ERROR] Trigger failed:', e.message);
  }

  return property;
}

async function updatePropertyAdmin(id, data) {
  const existing = await prisma.property.findUnique({ where: { id } });
  if (!existing) throw new Error('Property not found');

  const updateData = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.address !== undefined) updateData.address = data.address;
  if (data.cityId !== undefined) updateData.cityId = data.cityId ? Number(data.cityId) : null;
  if (data.communityId !== undefined) updateData.communityId = data.communityId ? Number(data.communityId) : null;
  if (data.propertyTypeId !== undefined) updateData.propertyTypeId = data.propertyTypeId ? Number(data.propertyTypeId) : null;
  if (data.hostId !== undefined) updateData.hostId = data.hostId;
  if (data.nightlyPrice !== undefined) updateData.nightlyPrice = parseFloat(data.nightlyPrice);
  if (data.weekendPrice !== undefined) updateData.weekendPrice = data.weekendPrice ? parseFloat(data.weekendPrice) : null;
  if (data.maxGuests !== undefined) updateData.maxGuests = Number(data.maxGuests);
  if (data.bedrooms !== undefined) updateData.bedrooms = Number(data.bedrooms);
  if (data.beds !== undefined) updateData.beds = Number(data.beds);
  if (data.bathrooms !== undefined) updateData.bathrooms = parseFloat(data.bathrooms);
  if (data.cleaningFee !== undefined) updateData.cleaningFee = parseFloat(data.cleaningFee);
  if (data.status !== undefined) updateData.status = data.status.toUpperCase();
  if (data.isFeatured !== undefined) updateData.isFeatured = data.isFeatured === true || data.isFeatured === 'true';

  const updated = await prisma.property.update({
    where: { id },
    data: updateData,
    include: {
      city: { select: { id: true, name: true } },
      community: { select: { id: true, name: true } },
      propertyType: { select: { id: true, name: true } },
      host: { select: { id: true, firstName: true, lastName: true, email: true } },
      images: { orderBy: { displayOrder: 'asc' } }
    }
  });

  try {
    const emailService = require('./emailService');
    emailService.notifyNewPropertyPublished(id, existing.status, updated.status);
  } catch (e) {
    console.error('[PROPERTY EMAIL ERROR] Trigger failed:', e.message);
  }

  return updated;
}

async function updatePropertyStatusAdmin(id, status) {
  const existing = await prisma.property.findUnique({ where: { id } });
  if (!existing) throw new Error('Property not found');

  const validStatuses = ['PUBLISHED', 'PENDING_REVIEW', 'DRAFT', 'REJECTED', 'DELETED'];
  const targetStatus = status.toUpperCase();

  if (!validStatuses.includes(targetStatus)) {
    throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }

  const updated = await prisma.property.update({
    where: { id },
    data: {
      status: targetStatus,
      isFeatured: targetStatus === 'DELETED' ? false : undefined
    }
  });

  try {
    const emailService = require('./emailService');
    emailService.notifyNewPropertyPublished(id, existing.status, updated.status);
  } catch (e) {
    console.error('[PROPERTY EMAIL ERROR] Trigger failed:', e.message);
  }

  return updated;
}

async function updatePropertyFeaturedAdmin(id, isFeatured) {
  const existing = await prisma.property.findUnique({ where: { id } });
  if (!existing) throw new Error('Property not found');

  const featVal = isFeatured === true || isFeatured === 'true';

  const updated = await prisma.property.update({
    where: { id },
    data: { isFeatured: featVal }
  });

  return updated;
}

async function updatePropertyOwnerAdmin(id, hostId) {
  const existing = await prisma.property.findUnique({ where: { id } });
  if (!existing) throw new Error('Property not found');

  const newOwner = await prisma.user.findUnique({ where: { id: hostId } });
  if (!newOwner) throw new Error('Target user not found');

  const updated = await prisma.property.update({
    where: { id },
    data: { hostId },
    include: {
      host: { select: { id: true, firstName: true, lastName: true, email: true, role: true } }
    }
  });

  return updated;
}

async function deletePropertyAdmin(id, options = {}) {
  const propertyService = require('./propertyService');
  const rawMode = options?.deleteMode ?? options?.mode;
  const deleteMode = String(rawMode || 'soft').trim().toLowerCase();

  console.log(`[PERMANENT DELETE TRACE - SERVICE adminService]`);
  console.log(`propertyId: ${id}`);
  console.log(`deleteMode: ${deleteMode}`);
  console.log(`service:    adminService.deletePropertyAdmin\n`);

  return propertyService.deleteProperty(id, { id: 'admin', role: 'ADMIN' }, { deleteMode });
}

module.exports = {
  getAdminStats,
  getAllUsers,
  getUserById,
  updateUserProfile,
  updateUserRole,
  deleteUser,
  getAllReservations,
  getReservationById,
  updateReservationStatus,
  deleteReservation,
  getAllReviews,
  getReviewById,
  deleteReview,
  getAllCities,
  getCityById,
  createCity,
  updateCity,
  deleteCity,
  getAllCommunities,
  getCommunityById,
  createCommunity,
  updateCommunity,
  deleteCommunity,
  getAllPropertyTypes,
  getPropertyTypeById,
  createPropertyType,
  updatePropertyType,
  deletePropertyType,
  getAllAmenities,
  getAmenityById,
  createAmenity,
  updateAmenity,
  deleteAmenity,
  getAllFacilities,
  getFacilityById,
  createFacility,
  updateFacility,
  deleteFacility,
  getAllInvoices,
  getInvoiceById,
  deleteInvoice,
  getAllThreads,
  getThreadById,
  deleteThread,
  getAllContactMessages,
  getContactMessageById,
  updateContactMessageStatus,
  deleteContactMessage,
  getSiteSettings,
  getPublicSiteSettings,
  updateSiteSettings,
  getHomepageConfig,
  updateHomepageConfig,
  deleteProperty: deletePropertyAdmin,
  getAllPropertiesAdmin,
  getPropertyByIdAdmin,
  createPropertyAdmin,
  updatePropertyAdmin,
  updatePropertyStatusAdmin,
  updatePropertyFeaturedAdmin,
  updatePropertyOwnerAdmin,
  deletePropertyAdmin,
  updatePaymentVerificationStatusAdmin,
  reconcileReservationFinancialState
};

