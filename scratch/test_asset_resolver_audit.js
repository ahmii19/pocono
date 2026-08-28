const adminService = require('../server/src/services/adminService');

const VERIFIED_FALLBACKS = {
  desktopLogo: '/wp-content/uploads/2026/05/PV6_no-bg-_300.png',
  mobileLogo: '/wp-content/uploads/2026/05/PV6_no-bg-_300.png',
  footerLogo: '/wp-content/uploads/2026/05/PV6_no-bg-_full.png',
  heroBgImage: '/wp-content/uploads/2018/10/video-thumb.png',
  favicon: '/favicon3.png'
};

function resolveSiteAssetUrl(url, fallbackType) {
  const fallback = VERIFIED_FALLBACKS[fallbackType];
  if (!url || typeof url !== 'string') return fallback;
  const trimmed = url.trim();
  if (!trimmed) return fallback;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  if (
    trimmed === '/images/logo.png' ||
    trimmed === '/images/og-image.jpg' ||
    trimmed === '/wp-content/uploads/2026/08/hero-bg.jpg' ||
    trimmed.includes('2026/08/hero-bg.jpg')
  ) {
    return fallback;
  }
  return trimmed;
}

function runAudit() {
  console.log('====================================================');
  console.log(' FORENSIC AUDIT: ASSET RESOLUTION & SITE SETTINGS');
  console.log('====================================================\n');

  let passed = true;

  // Test 1: Known broken legacy paths -> must map to fallback
  console.log('--- TEST 1: KNOWN BROKEN LEGACY PATHS ---');
  const brokenPaths = [
    { input: '/images/logo.png', type: 'desktopLogo', expected: VERIFIED_FALLBACKS.desktopLogo },
    { input: '/images/og-image.jpg', type: 'heroBgImage', expected: VERIFIED_FALLBACKS.heroBgImage },
    { input: '/wp-content/uploads/2026/08/hero-bg.jpg', type: 'heroBgImage', expected: VERIFIED_FALLBACKS.heroBgImage },
    { input: '/path/2026/08/hero-bg.jpg', type: 'heroBgImage', expected: VERIFIED_FALLBACKS.heroBgImage }
  ];

  for (const t of brokenPaths) {
    const res = resolveSiteAssetUrl(t.input, t.type);
    const ok = res === t.expected;
    console.log(`[LEGACY PATH] "${t.input}" (${t.type}) => "${res}" [${ok ? 'OK' : 'FAIL'}]`);
    if (!ok) passed = false;
  }

  // Test 2: Absolute & Valid custom URLs -> must remain UNTOUCHED
  console.log('\n--- TEST 2: VALID CUSTOM & ABSOLUTE URLS ---');
  const validUrls = [
    { input: 'https://cdn.example.com/custom-logo.png', type: 'desktopLogo', expected: 'https://cdn.example.com/custom-logo.png' },
    { input: 'http://mybucket.s3.amazonaws.com/hero.jpg', type: 'heroBgImage', expected: 'http://mybucket.s3.amazonaws.com/hero.jpg' },
    { input: '/wp-content/uploads/2026/05/PV6_no-bg-_300.png', type: 'desktopLogo', expected: '/wp-content/uploads/2026/05/PV6_no-bg-_300.png' },
    { input: '/wp-content/uploads/2026/05/custom-brand-header.png', type: 'desktopLogo', expected: '/wp-content/uploads/2026/05/custom-brand-header.png' },
    { input: '/custom-uploads/2026/banner.jpg', type: 'heroBgImage', expected: '/custom-uploads/2026/banner.jpg' }
  ];

  for (const t of validUrls) {
    const res = resolveSiteAssetUrl(t.input, t.type);
    const ok = res === t.expected;
    console.log(`[VALID CUSTOM] "${t.input}" (${t.type}) => "${res}" [${ok ? 'OK' : 'FAIL'}]`);
    if (!ok) passed = false;
  }

  // Test 3: Null, undefined, empty string -> must resolve to fallback
  console.log('\n--- TEST 3: NULL / UNDEFINED / EMPTY VALUES ---');
  const nullCases = [
    { input: null, type: 'desktopLogo', expected: VERIFIED_FALLBACKS.desktopLogo },
    { input: undefined, type: 'heroBgImage', expected: VERIFIED_FALLBACKS.heroBgImage },
    { input: '', type: 'mobileLogo', expected: VERIFIED_FALLBACKS.mobileLogo },
    { input: '   ', type: 'footerLogo', expected: VERIFIED_FALLBACKS.footerLogo }
  ];

  for (const t of nullCases) {
    const res = resolveSiteAssetUrl(t.input, t.type);
    const ok = res === t.expected;
    console.log(`[EMPTY/NULL] "${t.input}" (${t.type}) => "${res}" [${ok ? 'OK' : 'FAIL'}]`);
    if (!ok) passed = false;
  }

  // Test 4: End-to-end Admin Settings update flow with custom logo & hero
  console.log('\n--- TEST 4: END-TO-END ADMIN CUSTOM ASSET UPDATE FLOW ---');
  const originalSettings = adminService.getSiteSettings();

  const customLogoUrl = 'https://pocono.vacations/assets/custom-admin-logo.png';
  const customHeroUrl = '/wp-content/uploads/2026/05/01-Photo-1-scaled.jpg';

  const updatedSettings = adminService.updateSiteSettings({
    branding: { ...originalSettings.branding, desktopLogoUrl: customLogoUrl },
    hero: { ...originalSettings.hero, heroBgImage: customHeroUrl }
  });

  const publicSettings = adminService.getPublicSiteSettings();

  const resolvedLogo = resolveSiteAssetUrl(publicSettings.branding.desktopLogoUrl, 'desktopLogo');
  const resolvedHero = resolveSiteAssetUrl(publicSettings.hero.heroBgImage, 'heroBgImage');

  console.log(`Updated Admin Logo: "${publicSettings.branding.desktopLogoUrl}" => Resolved: "${resolvedLogo}"`);
  console.log(`Updated Admin Hero: "${publicSettings.hero.heroBgImage}" => Resolved: "${resolvedHero}"`);

  const logoOk = resolvedLogo === customLogoUrl;
  const heroOk = resolvedHero === customHeroUrl;

  console.log(`[CUSTOM LOGO PERSISTED] ${logoOk ? 'OK' : 'FAIL'}`);
  console.log(`[CUSTOM HERO PERSISTED] ${heroOk ? 'OK' : 'FAIL'}`);

  if (!logoOk || !heroOk) passed = false;

  // Revert test changes back to original
  adminService.updateSiteSettings(originalSettings);
  console.log('\n[REVERT COMPLETE] Settings restored to original state.');

  console.log(`\n====================================================`);
  console.log(` AUDIT RESULT: ${passed ? 'ALL PASSED ✅' : 'FAILED ❌'}`);
  console.log(`====================================================`);
}

runAudit();
