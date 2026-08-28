const prisma = require('../config/prisma');

async function getFavorites(userId) {
  const favorites = await prisma.favorite.findMany({
    where: { userId },
    include: {
      property: {
        include: {
          city: true,
          community: true,
          images: { take: 1, orderBy: { displayOrder: 'asc' } }
        }
      }
    }
  });
  return favorites.map(f => f.property);
}

async function addFavorite(userId, propertyId) {
  const prop = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!prop) throw new Error('Property not found');

  return prisma.favorite.upsert({
    where: { userId_propertyId: { userId, propertyId } },
    update: {},
    create: { userId, propertyId }
  });
}

async function removeFavorite(userId, propertyId) {
  return prisma.favorite.delete({
    where: { userId_propertyId: { userId, propertyId } }
  });
}

module.exports = { getFavorites, addFavorite, removeFavorite };
