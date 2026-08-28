const bcrypt = require('bcryptjs');
const crypto = require('crypto');

/**
 * WordPress phpass / bcrypt password verification helper
 */

function checkPhpassPassword(password, storedHash) {
  if (!storedHash || typeof storedHash !== 'string') return false;

  // Standard bcrypt / argon2 check
  if (storedHash.startsWith('$2a$') || storedHash.startsWith('$2y$') || storedHash.startsWith('$2b$')) {
    try {
      const normalizedHash = storedHash.replace(/^\$2y\$/, '$2a$');
      return bcrypt.compareSync(password, normalizedHash);
    } catch (e) {
      return false;
    }
  }

  // WordPress phpass check ($P$B... or $P$D...)
  if (storedHash.startsWith('$P$') || storedHash.startsWith('$H$')) {
    return checkWpPhpass(password, storedHash);
  }

  // Fallback direct match or plain md5
  const md5Hash = crypto.createHash('md5').update(password).digest('hex');
  return storedHash === password || storedHash === md5Hash;
}

function checkWpPhpass(password, storedHash) {
  const itoa64 = './0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  if (storedHash.length < 34) return false;

  const countLog2 = itoa64.indexOf(storedHash[3]);
  if (countLog2 < 7 || countLog2 > 30) return false;

  const count = 1 << countLog2;
  const salt = storedHash.substring(4, 12);
  if (salt.length < 8) return false;

  let hash = crypto.createHash('md5').update(salt + password, 'binary').digest();
  for (let i = 0; i < count; i++) {
    hash = crypto.createHash('md5').update(Buffer.concat([hash, Buffer.from(password, 'binary')])).digest();
  }

  let output = storedHash.substring(0, 12);
  output += encode64(hash, 16, itoa64);

  return output === storedHash;
}

function encode64(input, count, itoa64) {
  let output = '';
  let i = 0;
  do {
    let value = input[i++];
    output += itoa64[value & 0x3f];
    if (i < count) value |= input[i] << 8;
    output += itoa64[(value >> 6) & 0x3f];
    if (i >= count) break;
    if (i < count) value |= input[i + 1] << 16;
    output += itoa64[(value >> 12) & 0x3f];
    if (i++ >= count) break;
    output += itoa64[(value >> 18) & 0x3f];
  } while (i < count);

  return output;
}

function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

module.exports = { checkPhpassPassword, hashPassword };
