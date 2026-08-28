require('dotenv').config();
const prisma = require('../server/src/config/prisma');
const hostService = require('../server/src/services/hostService');
const propertyService = require('../server/src/services/propertyService');
const emailService = require('../server/src/services/emailService');

async function runHostPropertyNotificationTests() {
  console.log('====================================================');
  console.log(' TESTING HOST UI PROPERTY PUBLISHED EMAIL TRACE');
  console.log('====================================================\n');

  // Find or create test host
  let hostUser = await prisma.user.findFirst({
    where: { role: 'HOST' }
  });

  if (!hostUser) {
    hostUser = await prisma.user.create({
      data: {
        email: `host.test.${Date.now()}@example.com`,
        passwordHash: 'hashed_password',
        firstName: 'Test',
        lastName: 'Host',
        role: 'HOST'
      }
    });
  }

  // Set guest revoluxemindset@gmail.com with emailNewPropertyNotifications = true
  let targetGuest = await prisma.user.findUnique({
    where: { email: 'revoluxemindset@gmail.com' }
  });

  if (!targetGuest) {
    targetGuest = await prisma.user.create({
      data: {
        email: 'revoluxemindset@gmail.com',
        passwordHash: 'hashed_password',
        firstName: 'Revoluxe',
        lastName: 'Guest',
        role: 'GUEST',
        emailNewPropertyNotifications: true
      }
    });
  } else {
    await prisma.user.update({
      where: { id: targetGuest.id },
      data: { emailNewPropertyNotifications: true }
    });
  }

  console.log(`[SETUP] Host: ${hostUser.email} (${hostUser.id})`);
  console.log(`[SETUP] Target Guest: ${targetGuest.email} (emailNewPropertyNotifications = true)`);

  // TEST 1: Host creates new PUBLISHED property
  console.log('\n----------------------------------------------------');
  console.log('[TEST 1] Host creates new PUBLISHED property...');
  console.log('----------------------------------------------------');
  const pubSlug = `host-published-${Date.now()}`;
  const pubProperty = await hostService.createHostProperty(hostUser.id, {
    title: 'Host Pocono Vista Chalet',
    slug: pubSlug,
    description: 'Breathtaking lakefront chalet created directly by host.',
    nightlyPrice: 320.00,
    bedrooms: 4,
    bathrooms: 3,
    maxGuests: 10,
    status: 'PUBLISHED'
  });

  console.log(`[TEST 1 RESULT] Property Created: ${pubProperty.id} | Status: ${pubProperty.status}`);
  // Wait 3 seconds for async email dispatch logs
  await new Promise(r => setTimeout(r, 3000));

  // TEST 2: Host creates DRAFT / PENDING property
  console.log('\n----------------------------------------------------');
  console.log('[TEST 2] Host creates PENDING_REVIEW property...');
  console.log('----------------------------------------------------');
  const pendingSlug = `host-pending-${Date.now()}`;
  const pendingProperty = await hostService.createHostProperty(hostUser.id, {
    title: 'Host Pending Retreat',
    slug: pendingSlug,
    description: 'Draft property under review.',
    nightlyPrice: 195.00,
    bedrooms: 2,
    bathrooms: 1,
    maxGuests: 4,
    status: 'PENDING_REVIEW'
  });

  console.log(`[TEST 2 RESULT] Property Created: ${pendingProperty.id} | Status: ${pendingProperty.status}`);
  await new Promise(r => setTimeout(r, 1000));

  // TEST 3: PENDING_REVIEW -> PUBLISHED
  console.log('\n----------------------------------------------------');
  console.log('[TEST 3] Updating property PENDING_REVIEW -> PUBLISHED...');
  console.log('----------------------------------------------------');
  const publishedFromPending = await hostService.updateHostProperty(hostUser.id, pendingProperty.id, {
    status: 'PUBLISHED'
  }, 'ADMIN');

  console.log(`[TEST 3 RESULT] Updated Property Status: ${publishedFromPending.status}`);
  await new Promise(r => setTimeout(r, 3000));

  // TEST 4: PUBLISHED -> PUBLISHED (Deduplication Check)
  console.log('\n----------------------------------------------------');
  console.log('[TEST 4] Updating property PUBLISHED -> PUBLISHED (Edit Title)...');
  console.log('----------------------------------------------------');
  await hostService.updateHostProperty(hostUser.id, pubProperty.id, {
    title: 'Host Pocono Vista Chalet - Edited Title',
    status: 'PUBLISHED'
  }, 'ADMIN');

  await new Promise(r => setTimeout(r, 1000));

  // TEST 5: Guest preference false
  console.log('\n----------------------------------------------------');
  console.log('[TEST 5] Testing Guest notification preference = FALSE...');
  console.log('----------------------------------------------------');
  await prisma.user.update({
    where: { id: targetGuest.id },
    data: { emailNewPropertyNotifications: false }
  });

  const prefFalseSlug = `pref-false-${Date.now()}`;
  const prefFalseProp = await hostService.createHostProperty(hostUser.id, {
    title: 'Pref False Test Property',
    slug: prefFalseSlug,
    description: 'Testing guest preference OFF.',
    nightlyPrice: 200.00,
    status: 'PUBLISHED'
  });

  await new Promise(r => setTimeout(r, 1000));

  // Restore guest preference
  await prisma.user.update({
    where: { id: targetGuest.id },
    data: { emailNewPropertyNotifications: true }
  });

  // CLEANUP TEST PROPERTIES
  console.log('\n[CLEANUP] Soft deleting test properties...');
  const mockAdmin = { id: hostUser.id, role: 'ADMIN' };
  await propertyService.deleteProperty(pubProperty.id, mockAdmin, { deleteMode: 'soft' });
  await propertyService.deleteProperty(pendingProperty.id, mockAdmin, { deleteMode: 'soft' });
  await propertyService.deleteProperty(prefFalseProp.id, mockAdmin, { deleteMode: 'soft' });

  console.log('\n====================================================');
  console.log(' HOST UI PROPERTY PUBLISHED EMAIL TRACE COMPLETED!');
  console.log('====================================================\n');

  await prisma.$disconnect();
}

runHostPropertyNotificationTests().catch(err => {
  console.error('[HOST PROPERTY TRACE FATAL ERROR]', err);
  process.exit(1);
});
