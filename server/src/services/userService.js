const prisma = require('../config/prisma');

async function updateProfile(userId, data) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      bio: data.bio,
      avatarUrl: data.avatarUrl
    },
    select: { id: true, email: true, firstName: true, lastName: true, phone: true, role: true, avatarUrl: true, bio: true }
  });
}

async function getHostProfile(hostId) {
  const host = await prisma.user.findUnique({
    where: { id: hostId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
      bio: true,
      createdAt: true,
      properties: {
        where: { status: 'PUBLISHED' },
        select: {
          id: true,
          title: true,
          slug: true,
          nightlyPrice: true,
          bedrooms: true,
          bathrooms: true,
          maxGuests: true,
          images: { take: 1, orderBy: { displayOrder: 'asc' } }
        }
      }
    }
  });

  if (!host) throw new Error('Host not found');
  return host;
}

module.exports = { updateProfile, getHostProfile };
