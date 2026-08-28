const membershipService = require('../services/membershipService');

async function getPlans(req, res, next) {
  try {
    const plans = await membershipService.getMembershipPlans();
    res.json({ success: true, count: plans.length, data: plans });
  } catch (err) { next(err); }
}

async function getMySubscriptions(req, res, next) {
  try {
    const subs = await membershipService.getUserSubscriptions(req.user.id);
    res.json({ success: true, count: subs.length, data: subs });
  } catch (err) { next(err); }
}

module.exports = { getPlans, getMySubscriptions };
