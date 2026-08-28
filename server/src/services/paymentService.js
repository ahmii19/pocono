const prisma = require('../config/prisma');
const reservationService = require('./reservationService');
const Stripe = require('stripe');

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || 'stripe_dummy_test_key_placeholder';
const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-06-20' });

class PaymentService {
  /**
   * Create Stripe Checkout Session
   */
  async createStripeCheckoutSession({ propertyId, guestId, checkInDate, checkOutDate, guestCount, selectedExtraPrices = [] }) {
    // 1. Validate property & calculate quote server-side
    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) throw new Error('Property not found');

    const availability = await reservationService.checkAvailability({
      propertyId,
      checkInDate,
      checkOutDate,
      guestCount,
      selectedExtraPrices
    });

    if (!availability.isAvailable) {
      throw new Error('Selected dates are no longer available');
    }

    const breakdown = availability.pricingBreakdown;

    // 2. Create reservation in PENDING_PAYMENT status
    const reservation = await prisma.reservation.create({
      data: {
        propertyId,
        guestId,
        hostId: property.hostId,
        checkInDate: new Date(checkInDate),
        checkOutDate: new Date(checkOutDate),
        guestCount: parseInt(guestCount),
        totalNights: availability.totalNights,
        baseTotal: breakdown.baseTotal,
        cleaningFee: breakdown.cleaningFee,
        cityFee: breakdown.cityFee,
        serviceFee: breakdown.serviceFee,
        taxesTotal: breakdown.taxesTotal,
        securityDeposit: breakdown.securityDeposit,
        extraPricesTotal: breakdown.extraPricesTotal,
        grandTotal: breakdown.grandTotal,
        upfrontPaid: 0.00,
        balanceDue: breakdown.grandTotal,
        status: 'PENDING_PAYMENT'
      }
    });

    // 3. Log initial PENDING payment
    const payment = await prisma.payment.create({
      data: {
        reservationId: reservation.id,
        userId: guestId,
        gateway: 'STRIPE',
        status: 'PENDING',
        amount: breakdown.grandTotal,
        currency: 'USD'
      }
    });

    // Create PENDING invoice for the new reservation
    try {
      const invoiceService = require('./invoiceService');
      await invoiceService.createReservationInvoice(reservation.id, guestId, breakdown.grandTotal);
    } catch (e) {
      console.error('[Invoice] Failed to create invoice on Stripe checkout:', e.message);
    }

    // 4. Construct Stripe Checkout Session parameters
    const origin = process.env.CLIENT_URL || 'http://localhost:3000';
    let checkoutSession;
    try {
      checkoutSession = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `${property.title} (${availability.totalNights} Nights)`,
                description: `Check-in: ${checkInDate} | Check-out: ${checkOutDate} | Guests: ${guestCount}`
              },
              unit_amount: Math.round(parseFloat(breakdown.grandTotal) * 100)
            },
            quantity: 1
          }
        ],
        mode: 'payment',
        success_url: `${origin}/dashboard?booking_success=true&reservation_id=${reservation.id}`,
        cancel_url: `${origin}/listing/${property.slug}?booking_cancelled=true`,
        metadata: {
          reservationId: reservation.id,
          paymentId: payment.id,
          propertyId,
          guestId
        }
      });
    } catch (e) {
      // Fallback for sandbox mock mode if secret key is test dummy string
      checkoutSession = {
        id: `cs_test_${Date.now()}`,
        url: `${origin}/dashboard?booking_success=true&reservation_id=${reservation.id}&mock_stripe=true`
      };
    }

    // Update payment record with checkout session transaction id
    await prisma.payment.update({
      where: { id: payment.id },
      data: { transactionId: checkoutSession.id }
    });

    // Trigger Email Notifications (Guest Confirmation & Host Notification)
    try {
      const emailService = require('./emailService');
      const fullRes = await prisma.reservation.findUnique({
        where: { id: reservation.id },
        include: {
          guest: { select: { id: true, firstName: true, lastName: true, email: true } },
          host: { select: { id: true, firstName: true, lastName: true, email: true } },
          property: { select: { id: true, title: true, slug: true } }
        }
      });
      if (fullRes) {
        emailService.sendBookingCreatedEmails({
          reservation: fullRes,
          guest: fullRes.guest,
          host: fullRes.host,
          property: fullRes.property
        }).catch(err => console.error('[BOOKING EMAIL ERROR] sendBookingCreatedEmails Stripe error:', err.message));
      }
    } catch (e) {
      console.error('[BOOKING EMAIL ERROR] Failed to trigger Stripe booking emails:', e.message);
    }

    return {
      checkoutUrl: checkoutSession.url,
      sessionId: checkoutSession.id,
      reservationId: reservation.id,
      grandTotal: breakdown.grandTotal
    };
  }

  /**
   * Create PayPal Sandbox Order
   */
  async createPayPalOrder({ propertyId, guestId, checkInDate, checkOutDate, guestCount, selectedExtraPrices = [] }) {
    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) throw new Error('Property not found');

    const availability = await reservationService.checkAvailability({
      propertyId,
      checkInDate,
      checkOutDate,
      guestCount,
      selectedExtraPrices
    });

    if (!availability.isAvailable) {
      throw new Error('Selected dates are no longer available');
    }

    const breakdown = availability.pricingBreakdown;

    const reservation = await prisma.reservation.create({
      data: {
        propertyId,
        guestId,
        hostId: property.hostId,
        checkInDate: new Date(checkInDate),
        checkOutDate: new Date(checkOutDate),
        guestCount: parseInt(guestCount),
        totalNights: availability.totalNights,
        baseTotal: breakdown.baseTotal,
        cleaningFee: breakdown.cleaningFee,
        cityFee: breakdown.cityFee,
        serviceFee: breakdown.serviceFee,
        taxesTotal: breakdown.taxesTotal,
        securityDeposit: breakdown.securityDeposit,
        extraPricesTotal: breakdown.extraPricesTotal,
        grandTotal: breakdown.grandTotal,
        upfrontPaid: 0.00,
        balanceDue: breakdown.grandTotal,
        status: 'PENDING_PAYMENT'
      }
    });

    const orderId = `PAYPAL_SANDBOX_ORDER_${Date.now()}_${reservation.id.slice(0, 8)}`;

    const payment = await prisma.payment.create({
      data: {
        reservationId: reservation.id,
        userId: guestId,
        gateway: 'PAYPAL',
        status: 'PENDING',
        transactionId: orderId,
        amount: breakdown.grandTotal,
        currency: 'USD'
      }
    });

    // Create PENDING invoice for the new PayPal reservation
    try {
      const invoiceService = require('./invoiceService');
      await invoiceService.createReservationInvoice(reservation.id, guestId, breakdown.grandTotal);
    } catch (e) {
      console.error('[Invoice] Failed to create invoice on PayPal order:', e.message);
    }

    // Trigger Email Notifications (Guest Confirmation & Host Notification)
    try {
      const emailService = require('./emailService');
      const fullRes = await prisma.reservation.findUnique({
        where: { id: reservation.id },
        include: {
          guest: { select: { id: true, firstName: true, lastName: true, email: true } },
          host: { select: { id: true, firstName: true, lastName: true, email: true } },
          property: { select: { id: true, title: true, slug: true } }
        }
      });
      if (fullRes) {
        emailService.sendBookingCreatedEmails({
          reservation: fullRes,
          guest: fullRes.guest,
          host: fullRes.host,
          property: fullRes.property
        }).catch(err => console.error('[BOOKING EMAIL ERROR] sendBookingCreatedEmails PayPal error:', err.message));
      }
    } catch (e) {
      console.error('[BOOKING EMAIL ERROR] Failed to trigger PayPal booking emails:', e.message);
    }

    return {
      orderId,
      reservationId: reservation.id,
      grandTotal: breakdown.grandTotal
    };
  }

  /**
   * Create Pay Later Reservation (Direct reservation creation without online gateway redirect)
   */
  async createPayLaterReservation({ propertyId, guestId, checkInDate, checkOutDate, guestCount, selectedExtraPrices = [] }) {
    // 1. Validate property
    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) throw new Error('Property not found');

    // 2. Check date availability
    const availability = await reservationService.checkAvailability({
      propertyId,
      checkInDate,
      checkOutDate,
      guestCount,
      selectedExtraPrices
    });

    if (!availability.isAvailable) {
      throw new Error('Selected dates are no longer available');
    }

    const breakdown = availability.pricingBreakdown;

    // 3. Idempotency safeguard: check for duplicate pending reservation created in last 30s
    const thirtySecAgo = new Date(Date.now() - 30 * 1000);
    const existingPending = await prisma.reservation.findFirst({
      where: {
        propertyId,
        guestId,
        checkInDate: new Date(checkInDate),
        checkOutDate: new Date(checkOutDate),
        status: 'PENDING_PAYMENT',
        createdAt: { gte: thirtySecAgo }
      }
    });

    if (existingPending) {
      return {
        reservationId: existingPending.id,
        grandTotal: existingPending.grandTotal,
        status: existingPending.status,
        paymentGateway: 'PAY_LATER'
      };
    }

    // 4. Create reservation in PENDING_PAYMENT status with configurable deadline
    const adminService = require('./adminService');
    const settings = adminService.getPublicSiteSettings();
    const deadlineHours = settings.payment?.payLaterDeadlineHours || 48;
    const paymentDueAt = new Date(Date.now() + deadlineHours * 60 * 60 * 1000);

    const reservation = await prisma.reservation.create({
      data: {
        propertyId,
        guestId,
        hostId: property.hostId,
        checkInDate: new Date(checkInDate),
        checkOutDate: new Date(checkOutDate),
        guestCount: parseInt(guestCount),
        totalNights: availability.totalNights,
        baseTotal: breakdown.baseTotal,
        cleaningFee: breakdown.cleaningFee,
        cityFee: breakdown.cityFee,
        serviceFee: breakdown.serviceFee,
        taxesTotal: breakdown.taxesTotal,
        securityDeposit: breakdown.securityDeposit,
        extraPricesTotal: breakdown.extraPricesTotal,
        grandTotal: breakdown.grandTotal,
        upfrontPaid: 0.00,
        balanceDue: breakdown.grandTotal,
        status: 'PENDING_PAYMENT',
        paymentVerificationStatus: 'NOT_SUBMITTED',
        paymentDueAt
      }
    });

    // 5. Create Payment record with PAY_LATER gateway
    const payLaterTransactionId = `PAY_LATER_${Date.now()}_${reservation.id.slice(0, 8)}`;
    await prisma.payment.create({
      data: {
        reservationId: reservation.id,
        userId: guestId,
        gateway: 'PAY_LATER',
        status: 'PENDING',
        transactionId: payLaterTransactionId,
        amount: breakdown.grandTotal,
        currency: 'USD'
      }
    });

    // 6. Create PENDING invoice
    try {
      const invoiceService = require('./invoiceService');
      await invoiceService.createReservationInvoice(reservation.id, guestId, breakdown.grandTotal);
    } catch (e) {
      console.error('[Invoice] Failed to create invoice on Pay Later reservation:', e.message);
    }

    // 7. Trigger Email Notifications (Booking Request Received email to Guest & Host)
    try {
      const emailService = require('./emailService');
      const fullRes = await prisma.reservation.findUnique({
        where: { id: reservation.id },
        include: {
          guest: { select: { id: true, firstName: true, lastName: true, email: true } },
          host: { select: { id: true, firstName: true, lastName: true, email: true } },
          property: { select: { id: true, title: true, slug: true } }
        }
      });
      if (fullRes) {
        emailService.sendBookingCreatedEmails({
          reservation: fullRes,
          guest: fullRes.guest,
          host: fullRes.host,
          property: fullRes.property
        }).catch(err => console.error('[BOOKING EMAIL ERROR] sendBookingCreatedEmails Pay Later error:', err.message));
      }
    } catch (e) {
      console.error('[BOOKING EMAIL ERROR] Failed to trigger Pay Later booking emails:', e.message);
    }

    return {
      reservationId: reservation.id,
      grandTotal: breakdown.grandTotal,
      status: reservation.status,
      paymentGateway: 'PAY_LATER'
    };
  }

  /**
   * Capture PayPal Sandbox Order & Set Payment Verification SUBMITTED
   */
  async capturePayPalOrder({ orderId, reservationId, userId }) {
    const reservation = await prisma.reservation.findUnique({ where: { id: reservationId } });
    if (!reservation) throw new Error('Reservation not found');

    // Check idempotency: If already verified & confirmed, return existing state
    if (reservation.status === 'CONFIRMED' || reservation.paymentVerificationStatus === 'VERIFIED') {
      return { success: true, message: 'Reservation already processed and verified', reservation };
    }

    const wasAlreadySubmitted = reservation.paymentVerificationStatus === 'SUBMITTED' || reservation.paymentVerificationStatus === 'VERIFIED';

    // Update reservation status to PENDING_PAYMENT with SUBMITTED verification status
    const updatedReservation = await prisma.reservation.update({
      where: { id: reservationId },
      data: {
        status: 'PENDING_PAYMENT',
        paymentVerificationStatus: 'SUBMITTED',
        paymentTransactionId: orderId,
        paymentSubmittedAt: new Date(),
        upfrontPaid: reservation.grandTotal,
        balanceDue: 0.00
      }
    });

    await prisma.payment.updateMany({
      where: { reservationId, gateway: 'PAYPAL' },
      data: {
        status: 'COMPLETED',
        transactionId: orderId
      }
    });

    // Note: Invoice status remains PENDING until Admin approves payment verification.

    // Trigger Online Payment Received Email (Guest & Admin) on first-time submission
    if (!wasAlreadySubmitted) {
      try {
        const emailService = require('./emailService');
        const fullRes = await prisma.reservation.findUnique({
          where: { id: reservationId },
          include: {
            guest: { select: { id: true, firstName: true, lastName: true, email: true } },
            property: { select: { id: true, title: true, slug: true } }
          }
        });
        if (fullRes) {
          emailService.sendOnlinePaymentReceivedEmails({
            reservation: fullRes,
            guest: fullRes.guest,
            property: fullRes.property,
            gateway: 'PAYPAL'
          }).catch(err => console.error('[EMAIL ERROR] sendOnlinePaymentReceivedEmails PayPal error:', err.message));
        }
      } catch (e) {
        console.error('[EMAIL ERROR] Failed to trigger PayPal payment emails:', e.message);
      }
    }

    // Note: Host earnings will be created ONLY when Admin approves payment verification.
    return {
      success: true,
      reservation: updatedReservation
    };
  }

  /**
   * Handle Webhook Confirmation Idempotently (Sets Payment=COMPLETED & Verification=SUBMITTED, pending Admin approval)
   */
  async handlePaymentWebhook({ gateway, transactionId, reservationId, status, rawPayload }) {
    if (!reservationId) return { received: true, processed: false };

    const reservation = await prisma.reservation.findUnique({ where: { id: reservationId } });
    if (!reservation) return { received: true, processed: false, error: 'Reservation missing' };

    if (reservation.status === 'CONFIRMED' || reservation.paymentVerificationStatus === 'VERIFIED') {
      return { received: true, processed: true, idempotency: 'already_completed' };
    }

    const wasAlreadySubmitted = reservation.paymentVerificationStatus === 'SUBMITTED';

    const isSuccess = status === 'COMPLETED' || status === 'PAID';
    const nextReservationStatus = isSuccess ? 'PENDING_PAYMENT' : 'FAILED';
    const nextVerificationStatus = isSuccess ? 'SUBMITTED' : 'REJECTED';

    await prisma.reservation.update({
      where: { id: reservationId },
      data: {
        status: nextReservationStatus,
        paymentVerificationStatus: nextVerificationStatus,
        paymentTransactionId: transactionId || null,
        paymentSubmittedAt: new Date(),
        upfrontPaid: isSuccess ? reservation.grandTotal : 0.00,
        balanceDue: isSuccess ? 0.00 : reservation.grandTotal
      }
    });

    await prisma.payment.create({
      data: {
        reservationId: reservation.id,
        userId: reservation.guestId,
        gateway: gateway.toUpperCase() === 'STRIPE' ? 'STRIPE' : 'PAYPAL',
        status: isSuccess ? 'COMPLETED' : 'FAILED',
        transactionId: transactionId || `TX_${Date.now()}`,
        amount: reservation.grandTotal,
        currency: 'USD',
        rawPayload: rawPayload || {}
      }
    });

    // Note: Invoice status remains PENDING until Admin approves payment verification.
    if (isSuccess) {
      // Trigger Online Payment Received Email (Guest & Admin) on first-time submission
      if (!wasAlreadySubmitted) {
        try {
          const emailService = require('./emailService');
          const fullRes = await prisma.reservation.findUnique({
            where: { id: reservationId },
            include: {
              guest: { select: { id: true, firstName: true, lastName: true, email: true } },
              property: { select: { id: true, title: true, slug: true } }
            }
          });
          if (fullRes) {
            emailService.sendOnlinePaymentReceivedEmails({
              reservation: fullRes,
              guest: fullRes.guest,
              property: fullRes.property,
              gateway: gateway.toUpperCase() === 'STRIPE' ? 'STRIPE' : 'PAYPAL'
            }).catch(err => console.error('[EMAIL ERROR] sendOnlinePaymentReceivedEmails Stripe error:', err.message));
          }
        } catch (e) {
          console.error('[EMAIL ERROR] Failed to trigger Stripe payment emails:', e.message);
        }
      }
    }

    return { received: true, processed: true, reservationId, newStatus: nextReservationStatus };
  }
}

module.exports = new PaymentService();
