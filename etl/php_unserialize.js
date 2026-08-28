/**
 * Lightweight PHP Unserialize helper for Homey serialized meta fields
 */
function phpUnserialize(str) {
  if (!str || typeof str !== 'string') return null;

  try {
    // If it's pure JSON string accidentally
    if (str.startsWith('{') || str.startsWith('[')) {
      return JSON.parse(str);
    }

    // Unserialize simple key-value pairs from PHP array format
    // Matches s:key_len:"key_name";s:val_len:"val_name"; or i:key;d:val; etc.
    const result = {};

    // Match string key-value pairs: s:len:"key";s:len:"val";
    const strKvRegex = /s:\d+:"([^"]+)";s:\d+:"([^"]*)";/g;
    let m;
    while ((m = strKvRegex.exec(str)) !== null) {
      result[m[1]] = m[2];
    }

    // Match string key to int/double val: s:len:"key";[id]:val;
    const numKvRegex = /s:\d+:"([^"]+)";[id]:([0-9.]+);/g;
    while ((m = numKvRegex.exec(str)) !== null) {
      result[m[1]] = parseFloat(m[2]);
    }

    // Match string key to array val or nested
    if (Object.keys(result).length > 0) {
      return result;
    }

    // For simple string arrays e.g. a:2:{i:0;s:5:"Venmo";i:1;s:5:"Zelle";}
    const listMatches = Array.from(str.matchAll(/s:\d+:"([^"]+)";/g)).map(m => m[1]);
    if (listMatches.length > 0) {
      return listMatches;
    }

    return null;
  } catch (e) {
    return null;
  }
}

module.exports = { phpUnserialize };
