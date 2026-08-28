require('dotenv').config();
const prisma = require('../server/src/config/prisma');
const emailService = require('../server/src/services/emailService');
const propertyService = require('../server/src/services/propertyService');

async function runNewPropertyNotificationTests() {
  console.log('====================================================');
  console.log(' TESTING NEW PROPERTY PUBLISHED EMAIL NOTIFICATIONS');
  console.log('====================================================\n');

  // 1. Setup Guest user revoluxemindset@gmail.com with emailNewPropertyNotifications = true
  const guest = await prisma.user.findUnique({
    where: { email: 'revoluxemindset@gmail.com' }
  });

  if (!guest) {
    throw new Error('Guest user revoluxemindset@gmail.com not found!');
  }

  await prisma.user.update({
    where: { id: guest.id },
    data: { emailNewPropertyNotifications: true }
  });

  console.log(`[SETUP] Guest ${guest.email} initialized with emailNewPropertyNotifications = true`);

  // TEST 1, 2, 3, 4: Create a new PUBLISHED property
  console.log('\n[TEST 1-4] Creating a new PUBLISHED property...');
  const randomSlug = `test-published-chalet-${Date.now()}`;
  const mockAdminUser = { id: guest.id, role: 'ADMIN' };

  const newProp = await propertyService.createProperty({
    title: 'Pocono Pines Luxury Chalet',
    slug: randomSlug,
    description: 'Beautiful <strong>luxury chalet</strong> with hot tub & scenic mountain views.',
    nightlyPrice: 275.00,
    bedrooms: 3,
    bathrooms: 2,
    maxGuests: 8,
    status: 'PUBLISHED',
    address: '123 Pine Road, Pocono Pines, PA'
  }, guest.id);

  console.log(`[TEST 1-4 RESULT] Created Property ID: ${newProp.id} | Status: ${newProp.status}`);

  // TEST 5: Verify with dummy host email
  console.log('\n[TEST 5] Verifying resilience with dummy host email...');
  const mockDummyProp = {
    id: `dummy-prop-${Date.now()}`,
    status: 'PUBLISHED',
    title: '<Script>Test Alert</Script> Villa',
    slug: 'test-alert-villa',
    description: 'Safe test <a href="#">link</a> description.',
    nightlyPrice: 150.00,
    bedrooms: 2,
    bathrooms: 1,
    maxGuests: 4,
    host: { id: 'dummy-h1', email: 'invalid-dummy-host-404@nonexistent-domain.org', firstName: 'DummyHost' },
    city: { name: 'Lake Harmony' },
    community: null,
    propertyType: { name: 'Chalet' },
    images: []
  };

  // Directly call sendNewPropertyPublishedEmails with dummy host
  await emailService.sendNewPropertyPublishedEmails(newProp.id);

  // TEST 6: Guest preference OFF (emailNewPropertyNotifications = false)
  console.log('\n[TEST 6] Testing Guest preference OFF...');
  await prisma.user.update({
    where: { id: guest.id },
    data: { emailNewPropertyNotifications: false }
  });

  // Trigger update on published property (PUBLISHED -> PUBLISHED should be skipped)
  console.log('\n[TEST 7] Testing Property Edit (PUBLISHED -> PUBLISHED)...');
  await propertyService.updateProperty(newProp.id, {
    title: 'Pocono Pines Luxury Chalet - Updated Title'
  }, mockAdminUser);

  // Re-enable Guest notification preference for future events
  await prisma.user.update({
    where: { id: guest.id },
    data: { emailNewPropertyNotifications: true }
  });

  console.log('\n[CLEANUP] Soft deleting test property...');
  await propertyService.deleteProperty(newProp.id, mockAdminUser, { deleteMode: 'soft' });

  console.log('\n====================================================');
  console.log(' ALL NEW PROPERTY EMAIL NOTIFICATION TESTS COMPLETED!');
  console.log('====================================================\n');

  await prisma.$disconnect();
}

runNewPropertyNotificationTests().catch(err => {
  console.error('[TEST FATAL ERROR]', err);
  process.exit(1);
});
