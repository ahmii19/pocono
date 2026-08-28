const reviewService = require('../services/reviewService');

async function getPropertyReviews(req, res, next) {
  try {
    const reviews = await reviewService.getPropertyReviews(req.params.propertyId);
    res.json({ success: true, count: reviews.length, data: reviews });
  } catch (err) { next(err); }
}

async function createReview(req, res, next) {
  try {
    const review = await reviewService.createReview(req.body, req.user.id);
    res.status(201).json({ success: true, data: review });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
}

module.exports = { getPropertyReviews, createReview };
