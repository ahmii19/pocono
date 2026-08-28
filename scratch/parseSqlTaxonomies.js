const fs = require('fs');
const readline = require('readline');
const prisma = require('../server/src/config/prisma');

async function parseSqlLineByLine() {
  const sqlPath = 'd:/AHMED PROJECTS/pocono/pocono/pocono.sql';
  const fileStream = fs.createReadStream(sqlPath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  const terms = new Map(); // term_id -> { name, slug }
  const taxMap = new Map(); // term_taxonomy_id -> { taxonomy, termId }
  const postTaxonomies = []; // { postId, term_taxonomy_id }

  for await (const line of rl) {
    if (line.startsWith('INSERT INTO `wp_terms`')) {
      const matches = line.matchAll(/\((\d+),\s*'([^']*)',\s*'([^']*)',/g);
      for (const m of matches) {
        terms.set(parseInt(m[1]), { name: m[2], slug: m[3] });
      }
    } else if (line.startsWith('INSERT INTO `wp_term_taxonomy`')) {
      const matches = line.matchAll(/\((\d+),\s*(\d+),\s*'([^']*)',/g);
      for (const m of matches) {
        taxMap.set(parseInt(m[1]), { termId: parseInt(m[2]), taxonomy: m[3] });
      }
    } else if (line.startsWith('INSERT INTO `wp_term_relationships`')) {
      const matches = line.matchAll(/\((\d+),\s*(\d+),\s*\d+\)/g);
      for (const m of matches) {
        postTaxonomies.push({ postId: parseInt(m[1]), ttId: parseInt(m[2]) });
      }
    }
  }

  console.log('Parsed Terms Count:', terms.size);
  console.log('Parsed Taxonomies Count:', taxMap.size);
  console.log('Parsed Post Relationships Count:', postTaxonomies.length);

  // Map post relationships to cities and communities
  const postCityMap = new Map(); // wpPostId -> cityId
  const postCommMap = new Map(); // wpPostId -> communityId

  // Get cities and communities from DB
  const dbCities = await prisma.city.findMany();
  const dbCommunities = await prisma.community.findMany();

  const citySlugToId = new Map(dbCities.map(c => [c.slug, c.id]));
  const commSlugToId = new Map(dbCommunities.map(c => [c.slug, c.id]));

  for (const rel of postTaxonomies) {
    const tt = taxMap.get(rel.ttId);
    if (!tt) continue;

    const term = terms.get(tt.termId);
    if (!term) continue;

    if (tt.taxonomy === 'room_type' || tt.taxonomy === 'listing_city') {
      const cityId = citySlugToId.get(term.slug);
      if (cityId) {
        postCityMap.set(rel.postId, cityId);
      }
    }

    if (tt.taxonomy === 'listing_area' || tt.taxonomy === 'property_area') {
      const commId = commSlugToId.get(term.slug);
      if (commId) {
        postCommMap.set(rel.postId, commId);
      }
    }
  }

  console.log('\n=== MAPPED CITY RELATIONSHIPS PER WP POST ===');
  console.log('Properties mapped to Cities:', postCityMap.size);
  console.log(Array.from(postCityMap.entries()));

  console.log('\n=== MAPPED COMMUNITY RELATIONSHIPS PER WP POST ===');
  console.log('Properties mapped to Communities:', postCommMap.size);
  console.log(Array.from(postCommMap.entries()));

  return { postCityMap, postCommMap };
}

parseSqlLineByLine().catch(console.error).finally(() => prisma.$disconnect());
