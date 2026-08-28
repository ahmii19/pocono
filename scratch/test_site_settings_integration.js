require('dotenv').config();
const prisma = require('../server/src/config/prisma');
const adminService = require('../server/src/services/adminService');
const hostEarningService = require('../server/src/services/hostEarningService');

async function testSettingsIntegration() {
  console.log('====================================================');
  console.log(' TESTING SYSTEM SETTINGS INTEGRATION & CONSUMPTION');
  console.log('====================================================\n');

  // 1. Get Public Settings
  console.log('--- 1. TESTING PUBLIC SETTINGS API (getPublicSiteSettings) ---');
  const publicSettings = adminService.getPublicSiteSettings();
  console.log('[PUBLIC SETTINGS OBJECT]', JSON.stringify(publicSettings, null, 2));

  if (!publicSettings.general || !publicSettings.branding || !publicSettings.hero || !publicSettings.seo) {
    throw new Error('Public settings object missing expected root sections.');
  }

  // 2. Test Admin Settings Update (Updating Commission & Branding)
  console.log('\n--- 2. UPDATING SITE SETTINGS (updateSiteSettings) ---');
  const current = adminService.getSiteSettings();
  
  const updatePayload = {
    general: {
      ...current.general,
      siteName: "Pocono.Vacations Direct",
      platformCommissionPercent: "12.5"
    },
    hero: {
      ...current.hero,
      heroHeading: "Discover Luxury Pocono Mountain Chalets"
    }
  };

  const updated = adminService.updateSiteSettings(updatePayload);
  console.log('[SETTINGS UPDATED]', {
    siteName: updated.general.siteName,
    platformCommissionPercent: updated.general.platformCommissionPercent,
    heroHeading: updated.hero.heroHeading
  });

  // 3. Verify Public API reflects update
  const newPublic = adminService.getPublicSiteSettings();
  console.log('\n--- 3. VERIFYING PUBLIC API CONSUMPTION ---');
  console.log(`Site Name: "${newPublic.general.siteName}"`);
  console.log(`Hero Heading: "${newPublic.hero.heroHeading}"`);

  if (newPublic.general.siteName !== "Pocono.Vacations Direct") {
    throw new Error('Public API failed to return updated siteName');
  }

  // 4. Verify Host Earning Service consumes updated commission
  console.log('\n--- 4. VERIFYING HOST EARNING COMMISSION CONSUMPTION ---');
  // Create dummy confirmed reservation to test host earning calculation with 12.5%
  const guest = await prisma.user.findFirst({ where: { role: 'GUEST' } });
  const host = await prisma.user.findFirst({ where: { role: 'HOST' } });
  const property = await prisma.property.findFirst({ where: { status: 'PUBLISHED' } });

  if (guest && host && property) {
    const dummyRes = await prisma.reservation.create({
      data: {
        propertyId: property.id,
        guestId: guest.id,
        hostId: host.id,
        checkInDate: new Date('2026-12-01'),
        checkOutDate: new Date('2026-12-04'),
        guestCount: 2,
        totalNights: 3,
        baseTotal: 1000,
        grandTotal: 1000,
        upfrontPaid: 1000,
        balanceDue: 0,
        status: 'CONFIRMED'
      }
    });

    const earning = await hostEarningService.syncReservationEarning(dummyRes.id, 'CONFIRMED');
    console.log(`[EARNING CREATED] Gross: $${earning.grossAmount} | Rate: ${earning.commissionRate}% | Commission: $${earning.commissionAmount} | Net: $${earning.netAmount}`);

    if (Number(earning.commissionRate) !== 12.5) {
      throw new Error(`Expected commission rate to be 12.5%, got ${earning.commissionRate}%`);
    }

    if (Number(earning.commissionAmount) !== 125) {
      throw new Error(`Expected commission amount to be $125, got $${earning.commissionAmount}`);
    }

    // Cleanup dummy reservation & earning
    await prisma.hostEarning.delete({ where: { id: earning.id } });
    await prisma.reservation.delete({ where: { id: dummyRes.id } });
    console.log('[CLEANUP] Deleted dummy test reservation & host earning.');
  }

  // 5. Revert site settings back to original defaults
  console.log('\n--- 5. REVERTING SITE SETTINGS TO ORIGINAL ---');
  adminService.updateSiteSettings(current);
  console.log('[REVERT COMPLETE] Settings restored to original state.');

  await prisma.$disconnect();
}

testSettingsIntegration().catch(err => {
  console.error('[TEST FAILURE]', err);
  process.exit(1);
});
