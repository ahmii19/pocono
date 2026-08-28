const prisma = require('../server/src/config/prisma');

async function inspectProperties() {
  const properties = await prisma.property.findMany({
    take: 10,
    select: {
      id: true,
      wpPostId: true,
      title: true,
      cityId: true,
      communityId: true,
      address: true,
      city: { select: { id: true, name: true } },
      community: { select: { id: true, name: true } }
    }
  });

  console.log('Sample properties from PostgreSQL:', JSON.stringify(properties, null, 2));

  const allProps = await prisma.property.findMany({
    select: { id: true, cityId: true, communityId: true }
  });
  console.log('Total properties in DB:', allProps.length);
  console.log('Non-null cityId count:', allProps.filter(p => p.cityId !== null).length);
  console.log('Non-null communityId count:', allProps.filter(p => p.communityId !== null).length);
}

inspectProperties()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
