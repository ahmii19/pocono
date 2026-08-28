const fs = require('fs');
const readline = require('readline');

/**
 * Parses MySQL dump file (pocono.sql) into clean structured in-memory JavaScript objects
 */
async function parsePoconoSql(sqlPath = 'd:/AHMED PROJECTS/pocono/pocono/pocono.sql') {
  const fileStream = fs.createReadStream(sqlPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  const rawUsers = [];
  const rawUserMeta = {}; // userId -> { key: val }
  const rawTerms = [];
  const rawTermTaxonomy = [];
  const rawTermMeta = {}; // termId -> { key: val }
  const rawPosts = [];
  const rawPostMeta = {}; // postId -> { key: val }
  const rawTermRelationships = [];
  const rawThreads = [];
  const rawThreadMessages = [];

  let currentInsertTable = '';

  for await (const line of rl) {
    if (line.startsWith('INSERT INTO `')) {
      const match = line.match(/INSERT INTO `([^`]+)`/);
      if (match) currentInsertTable = match[1];
    }

    if (currentInsertTable === 'wp_users' && line.startsWith("INSERT INTO `wp_users` VALUES")) {
      // wp_users: (ID, user_login, user_pass, user_nicename, user_email, user_url, user_registered, user_activation_key, user_status, display_name)
      const matches = Array.from(line.matchAll(/VALUES \('(\d+)','([^']+)','([^']+)','([^']+)','([^']+)','([^']*)','([^']+)','([^']*)','(\d+)','([^']*)'\);$/g));
      matches.forEach(m => {
        rawUsers.push({
          id: parseInt(m[1], 10),
          login: m[2],
          pass: m[3],
          nicename: m[4],
          email: m[5],
          url: m[6],
          registered: m[7],
          displayName: m[10]
        });
      });
    }

    if (currentInsertTable === 'wp_usermeta' && line.startsWith("INSERT INTO `wp_usermeta` VALUES")) {
      // wp_usermeta: (umeta_id, user_id, meta_key, meta_value)
      const matches = Array.from(line.matchAll(/VALUES \('\d+','(\d+)','([^']+)','([\s\S]*?)'\);$/g));
      matches.forEach(m => {
        const uid = parseInt(m[1], 10);
        const key = m[2];
        const val = m[3];
        if (!rawUserMeta[uid]) rawUserMeta[uid] = {};
        rawUserMeta[uid][key] = val;
      });
    }

    if (currentInsertTable === 'wp_terms' && line.startsWith("INSERT INTO `wp_terms` VALUES")) {
      // wp_terms: (term_id, name, slug, term_group)
      const matches = Array.from(line.matchAll(/VALUES \('(\d+)','([^']+)','([^']+)','\d+'\);$/g));
      matches.forEach(m => {
        rawTerms.push({
          id: parseInt(m[1], 10),
          name: m[2],
          slug: m[3]
        });
      });
    }

    if (currentInsertTable === 'wp_term_taxonomy' && line.startsWith("INSERT INTO `wp_term_taxonomy` VALUES")) {
      // wp_term_taxonomy: (term_taxonomy_id, term_id, taxonomy, description, parent, count)
      const matches = Array.from(line.matchAll(/VALUES \('(\d+)','(\d+)','([^']+)','([\s\S]*?)','(\d+)','(\d+)'\);$/g));
      matches.forEach(m => {
        rawTermTaxonomy.push({
          ttId: parseInt(m[1], 10),
          termId: parseInt(m[2], 10),
          taxonomy: m[3],
          description: m[4],
          parent: parseInt(m[5], 10),
          count: parseInt(m[6], 10)
        });
      });
    }

    if (currentInsertTable === 'wp_termmeta' && line.startsWith("INSERT INTO `wp_termmeta` VALUES")) {
      const matches = Array.from(line.matchAll(/VALUES \('\d+','(\d+)','([^']+)','([\s\S]*?)'\);$/g));
      matches.forEach(m => {
        const tid = parseInt(m[1], 10);
        if (!rawTermMeta[tid]) rawTermMeta[tid] = {};
        rawTermMeta[tid][m[2]] = m[3];
      });
    }

    if (currentInsertTable === 'wp_posts' && line.startsWith("INSERT INTO `wp_posts` VALUES")) {
      // wp_posts: (ID, post_author, post_date, post_date_gmt, post_content, post_title, post_excerpt, post_status, comment_status, ping_status, post_password, post_name, to_ping, pinged, post_modified, post_modified_gmt, post_content_filtered, post_parent, guid, menu_order, post_type, post_mime_type, comment_count)
      const matches = Array.from(line.matchAll(/^INSERT INTO `wp_posts` VALUES \('(\d+)','(\d+)','([^']+)','([^']+)','([\s\S]*?)','([^']*)','([\s\S]*?)','([^']+)','[^']*','[^']*','[^']*','([^']*)','[^']*','[^']*','([^']+)','([^']+)','[^']*','(\d+)','([^']*)','\d+','([^']+)','([^']*)','\d+'\);$/g));
      matches.forEach(m => {
        rawPosts.push({
          id: parseInt(m[1], 10),
          authorId: parseInt(m[2], 10),
          date: m[3],
          content: m[5],
          title: m[6],
          excerpt: m[7],
          status: m[8],
          slug: m[9],
          modified: m[10],
          parentId: parseInt(m[12], 10),
          guid: m[13],
          postType: m[14],
          mimeType: m[15]
        });
      });
    }

    if (currentInsertTable === 'wp_postmeta' && line.startsWith("INSERT INTO `wp_postmeta` VALUES")) {
      // wp_postmeta: (meta_id, post_id, meta_key, meta_value)
      const matches = Array.from(line.matchAll(/^INSERT INTO `wp_postmeta` VALUES \('\d+','(\d+)','([^']+)','([\s\S]*)'\);$/g));
      matches.forEach(m => {
        const pid = parseInt(m[1], 10);
        const key = m[2];
        const val = m[3];
        if (!rawPostMeta[pid]) rawPostMeta[pid] = {};
        rawPostMeta[pid][key] = val;
      });
    }

    if (currentInsertTable === 'wp_term_relationships' && line.startsWith("INSERT INTO `wp_term_relationships` VALUES")) {
      // wp_term_relationships: (object_id, term_taxonomy_id, term_order)
      const matches = Array.from(line.matchAll(/\('(\d+)','(\d+)','\d+'\)/g));
      matches.forEach(m => {
        rawTermRelationships.push({
          objectId: parseInt(m[1], 10),
          ttId: parseInt(m[2], 10)
        });
      });
    }

    if (currentInsertTable === 'wp_homey_threads' && line.startsWith("INSERT INTO `wp_homey_threads` VALUES")) {
      // wp_homey_threads: (id, listing_id, sender_id, receiver_id, seen, created_at)
      const matches = Array.from(line.matchAll(/VALUES \('(\d+)','(\d+)','(\d+)','(\d+)','\d+','([^']+)'\);$/g));
      matches.forEach(m => {
        rawThreads.push({
          id: parseInt(m[1], 10),
          listingId: parseInt(m[2], 10),
          senderId: parseInt(m[3], 10),
          receiverId: parseInt(m[4], 10),
          createdAt: m[5]
        });
      });
    }

    if (currentInsertTable === 'wp_homey_thread_messages' && line.startsWith("INSERT INTO `wp_homey_thread_messages` VALUES")) {
      // wp_homey_thread_messages: (id, thread_id, sender_id, message, created_at)
      const matches = Array.from(line.matchAll(/VALUES \('(\d+)','(\d+)','(\d+)','([\s\S]*?)','([^']+)'\);$/g));
      matches.forEach(m => {
        rawThreadMessages.push({
          id: parseInt(m[1], 10),
          threadId: parseInt(m[2], 10),
          senderId: parseInt(m[3], 10),
          message: m[4],
          createdAt: m[5]
        });
      });
    }
  }

  return {
    rawUsers,
    rawUserMeta,
    rawTerms,
    rawTermTaxonomy,
    rawTermMeta,
    rawPosts,
    rawPostMeta,
    rawTermRelationships,
    rawThreads,
    rawThreadMessages
  };
}

module.exports = { parsePoconoSql };
