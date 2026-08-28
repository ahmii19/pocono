const mediaService = require('../services/mediaService');

async function getPropertyMedia(req, res, next) {
  try {
    const result = await mediaService.getPropertyMedia(req.params.id);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(404).json({ success: false, error: err.message });
  }
}

async function getAllMedia(req, res, next) {
  try {
    const result = await mediaService.getAllMedia(req.query);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

async function uploadPropertyImage(req, res, next) {
  try {
    const image = await mediaService.uploadPropertyImage(req.params.id, req.body, req.user);
    res.status(201).json({ success: true, data: image });
  } catch (err) {
    const status = err.message === 'Unauthorized' || err.message.includes('Forbidden') ? 403 : 400;
    res.status(status).json({ success: false, error: err.message });
  }
}

async function setPrimaryImage(req, res, next) {
  try {
    const image = await mediaService.setPrimaryImage(req.params.id, req.params.imageId, req.user);
    res.json({ success: true, data: image });
  } catch (err) {
    const status = err.message === 'Unauthorized' || err.message.includes('Forbidden') ? 403 : 400;
    res.status(status).json({ success: false, error: err.message });
  }
}

async function reorderPropertyImages(req, res, next) {
  try {
    const result = await mediaService.reorderPropertyImages(req.params.id, req.body.orders, req.user);
    res.json({ success: true, ...result });
  } catch (err) {
    const status = err.message === 'Unauthorized' || err.message.includes('Forbidden') ? 403 : 400;
    res.status(status).json({ success: false, error: err.message });
  }
}

async function deletePropertyImage(req, res, next) {
  try {
    const result = await mediaService.deletePropertyImage(req.params.id, req.params.imageId, req.user);
    res.json({ success: true, ...result });
  } catch (err) {
    const status = err.message === 'Unauthorized' || err.message.includes('Forbidden') ? 403 : 400;
    res.status(status).json({ success: false, error: err.message });
  }
}

module.exports = {
  getPropertyMedia,
  getAllMedia,
  uploadPropertyImage,
  setPrimaryImage,
  reorderPropertyImages,
  deletePropertyImage
};
