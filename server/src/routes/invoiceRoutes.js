const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const { authenticate } = require('../middleware/auth');

router.get('/my', authenticate, invoiceController.getMyInvoices);
router.get('/reservation/:reservationId', authenticate, invoiceController.getInvoiceByReservation);
router.get('/:id', authenticate, invoiceController.getInvoiceById);

module.exports = router;

