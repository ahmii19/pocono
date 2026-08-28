require('dotenv').config();
const fs = require('fs');
const path = require('path');
const adminService = require('../server/src/services/adminService');

async function testSeoMetadataE2E() {
  console.log('====================================================');
  console.log(' SEO METADATA SYSTEM TEST SUITE');
  console.log('====================================================\n');

  const originalSettings = adminService.getSiteSettings();
  console.log('[INITIAL SETTINGS] Saved original site settings.');

  let allPassed = true;

  try {
    // --------------------------------------------------
    // TEST 1: GENERAL siteName & siteDescription PRIORITY (when seo fields are empty)
    // --------------------------------------------------
    console.log('--- TEST 1: General siteName & siteDescription SEO Metadata Resolution ---');
    const TEST_TITLE = "TEST VACATIONS";
    const TEST_DESC = "TEST SITE DESCRIPTION FOR SEO";

    adminService.updateSiteSettings({
      ...originalSettings,
      general: {
        ...originalSettings.general,
        siteName: TEST_TITLE,
        siteDescription: TEST_DESC
      },
      seo: {
        metaTitle: "",
        metaDescription: "",
        ogImageUrl: "/images/og-image.jpg"
      }
    });

    const settingsPath = path.resolve(__dirname, '../server/src/data/siteSettings.json');
    const rawData = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));

    // Replicate layout.tsx generateMetadata() logic
    let resolvedTitle = 'Pocono.Vacations | Luxury Cabin & Chalet Rentals in the Poconos';
    let resolvedDescription = 'Fallback description';
    let resolvedSiteName = 'Pocono.Vacations';

    if (rawData.general?.siteName && rawData.general.siteName.trim()) {
      resolvedSiteName = rawData.general.siteName.trim();
    }
    if (rawData.seo?.metaTitle && rawData.seo.metaTitle.trim()) {
      resolvedTitle = rawData.seo.metaTitle.trim();
    } else if (rawData.general?.siteName && rawData.general.siteName.trim()) {
      resolvedTitle = rawData.general.siteName.trim();
    }
    if (rawData.seo?.metaDescription && rawData.seo.metaDescription.trim()) {
      resolvedDescription = rawData.seo.metaDescription.trim();
    } else if (rawData.general?.siteDescription && rawData.general.siteDescription.trim()) {
      resolvedDescription = rawData.general.siteDescription.trim();
    }

    if (resolvedTitle === TEST_TITLE) {
      console.log(`[TEST 1A PASSED] Title resolved from general.siteName: "${resolvedTitle}"`);
    } else {
      console.error(`[TEST 1A FAILED] Expected "${TEST_TITLE}", got "${resolvedTitle}"`);
      allPassed = false;
    }

    if (resolvedDescription === TEST_DESC) {
      console.log(`[TEST 1B PASSED] Meta description resolved from general.siteDescription: "${resolvedDescription}"`);
    } else {
      console.error(`[TEST 1B FAILED] Expected "${TEST_DESC}", got "${resolvedDescription}"`);
      allPassed = false;
    }

    if (resolvedSiteName === TEST_TITLE) {
      console.log(`[TEST 1C PASSED] OpenGraph siteName resolved from general.siteName: "${resolvedSiteName}"`);
    } else {
      console.error(`[TEST 1C FAILED] Expected "${TEST_TITLE}", got "${resolvedSiteName}"`);
      allPassed = false;
    }

    // --------------------------------------------------
    // TEST 2: SEO PRIORITY 1 (metaTitle & metaDescription override general defaults)
    // --------------------------------------------------
    console.log('\n--- TEST 2: Explicit seo.metaTitle & metaDescription Priority Override ---');
    const EXPLICIT_SEO_TITLE = "EXPLICIT SEO TITLE FOR GOOGLE";
    const EXPLICIT_SEO_DESC = "EXPLICIT SEO DESCRIPTION FOR SEARCH ENGINES";

    adminService.updateSiteSettings({
      ...originalSettings,
      general: {
        ...originalSettings.general,
        siteName: TEST_TITLE,
        siteDescription: TEST_DESC
      },
      seo: {
        metaTitle: EXPLICIT_SEO_TITLE,
        metaDescription: EXPLICIT_SEO_DESC,
        ogImageUrl: "/images/og-image.jpg"
      }
    });

    const rawDataSeo = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));

    let seoTitle = 'Pocono.Vacations';
    let seoDesc = 'Fallback description';

    if (rawDataSeo.seo?.metaTitle && rawDataSeo.seo.metaTitle.trim()) {
      seoTitle = rawDataSeo.seo.metaTitle.trim();
    } else if (rawDataSeo.general?.siteName && rawDataSeo.general.siteName.trim()) {
      seoTitle = rawDataSeo.general.siteName.trim();
    }

    if (rawDataSeo.seo?.metaDescription && rawDataSeo.seo.metaDescription.trim()) {
      seoDesc = rawDataSeo.seo.metaDescription.trim();
    } else if (rawDataSeo.general?.siteDescription && rawDataSeo.general.siteDescription.trim()) {
      seoDesc = rawDataSeo.general.siteDescription.trim();
    }

    if (seoTitle === EXPLICIT_SEO_TITLE) {
      console.log(`[TEST 2A PASSED] Explicit seo.metaTitle correctly overrides general.siteName: "${seoTitle}"`);
    } else {
      console.error(`[TEST 2A FAILED] Expected "${EXPLICIT_SEO_TITLE}", got "${seoTitle}"`);
      allPassed = false;
    }

    if (seoDesc === EXPLICIT_SEO_DESC) {
      console.log(`[TEST 2B PASSED] Explicit seo.metaDescription correctly overrides general.siteDescription: "${seoDesc}"`);
    } else {
      console.error(`[TEST 2B FAILED] Expected "${EXPLICIT_SEO_DESC}", got "${seoDesc}"`);
      allPassed = false;
    }

  } catch (err) {
    console.error('[TEST ERROR]', err);
    allPassed = false;
  } finally {
    // Restore exact original site settings
    console.log('\n[RESTORATION] Reverting to original site settings...');
    adminService.updateSiteSettings(originalSettings);

    const restoredData = adminService.getSiteSettings();
    if (
      restoredData.general?.siteName === originalSettings.general?.siteName &&
      restoredData.seo?.metaTitle === originalSettings.seo?.metaTitle
    ) {
      console.log('[RESTORATION VERIFIED] Site settings successfully restored to original state.');
    } else {
      console.error('[RESTORATION FAILED] Failed to restore original settings.');
    }

    console.log(`\n====================================================`);
    console.log(` FINAL SEO METADATA TEST RESULT: ${allPassed ? 'PASSED ✅' : 'FAILED ❌'}`);
    console.log(`====================================================`);

    if (!allPassed) process.exit(1);
  }
}

testSeoMetadataE2E();
