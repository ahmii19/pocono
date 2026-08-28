const paymentService = require('../services/paymentService');
const adminService = require('../services/adminService');

function checkGatewayEnabled(gateway) {
  const settings = adminService.getPublicSiteSettings();
  const payment = settings.payment || {};
  if (gateway === 'stripe' && payment.stripeEnabled === false) {
    const err = new Error('Stripe payments are currently unavailable.');
    err.statusCode = 400;
    throw err;
  }
  if (gateway === 'paypal' && payment.paypalEnabled === false) {
    const err = new Error('PayPal payments are currently unavailable.');
    err.statusCode = 400;
    throw err;
  }
  if (gateway === 'pay_later' && payment.payLaterEnabled === false) {
    const err = new Error('Pay Later reservations are currently unavailable.');
    err.statusCode = 400;
    throw err;
  }
}

class PaymentController {
  async createStripeSession(req, res) {
    try {
      checkGatewayEnabled('stripe');

      const { propertyId, checkInDate, checkOutDate, guestCount, selectedExtraPrices } = req.body;
      const guestId = req.user.id;

      if (!propertyId || !checkInDate || !checkOutDate || !guestCount) {
        return res.status(400).json({ success: false, error: 'Missing required reservation fields' });
      }

      const result = await paymentService.createStripeCheckoutSession({
        propertyId,
        guestId,
        checkInDate,
        checkOutDate,
        guestCount,
        selectedExtraPrices
      });

      return res.status(200).json({ success: true, data: result });
    } catch (e) {
      console.error('Stripe Checkout Session Error:', e);
      return res.status(e.statusCode || 500).json({ success: false, error: e.message });
    }
  }

  async createPayPalOrder(req, res) {
    try {
      checkGatewayEnabled('paypal');

      const { propertyId, checkInDate, checkOutDate, guestCount, selectedExtraPrices } = req.body;
      const guestId = req.user.id;

      if (!propertyId || !checkInDate || !checkOutDate || !guestCount) {
        return res.status(400).json({ success: false, error: 'Missing required reservation fields' });
      }

      const result = await paymentService.createPayPalOrder({
        propertyId,
        guestId,
        checkInDate,
        checkOutDate,
        guestCount,
        selectedExtraPrices
      });

      return res.status(200).json({ success: true, data: result });
    } catch (e) {
      console.error('PayPal Order Error:', e);
      return res.status(e.statusCode || 500).json({ success: false, error: e.message });
    }
  }

  async capturePayPalOrder(req, res) {
    try {
      checkGatewayEnabled('paypal');

      const { orderId, reservationId } = req.body;
      const userId = req.user.id;

      if (!orderId || !reservationId) {
        return res.status(400).json({ success: false, error: 'Missing orderId or reservationId' });
      }

      const result = await paymentService.capturePayPalOrder({ orderId, reservationId, userId });
      return res.status(200).json({ success: true, data: result });
    } catch (e) {
      console.error('PayPal Capture Error:', e);
      return res.status(e.statusCode || 500).json({ success: false, error: e.message });
    }
  }

  async createPayLaterSession(req, res) {
    try {
      checkGatewayEnabled('pay_later');

      const { propertyId, checkInDate, checkOutDate, guestCount, selectedExtraPrices } = req.body;
      const guestId = req.user.id;

      if (!propertyId || !checkInDate || !checkOutDate || !guestCount) {
        return res.status(400).json({ success: false, error: 'Missing required reservation fields' });
      }

      const result = await paymentService.createPayLaterReservation({
        propertyId,
        guestId,
        checkInDate,
        checkOutDate,
        guestCount,
        selectedExtraPrices
      });

      return res.status(200).json({ success: true, data: result });
    } catch (e) {
      console.error('Pay Later Reservation Error:', e);
      return res.status(e.statusCode || 500).json({ success: false, error: e.message });
    }
  }

  async handleStripeWebhook(req, res) {
    try {
      const sig = req.headers['stripe-signature'];
      const rawBody = req.body;
      let event = rawBody;

      // Extract metadata cleanly
      const metadata = event?.data?.object?.metadata || event?.metadata || {};
      const reservationId = metadata.reservationId;
      const transactionId = event?.data?.object?.id || event?.id || `TX_${Date.now()}`;

      const result = await paymentService.handlePaymentWebhook({
        gateway: 'STRIPE',
        transactionId,
        reservationId,
        status: 'COMPLETED',
        rawPayload: event
      });

      return res.status(200).json({ received: true, result });
    } catch (e) {
      console.error('Stripe Webhook Error:', e);
      return res.status(400).send(`Webhook Error: ${e.message}`);
    }
  }
}

module.exports = new PaymentController();
