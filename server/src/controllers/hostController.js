const hostService = require('../services/hostService');
const mediaService = require('../services/mediaService');

async function getDashboardStats(req, res, next) {
  try {
    const stats = await hostService.getHostDashboardStats(req.user.id);
    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
}

async function getProperties(req, res, next) {
  try {
    const properties = await hostService.getHostProperties(req.user.id, req.query);
    res.json({ success: true, count: properties.length, data: properties });
  } catch (err) {
    next(err);
  }
}

async function getPropertyById(req, res, next) {
  try {
    const property = await hostService.getHostPropertyById(req.user.id, req.params.id, req.user.role);
    res.json({ success: true, data: property });
  } catch (err) {
    if (err.status === 403) {
      return res.status(403).json({ success: false, error: err.message });
    }
    res.status(404).json({ success: false, error: err.message });
  }
}

async function createProperty(req, res, next) {
  try {
    const property = await hostService.createHostProperty(req.user.id, req.body);
    res.status(201).json({ success: true, message: 'Property created and submitted for admin review.', data: property });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

async function updateProperty(req, res, next) {
  try {
    const property = await hostService.updateHostProperty(req.user.id, req.params.id, req.body, req.user.role);
    res.json({ success: true, message: 'Property updated successfully.', data: property });
  } catch (err) {
    if (err.status === 403) {
      return res.status(403).json({ success: false, error: err.message });
    }
    res.status(400).json({ success: false, error: err.message });
  }
}

async function deleteProperty(req, res, next) {
  try {
    const result = await hostService.deleteHostProperty(req.user.id, req.params.id, req.user.role);
    res.json(result);
  } catch (err) {
    if (err.status === 403) {
      return res.status(403).json({ success: false, error: err.message });
    }
    res.status(400).json({ success: false, error: err.message });
  }
}

async function getPropertyMedia(req, res, next) {
  try {
    // Validate ownership before retrieving media
    await hostService.getHostPropertyById(req.user.id, req.params.id, req.user.role);
    const media = await mediaService.getPropertyMedia(req.params.id);
    res.json({ success: true, data: media });
  } catch (err) {
    if (err.status === 403) {
      return res.status(403).json({ success: false, error: err.message });
    }
    res.status(404).json({ success: false, error: err.message });
  }
}

async function uploadPropertyImage(req, res, next) {
  try {
    const image = await mediaService.uploadPropertyImage(req.params.id, req.body, req.user);
    res.status(201).json({ success: true, message: 'Image uploaded successfully.', data: image });
  } catch (err) {
    if (err.message === 'Unauthorized') {
      return res.status(403).json({ success: false, error: 'Forbidden: You do not own this property.' });
    }
    res.status(400).json({ success: false, error: err.message });
  }
}

async function deletePropertyImage(req, res, next) {
  try {
    const result = await mediaService.deletePropertyImage(req.params.id, req.params.imageId, req.user);
    res.json(result);
  } catch (err) {
    if (err.message === 'Unauthorized') {
      return res.status(403).json({ success: false, error: 'Forbidden: You do not own this property.' });
    }
    res.status(400).json({ success: false, error: err.message });
  }
}

async function setPrimaryImage(req, res, next) {
  try {
    const image = await mediaService.setPrimaryImage(req.params.id, req.params.imageId, req.user);
    res.json({ success: true, message: 'Primary image updated successfully.', data: image });
  } catch (err) {
    if (err.message === 'Unauthorized') {
      return res.status(403).json({ success: false, error: 'Forbidden: You do not own this property.' });
    }
    res.status(400).json({ success: false, error: err.message });
  }
}

async function reorderPropertyImages(req, res, next) {
  try {
    const result = await mediaService.reorderPropertyImages(req.params.id, req.body.orders, req.user);
    res.json(result);
  } catch (err) {
    if (err.message === 'Unauthorized') {
      return res.status(403).json({ success: false, error: 'Forbidden: You do not own this property.' });
    }
    res.status(400).json({ success: false, error: err.message });
  }
}

async function getReservations(req, res, next) {
  try {
    const reservations = await hostService.getHostReservations(req.user.id, req.query, req.user.role);
    res.json({ success: true, count: reservations.length, data: reservations });
  } catch (err) {
    next(err);
  }
}

async function getReservationById(req, res, next) {
  try {
    const reservation = await hostService.getHostReservationById(req.user.id, req.params.id, req.user.role);
    res.json({ success: true, data: reservation });
  } catch (err) {
    if (err.status === 403) {
      return res.status(403).json({ success: false, error: err.message });
    }
    res.status(404).json({ success: false, error: err.message });
  }
}

async function getMessages(req, res, next) {
  try {
    const threads = await hostService.getHostMessages(req.user.id);
    res.json({ success: true, count: threads.length, data: threads });
  } catch (err) {
    next(err);
  }
}

async function getReviews(req, res, next) {
  try {
    const reviews = await hostService.getHostReviews(req.user.id);
    res.json({ success: true, count: reviews.length, data: reviews });
  } catch (err) {
    next(err);
  }
}

async function getProfile(req, res, next) {
  try {
    const user = await hostService.getHostProfile(req.user.id);
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

async function updateProfile(req, res, next) {
  try {
    const user = await hostService.updateHostProfile(req.user.id, req.body);
    res.json({ success: true, message: 'Host profile updated successfully.', data: user });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

async function applyBecomeHost(req, res, next) {
  try {
    if (req.user.role === 'HOST') {
      return res.json({ success: true, message: 'Your account is already an active HOST.', role: 'HOST' });
    }
    if (req.user.role === 'ADMIN') {
      return res.json({ success: true, message: 'Your account is an Administrator.', role: 'ADMIN' });
    }
    return res.status(403).json({
      success: false,
      error: 'Guest self-promotion is disabled. Please contact an Administrator to be approved and granted Host status.'
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

module.exports = {
  getDashboardStats,
  getProperties,
  getPropertyById,
  createProperty,
  updateProperty,
  deleteProperty,
  getPropertyMedia,
  uploadPropertyImage,
  deletePropertyImage,
  setPrimaryImage,
  reorderPropertyImages,
  getReservations,
  getReservationById,
  getMessages,
  getReviews,
  getProfile,
  updateProfile,
  applyBecomeHost
};
