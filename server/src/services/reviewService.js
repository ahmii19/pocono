const prisma = require('../config/prisma');

async function getPropertyReviews(propertyId) {
  return prisma.review.findMany({
    where: { propertyId },
    orderBy: { createdAt: 'desc' },
    include: {
      guest: { select: { id: true, firstName: true, avatarUrl: true } }
    }
  });
}

async function createReview(data, guestId) {
  const rating = Number(data.rating);
  if (rating < 1 || rating > 5) {
    throw new Error('Rating must be between 1 and 5');
  }

  const review = await prisma.review.create({
    data: {
      propertyId: data.propertyId,
      reservationId: data.reservationId || null,
      guestId,
      rating,
      comment: data.comment
    }
  });

  // Recalculate average rating & review count for property
  const agg = await prisma.review.aggregate({
    where: { propertyId: data.propertyId },
    _avg: { rating: true },
    _count: { id: true }
  });

  await prisma.property.update({
    where: { id: data.propertyId },
    data: {
      averageRating: agg._avg.rating || 0.00,
      reviewCount: agg._count.id || 0
    }
  });

  return review;
}

module.exports = { getPropertyReviews, createReview };
