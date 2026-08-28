const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');
const { Client } = require('pg');

const PLACEHOLDER_HASH = 'bfc8abe406d3afeefad09530944821e48fe007caba6fa97b52b78bba5f752938';
const BASE_WORKSPACE_UPLOADS = 'D:\\AHMED PROJECTS\\pocono\\pocono';

function downloadFile(url, destPath) {
  return new Promise((resolve) => {
    const fileStream = fs.createWriteStream(destPath);

    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }, timeout: 6000 }, (response) => {
      if (response.statusCode === 200) {
        response.pipe(fileStream);
        fileStream.on('finish', () => {
          fileStream.close();
          resolve({ success: true, statusCode: response.statusCode, contentType: response.headers['content-type'] });
        });
      } else {
        fileStream.close();
        if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
        resolve({ success: false, statusCode: response.statusCode });
      }
    });

    req.on('error', (err) => {
      fileStream.close();
      if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
      resolve({ success: false, statusCode: 0, error: err.message });
    });

    req.on('timeout', () => {
      req.destroy();
      fileStream.close();
      if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
      resolve({ success: false, statusCode: 408, error: 'Request Timeout' });
    });
  });
}

async function runRecovery() {
  const client = new Client({
    connectionString: 'postgresql://postgres:postgres@localhost:5432/pocono?schema=public'
  });

  await client.connect();

  const res = await client.query(`
    SELECT pi.id, pi.image_url, p.title, p.slug 
    FROM "property_images" pi 
    LEFT JOIN "properties" p ON pi.property_id = p.id
  `);

  const images = res.rows;
  console.log(`Auditing ${images.length} PropertyImage database records from PostgreSQL...`);

  const report = [];
  let recoveredCount = 0;
  let skippedValidCount = 0;
  let failedDownloadCount = 0;

  for (const img of images) {
    let cleanPath = img.image_url.replace(/^https?:\/\/[^\/]+/, '').replace(/^\//, '');
    const localFilePath = path.join(BASE_WORKSPACE_UPLOADS, cleanPath);
    const liveUrl = `https://pocono.vacations/${cleanPath}`;

    let localExists = fs.existsSync(localFilePath);
    let isPlaceholder = false;
    let localSize = 0;
    let localHash = '';

    if (localExists) {
      const stats = fs.statSync(localFilePath);
      localSize = stats.size;
      const buf = fs.readFileSync(localFilePath);
      localHash = crypto.createHash('sha256').update(buf).digest('hex');
      if (localHash === PLACEHOLDER_HASH || localSize <= 1000) {
        isPlaceholder = true;
      }
    }

    if (localExists && !isPlaceholder) {
      console.log(`[SKIPPED - VALID LOCAL] ${img.title}: ${cleanPath} (${localSize} bytes)`);
      skippedValidCount++;
      report.push({
        property: img.title || 'Unknown',
        slug: img.slug || 'Unknown',
        imageUrl: img.image_url,
        liveUrl,
        localPath: localFilePath,
        httpStatus: 200,
        fileSize: localSize,
        sha256: localHash,
        status: 'VALID_LOCAL_EXISTED'
      });
      continue;
    }

    // Download from live website
    console.log(`[ATTEMPTING DOWNLOAD] ${img.title}: ${liveUrl}`);
    const tempPath = localFilePath + '.tmp';
    const tempDir = path.dirname(tempPath);
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const downloadRes = await downloadFile(liveUrl, tempPath);

    if (downloadRes.success) {
      const tempStats = fs.statSync(tempPath);
      const tempBuf = fs.readFileSync(tempPath);
      const tempHash = crypto.createHash('sha256').update(tempBuf).digest('hex');

      if (tempStats.size > 5000 && tempHash !== PLACEHOLDER_HASH) {
        // Successfully downloaded real original photo binary
        if (fs.existsSync(localFilePath)) fs.unlinkSync(localFilePath);
        fs.renameSync(tempPath, localFilePath);
        recoveredCount++;
        console.log(`[RECOVERED SUCCESS] ${img.title}: ${tempStats.size} bytes (Hash: ${tempHash.slice(0, 10)}...)`);
        report.push({
          property: img.title || 'Unknown',
          slug: img.slug || 'Unknown',
          imageUrl: img.image_url,
          liveUrl,
          localPath: localFilePath,
          httpStatus: 200,
          fileSize: tempStats.size,
          contentType: downloadRes.contentType,
          sha256: tempHash,
          status: 'RECOVERED'
        });
      } else {
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        failedDownloadCount++;
        console.log(`[REJECTED - LIVE RETURNED PLACEHOLDER OR SMALL FILE] ${img.title}: ${tempStats.size} bytes`);
        report.push({
          property: img.title || 'Unknown',
          slug: img.slug || 'Unknown',
          imageUrl: img.image_url,
          liveUrl,
          localPath: localFilePath,
          httpStatus: 200,
          fileSize: tempStats.size,
          sha256: tempHash,
          status: 'NOT_RECOVERED_LIVE_IS_PLACEHOLDER'
        });
      }
    } else {
      failedDownloadCount++;
      console.log(`[FAILED HTTP] ${img.title}: HTTP ${downloadRes.statusCode || 'ERROR'}`);
      report.push({
        property: img.title || 'Unknown',
        slug: img.slug || 'Unknown',
        imageUrl: img.image_url,
        liveUrl,
        localPath: localFilePath,
        httpStatus: downloadRes.statusCode || 0,
        fileSize: 0,
        sha256: 'N/A',
        status: `NOT_RECOVERED_HTTP_${downloadRes.statusCode || 'ERR'}`
      });
    }
  }

  console.log('\n================ RECOVERY SUMMARY ================');
  console.log(`Total Images Evaluated: ${images.length}`);
  console.log(`Recovered Original Binaries: ${recoveredCount}`);
  console.log(`Skipped (Already Valid Real Files): ${skippedValidCount}`);
  console.log(`Failed / Live 404 / Live Placeholders: ${failedDownloadCount}`);

  fs.writeFileSync('C:\\Users\\ahmed\\.gemini\\antigravity-ide\\brain\\cb6c5269-6730-4380-8f60-39e43d3f2e32\\scratch\\recovery_report_details.json', JSON.stringify(report, null, 2));
  await client.end();
}

runRecovery().catch(console.error);
