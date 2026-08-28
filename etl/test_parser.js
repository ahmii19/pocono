const { parsePoconoSql } = require('./sql_parser');

async function test() {
  console.log('Testing SQL Parser...');
  const data = await parsePoconoSql();
  console.log(`Users count: ${data.rawUsers.length}`);
  console.log(`UserMeta count: ${Object.keys(data.rawUserMeta).length}`);
  console.log(`Terms count: ${data.rawTerms.length}`);
  console.log(`TermTaxonomy count: ${data.rawTermTaxonomy.length}`);
  console.log(`Posts count: ${data.rawPosts.length}`);
  console.log(`PostMeta count: ${Object.keys(data.rawPostMeta).length}`);
  console.log(`TermRelationships count: ${data.rawTermRelationships.length}`);
  console.log(`Threads count: ${data.rawThreads.length}`);
  console.log(`ThreadMessages count: ${data.rawThreadMessages.length}`);
}

test();
