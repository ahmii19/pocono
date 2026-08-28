const reservationService = require('../services/reservationService');

async function checkAvailability(req, res, next) {
  try {
    const result = await reservationService.checkAvailability(req.body);
    res.json({ success: true, data: result });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
}

async function createReservation(req, res, next) {
  try {
    const reservation = await reservationService.createReservation(req.body, req.user.id);
    res.status(201).json({ success: true, data: reservation });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
}

async function getMyReservations(req, res, next) {
  try {
    const reservations = await reservationService.getUserReservations(req.user.id, req.user.role);
    res.json({ success: true, count: reservations.length, data: reservations });
  } catch (err) { next(err); }
}

async function getReservationById(req, res, next) {
  try {
    const reservation = await reservationService.getReservationById(req.params.id, req.user);
    res.json({ success: true, data: reservation });
  } catch (err) { res.status(404).json({ success: false, error: err.message }); }
}

async function cancelReservation(req, res, next) {
  try {
    const reservation = await reservationService.cancelReservation(req.params.id, req.user);
    res.json({ success: true, data: reservation });
  } catch (err) { next(err); }
}

async function deleteReservation(req, res, next) {
  try {
    const result = await reservationService.deleteReservation(req.params.id, req.user);
    res.json(result);
  } catch (err) {
    const status = err.statusCode || (err.message.includes('not found') ? 404 : (err.message.includes('Forbidden') || err.message.includes('cannot be deleted') || err.message.includes('permission') || err.message.includes('Unauthorized')) ? 403 : 400);
    res.status(status).json({ success: false, error: err.message });
  }
}

async function submitPaymentProof(req, res, next) {
  try {
    const { file, transactionId, paymentNote } = req.body;
    const reservation = await reservationService.submitGuestPaymentProof(
      req.params.id,
      file,
      { transactionId, paymentNote },
      req.user
    );
    res.status(200).json({ success: true, message: 'Payment proof submitted successfully.', data: reservation });
  } catch (err) {
    const status = err.statusCode || (err.message.includes('not found') ? 404 : err.message.includes('Forbidden') ? 403 : 400);
    res.status(status).json({ success: false, error: err.message });
  }
}

async function getPaymentProof(req, res, next) {
  try {
    const proof = await reservationService.getPaymentProof(req.params.id, req.user);
    res.json({ success: true, data: proof });
  } catch (err) {
    const status = err.statusCode || (err.message.includes('not found') ? 404 : err.message.includes('Forbidden') ? 403 : 400);
    res.status(status).json({ success: false, error: err.message });
  }
}

async function verifyPaymentProofAdmin(req, res, next) {
  try {
    const result = await reservationService.verifyPaymentProofAdmin(req.params.id, req.user);
    res.json({ success: true, message: 'Payment verified and reservation confirmed successfully.', ...result });
  } catch (err) {
    const status = err.statusCode || (err.message.includes('not found') ? 404 : err.message.includes('Forbidden') ? 403 : 400);
    res.status(status).json({ success: false, error: err.message });
  }
}

async function rejectPaymentProofAdmin(req, res, next) {
  try {
    const { rejectionReason } = req.body;
    const reservation = await reservationService.rejectPaymentProofAdmin(req.params.id, rejectionReason, req.user);
    res.json({ success: true, message: 'Payment proof rejected successfully.', data: reservation });
  } catch (err) {
    const status = err.statusCode || (err.message.includes('not found') ? 404 : err.message.includes('Forbidden') ? 403 : 400);
    res.status(status).json({ success: false, error: err.message });
  }
}

module.exports = {
  checkAvailability,
  createReservation,
  getMyReservations,
  getReservationById,
  cancelReservation,
  deleteReservation,
  submitPaymentProof,
  getPaymentProof,
  verifyPaymentProofAdmin,
  rejectPaymentProofAdmin
};
