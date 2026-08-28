const hostEarningService = require('../services/hostEarningService');

/**
 * GET /api/v1/host/earnings
 */
async function getHostEarnings(req, res, next) {
  try {
    const result = await hostEarningService.getHostEarnings(req.user.id, req.query);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/host/earnings/summary
 */
async function getHostEarningSummary(req, res, next) {
  try {
    const summary = await hostEarningService.getHostEarningSummary(req.user.id);
    res.json({ success: true, data: summary });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/host/earnings/:id
 */
async function getHostEarningById(req, res, next) {
  try {
    const earning = await hostEarningService.getHostEarningById(req.params.id, req.user.id, req.user.role);
    res.json({ success: true, data: earning });
  } catch (err) {
    const status = err.statusCode || (err.message.includes('not found') ? 404 : err.message.includes('Forbidden') ? 403 : 400);
    res.status(status).json({ success: false, error: err.message });
  }
}

/**
 * Admin: GET /api/v1/admin/earnings
 */
async function getAdminEarnings(req, res, next) {
  try {
    const result = await hostEarningService.getAdminEarnings(req.query);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

/**
 * Admin: PATCH /api/v1/admin/earnings/:id/status
 */
async function updateAdminEarningStatus(req, res, next) {
  try {
    const { status } = req.body;
    const result = await hostEarningService.updateHostEarningStatusAdmin(req.params.id, status);
    res.json({ success: true, message: 'Earning status updated successfully', data: result });
  } catch (err) {
    res.status(err.statusCode || 400).json({ success: false, error: err.message });
  }
}

module.exports = {
  getHostEarnings,
  getHostEarningSummary,
  getHostEarningById,
  getAdminEarnings,
  updateAdminEarningStatus
};
