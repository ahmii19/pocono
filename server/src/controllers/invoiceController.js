const invoiceService = require('../services/invoiceService');

async function getMyInvoices(req, res, next) {
  try {
    const invoices = await invoiceService.getUserInvoices(req.user.id);
    res.json({ success: true, count: invoices.length, data: invoices });
  } catch (err) { next(err); }
}

async function getInvoiceById(req, res, next) {
  try {
    const invoice = await invoiceService.getInvoiceById(req.params.id, req.user);
    res.json({ success: true, data: invoice });
  } catch (err) { res.status(404).json({ success: false, error: err.message }); }
}

async function getInvoiceByReservation(req, res, next) {
  try {
    const invoice = await invoiceService.getInvoiceByReservationId(req.params.reservationId, req.user);
    if (!invoice) {
      return res.status(404).json({ success: false, error: 'No invoice found for this reservation.' });
    }
    res.json({ success: true, data: invoice });
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ success: false, error: err.message });
  }
}

module.exports = { getMyInvoices, getInvoiceById, getInvoiceByReservation };

