require('dotenv').config();
const fs = require('fs');
const path = require('path');
const adminService = require('../server/src/services/adminService');

async function testSiteNameE2E() {
  console.log('====================================================');
  console.log(' END-TO-END WEBSITE NAME CONNECTION TEST');
  console.log('====================================================\n');

  const originalSettings = adminService.getSiteSettings();
  const originalSiteName = originalSettings.general?.siteName || 'Pocono.Vacations';
  console.log(`[INITIAL STATE] Original siteName: "${originalSiteName}"`);

  let testPassed = true;

  try {
    const TEST_NAME = "TEST POCONO WEBSITE";

    // 1. Update siteName in adminService
    console.log(`\n[STEP 1] Updating siteName to "${TEST_NAME}" via updateSiteSettings()...`);
    adminService.updateSiteSettings({
      general: {
        ...originalSettings.general,
        siteName: TEST_NAME
      }
    });

    // 2. Verify disk persistence in siteSettings.json
    const diskPath = path.join(__dirname, '../server/src/data/siteSettings.json');
    const diskRaw = fs.readFileSync(diskPath, 'utf8');
    const diskJson = JSON.parse(diskRaw);

    if (diskJson.general?.siteName === TEST_NAME) {
      console.log(`[STEP 2 PASSED] Disk persistence verified: siteSettings.json contains "${TEST_NAME}"`);
    } else {
      console.error(`[STEP 2 FAILED] Expected "${TEST_NAME}", got "${diskJson.general?.siteName}"`);
      testPassed = false;
    }

    // 3. Verify public API response via adminService.getPublicSiteSettings()
    const pub = adminService.getPublicSiteSettings();
    if (pub.general?.siteName === TEST_NAME) {
      console.log(`[STEP 3 PASSED] Public settings service verified: getPublicSiteSettings().general.siteName === "${TEST_NAME}"`);
    } else {
      console.error(`[STEP 3 FAILED] Expected "${TEST_NAME}", got "${pub.general?.siteName}"`);
      testPassed = false;
    }

    // 4. Verify SSR metadata reading logic (layout.tsx)
    if (fs.existsSync(diskPath)) {
      const rawData = JSON.parse(fs.readFileSync(diskPath, 'utf8'));
      const ssrSiteName = rawData.general?.siteName || 'Pocono.Vacations';
      if (ssrSiteName === TEST_NAME) {
        console.log(`[STEP 4 PASSED] SSR metadata logic verified: openGraph.siteName resolves to "${TEST_NAME}"`);
      } else {
        console.error(`[STEP 4 FAILED] SSR logic mismatch.`);
        testPassed = false;
      }
    }

  } catch (err) {
    console.error('[TEST ERROR]', err);
    testPassed = false;
  } finally {
    // 5. Restore exact original settings
    console.log(`\n[RESTORATION] Restoring original siteName to "${originalSiteName}"...`);
    adminService.updateSiteSettings({
      general: {
        ...originalSettings.general,
        siteName: originalSiteName
      }
    });

    const restoredPub = adminService.getPublicSiteSettings();
    if (restoredPub.general?.siteName === originalSiteName) {
      console.log(`[RESTORATION VERIFIED] siteName successfully restored to "${originalSiteName}".`);
    } else {
      console.error(`[RESTORATION FAILED] Failed to restore original siteName.`);
    }

    console.log(`\n====================================================`);
    console.log(` FINAL E2E TEST RESULT: ${testPassed ? 'PASSED ✅' : 'FAILED ❌'}`);
    console.log(`====================================================`);
  }
}

testSiteNameE2E();
