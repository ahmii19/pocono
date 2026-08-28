const prisma = require('../config/prisma');

async function getProperties(params = {}) {
  const {
    destination,
    city,
    community,
    propertyType,
    guests,
    bedrooms,
    bathrooms,
    minPrice,
    maxPrice,
    instantBook,
    isFeatured,
    featured,
    search,
    status = 'PUBLISHED',
    sort = 'newest',
    page = 1,
    limit = 12
  } = params;

  const where = {};
  if (status !== 'all') {
    where.status = status.toUpperCase();
  }

  if (isFeatured !== undefined || featured !== undefined) {
    const featVal = isFeatured === 'true' || isFeatured === true || featured === 'true' || featured === true;
    where.isFeatured = featVal;
  }

  if (destination) {
    const destSlug = destination.toLowerCase().trim();
    where.OR = [
      { city: { slug: { equals: destSlug, mode: 'insensitive' } } },
      { community: { slug: { equals: destSlug, mode: 'insensitive' } } },
      { city: { name: { contains: destSlug, mode: 'insensitive' } } },
      { community: { name: { contains: destSlug, mode: 'insensitive' } } },
      { title: { contains: destSlug, mode: 'insensitive' } },
      { address: { contains: destSlug, mode: 'insensitive' } }
    ];
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

  if (guests) {
    where.maxGuests = { gte: Number(guests) };
  }

  if (bedrooms) {
    where.bedrooms = { gte: Number(bedrooms) };
  }

  if (bathrooms) {
    where.bathrooms = { gte: Number(bathrooms) };
  }

  if (minPrice || maxPrice) {
    where.nightlyPrice = {};
    if (minPrice) where.nightlyPrice.gte = Number(minPrice);
    if (maxPrice) where.nightlyPrice.lte = Number(maxPrice);
  }

  if (instantBook === 'true' || instantBook === true) {
    where.instantBook = true;
  }

  if (search) {
    const searchTerm = search.trim();
    where.OR = [
      { title: { contains: searchTerm, mode: 'insensitive' } },
      { slug: { contains: searchTerm, mode: 'insensitive' } },
      { description: { contains: searchTerm, mode: 'insensitive' } },
      { address: { contains: searchTerm, mode: 'insensitive' } },
      { city: { name: { contains: searchTerm, mode: 'insensitive' } } },
      { community: { name: { contains: searchTerm, mode: 'insensitive' } } },
      { host: { firstName: { contains: searchTerm, mode: 'insensitive' } } },
      { host: { lastName: { contains: searchTerm, mode: 'insensitive' } } }
    ];
  }

  const orderBy = [];
  if (sort === 'price_asc') orderBy.push({ nightlyPrice: 'asc' });
  else if (sort === 'price_desc') orderBy.push({ nightlyPrice: 'desc' });
  else if (sort === 'rating') orderBy.push({ averageRating: 'desc' });
  else orderBy.push({ createdAt: 'desc' });

  const pageNum = Math.max(1, Number(page));
  const take = Math.min(100, Math.max(1, Number(limit)));
  const skip = (pageNum - 1) * take;

  const [total, data] = await Promise.all([
    prisma.property.count({ where }),
    prisma.property.findMany({
      where,
      orderBy,
      skip,
      take,
      include: {
        city: true,
        community: true,
        propertyType: true,
        images: { orderBy: { displayOrder: 'asc' }, take: 5 },
        extraPrices: true,
        host: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } }
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

async function getPropertyBySlug(slug) {
  const property = await prisma.property.findUnique({
    where: { slug },
    include: {
      city: true,
      community: true,
      propertyType: true,
      cancellationPolicy: true,
      images: { orderBy: { displayOrder: 'asc' } },
      amenities: { include: { amenity: true } },
      facilities: { include: { facility: true } },
      extraPrices: true,
      blockedDates: true,
      reviews: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { guest: { select: { id: true, firstName: true, avatarUrl: true } } }
      },
      host: { select: { id: true, firstName: true, lastName: true, phone: true, avatarUrl: true, bio: true } }
    }
  });

  if (!property) {
    throw new Error('Property not found');
  }

  if (property.status !== 'PUBLISHED') {
    throw new Error('Property not found or not published');
  }

  return property;
}

async function getPropertyById(id) {
  const property = await prisma.property.findUnique({
    where: { id },
    include: {
      city: true,
      community: true,
      propertyType: true,
      cancellationPolicy: true,
      images: { orderBy: { displayOrder: 'asc' } },
      amenities: { include: { amenity: true } },
      facilities: { include: { facility: true } },
      extraPrices: true,
      host: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } }
    }
  });

  if (!property) {
    throw new Error('Property not found');
  }

  return property;
}

async function createProperty(data, defaultHostId) {
  const hostId = data.hostId || defaultHostId;
  const slug = data.slug || data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const created = await prisma.property.create({
    data: {
      hostId,
      title: data.title,
      slug,
      description: data.description || '',
      nightlyPrice: Number(data.nightlyPrice) || 100,
      weekendPrice: data.weekendPrice ? Number(data.weekendPrice) : null,
      cleaningFee: Number(data.cleaningFee) || 0.00,
      securityDeposit: Number(data.securityDeposit) || 0.00,
      maxGuests: Number(data.maxGuests) || 1,
      bedrooms: Number(data.bedrooms) || 1,
      beds: Number(data.beds) || 1,
      bathrooms: Number(data.bathrooms) || 1.0,
      address: data.address || '',
      zipCode: data.zipCode || '',
      status: data.status || 'PUBLISHED',
      isFeatured: data.isFeatured === 'true' || data.isFeatured === true,
      cityId: data.cityId ? Number(data.cityId) : null,
      communityId: data.communityId ? Number(data.communityId) : null,
      propertyTypeId: data.propertyTypeId ? Number(data.propertyTypeId) : null,
      cancellationPolicyId: data.cancellationPolicyId ? Number(data.cancellationPolicyId) : null
    }
  });

  try {
    const emailService = require('./emailService');
    emailService.notifyNewPropertyPublished(created.id, null, created.status);
  } catch (e) {
    console.error('[PROPERTY EMAIL ERROR] Trigger failed:', e.message);
  }

  return created;
}

async function updateProperty(id, data, user) {
  const existing = await prisma.property.findUnique({ where: { id } });
  if (!existing) throw new Error('Property not found');

  if (existing.hostId !== user.id && user.role !== 'ADMIN') {
    throw new Error('Unauthorized to edit this property');
  }

  const updateData = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.slug !== undefined) updateData.slug = data.slug;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.nightlyPrice !== undefined) updateData.nightlyPrice = Number(data.nightlyPrice);
  if (data.maxGuests !== undefined) updateData.maxGuests = Number(data.maxGuests);
  if (data.bedrooms !== undefined) updateData.bedrooms = Number(data.bedrooms);
  if (data.beds !== undefined) updateData.beds = Number(data.beds);
  if (data.bathrooms !== undefined) updateData.bathrooms = Number(data.bathrooms);
  if (data.status !== undefined) updateData.status = data.status;
  if (data.isFeatured !== undefined) updateData.isFeatured = data.isFeatured === 'true' || data.isFeatured === true;
  if (data.cityId !== undefined) updateData.cityId = data.cityId ? Number(data.cityId) : null;
  if (data.communityId !== undefined) updateData.communityId = data.communityId ? Number(data.communityId) : null;
  if (data.propertyTypeId !== undefined) updateData.propertyTypeId = data.propertyTypeId ? Number(data.propertyTypeId) : null;
  if (data.hostId !== undefined && user.role === 'ADMIN') updateData.hostId = data.hostId;

  const updated = await prisma.property.update({
    where: { id },
    data: updateData
  });

  try {
    const emailService = require('./emailService');
    emailService.notifyNewPropertyPublished(id, existing.status, updated.status);
  } catch (e) {
    console.error('[PROPERTY EMAIL ERROR] Trigger failed:', e.message);
  }

  return updated;
}

async function updatePropertyStatus(id, status, user) {
  const existing = await prisma.property.findUnique({ where: { id } });
  if (!existing) throw new Error('Property not found');

  if (existing.hostId !== user.id && user.role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }

  const updated = await prisma.property.update({
    where: { id },
    data: { status }
  });

  try {
    const emailService = require('./emailService');
    emailService.notifyNewPropertyPublished(id, existing.status, updated.status);
  } catch (e) {
    console.error('[PROPERTY EMAIL ERROR] Trigger failed:', e.message);
  }

  return updated;
}

async function deleteProperty(id, user, options = {}) {
  const rawMode = options?.deleteMode ?? options?.mode;
  const deleteMode = String(rawMode || 'soft').trim().toLowerCase();
  
  console.log(`[PERMANENT DELETE TRACE - SERVICE propertyService]`);
  console.log(`propertyId: ${id}`);
  console.log(`deleteMode: ${deleteMode}`);
  console.log(`service:    propertyService.deleteProperty\n`);

  if (deleteMode !== 'soft' && deleteMode !== 'permanent') {
    const error = new Error('Invalid deletion mode. Must be "soft" or "permanent"');
    error.statusCode = 400;
    throw error;
  }

  const existing = await prisma.property.findUnique({
    where: { id }
  });

  if (!existing) {
    const error = new Error('Property not found');
    error.statusCode = 404;
    throw error;
  }

  // Authorization check: host can delete their own property; ADMIN can delete any property
  if (existing.hostId !== user.id && user.role !== 'ADMIN') {
    const error = new Error('Unauthorized to delete this property');
    error.statusCode = 403;
    throw error;
  }

  // PERMANENT DELETE RESTRICTION: STRICTLY ADMIN ONLY!
  if (deleteMode === 'permanent') {
    if (user.role !== 'ADMIN') {
      const error = new Error('Forbidden: Only Administrators can permanently delete properties');
      error.statusCode = 403;
      throw error;
    }

    console.log(`[PERMANENT DELETE TRACE - SERVICE propertyService] BRANCH: PERMANENT`);
    console.log(`PERMANENT DELETE TRANSACTION STARTED`);

    // Transactional Permanent Delete
    return prisma.$transaction(async (tx) => {
      // 1. Collect message threads
      const threads = await tx.messageThread.findMany({
        where: { propertyId: id },
        select: { id: true }
      });
      const threadIds = threads.map(t => t.id);

      // 2. Delete messages inside threads
      if (threadIds.length > 0) {
        await tx.message.deleteMany({
          where: { threadId: { in: threadIds } }
        });
      }

      // 3. Delete message threads
      await tx.messageThread.deleteMany({
        where: { propertyId: id }
      });

      // 4. Delete property relations
      await tx.propertyImage.deleteMany({ where: { propertyId: id } });
      await tx.propertyAmenity.deleteMany({ where: { propertyId: id } });
      await tx.propertyFacility.deleteMany({ where: { propertyId: id } });
      await tx.propertyExtraPrice.deleteMany({ where: { propertyId: id } });
      await tx.propertyBlockedDate.deleteMany({ where: { propertyId: id } });
      await tx.favorite.deleteMany({ where: { propertyId: id } });

      // 5. Delete reviews
      await tx.review.deleteMany({ where: { propertyId: id } });

      // 6. Delete reservations & associated payments
      const reservations = await tx.reservation.findMany({
        where: { propertyId: id },
        select: { id: true }
      });
      const resIds = reservations.map(r => r.id);

      if (resIds.length > 0) {
        await tx.payment.deleteMany({
          where: { reservationId: { in: resIds } }
        });
      }

      await tx.reservation.deleteMany({
        where: { propertyId: id }
      });

      // 7. Delete Property record itself
      const deleted = await tx.property.delete({
        where: { id }
      });

      return {
        success: true,
        deleteMode: 'permanent',
        message: 'Property and all associated property data permanently deleted.',
        data: deleted
      };
    });
  }

  // SOFT DELETE MODE
  const archived = await prisma.property.update({
    where: { id },
    data: { status: 'DELETED', isFeatured: false }
  });

  return {
    success: true,
    deleteMode: 'soft',
    message: 'Property soft-deleted (archived) successfully.',
    data: archived
  };
}

async function addExtraPrice(propertyId, data, user) {
  const prop = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!prop) throw new Error('Property not found');

  if (prop.hostId !== user.id && user.role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }

  return prisma.propertyExtraPrice.create({
    data: {
      propertyId,
      name: data.name,
      price: data.price,
      priceType: data.priceType || 'per_night'
    }
  });
}

module.exports = {
  getProperties,
  getPropertyBySlug,
  getPropertyById,
  createProperty,
  updateProperty,
  updatePropertyStatus,
  deleteProperty,
  addExtraPrice
};
