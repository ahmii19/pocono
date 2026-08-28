const fs = require('fs');
const prisma = require('../server/src/config/prisma');

async function parseExactSql() {
  const sql = fs.readFileSync('d:/AHMED PROJECTS/pocono/pocono/pocono.sql', 'utf8');

  // Parse wp_terms
  // Example: (10, 'Albrightsville', 'albrightsville', 0)
  const terms = new Map();
  const termsMatch = sql.match(/INSERT INTO `wp_terms` VALUES\s*([\s\S]*?);/);
  if (termsMatch) {
    const rawRows = termsMatch[1];
    // Split by ),(
    const tupleRegex = /\((\d+),\s*'((?:\\'|[^'])*)',\s*'((?:\\'|[^'])*)'/g;
    let m;
    while ((m = tupleRegex.exec(rawRows)) !== null) {
      terms.set(parseInt(m[1]), { id: parseInt(m[1]), name: m[2], slug: m[3] });
    }
  }
  console.log('Terms parsed:', terms.size);
  console.log('Sample terms:', Array.from(terms.values()).slice(0, 10));

  // Parse wp_term_taxonomy
  // Example: (10, 10, 'listing_city', '', 0, 0)
  const taxMap = new Map();
  const ttMatch = sql.match(/INSERT INTO `wp_term_taxonomy` VALUES\s*([\s\S]*?);/);
  if (ttMatch) {
    const rawRows = ttMatch[1];
    const tupleRegex = /\((\d+),\s*(\d+),\s*'((?:\\'|[^'])*)'/g;
    let m;
    while ((m = tupleRegex.exec(rawRows)) !== null) {
      taxMap.set(parseInt(m[1]), { ttId: parseInt(m[1]), termId: parseInt(m[2]), taxonomy: m[3] });
    }
  }
  console.log('Taxonomies parsed:', taxMap.size);

  // Parse wp_term_relationships
  // Example: (279, 10, 0)
  const postRels = [];
  const trMatch = sql.match(/INSERT INTO `wp_term_relationships` VALUES\s*([\s\S]*?);/);
  if (trMatch) {
    const rawRows = trMatch[1];
    const tupleRegex = /\((\d+),\s*(\d+),\s*\d+\)/g;
    let m;
    while ((m = tupleRegex.exec(rawRows)) !== null) {
      postRels.push({ postId: parseInt(m[1]), ttId: parseInt(m[2]) });
    }
  }
  console.log('Relationships parsed:', postRels.length);

  // Get DB cities and communities
  const dbCities = await prisma.city.findMany();
  const dbCommunities = await prisma.community.findMany();

  const citySlugToId = new Map(dbCities.map(c => [c.slug, c.id]));
  const commSlugToId = new Map(dbCommunities.map(c => [c.slug, c.id]));

  // Get DB properties
  const dbProperties = await prisma.property.findMany();

  // Match each property to cityId and communityId
  const updates = [];

  for (const prop of dbProperties) {
    // Find all relationships for this wpPostId
    const propRels = postRels.filter(r => r.postId === prop.wpPostId);
    let matchedCityId = null;
    let matchedCommId = null;

    for (const rel of propRels) {
      const tt = taxMap.get(rel.ttId);
      if (!tt) continue;
      const term = terms.get(tt.termId);
      if (!term) continue;

      if (tt.taxonomy === 'room_type' || tt.taxonomy === 'listing_city' || tt.taxonomy === 'property_city') {
        const cId = citySlugToId.get(term.slug);
        if (cId) matchedCityId = cId;
      }

      if (tt.taxonomy === 'listing_area' || tt.taxonomy === 'property_area') {
        const cmId = commSlugToId.get(term.slug);
        if (cmId) matchedCommId = cmId;
      }
    }

    updates.push({
      propertyId: prop.id,
      wpPostId: prop.wpPostId,
      title: prop.title,
      matchedCityId,
      matchedCommId
    });
  }

  console.log('\n=== MAPPED PROPERTY TAXONOMY MATCHES ===');
  updates.forEach(u => {
    console.log(`WP ID ${u.wpPostId} | ${u.title.slice(0, 30)} -> CityId: ${u.matchedCityId} | CommId: ${u.matchedCommId}`);
  });

  const cityCount = updates.filter(u => u.matchedCityId !== null).length;
  const commCount = updates.filter(u => u.matchedCommId !== null).length;

  console.log(`\nMatched Properties with City: ${cityCount} / ${dbProperties.length}`);
  console.log(`Matched Properties with Community: ${commCount} / ${dbProperties.length}`);

  return updates;
}

parseExactSql().catch(console.error).finally(() => prisma.$disconnect());
