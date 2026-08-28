const fs = require('fs');
const readline = require('readline');
const prisma = require('../server/src/config/prisma');

async function parseWpPostTerms() {
  const sqlPath = 'd:/AHMED PROJECTS/pocono/pocono/pocono.sql';
  const fileStream = fs.createReadStream(sqlPath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  const terms = new Map(); // term_id -> { id, name, slug }
  const taxMap = new Map(); // term_taxonomy_id -> { termId, taxonomy }
  const postMeta = new Map(); // postId -> { city, area, address }
  const postRelationships = []; // { postId, ttId }

  for await (const line of rl) {
    if (line.includes('INSERT INTO `wp_terms` VALUES')) {
      // (10, 'Albrightsville', 'albrightsville', 0)
      const matches = line.matchAll(/\((\d+),\s*'([^']*)',\s*'([^']*)',/g);
      for (const m of matches) {
        terms.set(parseInt(m[1]), { id: parseInt(m[1]), name: m[2], slug: m[3] });
      }
    } else if (line.includes('INSERT INTO `wp_term_taxonomy` VALUES')) {
      // (10, 10, 'listing_city', '', 0, 0)
      const matches = line.matchAll(/\((\d+),\s*(\d+),\s*'([^']*)',/g);
      for (const m of matches) {
        taxMap.set(parseInt(m[1]), { ttId: parseInt(m[1]), termId: parseInt(m[2]), taxonomy: m[3] });
      }
    } else if (line.includes('INSERT INTO `wp_term_relationships` VALUES')) {
      // (279, 10, 0)
      const matches = line.matchAll(/\((\d+),\s*(\d+),\s*\d+\)/g);
      for (const m of matches) {
        postRelationships.push({ postId: parseInt(m[1]), ttId: parseInt(m[2]) });
      }
    } else if (line.includes('INSERT INTO `wp_postmeta` VALUES')) {
      // (meta_id, post_id, meta_key, meta_value)
      const matches = line.matchAll(/\(\d+,\s*(\d+),\s*'([^']*)',\s*'([^']*)'\)/g);
      for (const m of matches) {
        const postId = parseInt(m[1]);
        const key = m[2];
        const val = m[3];
        if (!postMeta.has(postId)) postMeta.set(postId, {});
        const meta = postMeta.get(postId);
        if (key.includes('city') || key.includes('area') || key.includes('address') || key.includes('zip')) {
          meta[key] = val;
        }
      }
    }
  }

  console.log('=== PARSED TERMS ===', terms.size);
  console.log('=== PARSED TAXONOMIES ===', taxMap.size);
  console.log('=== PARSED POST RELATIONSHIPS ===', postRelationships.length);

  // Group relationships by taxonomy
  const postTaxonomyMap = new Map(); // postId -> { cities: [], areas: [] }
  postRelationships.forEach(rel => {
    const tt = taxMap.get(rel.ttId);
    if (!tt) return;
    const term = terms.get(tt.termId);
    if (!term) return;

    if (!postTaxonomyMap.has(rel.postId)) {
      postTaxonomyMap.set(rel.postId, { cities: [], areas: [] });
    }
    const record = postTaxonomyMap.get(rel.postId);
    if (tt.taxonomy === 'room_type' || tt.taxonomy === 'listing_city' || tt.taxonomy === 'property_city') {
      record.cities.push(term);
    }
    if (tt.taxonomy === 'listing_area' || tt.taxonomy === 'property_area') {
      record.areas.push(term);
    }
  });

  // Get current DB properties
  const dbProperties = await prisma.property.findMany({
    select: { id: true, wpPostId: true, title: true, cityId: true, communityId: true }
  });

  const dbCities = await prisma.city.findMany();
  const dbCommunities = await prisma.community.findMany();

  const citySlugMap = new Map(dbCities.map(c => [c.slug, c.id]));
  const commSlugMap = new Map(dbCommunities.map(c => [c.slug, c.id]));

  console.log('\n=== CHECKING PROPERTY TO TAXONOMY MATCHES ===');
  let matchCityCount = 0;
  let matchCommCount = 0;

  dbProperties.forEach(p => {
    const rels = postTaxonomyMap.get(p.wpPostId);
    const meta = postMeta.get(p.wpPostId);

    const cityTerm = rels?.cities?.[0];
    const commTerm = rels?.areas?.[0];

    const matchedCityId = cityTerm ? citySlugMap.get(cityTerm.slug) : null;
    const matchedCommId = commTerm ? commSlugMap.get(commTerm.slug) : null;

    if (matchedCityId) matchCityCount++;
    if (matchedCommId) matchCommCount++;

    console.log(`Property WP ID ${p.wpPostId} "${p.title.slice(0, 30)}":`);
    console.log(`  -> City Term: ${cityTerm?.name || 'NONE'} (ID: ${matchedCityId})`);
    console.log(`  -> Comm Term: ${commTerm?.name || 'NONE'} (ID: ${matchedCommId})`);
  });

  console.log('\nTotal Matched Cities:', matchCityCount);
  console.log('Total Matched Communities:', matchCommCount);
}

parseWpPostTerms().catch(console.error).finally(() => prisma.$disconnect());
