const express = require('express');
const router = express.Router();
const hostController = require('../controllers/hostController');
const { authenticate, authorize } = require('../middleware/auth');

// Apply to Become a Host (Allows GUEST, HOST, ADMIN)
router.post('/apply', authenticate, hostController.applyBecomeHost);

// All subsequent host routes require HOST or ADMIN role
router.use(authenticate, authorize('HOST', 'ADMIN'));

// Host Dashboard Overview Stats
router.get('/dashboard', hostController.getDashboardStats);

// Host Properties CRUD
router.get('/properties', hostController.getProperties);
router.post('/properties', hostController.createProperty);
router.get('/properties/:id', hostController.getPropertyById);
router.put('/properties/:id', hostController.updateProperty);
router.delete('/properties/:id', hostController.deleteProperty);

// Host Property Media
router.get('/properties/:id/media', hostController.getPropertyMedia);
router.post('/properties/:id/media', hostController.uploadPropertyImage);
router.delete('/properties/:id/media/:imageId', hostController.deletePropertyImage);
router.patch('/properties/:id/media/:imageId/primary', hostController.setPrimaryImage);
router.post('/properties/:id/media/reorder', hostController.reorderPropertyImages);

// Host Reservations & Earnings
router.get('/reservations', hostController.getReservations);
router.get('/reservations/:id', hostController.getReservationById);
const hostEarningRoutes = require('./hostEarningRoutes');
router.use('/earnings', hostEarningRoutes);

// Host Messages & Reviews
router.get('/messages', hostController.getMessages);
router.get('/reviews', hostController.getReviews);

// Host Profile
router.get('/profile', hostController.getProfile);
router.put('/profile', hostController.updateProfile);

module.exports = router;
