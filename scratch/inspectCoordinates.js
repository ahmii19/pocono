const prisma = require('../server/src/config/prisma');

async function checkCoords() {
  const props = await prisma.property.findMany({
    select: { id: true, title: true, address: true, city: true, community: true, latitude: true, longitude: true }
  });

  console.log(`Total Properties in DB: ${props.length}`);
  const withCoords = props.filter(p => p.latitude !== null && p.longitude !== null);
  console.log(`Properties with non-null coordinates: ${withCoords.length}`);

  props.slice(0, 10).forEach(p => {
    console.log(`[${p.title}] Address: "${p.address}" | City: ${p.city?.name} | Lat: ${p.latitude} | Lng: ${p.longitude}`);
  });
}

checkCoords().catch(console.error).finally(() => prisma.$disconnect());
