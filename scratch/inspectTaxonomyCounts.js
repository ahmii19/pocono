const prisma = require('../server/src/config/prisma');
const taxonomyService = require('../server/src/services/taxonomyService');

async function inspect() {
  console.log('=== 1. POSTGRESQL PROPERTY COUNTS BY CITY ===');
  const propertiesWithCity = await prisma.property.findMany({
    select: { id: true, title: true, cityId: true, communityId: true, status: true }
  });
  console.log('Total Properties in DB:', propertiesWithCity.length);

  const cityCounts = {};
  const commCounts = {};
  propertiesWithCity.forEach(p => {
    if (p.cityId) cityCounts[p.cityId] = (cityCounts[p.cityId] || 0) + 1;
    if (p.communityId) commCounts[p.communityId] = (commCounts[p.communityId] || 0) + 1;
  });
  console.log('Property counts by cityId:', cityCounts);
  console.log('Property counts by communityId:', commCounts);

  console.log('\n=== 2. TAXONOMY SERVICE GET CITIES OUTPUT ===');
  const cities = await taxonomyService.getCities();
  console.log('Cities count:', cities.length);
  console.log('Sample city output:', JSON.stringify(cities[0], null, 2));

  console.log('\n=== 3. TAXONOMY SERVICE GET COMMUNITIES OUTPUT ===');
  const communities = await taxonomyService.getCommunities();
  console.log('Communities count:', communities.length);
  console.log('Sample community output:', JSON.stringify(communities[0], null, 2));
}

inspect()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
