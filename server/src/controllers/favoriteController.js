const favoriteService = require('../services/favoriteService');

async function getFavorites(req, res, next) {
  try {
    const favorites = await favoriteService.getFavorites(req.user.id);
    res.json({ success: true, count: favorites.length, data: favorites });
  } catch (err) { next(err); }
}

async function addFavorite(req, res, next) {
  try {
    const { propertyId } = req.body;
    if (!propertyId) return res.status(400).json({ success: false, error: 'propertyId is required' });
    const favorite = await favoriteService.addFavorite(req.user.id, propertyId);
    res.status(201).json({ success: true, data: favorite });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
}

async function removeFavorite(req, res, next) {
  try {
    await favoriteService.removeFavorite(req.user.id, req.params.propertyId);
    res.json({ success: true, message: 'Removed from favorites' });
  } catch (err) { next(err); }
}

module.exports = { getFavorites, addFavorite, removeFavorite };
