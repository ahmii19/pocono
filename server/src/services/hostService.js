const prisma = require('../config/prisma');

function generateSlug(str) {
  if (!str) return 'property';
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function getHostDashboardStats(hostId) {
  const [
    totalProperties,
    publishedProperties,
    draftProperties,
    pendingProperties,
    totalReservations,
    upcomingReservations,
    paidReservations,
    reviewsSummary
  ] = await Promise.all([
    prisma.property.count({ where: { hostId } }),
    prisma.property.count({ where: { hostId, status: 'PUBLISHED' } }),
    prisma.property.count({ where: { hostId, status: 'DRAFT' } }),
    prisma.property.count({ where: { hostId, status: 'PENDING_REVIEW' } }),
    prisma.reservation.count({ where: { property: { hostId } } }),
    prisma.reservation.count({
      where: {
        property: { hostId },
        checkInDate: { gte: new Date() },
        status: { in: ['CONFIRMED', 'PAID', 'PENDING', 'PENDING_PAYMENT'] }
      }
    }),
    prisma.reservation.findMany({
      where: {
        property: { hostId },
        status: { in: ['PAID', 'CONFIRMED', 'COMPLETED'] }
      },
      select: { grandTotal: true }
    }),
    prisma.review.aggregate({
      where: { property: { hostId } },
      _count: { id: true },
      _avg: { rating: true }
    })
  ]);

  const totalRevenue = paidReservations.reduce(
    (sum, r) => sum + (Number(r.grandTotal) || 0),
    0
  );

  const hostEarningService = require('./hostEarningService');
  const earningsSummary = await hostEarningService.getHostEarningSummary(hostId);

  return {
    totalProperties,
    publishedProperties,
    draftProperties,
    pendingProperties,
    totalReservations,
    upcomingReservations,
    totalReviews: reviewsSummary._count.id || 0,
    averageRating: reviewsSummary._avg.rating ? Number(reviewsSummary._avg.rating.toFixed(1)) : 0,
    totalRevenue: totalRevenue.toFixed(2),
    earningsSummary
  };
}

async function getHostProperties(hostId, params = {}) {
  const { search, status } = params;
  const where = { hostId };

  if (status && status !== 'ALL') {
    where.status = status.toUpperCase();
  }

  if (search) {
    const s = search.trim();
    where.OR = [
      { title: { contains: s, mode: 'insensitive' } },
      { slug: { contains: s, mode: 'insensitive' } },
      { address: { contains: s, mode: 'insensitive' } }
    ];
  }

  const properties = await prisma.property.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      city: { select: { id: true, name: true } },
      community: { select: { id: true, name: true } },
      propertyType: { select: { id: true, name: true } },
      images: { orderBy: { displayOrder: 'asc' } },
      _count: {
        select: {
          reservations: true,
          reviews: true
        }
      }
    }
  });

  return properties;
}

async function getHostPropertyById(hostId, propertyId, userRole = 'HOST') {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    include: {
      city: { select: { id: true, name: true } },
      community: { select: { id: true, name: true } },
      propertyType: { select: { id: true, name: true } },
      images: { orderBy: { displayOrder: 'asc' } },
      amenities: { include: { amenity: true } },
      facilities: { include: { facility: true } },
      _count: {
        select: {
          reservations: true,
          reviews: true
        }
      }
    }
  });

  if (!property) {
    throw new Error('Property not found');
  }

  if (property.hostId !== hostId && userRole !== 'ADMIN') {
    const error = new Error('Forbidden: You do not own this property.');
    error.status = 403;
    throw error;
  }

  return property;
}

async function createHostProperty(hostId, data) {
  const {
    title,
    description,
    address,
    cityId,
    communityId,
    propertyTypeId,
    nightlyPrice,
    weekendPrice,
    maxGuests,
    bedrooms,
    beds,
    bathrooms,
    cleaningFee,
    amenityIds,
    facilityIds
  } = data;

  if (!title || !nightlyPrice) {
    throw new Error('Title and nightly price are required.');
  }

  let baseSlug = generateSlug(title) || 'property';
  let uniqueSlug = baseSlug;
  let count = 1;

  while (await prisma.property.findUnique({ where: { slug: uniqueSlug } })) {
    uniqueSlug = `${baseSlug}-${count++}`;
  }

  const targetStatus = data.status ? String(data.status).toUpperCase() : 'PENDING_REVIEW';

  const property = await prisma.property.create({
    data: {
      hostId,
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
      status: targetStatus,
      amenities: Array.isArray(amenityIds) && amenityIds.length > 0
        ? { create: amenityIds.map(id => ({ amenityId: Number(id) })) }
        : undefined,
      facilities: Array.isArray(facilityIds) && facilityIds.length > 0
        ? { create: facilityIds.map(id => ({ facilityId: Number(id) })) }
        : undefined
    },
    include: {
      city: { select: { id: true, name: true } },
      community: { select: { id: true, name: true } },
      propertyType: { select: { id: true, name: true } }
    }
  });

  try {
    const emailService = require('./emailService');
    emailService.notifyNewPropertyPublished(property.id, null, property.status);
  } catch (e) {
    console.error('[PROPERTY EMAIL ERROR] Host create trigger failed:', e.message);
  }

  return property;
}

async function updateHostProperty(hostId, propertyId, data, userRole = 'HOST') {
  const existing = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!existing) throw new Error('Property not found');

  if (existing.hostId !== hostId && userRole !== 'ADMIN') {
    const error = new Error('Forbidden: You do not own this property.');
    error.status = 403;
    throw error;
  }

  const updateData = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.address !== undefined) updateData.address = data.address;
  if (data.cityId !== undefined) updateData.cityId = data.cityId ? Number(data.cityId) : null;
  if (data.communityId !== undefined) updateData.communityId = data.communityId ? Number(data.communityId) : null;
  if (data.propertyTypeId !== undefined) updateData.propertyTypeId = data.propertyTypeId ? Number(data.propertyTypeId) : null;
  if (data.nightlyPrice !== undefined) updateData.nightlyPrice = parseFloat(data.nightlyPrice);
  if (data.weekendPrice !== undefined) updateData.weekendPrice = data.weekendPrice ? parseFloat(data.weekendPrice) : null;
  if (data.maxGuests !== undefined) updateData.maxGuests = Number(data.maxGuests);
  if (data.bedrooms !== undefined) updateData.bedrooms = Number(data.bedrooms);
  if (data.beds !== undefined) updateData.beds = Number(data.beds);
  if (data.bathrooms !== undefined) updateData.bathrooms = parseFloat(data.bathrooms);
  if (data.cleaningFee !== undefined) updateData.cleaningFee = parseFloat(data.cleaningFee);

  if (data.status !== undefined) {
    updateData.status = String(data.status).toUpperCase();
  } else if (existing.status === 'PUBLISHED' && userRole !== 'ADMIN') {
    updateData.status = 'PENDING_REVIEW';
  }

  const updated = await prisma.property.update({
    where: { id: propertyId },
    data: updateData,
    include: {
      city: { select: { id: true, name: true } },
      community: { select: { id: true, name: true } },
      propertyType: { select: { id: true, name: true } },
      images: { orderBy: { displayOrder: 'asc' } }
    }
  });

  try {
    const emailService = require('./emailService');
    emailService.notifyNewPropertyPublished(propertyId, existing.status, updated.status);
  } catch (e) {
    console.error('[PROPERTY EMAIL ERROR] Host update trigger failed:', e.message);
  }

  return updated;
}

async function deleteHostProperty(hostId, propertyId, userRole = 'HOST') {
  const existing = await prisma.property.findUnique({
    where: { id: propertyId },
    include: { _count: { select: { reservations: true } } }
  });
  if (!existing) throw new Error('Property not found');

  if (existing.hostId !== hostId && userRole !== 'ADMIN') {
    const error = new Error('Forbidden: You do not own this property.');
    error.status = 403;
    throw error;
  }

  if (existing._count.reservations > 0) {
    await prisma.property.update({
      where: { id: propertyId },
      data: { status: 'DRAFT', isFeatured: false }
    });
    return { success: true, message: 'Property archived as DRAFT because historical reservations exist.' };
  }

  await prisma.property.delete({ where: { id: propertyId } });
  return { success: true, message: 'Property removed successfully.' };
}

async function getHostReservations(hostId, params = {}, userRole = 'HOST') {
  const { status, propertyId } = params;
  const where = { property: { hostId } };

  if (propertyId) {
    where.propertyId = propertyId;
  }

  if (status && status !== 'ALL') {
    where.status = status.toUpperCase();
  }

  const reservations = await prisma.reservation.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      property: { select: { id: true, title: true, slug: true, hostId: true } },
      guest: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } }
    }
  });

  return reservations;
}

async function getHostReservationById(hostId, reservationId, userRole = 'HOST') {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: {
      property: { select: { id: true, title: true, slug: true, hostId: true } },
      guest: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
      invoices: true
    }
  });

  if (!reservation) {
    throw new Error('Reservation not found');
  }

  if (reservation.property.hostId !== hostId && userRole !== 'ADMIN') {
    const error = new Error('Forbidden: You do not own this reservation.');
    error.status = 403;
    throw error;
  }

  return reservation;
}

async function getHostMessages(hostId) {
  const messageService = require('./messageService');
  return messageService.getUserThreads({ id: hostId, role: 'HOST' });
}

async function getHostReviews(hostId) {
  const reviews = await prisma.review.findMany({
    where: { property: { hostId } },
    orderBy: { createdAt: 'desc' },
    include: {
      property: { select: { id: true, title: true, slug: true } },
      guest: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } }
    }
  });

  return reviews;
}

async function getHostProfile(hostId) {
  const user = await prisma.user.findUnique({
    where: { id: hostId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      role: true,
      bio: true,
      avatarUrl: true,
      createdAt: true,
      updatedAt: true
    }
  });

  if (!user) throw new Error('User not found');
  return user;
}

async function updateHostProfile(hostId, data) {
  const updateData = {};
  if (data.firstName !== undefined) updateData.firstName = data.firstName;
  if (data.lastName !== undefined) updateData.lastName = data.lastName;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.bio !== undefined) updateData.bio = data.bio;
  if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl;

  const updated = await prisma.user.update({
    where: { id: hostId },
    data: updateData,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      role: true,
      bio: true,
      avatarUrl: true,
      createdAt: true,
      updatedAt: true
    }
  });

  return updated;
}

async function applyBecomeHost(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');

  if (user.role === 'ADMIN') {
    return { success: true, message: 'You are already an Administrator.', role: 'ADMIN' };
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { role: 'HOST' },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true
    }
  });

  return {
    success: true,
    message: 'Congratulations! Your account has been upgraded to HOST.',
    user: updated
  };
}

module.exports = {
  getHostDashboardStats,
  getHostProperties,
  getHostPropertyById,
  createHostProperty,
  updateHostProperty,
  deleteHostProperty,
  getHostReservations,
  getHostReservationById,
  getHostMessages,
  getHostReviews,
  getHostProfile,
  updateHostProfile,
  applyBecomeHost
};
