const fs = require('fs');

async function checkSqlTaxonomies() {
  const sqlPath = 'd:/AHMED PROJECTS/pocono/pocono/pocono.sql';
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('Searching pocono.sql for term relationships and taxonomy terms...');

  // Map terms
  const terms = new Map();
  const termRegex = /INSERT INTO `wp_terms` VALUES \s*(.*?);/s;
  const termMatch = termRegex.exec(sql);
  if (termMatch) {
    const rows = termMatch[1].split(/\),\s*\(/);
    rows.forEach(row => {
      const parts = row.replace(/^\(/, '').replace(/\)$/, '').split(',');
      if (parts.length >= 3) {
        const id = parseInt(parts[0].trim());
        const name = parts[1].trim().replace(/^'|'$/g, '');
        const slug = parts[2].trim().replace(/^'|'$/g, '');
        terms.set(id, { id, name, slug });
      }
    });
  }
  console.log('Total terms parsed:', terms.size);

  // Map term_taxonomy
  const ttMap = new Map();
  const ttRegex = /INSERT INTO `wp_term_taxonomy` VALUES \s*(.*?);/s;
  const ttMatch = ttRegex.exec(sql);
  if (ttMatch) {
    const rows = ttMatch[1].split(/\),\s*\(/);
    rows.forEach(row => {
      const parts = row.replace(/^\(/, '').replace(/\)$/, '').split(',');
      if (parts.length >= 3) {
        const ttId = parseInt(parts[0].trim());
        const termId = parseInt(parts[1].trim());
        const taxonomy = parts[2].trim().replace(/^'|'$/g, '');
        const term = terms.get(termId);
        ttMap.set(ttId, { ttId, termId, taxonomy, name: term?.name, slug: term?.slug });
      }
    });
  }
  console.log('Total term_taxonomies parsed:', ttMap.size);

  // Map term_relationships
  const relationships = [];
  const trRegex = /INSERT INTO `wp_term_relationships` VALUES \s*(.*?);/s;
  const trMatch = trRegex.exec(sql);
  if (trMatch) {
    const rows = trMatch[1].split(/\),\s*\(/);
    rows.forEach(row => {
      const parts = row.replace(/^\(/, '').replace(/\)$/, '').split(',');
      if (parts.length >= 2) {
        const objectId = parseInt(parts[0].trim());
        const ttId = parseInt(parts[1].trim());
        const tt = ttMap.get(ttId);
        if (tt && (tt.taxonomy === 'room_type' || tt.taxonomy === 'listing_city' || tt.taxonomy === 'listing_area' || tt.taxonomy === 'property_city' || tt.taxonomy === 'property_area')) {
          relationships.push({ postId: objectId, taxonomy: tt.taxonomy, termId: tt.termId, name: tt.name, slug: tt.slug });
        }
      }
    });
  }
  console.log('Found listing city/area relationships in SQL:', relationships.length);
  console.log('Sample relationships:', JSON.stringify(relationships.slice(0, 15), null, 2));
}

checkSqlTaxonomies().catch(console.error);
