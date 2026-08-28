const fs = require('fs');
const readline = require('readline');
const prisma = require('../server/src/config/prisma');

async function linkProperties() {
  const sqlPath = 'd:/AHMED PROJECTS/pocono/pocono/pocono.sql';
  const fileStream = fs.createReadStream(sqlPath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  const terms = new Map(); // termId -> { id, name, slug }
  const taxMap = new Map(); // ttId -> { ttId, termId, taxonomy }
  const postRelationships = []; // { postId, ttId }

  for await (const line of rl) {
    if (line.startsWith('INSERT INTO `wp_terms` VALUES')) {
      // INSERT INTO `wp_terms` VALUES ('847','Main Nav','main-nav','0');
      const m = line.match(/VALUES \('(\d+)','([^']*)','([^']*)',/);
      if (m) {
        terms.set(parseInt(m[1]), { id: parseInt(m[1]), name: m[2], slug: m[3] });
      }
    } else if (line.startsWith('INSERT INTO `wp_term_taxonomy` VALUES')) {
      // INSERT INTO `wp_term_taxonomy` VALUES ('847','847','nav_menu','','0','1');
      const m = line.match(/VALUES \('(\d+)','(\d+)','([^']*)',/);
      if (m) {
        taxMap.set(parseInt(m[1]), { ttId: parseInt(m[1]), termId: parseInt(m[2]), taxonomy: m[3] });
      }
    } else if (line.startsWith('INSERT INTO `wp_term_relationships` VALUES')) {
      // INSERT INTO `wp_term_relationships` VALUES ('279','847','0');
      const m = line.match(/VALUES \('(\d+)','(\d+)','\d+'\);/);
      if (m) {
        postRelationships.push({ postId: parseInt(m[1]), ttId: parseInt(m[2]) });
      }
    }
  }

  console.log('=== PARSED SQL DATA ===');
  console.log('Terms:', terms.size);
  console.log('Taxonomies:', taxMap.size);
  console.log('Post Relationships:', postRelationships.length);

  // Group terms by post
  const postTaxonomies = new Map(); // wpPostId -> { citySlugs: [], areaSlugs: [] }
  postRelationships.forEach(rel => {
    const tt = taxMap.get(rel.ttId);
    if (!tt) return;
    const term = terms.get(tt.termId);
    if (!term) return;

    if (!postTaxonomies.has(rel.postId)) {
      postTaxonomies.set(rel.postId, { citySlugs: [], areaSlugs: [] });
    }
    const rec = postTaxonomies.get(rel.postId);
    if (tt.taxonomy === 'room_type' || tt.taxonomy === 'listing_city' || tt.taxonomy === 'property_city') {
      rec.citySlugs.push(term.slug);
    }
    if (tt.taxonomy === 'listing_area' || tt.taxonomy === 'property_area') {
      rec.areaSlugs.push(term.slug);
    }
  });

  // Get PostgreSQL Cities, Communities, and Properties
  const dbCities = await prisma.city.findMany();
  const dbCommunities = await prisma.community.findMany();
  const dbProperties = await prisma.property.findMany();

  const citySlugToId = new Map(dbCities.map(c => [c.slug, c.id]));
  const commSlugToId = new Map(dbCommunities.map(c => [c.slug, c.id]));

  console.log('\n=== MATCHING POSTGRESQL PROPERTIES TO TAXONOMIES ===');

  let updatedCityCount = 0;
  let updatedCommCount = 0;

  for (const prop of dbProperties) {
    const taxInfo = postTaxonomies.get(prop.wpPostId);
    let targetCityId = null;
    let targetCommId = null;

    if (taxInfo) {
      for (const slug of taxInfo.citySlugs) {
        if (citySlugToId.has(slug)) {
          targetCityId = citySlugToId.get(slug);
          break;
        }
      }
      for (const slug of taxInfo.areaSlugs) {
        if (commSlugToId.has(slug)) {
          targetCommId = commSlugToId.get(slug);
          break;
        }
      }
    }

    if (targetCityId || targetCommId) {
      await prisma.property.update({
        where: { id: prop.id },
        data: {
          ...(targetCityId ? { cityId: targetCityId } : {}),
          ...(targetCommId ? { communityId: targetCommId } : {})
        }
      });
      if (targetCityId) updatedCityCount++;
      if (targetCommId) updatedCommCount++;
    }

    console.log(`WP ID ${prop.wpPostId} | "${prop.title.slice(0, 30)}" -> CityId: ${targetCityId || 'NONE'} | CommId: ${targetCommId || 'NONE'}`);
  }

  console.log(`\n==================================================`);
  console.log(`TAXONOMY LINKAGE COMPLETED`);
  console.log(`Properties Linked to Cities: ${updatedCityCount} / ${dbProperties.length}`);
  console.log(`Properties Linked to Communities: ${updatedCommCount} / ${dbProperties.length}`);
  console.log(`==================================================\n`);
}

linkProperties()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
