const taxonomyService = require('../server/src/services/taxonomyService');
const prisma = require('../server/src/config/prisma');

async function printAll() {
  const cities = await taxonomyService.getCities();
  console.log('=== ALL 16 CITIES & PROPERTY COUNTS ===');
  cities.forEach(c => {
    console.log(`City ID ${c.id} | ${c.name} (${c.slug}): ${c._count?.properties || 0} Properties`);
  });

  const communities = await taxonomyService.getCommunities();
  console.log('\n=== ALL 16 COMMUNITIES & PROPERTY COUNTS ===');
  communities.forEach(c => {
    console.log(`Community ID ${c.id} | ${c.name} (${c.slug}): ${c._count?.properties || 0} Properties`);
  });
}

printAll().catch(console.error).finally(() => prisma.$disconnect());
