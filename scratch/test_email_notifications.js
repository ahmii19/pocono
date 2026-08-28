const emailService = require('../server/src/services/emailService');

async function runEmailAuditTest() {
  console.log('====================================================');
  console.log('STARTING END-TO-END EMAIL SYSTEM AUDIT AND VERIFICATION');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      console.log(`[TESTING] ${name}...`);
      await fn();
      console.log(`[PASS] ${name}\n`);
      passed++;
    } catch (e) {
      console.error(`[FAIL] ${name}:`, e.message, '\n');
      failed++;
    }
  }

  // 1. Guest Registration Welcome Email
  await test('1. Guest Registration Welcome Email', async () => {
    const res = await emailService.sendWelcomeEmail({
      id: 'test-guest-id',
      email: 'guest.test@example.com',
      firstName: 'Jane',
      lastName: 'Doe',
      role: 'GUEST'
    }, 'GUEST');
    if (!res) throw new Error('Failed to send guest welcome email');
  });

  // 2. Host Registration Welcome Email
  await test('2. Host Registration Welcome Email', async () => {
    const res = await emailService.sendWelcomeEmail({
      id: 'test-host-id',
      email: 'host.test@example.com',
      firstName: 'John',
      lastName: 'Smith',
      role: 'HOST'
    }, 'HOST');
    if (!res) throw new Error('Failed to send host welcome email');
  });

  // 3. Booking Creation Emails
  await test('3. Booking Creation Emails (Guest & Host)', async () => {
    const mockReservation = {
      id: 'res-12345678-abc',
      checkInDate: new Date('2026-09-01'),
      checkOutDate: new Date('2026-09-05'),
      guestCount: 4,
      grandTotal: 1250.00,
      status: 'PENDING'
    };
    const mockGuest = { id: 'g1', email: 'booking.guest@example.com', firstName: 'Alice', lastName: 'Walker' };
    const mockHost = { id: 'h1', email: 'booking.host@example.com', firstName: 'Bob', lastName: 'Builder' };
    const mockProperty = { id: 'p1', title: 'Mountain Chalet Resort', slug: 'mountain-chalet-resort' };

    await emailService.sendBookingCreatedEmails({
      reservation: mockReservation,
      guest: mockGuest,
      host: mockHost,
      property: mockProperty
    });
  });

  // 4. Payment Proof Submitted Emails
  await test('4. Payment Proof Submitted Emails (Guest & Admin)', async () => {
    const mockReservation = {
      id: 'res-87654321-xyz',
      grandTotal: 950.00,
      paymentTransactionId: 'TXN-998877',
      paymentNote: 'Paid via Zelle'
    };
    const mockGuest = { id: 'g1', email: 'proof.guest@example.com', firstName: 'Charlie' };
    const mockProperty = { id: 'p1', title: 'Lakeside Haven' };

    await emailService.sendPaymentProofSubmittedEmails({
      reservation: mockReservation,
      guest: mockGuest,
      property: mockProperty
    });
  });

  // 5 & 6. Payment Verification Result Emails
  await test('5. Payment Verified (Approved) Emails (Guest & Host)', async () => {
    const mockReservation = {
      id: 'res-verified-11',
      checkInDate: new Date('2026-10-10'),
      checkOutDate: new Date('2026-10-14'),
      grandTotal: 1500.00
    };
    const mockGuest = { id: 'g1', email: 'verified.guest@example.com', firstName: 'David' };
    const mockHost = { id: 'h1', email: 'verified.host@example.com', firstName: 'Emma' };
    const mockProperty = { id: 'p1', title: 'Pine Villa Getaway' };

    await emailService.sendPaymentVerificationResultEmails({
      reservation: mockReservation,
      guest: mockGuest,
      host: mockHost,
      property: mockProperty,
      status: 'VERIFIED'
    });
  });

  await test('6. Payment Verified (Rejected) Email (Guest)', async () => {
    const mockReservation = {
      id: 'res-rejected-22',
      checkInDate: new Date('2026-10-10'),
      checkOutDate: new Date('2026-10-14'),
      grandTotal: 1500.00
    };
    const mockGuest = { id: 'g1', email: 'rejected.guest@example.com', firstName: 'Frank' };
    const mockProperty = { id: 'p1', title: 'Pine Villa Getaway' };

    await emailService.sendPaymentVerificationResultEmails({
      reservation: mockReservation,
      guest: mockGuest,
      host: null,
      property: mockProperty,
      status: 'REJECTED',
      rejectionReason: 'Bank receipt transaction ID mismatch'
    });
  });

  // 7. Host Earning Creation Notification
  await test('7. Host Earning Creation Notification Email', async () => {
    const mockEarning = {
      grossAmount: 1000.00,
      commissionRate: 10.0,
      commissionAmount: 100.00,
      netAmount: 900.00,
      status: 'PENDING'
    };
    const mockHost = { id: 'h1', email: 'earning.host@example.com', firstName: 'George' };
    const mockProperty = { id: 'p1', title: 'Pocono Forest Cabin' };

    await emailService.sendHostEarningCreatedEmail({
      earning: mockEarning,
      host: mockHost,
      property: mockProperty
    });
  });

  // 8. Guest ↔ Host Message Notification
  await test('8. Guest ↔ Host Message Notification Email', async () => {
    const mockRecipient = { id: 'u1', email: 'message.recipient@example.com', firstName: 'Hannah' };
    const mockSender = { id: 'u2', firstName: 'Ian', lastName: 'Wright' };
    const mockProperty = { id: 'p1', title: 'Sunset Lake Retreat' };

    await emailService.sendNewMessageNotificationEmail({
      recipient: mockRecipient,
      sender: mockSender,
      property: mockProperty,
      messageSnippet: 'Is the hot tub heated during winter months?',
      threadId: 'thread-9900'
    });
  });

  // 9. Password Reset Email
  await test('9. Password Reset Email', async () => {
    const mockUser = { id: 'u1', email: 'reset.user@example.com', firstName: 'Isaac' };
    await emailService.sendPasswordResetEmail({
      user: mockUser,
      resetToken: 'mock-jwt-reset-token-12345'
    });
  });

  // 10. Contact Us Emails
  await test('10. Contact Us Form Emails (User & Admin)', async () => {
    const mockContactMsg = {
      id: 'contact-55',
      name: 'Julia Roberts',
      email: 'julia.contact@example.com',
      phone: '555-123-4567',
      subject: 'Inquiry regarding group stays',
      message: 'Hello, do you offer discounts for bookings over 14 nights?'
    };
    await emailService.sendContactUsEmails({ contactMsg: mockContactMsg });
  });

  console.log('====================================================');
  console.log(`EMAIL AUDIT RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) process.exit(1);
}

runEmailAuditTest();
