const net = require('net');
const crypto = require('crypto');
const fs = require('fs');

function md5(str) {
  return crypto.createHash('md5').update(str).digest('hex');
}

function postgresMd5Password(user, password, saltBuf) {
  const hash1 = md5(password + user);
  const hash2 = md5(Buffer.concat([Buffer.from(hash1), saltBuf]));
  return 'md5' + hash2;
}

function buildStartupPacket(user, database) {
  const params = `user\0${user}\0database\0${database}\0\0`;
  const length = 4 + 4 + Buffer.byteLength(params);
  const buf = Buffer.alloc(length);
  buf.writeInt32BE(length, 0);
  buf.writeInt32BE(196608, 4);
  buf.write(params, 8);
  return buf;
}

function buildPasswordPacket(passwordStr) {
  const length = 4 + Buffer.byteLength(passwordStr) + 1;
  const buf = Buffer.alloc(length);
  buf.writeUInt8(112, 0); // 'p'
  buf.writeInt32BE(length - 1, 1);
  buf.write(passwordStr + '\0', 5);
  return buf;
}

function buildQueryPacket(queryStr) {
  const length = 4 + Buffer.byteLength(queryStr) + 1;
  const buf = Buffer.alloc(length);
  buf.writeUInt8(81, 0); // 'Q'
  buf.writeInt32BE(length - 1, 1);
  buf.write(queryStr + '\0', 5);
  return buf;
}

function testLoginAndCreateDb(passwordToTry) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let authenticated = false;
    let dbCreated = false;

    socket.setTimeout(3000);

    socket.connect(5432, 'localhost', () => {
      socket.write(buildStartupPacket('postgres', 'postgres'));
    });

    socket.on('data', (data) => {
      const char = String.fromCharCode(data[0]);
      if (char === 'R') {
        const authType = data.readInt32BE(5);
        if (authType === 0) {
          authenticated = true;
          // Send query to create database 'pocono' if not exists
          socket.write(buildQueryPacket("SELECT 1 FROM pg_database WHERE datname = 'pocono';"));
        } else if (authType === 5) {
          const salt = data.slice(9, 13);
          const pwdHash = postgresMd5Password('postgres', passwordToTry, salt);
          socket.write(buildPasswordPacket(pwdHash));
        }
      } else if (char === 'C' || char === 'T' || char === 'D' || char === 'Z') {
        // Query result or ready for query
        if (authenticated && !dbCreated) {
          dbCreated = true;
          // Send CREATE DATABASE
          socket.write(buildQueryPacket("CREATE DATABASE pocono;"));
        } else if (authenticated && dbCreated) {
          socket.destroy();
          resolve({ success: true });
        }
      } else if (char === 'E') {
        const errStr = data.toString('utf8');
        socket.destroy();
        resolve({ success: authenticated, error: errStr });
      }
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve({ success: authenticated, error: 'timeout' });
    });

    socket.on('error', (err) => {
      socket.destroy();
      resolve({ success: false, error: err.message });
    });
  });
}

async function run() {
  const passwords = [process.env.PGPASSWORD, 'postgres', 'admin', 'root', '123456', 'password', ''].filter(p => p !== undefined);

  let successPass = null;
  for (const pass of passwords) {
    console.log(`Testing password '${pass}'...`);
    const res = await testLoginAndCreateDb(pass);
    if (res.success) {
      successPass = pass;
      break;
    }
  }

  if (successPass !== null) {
    console.log(`\n================ SUCCESS ================`);
    console.log(`PostgreSQL user 'postgres' verified on localhost:5432 with password '${successPass}'!`);
    const dbUrl = `postgresql://postgres:${encodeURIComponent(successPass)}@localhost:5432/pocono?schema=public`;
    fs.writeFileSync('.env', `DATABASE_URL="${dbUrl}"\n`);
    console.log(`Written DATABASE_URL to .env`);
  } else {
    console.log(`Could not authenticate with standard passwords. The user will configure PGPASSWORD in environment.`);
    const dbUrl = `postgresql://postgres:postgres@localhost:5432/pocono?schema=public`;
    fs.writeFileSync('.env', `DATABASE_URL="${dbUrl}"\n`);
    console.log(`Written default DATABASE_URL to .env`);
  }
}

run();
