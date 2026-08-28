const prisma = require('../config/prisma');

async function getCities() {
  return prisma.city.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { properties: true } } }
  });
}

async function getCommunities() {
  return prisma.community.findMany({
    orderBy: { name: 'asc' },
    include: { city: true, _count: { select: { properties: true } } }
  });
}

async function getPropertyTypes() {
  return prisma.propertyType.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { properties: true } } }
  });
}

async function getAmenities() {
  return prisma.amenity.findMany({
    orderBy: { name: 'asc' }
  });
}

async function getFacilities() {
  return prisma.facility.findMany({
    orderBy: { name: 'asc' }
  });
}

module.exports = { getCities, getCommunities, getPropertyTypes, getAmenities, getFacilities };
