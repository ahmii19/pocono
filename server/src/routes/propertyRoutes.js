const express = require('express');
const router = express.Router();
const propertyController = require('../controllers/propertyController');
const reviewController = require('../controllers/reviewController');
const mediaController = require('../controllers/mediaController');
const { authenticate, authorize } = require('../middleware/auth');

// Public routes
router.get('/', propertyController.getProperties);
router.get('/slug/:slug', propertyController.getPropertyBySlug);
router.get('/:id', propertyController.getPropertyById);
router.get('/:propertyId/reviews', reviewController.getPropertyReviews);
router.get('/:id/media', mediaController.getPropertyMedia);

// Authenticated Host/Admin routes
router.post('/', authenticate, authorize('HOST', 'ADMIN'), propertyController.createProperty);
router.put('/:id', authenticate, authorize('HOST', 'ADMIN'), propertyController.updateProperty);
router.patch('/:id/status', authenticate, authorize('HOST', 'ADMIN'), propertyController.updateStatus);
router.delete('/:id', authenticate, authorize('HOST', 'ADMIN'), propertyController.deleteProperty);
router.post('/:id/extra-prices', authenticate, authorize('HOST', 'ADMIN'), propertyController.addExtraPrice);

// Property Media Management
router.post('/:id/media', authenticate, authorize('HOST', 'ADMIN'), mediaController.uploadPropertyImage);
router.patch('/:id/media/:imageId/primary', authenticate, authorize('HOST', 'ADMIN'), mediaController.setPrimaryImage);
router.patch('/:id/media/reorder', authenticate, authorize('HOST', 'ADMIN'), mediaController.reorderPropertyImages);
router.delete('/:id/media/:imageId', authenticate, authorize('HOST', 'ADMIN'), mediaController.deletePropertyImage);

module.exports = router;
