const express = require('express');
const router = express.Router();
const reservationController = require('../controllers/reservationController');
const { authenticate } = require('../middleware/auth');

router.post('/check', reservationController.checkAvailability);
router.post('/', authenticate, reservationController.createReservation);
router.get('/my', authenticate, reservationController.getMyReservations);
router.get('/:id', authenticate, reservationController.getReservationById);
router.patch('/:id/cancel', authenticate, reservationController.cancelReservation);
router.delete('/:id', authenticate, reservationController.deleteReservation);
router.post('/:id/payment-proof', authenticate, reservationController.submitPaymentProof);
router.get('/:id/payment-proof', authenticate, reservationController.getPaymentProof);

module.exports = router;
