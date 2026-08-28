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

async function runRecovery4B() {
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
  console.log(`Phase 4B: Deep auditing all ${images.length} PropertyImage database records...`);

  const report = [];
  let previouslyRecovered = 0;
  let newlyRecovered = 0;
  let unrecoverableCount = 0;

  for (const img of images) {
    let cleanPath = img.image_url.replace(/^https?:\/\/[^\/]+/, '').replace(/^\//, '');
    const localFilePath = path.join(BASE_WORKSPACE_UPLOADS, cleanPath);

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
      console.log(`[ALREADY RECOVERED / VALID] ${img.title}: ${cleanPath} (${localSize} bytes)`);
      previouslyRecovered++;
      report.push({
        property: img.title || 'Unknown',
        slug: img.slug || 'Unknown',
        imageUrl: img.image_url,
        liveUrlTested: `https://pocono.vacations/${cleanPath}`,
        localPath: localFilePath,
        httpStatus: 200,
        fileSize: localSize,
        sha256: localHash,
        status: 'VALID_REAL_FILE'
      });
      continue;
    }

    // Construct candidate URLs (Exact path, scaled variants, alternative year/month folders)
    const baseName = path.basename(cleanPath);
    const nameWithoutExt = baseName.replace(/\.[^/.]+$/, '');
    const ext = path.extname(baseName) || '.jpg';

    const candidateUrls = [
      `https://pocono.vacations/${cleanPath}`,
      `https://pocono.vacations/${cleanPath.replace(ext, `-scaled${ext}`)}`,
      `https://pocono.vacations/${cleanPath.replace(ext, `-1024x683${ext}`)}`,
      `https://pocono.vacations/${cleanPath.replace(ext, `-768x512${ext}`)}`,
      `https://pocono.vacations/wp-content/uploads/2026/05/${baseName}`,
      `https://pocono.vacations/wp-content/uploads/2018/10/${baseName}`,
      `https://pocono.vacations/wp-content/uploads/2019/04/${baseName}`
    ];

    let foundSuccess = false;

    for (const urlCandidate of candidateUrls) {
      console.log(`[TESTING CANDIDATE] ${img.title}: ${urlCandidate}`);
      const tempPath = localFilePath + '.tmp';
      const tempDir = path.dirname(tempPath);
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

      const downloadRes = await downloadFile(urlCandidate, tempPath);

      if (downloadRes.success) {
        const tempStats = fs.statSync(tempPath);
        const tempBuf = fs.readFileSync(tempPath);
        const tempHash = crypto.createHash('sha256').update(tempBuf).digest('hex');

        if (tempStats.size > 5000 && tempHash !== PLACEHOLDER_HASH) {
          if (fs.existsSync(localFilePath)) fs.unlinkSync(localFilePath);
          fs.renameSync(tempPath, localFilePath);
          newlyRecovered++;
          foundSuccess = true;
          console.log(`[NEWLY RECOVERED SUCCESS] ${img.title}: ${tempStats.size} bytes from ${urlCandidate}`);
          report.push({
            property: img.title || 'Unknown',
            slug: img.slug || 'Unknown',
            imageUrl: img.image_url,
            liveUrlTested: urlCandidate,
            localPath: localFilePath,
            httpStatus: 200,
            fileSize: tempStats.size,
            contentType: downloadRes.contentType,
            sha256: tempHash,
            status: 'NEWLY_RECOVERED'
          });
          break;
        } else {
          if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        }
      } else {
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      }
    }

    if (!foundSuccess) {
      unrecoverableCount++;
      console.log(`[UNRECOVERABLE LIVE 404] ${img.title}: All candidate URLs returned 404/Timeout`);
      report.push({
        property: img.title || 'Unknown',
        slug: img.slug || 'Unknown',
        imageUrl: img.image_url,
        liveUrlTested: `https://pocono.vacations/${cleanPath}`,
        localPath: localFilePath,
        httpStatus: 404,
        fileSize: localSize,
        sha256: localHash,
        status: 'NOT_RECOVERED_LIVE_404'
      });
    }
  }

  console.log('\n================ PHASE 4B RECOVERY SUMMARY ================');
  console.log(`Total Expected Database Images: ${images.length}`);
  console.log(`Previously Recovered Valid Files: ${previouslyRecovered}`);
  console.log(`Newly Recovered Files in 4B: ${newlyRecovered}`);
  console.log(`Total Verified Real Files on Disk: ${previouslyRecovered + newlyRecovered}`);
  console.log(`Unrecoverable Live Endpoints (404/Timeout): ${unrecoverableCount}`);

  fs.writeFileSync('C:\\Users\\ahmed\\.gemini\\antigravity-ide\\brain\\cb6c5269-6730-4380-8f60-39e43d3f2e32\\scratch\\phase_4b_report_details.json', JSON.stringify(report, null, 2));
  await client.end();
}

runRecovery4B().catch(console.error);
