const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const dumpPath = path.join(__dirname, 'pocono_backup_before_etl.dump');
console.log('Running PostgreSQL backup to:', dumpPath);

const pgDumpExe = 'C:\\Program Files\\PostgreSQL\\18\\bin\\pg_dump.exe';

const child = spawn(pgDumpExe, [
  '-h', 'localhost',
  '-U', 'postgres',
  '-d', 'pocono',
  '-F', 'c',
  '-b',
  '-v',
  '-f', dumpPath
], {
  env: { ...process.env, PGPASSWORD: 'postgres' }
});

child.stdout.on('data', (data) => {
  console.log(data.toString());
});

child.stderr.on('data', (data) => {
  console.log(data.toString());
});

child.on('close', (code) => {
  console.log(`pg_dump process exited with code ${code}`);
  if (code === 0 && fs.existsSync(dumpPath)) {
    const stats = fs.statSync(dumpPath);
    console.log(`[SUCCESS] Backup file created successfully! Size: ${stats.size} bytes`);
  } else {
    console.error(`[ERROR] Backup failed or file not created.`);
    process.exit(1);
  }
});
