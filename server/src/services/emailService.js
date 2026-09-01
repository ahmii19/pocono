const nodemailer = require('nodemailer');
const prisma = require('../config/prisma');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@pocono.vacations';
const SMTP_FROM = process.env.SMTP_FROM || 'Pocono Vacations <no-reply@pocono.vacations>';

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  // Default to 465 (SSL) — the most reliable Gmail SMTP port
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  const secure = String(process.env.SMTP_SECURE).toLowerCase() === 'true' || port === 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (user && pass) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass }
    });
  } else {
    // Fallback JSON transport for development without real SMTP credentials
    console.warn('[EMAIL SERVICE] SMTP_USER/SMTP_PASS not set — running in mock (JSON) mode. Emails will NOT be delivered.');
    transporter = nodemailer.createTransport({
      jsonTransport: true
    });
  }

  return transporter;
}

/**
 * Verify SMTP connection — safe to call on startup or from test scripts.
 * Never logs the password. Returns { ok: true } or throws with a clean message.
 */
async function verifySmtp() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    throw new Error('SMTP credentials missing: set SMTP_USER and SMTP_PASS in .env');
  }

  // Force a fresh transporter for verify calls
  transporter = null;
  const t = getTransporter();

  try {
    await t.verify();
    console.log(`[EMAIL SERVICE] SMTP connection verified successfully. User: ${user}`);
    return { ok: true, user };
  } catch (err) {
    // Sanitise error: never print the password
    const safeMessage = err.message
      .replace(process.env.SMTP_PASS || '', '[REDACTED]')
      .replace(/AUTH[^\s]*/gi, 'AUTH [REDACTED]');

    const hint =
      err.code === 'EAUTH'   ? 'Gmail authentication failed — confirm App Password is correct (Google Account → Security → App Passwords).' :
      err.code === 'ENOTFOUND' ? 'SMTP host unreachable — check SMTP_HOST and internet connectivity.' :
      err.code === 'ETIMEDOUT' ? 'SMTP connection timed out — check SMTP_PORT (should be 465) and firewall rules.' :
      'Unexpected SMTP error — check all SMTP_* environment variables.';

    throw new Error(`SMTP connection failed: ${hint}\nDetail: ${safeMessage}`);
  }
}

/**
 * Send a single plain-text test email — for SMTP verification only.
 * Never creates a public endpoint. Call from test scripts only.
 */
async function sendTestEmail(to) {
  if (!to) throw new Error('sendTestEmail requires a recipient address');
  return sendEmail({
    to,
    subject: 'Pocono Vacations SMTP Test',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:8px;">
        <h2 style="color:#059669;">✅ SMTP Configuration Working</h2>
        <p>This is a test email from <strong>Pocono Vacations</strong>.</p>
        <p>If you received this, your Gmail SMTP integration is configured correctly.</p>
        <hr style="border:0;border-top:1px solid #e2e8f0;margin:16px 0;"/>
        <p style="font-size:12px;color:#64748b;">Sent at: ${new Date().toISOString()}</p>
      </div>
    `
  });
}

/**
 * Core send email helper wrapper (never throws uncaught errors to caller)
 */
async function sendEmail({ to, subject, html, text }) {
  if (!to) {
    console.warn('[EMAIL SERVICE WARNING] No recipient address provided for email:', subject);
    return false;
  }

  try {
    const transport = getTransporter();
    const mailOptions = {
      from: SMTP_FROM,
      to,
      subject,
      text: text || html.replace(/<[^>]+>/g, ''),
      html
    };

    const info = await transport.sendMail(mailOptions);

    if (info.message) {
      console.log(`[EMAIL SERVICE] (MOCK/JSON) Sent email to: ${to} | Subject: "${subject}"`);
    } else {
      console.log(`[EMAIL SERVICE] Sent email to: ${to} | MessageId: ${info.messageId} | Subject: "${subject}"`);
    }
    return true;
  } catch (err) {
    console.error(`[EMAIL SERVICE ERROR] Failed to send email to ${to} ("${subject}"):`, err.message);
    return false;
  }
}

/**
 * 1 & 2. Welcome Email for Guest or Host
 */
async function sendWelcomeEmail(user, role) {
  const isHost = (role || user.role) === 'HOST';
  const name = user.firstName ? `${user.firstName}` : 'Valued User';
  const targetRole = isHost ? 'Host' : 'Guest';
  const subject = `Welcome to Pocono Vacations, ${name}!`;

  const dashboardUrl = isHost ? `${FRONTEND_URL}/host` : `${FRONTEND_URL}/dashboard`;
  const actionText = isHost ? 'Go to Host Dashboard' : 'Explore Vacation Rentals';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #0f172a; color: #ffffff; padding: 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">Pocono Vacations</h1>
        <p style="margin: 4px 0 0; opacity: 0.8;">Welcome to our community</p>
      </div>
      <div style="padding: 24px; color: #334155; line-height: 1.6;">
        <h2 style="color: #0f172a;">Hi ${name},</h2>
        <p>Thank you for creating a ${targetRole} account on Pocono Vacations.</p>
        <p>${isHost 
          ? 'You can now start listing your vacation rental property, managing availability, and earning with us.' 
          : 'Discover luxury cabins, chalets, and getaway properties across the Pocono Mountains.'}</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${dashboardUrl}" style="background-color: #059669; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">${actionText}</a>
        </div>
        <p>If you have any questions, our support team is always here to help.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="font-size: 12px; color: #64748b; text-align: center;">© Pocono Vacations. All rights reserved.</p>
      </div>
    </div>
  `;

  return sendEmail({ to: user.email, subject, html });
}

/**
 * 3. Booking Creation Emails (Guest & Host)
 */
async function sendBookingCreatedEmails({ reservation, guest, host, property }) {
  if (!reservation) {
    console.warn('[BOOKING EMAIL WARNING] Missing reservation payload');
    return { guestSuccess: false, hostSuccess: false };
  }

  const resId = reservation.id || 'N/A';
  const propertyTitle = (property && property.title) ? property.title : 'Pocono Property';
  const checkIn = reservation.checkInDate ? new Date(reservation.checkInDate).toLocaleDateString() : 'N/A';
  const checkOut = reservation.checkOutDate ? new Date(reservation.checkOutDate).toLocaleDateString() : 'N/A';
  const total = Number(reservation.grandTotal || 0).toFixed(2);
  const status = reservation.status || 'PENDING';

  console.log(`[BOOKING EMAIL] Processing creation emails for Reservation ID: ${resId}`);
  console.log(`[BOOKING EMAIL] Guest Recipient: ${guest && guest.email ? guest.email : 'MISSING'}`);
  console.log(`[BOOKING EMAIL] Host Recipient: ${host && host.email ? host.email : 'MISSING/NONE'}`);

  let guestSuccess = false;
  let hostSuccess = false;

  // 1. INDEPENDENT GUEST EMAIL ATTEMPT (FIRST)
  if (guest && guest.email) {
    try {
      const guestName = guest.firstName ? `${guest.firstName} ${guest.lastName || ''}`.trim() : guest.email;
      const guestSubject = `Booking Request Received - ${propertyTitle}`;
      const guestUrl = `${FRONTEND_URL}/dashboard`;
      const guestHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #0f172a; color: #ffffff; padding: 24px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">Pocono Vacations</h1>
            <p style="margin: 4px 0 0; opacity: 0.8;">Booking Confirmation Request</p>
          </div>
          <div style="padding: 24px; color: #334155; line-height: 1.6;">
            <h2 style="color: #0f172a;">Hi ${guestName},</h2>
            <p>Your booking request for <strong>${propertyTitle}</strong> has been created successfully!</p>
            <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 16px; margin: 20px 0;">
              <p style="margin: 4px 0;"><strong>Reservation ID:</strong> ${resId}</p>
              <p style="margin: 4px 0;"><strong>Check-In:</strong> ${checkIn}</p>
              <p style="margin: 4px 0;"><strong>Check-Out:</strong> ${checkOut}</p>
              <p style="margin: 4px 0;"><strong>Guests:</strong> ${reservation.guestCount}</p>
              <p style="margin: 4px 0;"><strong>Total Amount:</strong> $${total}</p>
              <p style="margin: 4px 0;"><strong>Status:</strong> <span style="color: #d97706; font-weight: bold;">${status}</span></p>
            </div>
            <p>Please submit your payment proof on your dashboard to complete reservation verification.</p>
            <div style="text-align: center; margin: 28px 0;">
              <a href="${guestUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Booking Dashboard</a>
            </div>
          </div>
        </div>
      `;

      guestSuccess = await sendEmail({ to: guest.email, subject: guestSubject, html: guestHtml });
      console.log(`[BOOKING EMAIL RESULT] Guest email (${guest.email}): ${guestSuccess ? 'SUCCESS' : 'FAILED'}`);
    } catch (err) {
      console.error(`[BOOKING EMAIL ERROR] Guest email attempt failed for reservation ${resId}:`, err.message);
    }
  } else {
    console.warn(`[BOOKING EMAIL WARNING] Guest email skipped: guest object or guest.email is missing for reservation ${resId}`);
  }

  // 2. INDEPENDENT HOST EMAIL ATTEMPT (SECOND)
  if (host && host.email) {
    try {
      const guestName = (guest && guest.firstName) ? `${guest.firstName} ${guest.lastName || ''}`.trim() : (guest ? guest.email : 'Guest');
      const hostName = host.firstName ? `${host.firstName} ${host.lastName || ''}`.trim() : host.email;
      const hostSubject = `New Booking Request for ${propertyTitle}`;
      const hostUrl = `${FRONTEND_URL}/host/properties`;
      const hostHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #0f172a; color: #ffffff; padding: 24px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">Pocono Vacations</h1>
            <p style="margin: 4px 0 0; opacity: 0.8;">New Booking Alert</p>
          </div>
          <div style="padding: 24px; color: #334155; line-height: 1.6;">
            <h2 style="color: #0f172a;">Hi ${hostName},</h2>
            <p>You have a new reservation request for <strong>${propertyTitle}</strong>!</p>
            <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 16px; margin: 20px 0;">
              <p style="margin: 4px 0;"><strong>Guest Name:</strong> ${guestName}</p>
              <p style="margin: 4px 0;"><strong>Check-In:</strong> ${checkIn}</p>
              <p style="margin: 4px 0;"><strong>Check-Out:</strong> ${checkOut}</p>
              <p style="margin: 4px 0;"><strong>Grand Total:</strong> $${total}</p>
            </div>
            <div style="text-align: center; margin: 28px 0;">
              <a href="${hostUrl}" style="background-color: #059669; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Manage Host Reservations</a>
            </div>
          </div>
        </div>
      `;

      hostSuccess = await sendEmail({ to: host.email, subject: hostSubject, html: hostHtml });
      console.log(`[BOOKING EMAIL RESULT] Host email (${host.email}): ${hostSuccess ? 'SUCCESS' : 'FAILED'}`);
    } catch (err) {
      console.error(`[BOOKING EMAIL ERROR] Host email attempt failed for reservation ${resId}:`, err.message);
    }
  } else {
    console.log(`[BOOKING EMAIL INFO] Host email skipped for reservation ${resId}: host object or host.email is missing/dummy`);
  }

  return { guestSuccess, hostSuccess };
}

/**
 * 4. Payment Proof Submitted Emails (Guest & Admin)
 */
async function sendPaymentProofSubmittedEmails({ reservation, guest, property }) {
  const guestName = guest.firstName ? `${guest.firstName} ${guest.lastName || ''}`.trim() : guest.email;
  const propertyTitle = property ? property.title : 'Pocono Property';
  const total = Number(reservation.grandTotal || 0).toFixed(2);

  // Guest Confirmation
  const guestSubject = `Payment Proof Received - Reservation #${reservation.id.substring(0, 8)}`;
  const guestHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #0f172a; color: #ffffff; padding: 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">Pocono Vacations</h1>
        <p style="margin: 4px 0 0; opacity: 0.8;">Payment Proof Under Review</p>
      </div>
      <div style="padding: 24px; color: #334155; line-height: 1.6;">
        <h2 style="color: #0f172a;">Hi ${guestName},</h2>
        <p>We have received your payment proof submission for <strong>${propertyTitle}</strong>.</p>
        <p>Our administration team is currently reviewing your payment details. You will receive an email as soon as verification is complete.</p>
        <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 16px; margin: 20px 0;">
          <p style="margin: 4px 0;"><strong>Reservation ID:</strong> ${reservation.id}</p>
          <p style="margin: 4px 0;"><strong>Transaction ID:</strong> ${reservation.paymentTransactionId || 'N/A'}</p>
          <p style="margin: 4px 0;"><strong>Total Amount:</strong> $${total}</p>
          <p style="margin: 4px 0;"><strong>Verification Status:</strong> <span style="color: #2563eb; font-weight: bold;">SUBMITTED</span></p>
        </div>
      </div>
    </div>
  `;
  // Admin Alert Email
  const adminSubject = `[ACTION REQUIRED] New Payment Proof Submitted - Reservation #${reservation.id.substring(0, 8)}`;
  const adminUrl = `${FRONTEND_URL}/admin/reservations`;
  const adminHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #991b1b; color: #ffffff; padding: 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">Pocono Admin Alert</h1>
        <p style="margin: 4px 0 0; opacity: 0.9;">Payment Verification Needed</p>
      </div>
      <div style="padding: 24px; color: #334155; line-height: 1.6;">
        <h2 style="color: #0f172a;">New Payment Proof Submission</h2>
        <p>Guest <strong>${guestName}</strong> (${guest.email}) has uploaded payment proof for <strong>${propertyTitle}</strong>.</p>
        <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 16px; margin: 20px 0;">
          <p style="margin: 4px 0;"><strong>Reservation ID:</strong> ${reservation.id}</p>
          <p style="margin: 4px 0;"><strong>Amount:</strong> $${total}</p>
          <p style="margin: 4px 0;"><strong>Transaction ID:</strong> ${reservation.paymentTransactionId || 'N/A'}</p>
          <p style="margin: 4px 0;"><strong>Note:</strong> ${reservation.paymentNote || 'None'}</p>
        </div>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${adminUrl}" style="background-color: #991b1b; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Review in Admin Panel</a>
        </div>
      </div>
    </div>
  `;

  // Guest Confirmation & Admin Alert Emails in Parallel
  await Promise.all([
    sendEmail({ to: guest.email, subject: guestSubject, html: guestHtml }),
    sendEmail({ to: ADMIN_EMAIL, subject: adminSubject, html: adminHtml })
  ]);
}

/**
 * 5 & 6. Admin Payment Verification & Reservation Confirmation (Approved or Rejected)
 */
async function sendPaymentVerificationResultEmails({ reservation, guest, host, property, status, rejectionReason }) {
  const guestName = guest.firstName ? `${guest.firstName} ${guest.lastName || ''}`.trim() : guest.email;
  const hostName = host ? (host.firstName ? `${host.firstName} ${host.lastName || ''}`.trim() : host.email) : 'Host';
  const propertyTitle = property ? property.title : 'Pocono Property';
  const checkIn = new Date(reservation.checkInDate).toLocaleDateString();
  const checkOut = new Date(reservation.checkOutDate).toLocaleDateString();

  if (status === 'VERIFIED') {
    // Payment Approved / Confirmed
    const guestSubject = `Reservation Confirmed! - ${propertyTitle}`;
    const guestHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #059669; color: #ffffff; padding: 24px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">Booking Confirmed!</h1>
          <p style="margin: 4px 0 0; opacity: 0.9;">Pocono Vacations</p>
        </div>
        <div style="padding: 24px; color: #334155; line-height: 1.6;">
          <h2 style="color: #0f172a;">Great news, ${guestName}!</h2>
          <p>Your payment has been verified and your reservation for <strong>${propertyTitle}</strong> is now <strong style="color: #059669;">CONFIRMED</strong>.</p>
          <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 6px; padding: 16px; margin: 20px 0;">
            <p style="margin: 4px 0;"><strong>Reservation ID:</strong> ${reservation.id}</p>
            <p style="margin: 4px 0;"><strong>Check-In:</strong> ${checkIn}</p>
            <p style="margin: 4px 0;"><strong>Check-Out:</strong> ${checkOut}</p>
            <p style="margin: 4px 0;"><strong>Total Paid:</strong> $${Number(reservation.grandTotal).toFixed(2)}</p>
          </div>
          <p>We look forward to hosting your stay in the Poconos!</p>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${FRONTEND_URL}/dashboard" style="background-color: #059669; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Reservation Details</a>
          </div>
        </div>
      </div>
    `;

    const promises = [
      sendEmail({ to: guest.email, subject: guestSubject, html: guestHtml })
    ];

    if (host && host.email) {
      const hostSubject = `Reservation Confirmed for ${propertyTitle}`;
      const hostHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #0f172a; color: #ffffff; padding: 24px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">Pocono Vacations</h1>
            <p style="margin: 4px 0 0; opacity: 0.8;">Confirmed Reservation</p>
          </div>
          <div style="padding: 24px; color: #334155; line-height: 1.6;">
            <h2 style="color: #0f172a;">Hi ${hostName},</h2>
            <p>Payment has been verified for the reservation at <strong>${propertyTitle}</strong> by guest <strong>${guestName}</strong>.</p>
            <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 16px; margin: 20px 0;">
              <p style="margin: 4px 0;"><strong>Guest:</strong> ${guestName}</p>
              <p style="margin: 4px 0;"><strong>Check-In:</strong> ${checkIn}</p>
              <p style="margin: 4px 0;"><strong>Check-Out:</strong> ${checkOut}</p>
              <p style="margin: 4px 0;"><strong>Status:</strong> <strong style="color: #059669;">CONFIRMED</strong></p>
            </div>
            <div style="text-align: center; margin: 28px 0;">
              <a href="${FRONTEND_URL}/host/properties" style="background-color: #0f172a; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Host Dashboard</a>
            </div>
          </div>
        </div>
      `;
      promises.push(sendEmail({ to: host.email, subject: hostSubject, html: hostHtml }));
    }

    await Promise.all(promises);
  } else if (status === 'REJECTED') {
    // Payment Rejected
    const guestSubject = `Action Required: Payment Proof Status Update`;
    const guestHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #dc2626; color: #ffffff; padding: 24px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">Payment Proof Update</h1>
          <p style="margin: 4px 0 0; opacity: 0.9;">Pocono Vacations</p>
        </div>
        <div style="padding: 24px; color: #334155; line-height: 1.6;">
          <h2 style="color: #0f172a;">Hi ${guestName},</h2>
          <p>Unfortunately, your payment proof for <strong>${propertyTitle}</strong> could not be verified.</p>
          <div style="background-color: #fef2f2; border: 1px solid #fca5a5; border-radius: 6px; padding: 16px; margin: 20px 0;">
            <p style="margin: 4px 0; color: #991b1b;"><strong>Reason for Rejection:</strong></p>
            <p style="margin: 4px 0; color: #7f1d1d;">${rejectionReason || 'Invalid or unreadable payment document.'}</p>
          </div>
          <p>Please re-upload a valid payment receipt or contact support.</p>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${FRONTEND_URL}/dashboard" style="background-color: #dc2626; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Re-upload Payment Proof</a>
          </div>
        </div>
      </div>
    `;
    await sendEmail({ to: guest.email, subject: guestSubject, html: guestHtml });
  }
}

/**
 * 7. Host Earning Creation Notification
 */
async function sendHostEarningCreatedEmail({ earning, host, property }) {
  if (!host || !host.email) return;

  const hostName = host.firstName ? `${host.firstName}` : 'Host';
  const propertyTitle = property ? property.title : 'Pocono Property';
  const netAmount = Number(earning.netAmount || 0).toFixed(2);
  const grossAmount = Number(earning.grossAmount || 0).toFixed(2);
  const commission = Number(earning.commissionAmount || 0).toFixed(2);

  const subject = `Host Earning Credited - $${netAmount} (${propertyTitle})`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #0f172a; color: #ffffff; padding: 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">Pocono Vacations</h1>
        <p style="margin: 4px 0 0; opacity: 0.8;">Host Earning Notice</p>
      </div>
      <div style="padding: 24px; color: #334155; line-height: 1.6;">
        <h2 style="color: #0f172a;">Hi ${hostName},</h2>
        <p>A new earning has been credited to your host account for <strong>${propertyTitle}</strong>!</p>
        <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 16px; margin: 20px 0;">
          <p style="margin: 4px 0;"><strong>Gross Booking Total:</strong> $${grossAmount}</p>
          <p style="margin: 4px 0;"><strong>Platform Fee (${earning.commissionRate}%):</strong> -$${commission}</p>
          <p style="margin: 4px 0; font-size: 16px;"><strong>Net Host Payout:</strong> <span style="color: #059669; font-weight: bold;">$${netAmount}</span></p>
          <p style="margin: 4px 0;"><strong>Earning Status:</strong> ${earning.status}</p>
        </div>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${FRONTEND_URL}/host/properties" style="background-color: #059669; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Host Earnings</a>
        </div>
      </div>
    </div>
  `;

  return sendEmail({ to: host.email, subject, html });
}

/**
 * 8. Guest ↔ Host Message Notification
 */
async function sendNewMessageNotificationEmail({ recipient, sender, property, messageSnippet, threadId }) {
  if (!recipient || !recipient.email) return;

  const recipientName = recipient.firstName ? `${recipient.firstName}` : 'User';
  const senderName = sender ? `${sender.firstName || ''} ${sender.lastName || ''}`.trim() || 'User' : 'Someone';
  const propertyTitle = property ? property.title : 'Property Inquiry';

  const chatUrl = threadId ? `${FRONTEND_URL}/messages/${threadId}` : `${FRONTEND_URL}/messages`;
  const subject = `New Message from ${senderName} - ${propertyTitle}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #0f172a; color: #ffffff; padding: 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">Pocono Vacations</h1>
        <p style="margin: 4px 0 0; opacity: 0.8;">New Message Notification</p>
      </div>
      <div style="padding: 24px; color: #334155; line-height: 1.6;">
        <h2 style="color: #0f172a;">Hi ${recipientName},</h2>
        <p><strong>${senderName}</strong> sent you a message regarding <strong>${propertyTitle}</strong>:</p>
        <div style="background-color: #f1f5f9; border-left: 4px solid #2563eb; padding: 16px; margin: 20px 0; font-style: italic;">
          "${messageSnippet}"
        </div>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${chatUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Open Full Chat</a>
        </div>
      </div>
    </div>
  `;

  return sendEmail({ to: recipient.email, subject, html });
}

/**
 * 9. Password Reset Email
 */
async function sendPasswordResetEmail({ user, resetToken }) {
  const name = user.firstName ? `${user.firstName}` : 'User';
  const resetUrl = `${FRONTEND_URL}/reset-password?token=${resetToken}`;
  const subject = `Reset Your Pocono Vacations Password`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #0f172a; color: #ffffff; padding: 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">Pocono Vacations</h1>
        <p style="margin: 4px 0 0; opacity: 0.8;">Password Reset Request</p>
      </div>
      <div style="padding: 24px; color: #334155; line-height: 1.6;">
        <h2 style="color: #0f172a;">Hi ${name},</h2>
        <p>We received a request to reset your account password. Click the button below to choose a new password:</p>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${resetUrl}" style="background-color: #dc2626; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
        </div>
        <p style="font-size: 13px; color: #64748b;">If you did not request a password reset, you can safely ignore this email.</p>
      </div>
    </div>
  `;

  return sendEmail({ to: user.email, subject, html });
}

/**
 * 10. Contact Us Emails (User & Admin)
 */
async function sendContactUsEmails({ contactMsg }) {
  const { name, email, phone, subject: inquirySubject, message } = contactMsg;

  // User Confirmation
  const userSubject = `We Received Your Inquiry - Pocono Vacations`;
  const userHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #0f172a; color: #ffffff; padding: 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">Pocono Vacations</h1>
        <p style="margin: 4px 0 0; opacity: 0.8;">Inquiry Confirmation</p>
      </div>
      <div style="padding: 24px; color: #334155; line-height: 1.6;">
        <h2 style="color: #0f172a;">Hi ${name},</h2>
        <p>Thank you for reaching out to Pocono Vacations! We have received your message regarding "<strong>${inquirySubject}</strong>".</p>
        <p>A team member will review your inquiry and get back to you as soon as possible.</p>
        <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 16px; margin: 20px 0;">
          <p style="margin: 4px 0;"><strong>Subject:</strong> ${inquirySubject}</p>
          <p style="margin: 4px 0;"><strong>Your Message:</strong></p>
          <p style="margin: 4px 0; font-style: italic;">"${message}"</p>
        </div>
      </div>
    </div>
  `;
  await sendEmail({ to: email, subject: userSubject, html: userHtml });

  // Admin Notification
  const adminSubject = `[CONTACT FORM] New Inquiry from ${name}`;
  const adminHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #0f172a; color: #ffffff; padding: 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">Pocono Support Alert</h1>
        <p style="margin: 4px 0 0; opacity: 0.8;">New Contact Us Submission</p>
      </div>
      <div style="padding: 24px; color: #334155; line-height: 1.6;">
        <h2 style="color: #0f172a;">Contact Inquiry Details</h2>
        <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 16px; margin: 20px 0;">
          <p style="margin: 4px 0;"><strong>Name:</strong> ${name}</p>
          <p style="margin: 4px 0;"><strong>Email:</strong> ${email}</p>
          <p style="margin: 4px 0;"><strong>Phone:</strong> ${phone || 'Not provided'}</p>
          <p style="margin: 4px 0;"><strong>Subject:</strong> ${inquirySubject}</p>
          <p style="margin: 4px 0;"><strong>Message:</strong></p>
          <p style="margin: 4px 0; background: #ffffff; padding: 10px; border-radius: 4px;">${message}</p>
        </div>
      </div>
    </div>
  `;
  await sendEmail({ to: ADMIN_EMAIL, subject: adminSubject, html: adminHtml });
}

/**
 * 11. New Property Published Emails (Guests & Host)
 */
async function sendNewPropertyPublishedEmails(propertyId) {
  if (!propertyId) return;

  try {
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        host: { select: { id: true, firstName: true, lastName: true, email: true } },
        city: { select: { name: true } },
        community: { select: { name: true } },
        propertyType: { select: { name: true } },
        images: { take: 1, orderBy: { displayOrder: 'asc' } }
      }
    });

    if (!property || property.status !== 'PUBLISHED') {
      console.log(`[PROPERTY EMAIL INFO] Property ${propertyId} is not in PUBLISHED status. Skipping notifications.`);
      return;
    }

    const title = property.title || 'Vacation Rental';
    const escapedTitle = title.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const location = [property.city?.name, property.community?.name, property.address].filter(Boolean).join(', ') || 'Pocono Mountains, PA';
    const escapedLocation = location.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const propertyTypeStr = property.propertyType?.name || 'Vacation Home';

    const rawDesc = property.description || '';
    const cleanDesc = rawDesc.replace(/<[^>]+>/g, '').trim().substring(0, 180);
    const snippet = cleanDesc ? `${cleanDesc}...` : 'Explore this incredible new vacation rental in the Pocono Mountains.';
    const escapedSnippet = snippet.replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const price = property.nightlyPrice ? `$${Number(property.nightlyPrice).toFixed(2)}` : 'Contact for pricing';
    const bedrooms = property.bedrooms || 1;
    const bathrooms = Number(property.bathrooms || 1);
    const maxGuests = property.maxGuests || 1;

    let imageUrl = '';
    if (property.images && property.images.length > 0 && property.images[0].imageUrl) {
      const origUrl = property.images[0].imageUrl;
      imageUrl = origUrl.startsWith('http') ? origUrl : `${FRONTEND_URL}${origUrl.startsWith('/') ? '' : '/'}${origUrl}`;
    }

    const propertyUrl = `${FRONTEND_URL}/listing/${property.slug || property.id}`;

    console.log(`[PROPERTY EMAIL] Starting publication notification dispatch for Property ID: ${property.id} ("${title}")`);

    // 1. HOST NOTIFICATION ("Your Property Has Been Published")
    if (property.host && property.host.email) {
      try {
        const hostName = property.host.firstName ? `${property.host.firstName}` : 'Host';
        const hostSubject = `Your Property Has Been Published - ${title}`;
        const hostDashboardUrl = `${FRONTEND_URL}/host/properties`;

        const hostHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #0f172a; color: #ffffff; padding: 24px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px;">Pocono Vacations</h1>
              <p style="margin: 4px 0 0; opacity: 0.8;">Property Published Notice</p>
            </div>
            <div style="padding: 24px; color: #334155; line-height: 1.6;">
              <h2 style="color: #0f172a;">Hi ${hostName},</h2>
              <p>Great news! Your property <strong>${escapedTitle}</strong> is now live and <strong style="color: #059669;">PUBLISHED</strong> on Pocono Vacations.</p>
              <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 16px; margin: 20px 0;">
                <p style="margin: 4px 0;"><strong>Property Title:</strong> ${escapedTitle}</p>
                <p style="margin: 4px 0;"><strong>Location:</strong> ${escapedLocation}</p>
                <p style="margin: 4px 0;"><strong>Nightly Rate:</strong> ${price}</p>
                <p style="margin: 4px 0;"><strong>Status:</strong> <span style="color: #059669; font-weight: bold;">PUBLISHED</span></p>
              </div>
              <div style="text-align: center; margin: 28px 0;">
                <a href="${propertyUrl}" style="background-color: #059669; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; margin-right: 8px;">View My Listing</a>
                <a href="${hostDashboardUrl}" style="background-color: #0f172a; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Host Dashboard</a>
              </div>
            </div>
          </div>
        `;

        const hostRes = await sendEmail({ to: property.host.email, subject: hostSubject, html: hostHtml });
        console.log(`[PROPERTY EMAIL] Host Notification to ${property.host.email}: ${hostRes ? 'SUCCESS' : 'FAILED'}`);
      } catch (err) {
        console.error(`[PROPERTY EMAIL ERROR] Host notification failed for property ${property.id}:`, err.message);
      }
    } else {
      console.log(`[PROPERTY EMAIL INFO] Host email skipped for property ${property.id}: host object or host.email is missing`);
    }

    // 2. GUEST MARKETING NOTIFICATION ("New Vacation Rental Available")
    const hostEmail = property.host?.email ? property.host.email.toLowerCase() : null;

    const eligibleGuests = await prisma.user.findMany({
      where: {
        role: 'GUEST',
        emailNewPropertyNotifications: true,
        OR: [
          { status: { not: 'DELETED' } },
          { status: null }
        ],
        ...(property.hostId && { id: { not: property.hostId } }),
        ...(hostEmail && { email: { not: hostEmail } })
      },
      select: { id: true, email: true, firstName: true }
    });

    console.log(`[PROPERTY EMAIL DEBUG]`);
    console.log(`Eligible Guest Count: ${eligibleGuests.length}`);
    console.log(`Guest Emails: ${eligibleGuests.map(g => g.email).join(', ')}`);

    if (eligibleGuests.length === 0) {
      console.log(`[PROPERTY EMAIL] No eligible guests found with email preferences enabled.`);
      return;
    }

    const guestSubject = `New Vacation Rental Available - ${title}`;

    const guestPromises = eligibleGuests.map(async (guest) => {
      if (!guest.email) return false;

      console.log(`[PROPERTY EMAIL] Guest Recipient: ${guest.email}`);

      try {
        const guestName = guest.firstName ? `${guest.firstName}` : 'Valued Guest';
        const guestHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #0f172a; color: #ffffff; padding: 24px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px;">Pocono Vacations</h1>
              <p style="margin: 4px 0 0; opacity: 0.8;">New Vacation Rental Announcement</p>
            </div>
            ${imageUrl ? `<div style="text-align: center; background-color: #f1f5f9;"><img src="${imageUrl}" alt="${escapedTitle}" style="width: 100%; max-height: 280px; object-fit: cover; display: block;" /></div>` : ''}
            <div style="padding: 24px; color: #334155; line-height: 1.6;">
              <h2 style="color: #0f172a; margin-top: 0;">Hi ${guestName},</h2>
              <p>A brand new vacation rental has just been listed in the Poconos!</p>
              <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 16px; margin: 20px 0;">
                <h3 style="margin: 0 0 8px; color: #0f172a;">${escapedTitle}</h3>
                <p style="margin: 4px 0; color: #64748b;">📍 ${escapedLocation} (${propertyTypeStr})</p>
                <p style="margin: 8px 0; color: #334155; font-style: italic;">"${escapedSnippet}"</p>
                <div style="margin-top: 12px; font-weight: bold; color: #059669;">
                  🛏️ ${bedrooms} Beds &nbsp;|&nbsp; 🛁 ${bathrooms} Baths &nbsp;|&nbsp; 👥 Up to ${maxGuests} Guests &nbsp;|&nbsp; 💵 ${price}/night
                </div>
              </div>
              <div style="text-align: center; margin: 28px 0;">
                <a href="${propertyUrl}" style="background-color: #059669; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Property Details</a>
              </div>
              <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
              <p style="font-size: 11px; color: #94a3b8; text-align: center;">You are receiving this because you subscribed to new rental alerts on Pocono Vacations. You can update your preferences anytime in your account dashboard.</p>
            </div>
          </div>
        `;

        return await sendEmail({ to: guest.email, subject: guestSubject, html: guestHtml });
      } catch (err) {
        console.error(`[PROPERTY EMAIL ERROR] Failed to send to ${guest.email}:`, err.message);
        return false;
      }
    });

    const results = await Promise.allSettled(guestPromises);
    const successCount = results.filter(r => r.status === 'fulfilled' && r.value === true).length;
    const failCount = eligibleGuests.length - successCount;

    console.log(`[PROPERTY EMAIL SUMMARY] Property ${property.id}: ${successCount} successful, ${failCount} failed out of ${eligibleGuests.length} guests.`);
  } catch (err) {
    console.error(`[PROPERTY EMAIL FATAL ERROR] Failed to process property published emails for ${propertyId}:`, err.message);
  }
}

/**
 * Trigger helper for status transitions: ONLY fires when previousStatus !== 'PUBLISHED' && newStatus === 'PUBLISHED'
 */
function notifyNewPropertyPublished(propertyId, previousStatus, newStatus) {
  const normPrev = previousStatus ? String(previousStatus).toUpperCase() : null;
  const normNew = newStatus ? String(newStatus).toUpperCase() : null;

  const willTrigger = normNew === 'PUBLISHED' && normPrev !== 'PUBLISHED';

  console.log('\n[PROPERTY EMAIL DEBUG]');
  console.log(`Property ID: ${propertyId}`);
  console.log(`Previous Status: ${normPrev}`);
  console.log(`New Status: ${normNew}`);
  console.log(`Notification Trigger Called: ${willTrigger}`);

  if (willTrigger) {
    console.log(`[PROPERTY EMAIL TRIGGER] Property ${propertyId} published (previous: ${normPrev}, new: ${normNew}). Initiating async emails...`);
    sendNewPropertyPublishedEmails(propertyId).catch(err => {
      console.error('[PROPERTY EMAIL TRIGGER ERROR]', err.message);
    });
  } else {
    console.log(`[PROPERTY EMAIL TRIGGER SKIPPED] Property ${propertyId} transition (${normPrev} -> ${normNew}) does not qualify for new publication emails.`);
  }
}

/**
 * 3.5. Online Payment Received Emails (Guest & Admin) for Stripe / PayPal
 */
async function sendOnlinePaymentReceivedEmails({ reservation, guest, property, gateway }) {
  if (!reservation || !guest || !guest.email) return;

  const resId = reservation.id || 'N/A';
  const shortId = typeof resId === 'string' ? resId.substring(0, 8) : 'N/A';
  const propertyTitle = (property && property.title) ? property.title : 'Pocono Property';
  const guestName = guest.firstName ? `${guest.firstName} ${guest.lastName || ''}`.trim() : guest.email;
  const total = Number(reservation.grandTotal || 0).toFixed(2);
  const gatewayName = gateway ? String(gateway).toUpperCase() : 'ONLINE_GATEWAY';

  // EMAIL 1 — GUEST
  const guestSubject = `Payment Received — Awaiting Verification | Reservation #${shortId}`;
  const guestHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #0f172a; color: #ffffff; padding: 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">Pocono Vacations</h1>
        <p style="margin: 4px 0 0; opacity: 0.8;">Payment Received — Pending Verification</p>
      </div>
      <div style="padding: 24px; color: #334155; line-height: 1.6;">
        <h2 style="color: #0f172a;">Hi ${guestName},</h2>
        <p>Thank you! Your payment for <strong>${propertyTitle}</strong> has been received successfully via <strong>${gatewayName}</strong>.</p>
        <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 14px; margin: 20px 0; color: #92400e; font-size: 13px;">
          <strong>Important Note:</strong> Your payment was received, but your reservation is currently <strong>awaiting Admin verification</strong>. Please do not consider your booking confirmed until verification is complete. You will receive an official confirmation email once approved by our administration team.
        </div>
        <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 16px; margin: 20px 0;">
          <p style="margin: 4px 0;"><strong>Reservation ID:</strong> ${resId}</p>
          <p style="margin: 4px 0;"><strong>Property:</strong> ${propertyTitle}</p>
          <p style="margin: 4px 0;"><strong>Payment Method:</strong> ${gatewayName}</p>
          <p style="margin: 4px 0;"><strong>Amount Paid:</strong> $${total}</p>
          <p style="margin: 4px 0;"><strong>Status:</strong> <span style="color: #d97706; font-weight: bold;">PENDING PAYMENT / AWAITING VERIFICATION</span></p>
        </div>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${FRONTEND_URL}/dashboard" style="background-color: #0f172a; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Booking Dashboard</a>
        </div>
      </div>
    </div>
  `;
  // EMAIL 2 — ADMIN
  const adminSubject = `[ACTION REQUIRED] Online Payment Received — Reservation #${shortId}`;
  const adminUrl = `${FRONTEND_URL}/admin/reservations/${resId}`;
  const adminHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #0f172a; color: #ffffff; padding: 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">Pocono Admin Alert</h1>
        <p style="margin: 4px 0 0; opacity: 0.9;">Online Payment Verification Needed</p>
      </div>
      <div style="padding: 24px; color: #334155; line-height: 1.6;">
        <h2 style="color: #0f172a;">Online Payment Completed</h2>
        <p>Guest <strong>${guestName}</strong> (${guest.email}) has completed payment via <strong>${gatewayName}</strong> for <strong>${propertyTitle}</strong>.</p>
        <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 16px; margin: 20px 0;">
          <p style="margin: 4px 0;"><strong>Reservation ID:</strong> ${resId}</p>
          <p style="margin: 4px 0;"><strong>Guest Name:</strong> ${guestName}</p>
          <p style="margin: 4px 0;"><strong>Guest Email:</strong> ${guest.email}</p>
          <p style="margin: 4px 0;"><strong>Payment Gateway:</strong> ${gatewayName}</p>
          <p style="margin: 4px 0;"><strong>Amount Paid:</strong> $${total}</p>
          <p style="margin: 4px 0;"><strong>Payment Status:</strong> <span style="color: #059669; font-weight: bold;">COMPLETED</span></p>
          <p style="margin: 4px 0;"><strong>Reservation Status:</strong> <span style="color: #d97706; font-weight: bold;">PENDING_PAYMENT</span></p>
          <p style="margin: 4px 0;"><strong>Verification Status:</strong> <span style="color: #2563eb; font-weight: bold;">SUBMITTED</span></p>
        </div>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${adminUrl}" style="background-color: #059669; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Verify in Admin Panel</a>
        </div>
      </div>
    </div>
  `;

  await Promise.all([
    sendEmail({ to: guest.email, subject: guestSubject, html: guestHtml }),
    sendEmail({ to: ADMIN_EMAIL, subject: adminSubject, html: adminHtml })
  ]);
}

/**
 * 12. Reservation Cancelled Email (Guest & Host depending on property ownership)
 */
async function sendReservationCancelledEmail({ reservation, guest, host: hostInput, property: propInput, reason, notifyGuest = true, notifyHost = true }) {
  if (!reservation) return;

  let guestUser = guest || reservation.guest;
  let property = propInput || reservation.property;
  let hostUser = hostInput || reservation.host || (property ? property.host : null);

  if ((!guestUser || !property || !hostUser) && reservation.id) {
    try {
      const fullRes = await prisma.reservation.findUnique({
        where: { id: reservation.id },
        include: {
          guest: true,
          property: { include: { host: true } },
          host: true
        }
      });
      if (fullRes) {
        if (!guestUser) guestUser = fullRes.guest;
        if (!property) property = fullRes.property;
        if (!hostUser) hostUser = fullRes.host || (fullRes.property ? fullRes.property.host : null);
      }
    } catch (e) {
      console.error('[EMAIL SERVICE ERROR] Failed to fetch full reservation details:', e.message);
    }
  }

  if (!guestUser || !guestUser.email) return;

  const resId = reservation.id || 'N/A';
  const shortId = typeof resId === 'string' ? resId.substring(0, 8) : 'N/A';
  const propertyTitle = (property && property.title) ? property.title : 'Pocono Property';
  const guestName = guestUser.firstName ? `${guestUser.firstName} ${guestUser.lastName || ''}`.trim() : guestUser.email;
  const checkIn = reservation.checkInDate ? new Date(reservation.checkInDate).toLocaleDateString() : 'N/A';
  const checkOut = reservation.checkOutDate ? new Date(reservation.checkOutDate).toLocaleDateString() : 'N/A';
  const guestsCount = reservation.guestCount || reservation.guests || 1;
  const total = Number(reservation.grandTotal || 0).toFixed(2);
  const cancelReason = reason && String(reason).trim() ? String(reason).trim() : 'No reason was provided by the administrator.';
  const safeCancelReason = cancelReason.replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const adminEmailNorm = (ADMIN_EMAIL || 'admin@pocono.vacations').trim().toLowerCase();
  const guestEmailNorm = guestUser.email.trim().toLowerCase();
  const hostEmailNorm = hostUser && hostUser.email ? hostUser.email.trim().toLowerCase() : null;

  // Property Owner Host Check: ONLY send Host notification if property owner role is HOST and not ADMIN
  const isHostOwned = hostUser && hostUser.role === 'HOST' && hostEmailNorm && hostEmailNorm !== adminEmailNorm && hostEmailNorm !== guestEmailNorm;

  const guestSubject = `Your Pocono.Vacations Reservation Was Cancelled`;
  const guestHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #dc2626; color: #ffffff; padding: 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">Reservation Cancelled</h1>
        <p style="margin: 4px 0 0; opacity: 0.9;">Pocono Vacations</p>
      </div>
      <div style="padding: 24px; color: #334155; line-height: 1.6;">
        <h2 style="color: #0f172a;">Hi ${guestName},</h2>
        <p>Your reservation for <strong>${propertyTitle}</strong> has been <strong style="color: #dc2626;">CANCELLED</strong> by Pocono.Vacations.</p>
        <div style="background-color: #fef2f2; border: 1px solid #fca5a5; border-radius: 6px; padding: 16px; margin: 20px 0;">
          <p style="margin: 4px 0;"><strong>Reservation ID:</strong> ${resId}</p>
          <p style="margin: 4px 0;"><strong>Property:</strong> ${propertyTitle}</p>
          <p style="margin: 4px 0;"><strong>Check-In:</strong> ${checkIn}</p>
          <p style="margin: 4px 0;"><strong>Check-Out:</strong> ${checkOut}</p>
          <p style="margin: 4px 0;"><strong>Guests:</strong> ${guestsCount}</p>
          <p style="margin: 4px 0;"><strong>Grand Total:</strong> $${total}</p>
          <p style="margin: 4px 0;"><strong>Cancellation Reason:</strong> ${safeCancelReason}</p>
        </div>
        <p style="font-size: 13px; color: #64748b;">If you have any questions regarding this cancellation, please contact our support team.</p>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${FRONTEND_URL}/dashboard" style="background-color: #0f172a; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Account Dashboard</a>
        </div>
      </div>
    </div>
  `;

  const sendPromises = [];

  if (notifyGuest !== false) {
    sendPromises.push(sendEmail({ to: guestUser.email, subject: guestSubject, html: guestHtml }));
  }

  if (notifyHost !== false && isHostOwned) {
    const hostName = hostUser.firstName ? `${hostUser.firstName} ${hostUser.lastName || ''}`.trim() : hostUser.email;
    const hostSubject = `Reservation Cancelled — ${propertyTitle}`;
    const hostHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #0f172a; color: #ffffff; padding: 24px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">Pocono Vacations</h1>
          <p style="margin: 4px 0 0; opacity: 0.8;">Reservation Cancellation Notice</p>
        </div>
        <div style="padding: 24px; color: #334155; line-height: 1.6;">
          <h2 style="color: #0f172a;">Hi ${hostName},</h2>
          <p>The reservation at <strong>${propertyTitle}</strong> by guest <strong>${guestName}</strong> has been <strong style="color: #dc2626;">CANCELLED</strong>.</p>
          <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 16px; margin: 20px 0;">
            <p style="margin: 4px 0;"><strong>Reservation ID:</strong> ${resId}</p>
            <p style="margin: 4px 0;"><strong>Guest Name:</strong> ${guestName}</p>
            <p style="margin: 4px 0;"><strong>Check-In:</strong> ${checkIn}</p>
            <p style="margin: 4px 0;"><strong>Check-Out:</strong> ${checkOut}</p>
            <p style="margin: 4px 0;"><strong>Guests:</strong> ${guestsCount}</p>
            <p style="margin: 4px 0;"><strong>Status:</strong> <span style="color: #dc2626; font-weight: bold;">CANCELLED</span></p>
            <p style="margin: 4px 0;"><strong>Reason:</strong> ${safeCancelReason}</p>
          </div>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${FRONTEND_URL}/host/properties" style="background-color: #0f172a; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Host Dashboard</a>
          </div>
        </div>
      </div>
    `;
    sendPromises.push(sendEmail({ to: hostUser.email, subject: hostSubject, html: hostHtml }));
    console.log(`[RESERVATION EMAIL]\nEvent: CANCELLED\nReservation: ${resId}\nGuest: ${guestEmailNorm}\nHost: ${hostEmailNorm}\nHost Role: HOST\nAdmin Notification: SKIPPED`);
  } else {
    console.log(`[RESERVATION EMAIL]\nEvent: CANCELLED\nReservation: ${resId}\nGuest: ${guestEmailNorm}\nProperty Owner Role: ${hostUser ? hostUser.role : 'ADMIN/MISSING'}\nGuest Notification: ${notifyGuest ? 'SENT' : 'UNCHECKED'}\nHost Notification: ${notifyHost ? (isHostOwned ? 'SENT' : 'SKIPPED_ADMIN') : 'UNCHECKED'}`);
  }

  if (sendPromises.length > 0) {
    await Promise.allSettled(sendPromises);
  }
}

/**
 * 12B. Reservation Rejected Email (Guest & Host depending on property ownership)
 */
async function sendReservationRejectedEmail({ reservation, guest, host: hostInput, property: propInput, reason, notifyGuest = true, notifyHost = true }) {
  if (!reservation) return;

  let guestUser = guest || reservation.guest;
  let property = propInput || reservation.property;
  let hostUser = hostInput || reservation.host || (property ? property.host : null);

  if ((!guestUser || !property || !hostUser) && reservation.id) {
    try {
      const fullRes = await prisma.reservation.findUnique({
        where: { id: reservation.id },
        include: {
          guest: true,
          property: { include: { host: true } },
          host: true
        }
      });
      if (fullRes) {
        if (!guestUser) guestUser = fullRes.guest;
        if (!property) property = fullRes.property;
        if (!hostUser) hostUser = fullRes.host || (fullRes.property ? fullRes.property.host : null);
      }
    } catch (e) {
      console.error('[EMAIL SERVICE ERROR] Failed to fetch full reservation details:', e.message);
    }
  }

  if (!guestUser || !guestUser.email) return;

  const resId = reservation.id || 'N/A';
  const shortId = typeof resId === 'string' ? resId.substring(0, 8) : 'N/A';
  const propertyTitle = (property && property.title) ? property.title : 'Pocono Property';
  const guestName = guestUser.firstName ? `${guestUser.firstName} ${guestUser.lastName || ''}`.trim() : guestUser.email;
  const checkIn = reservation.checkInDate ? new Date(reservation.checkInDate).toLocaleDateString() : 'N/A';
  const checkOut = reservation.checkOutDate ? new Date(reservation.checkOutDate).toLocaleDateString() : 'N/A';
  const guestsCount = reservation.guestCount || reservation.guests || 1;
  const rejectionReason = reason && String(reason).trim() ? String(reason).trim() : 'No reason was provided by the administrator.';
  const safeRejectionReason = rejectionReason.replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const adminEmailNorm = (ADMIN_EMAIL || 'admin@pocono.vacations').trim().toLowerCase();
  const guestEmailNorm = guestUser.email.trim().toLowerCase();
  const hostEmailNorm = hostUser && hostUser.email ? hostUser.email.trim().toLowerCase() : null;

  // Property Owner Host Check: ONLY send Host notification if property owner role is HOST and not ADMIN
  const isHostOwned = hostUser && hostUser.role === 'HOST' && hostEmailNorm && hostEmailNorm !== adminEmailNorm && hostEmailNorm !== guestEmailNorm;

  const guestSubject = `Your Pocono.Vacations Reservation Was Rejected`;
  const guestHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #dc2626; color: #ffffff; padding: 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">Reservation Rejected</h1>
        <p style="margin: 4px 0 0; opacity: 0.9;">Pocono Vacations</p>
      </div>
      <div style="padding: 24px; color: #334155; line-height: 1.6;">
        <h2 style="color: #0f172a;">Hi ${guestName},</h2>
        <p>Your reservation request for <strong>${propertyTitle}</strong> has been <strong style="color: #dc2626;">REJECTED</strong> by Pocono.Vacations.</p>
        <div style="background-color: #fef2f2; border: 1px solid #fca5a5; border-radius: 6px; padding: 16px; margin: 20px 0;">
          <p style="margin: 4px 0;"><strong>Reservation ID:</strong> ${resId}</p>
          <p style="margin: 4px 0;"><strong>Property:</strong> ${propertyTitle}</p>
          <p style="margin: 4px 0;"><strong>Check-In:</strong> ${checkIn}</p>
          <p style="margin: 4px 0;"><strong>Check-Out:</strong> ${checkOut}</p>
          <p style="margin: 4px 0;"><strong>Guests:</strong> ${guestsCount}</p>
          <p style="margin: 4px 0;"><strong>Reason:</strong> ${safeRejectionReason}</p>
        </div>
        <p style="font-size: 13px; color: #64748b;">If you have questions, please contact Pocono.Vacations support.</p>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${FRONTEND_URL}/dashboard" style="background-color: #0f172a; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Account Dashboard</a>
        </div>
      </div>
    </div>
  `;

  const sendPromises = [];

  if (notifyGuest !== false) {
    sendPromises.push(sendEmail({ to: guestUser.email, subject: guestSubject, html: guestHtml }));
  }

  if (notifyHost !== false && isHostOwned) {
    const hostName = hostUser.firstName ? `${hostUser.firstName} ${hostUser.lastName || ''}`.trim() : hostUser.email;
    const hostSubject = `Reservation Rejected — ${propertyTitle}`;
    const hostHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #0f172a; color: #ffffff; padding: 24px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">Pocono Vacations</h1>
          <p style="margin: 4px 0 0; opacity: 0.8;">Reservation Rejection Notice</p>
        </div>
        <div style="padding: 24px; color: #334155; line-height: 1.6;">
          <h2 style="color: #0f172a;">Hi ${hostName},</h2>
          <p>The reservation at <strong>${propertyTitle}</strong> by guest <strong>${guestName}</strong> has been <strong style="color: #dc2626;">REJECTED</strong>.</p>
          <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 16px; margin: 20px 0;">
            <p style="margin: 4px 0;"><strong>Reservation ID:</strong> ${resId}</p>
            <p style="margin: 4px 0;"><strong>Guest Name:</strong> ${guestName}</p>
            <p style="margin: 4px 0;"><strong>Check-In:</strong> ${checkIn}</p>
            <p style="margin: 4px 0;"><strong>Check-Out:</strong> ${checkOut}</p>
            <p style="margin: 4px 0;"><strong>Guests:</strong> ${guestsCount}</p>
            <p style="margin: 4px 0;"><strong>Status:</strong> <span style="color: #dc2626; font-weight: bold;">REJECTED</span></p>
            <p style="margin: 4px 0;"><strong>Reason:</strong> ${safeRejectionReason}</p>
          </div>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${FRONTEND_URL}/host/properties" style="background-color: #0f172a; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Host Dashboard</a>
          </div>
        </div>
      </div>
    `;
    sendPromises.push(sendEmail({ to: hostUser.email, subject: hostSubject, html: hostHtml }));
    console.log(`[RESERVATION EMAIL]\nEvent: REJECTED\nReservation: ${resId}\nGuest: ${guestEmailNorm}\nHost: ${hostEmailNorm}\nHost Role: HOST\nAdmin Notification: SKIPPED`);
  } else {
    console.log(`[RESERVATION EMAIL]\nEvent: REJECTED\nReservation: ${resId}\nGuest: ${guestEmailNorm}\nProperty Owner Role: ${hostUser ? hostUser.role : 'ADMIN/MISSING'}\nGuest Notification: ${notifyGuest ? 'SENT' : 'UNCHECKED'}\nHost Notification: ${notifyHost ? (isHostOwned ? 'SENT' : 'SKIPPED_ADMIN') : 'UNCHECKED'}`);
  }

  if (sendPromises.length > 0) {
    await Promise.allSettled(sendPromises);
  }
}

/**
 * 13. Financial Reversal Email (Guest & Host)
 */
async function sendFinancialReversalEmail({ reservation, guest, host, property, invoice }) {
  if (!reservation || !guest || !guest.email) return;

  const resId = reservation.id || 'N/A';
  const shortId = typeof resId === 'string' ? resId.substring(0, 8) : 'N/A';
  const propertyTitle = (property && property.title) ? property.title : 'Pocono Property';
  const guestName = guest.firstName ? `${guest.firstName} ${guest.lastName || ''}`.trim() : guest.email;
  const hostName = host ? (host.firstName ? `${host.firstName} ${host.lastName || ''}`.trim() : host.email) : 'Host';
  const total = Number(reservation.grandTotal || (invoice ? invoice.totalAmount : 0)).toFixed(2);

  const guestSubject = `Financial Status Update - Reservation #${shortId}`;
  const guestHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #0f172a; color: #ffffff; padding: 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">Pocono Vacations</h1>
        <p style="margin: 4px 0 0; opacity: 0.8;">Financial Ledger Update</p>
      </div>
      <div style="padding: 24px; color: #334155; line-height: 1.6;">
        <h2 style="color: #0f172a;">Hi ${guestName},</h2>
        <p>This is an automated notification regarding reservation <strong>#${shortId}</strong> for <strong>${propertyTitle}</strong>.</p>
        <p>Following reservation cancellation and payment verification rejection, internal financial records for this invoice have been set to <strong style="color: #dc2626;">FAILED / REVERSED</strong>.</p>
        <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 16px; margin: 20px 0;">
          <p style="margin: 4px 0;"><strong>Reservation ID:</strong> ${resId}</p>
          <p style="margin: 4px 0;"><strong>Invoice Status:</strong> <span style="color: #dc2626; font-weight: bold;">FAILED / REVERSED</span></p>
          <p style="margin: 4px 0;"><strong>Reversed Amount:</strong> $${total}</p>
        </div>
        <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 14px; margin: 20px 0; color: #92400e; font-size: 13px;">
          <strong>Gateway Refund Note:</strong> Internal accounting has excluded this invoice from revenue. If you paid online via credit card or PayPal, any manual gateway refund will be processed directly through the payment processor.
        </div>
      </div>
    </div>
  `;

  const promises = [
    sendEmail({ to: guest.email, subject: guestSubject, html: guestHtml })
  ];

  if (host && host.email) {
    const hostSubject = `Host Earning Cancelled for ${propertyTitle} (#${shortId})`;
    const hostHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #0f172a; color: #ffffff; padding: 24px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">Pocono Vacations</h1>
          <p style="margin: 4px 0 0; opacity: 0.8;">Host Earning Reversal Notice</p>
        </div>
        <div style="padding: 24px; color: #334155; line-height: 1.6;">
          <h2 style="color: #0f172a;">Hi ${hostName},</h2>
          <p>Please note that the host earning for reservation <strong>#${shortId}</strong> at <strong>${propertyTitle}</strong> has been <strong style="color: #dc2626;">CANCELLED</strong> due to reservation cancellation and payment rejection.</p>
          <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 16px; margin: 20px 0;">
            <p style="margin: 4px 0;"><strong>Reservation ID:</strong> ${resId}</p>
            <p style="margin: 4px 0;"><strong>Host Earning Status:</strong> <span style="color: #dc2626; font-weight: bold;">CANCELLED</span></p>
          </div>
        </div>
      </div>
    `;
    promises.push(sendEmail({ to: host.email, subject: hostSubject, html: hostHtml }));
  }

  await Promise.all(promises);
}

/**
 * 14. Professional Branded Template Wrapper for Admin Campaigns
 */
function wrapCampaignTemplate(contentHtml, title = 'Special Announcement') {
  return `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: #2b2b2b; color: #ffffff; padding: 28px 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px; font-weight: 800; tracking-tight: -0.025em;">Pocono.Vacations</h1>
        <p style="margin: 6px 0 0; opacity: 0.85; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; color: #f15e75;">${title}</p>
      </div>
      <div style="padding: 28px 24px; color: #334155; line-height: 1.6; font-size: 14px;">
        ${contentHtml}
        
        <div style="text-align: center; margin: 32px 0 16px 0;">
          <a href="${FRONTEND_URL}/properties" style="background-color: #f15e75; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Explore Pocono Vacation Rentals</a>
        </div>
      </div>
      <div style="background-color: #f8fafc; padding: 20px 24px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #64748b;">
        <p style="margin: 0 0 6px 0;">© ${new Date().getFullYear()} Pocono.Vacations. All rights reserved.</p>
        <p style="margin: 0;">Pocono Mountains, Pennsylvania • Direct Host Booking Platform</p>
      </div>
    </div>
  `;
}

module.exports = {
  getTransporter,
  sendEmail,
  sendWelcomeEmail,
  sendBookingCreatedEmails,
  sendOnlinePaymentReceivedEmails,
  sendPaymentProofSubmittedEmails,
  sendPaymentVerificationResultEmails,
  sendHostEarningCreatedEmail,
  sendNewMessageNotificationEmail,
  sendPasswordResetEmail,
  sendContactUsEmails,
  verifySmtp,
  sendTestEmail,
  sendNewPropertyPublishedEmails,
  notifyNewPropertyPublished,
  sendReservationCancelledEmail,
  sendReservationRejectedEmail,
  sendFinancialReversalEmail,
  wrapCampaignTemplate
};
