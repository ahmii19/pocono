const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const mediaController = require('../controllers/mediaController');
const reservationController = require('../controllers/reservationController');
const { authenticate, authorize } = require('../middleware/auth');

// All admin routes require ADMIN role
router.use(authenticate, authorize('ADMIN'));

router.get('/stats', adminController.getStats);

// User Management (Phase 9D)
router.get('/users', adminController.getUsers);
router.get('/users/:id', adminController.getUserById);
router.put('/users/:id', adminController.updateUserProfile);
router.patch('/users/:id/role', adminController.updateUserRole);
router.delete('/users/:id', adminController.deleteUser);

// Reservation Management (Phase 9E)
router.get('/reservations', adminController.getReservations);
router.get('/reservations/:id', adminController.getReservationById);
router.patch('/reservations/:id/status', adminController.updateReservationStatus);
router.patch('/reservations/:id/payment-verification-status', adminController.updatePaymentVerificationStatus);
router.delete('/reservations/:id', adminController.deleteReservation);
router.patch('/reservations/:id/payment-verification/verify', reservationController.verifyPaymentProofAdmin);
router.patch('/reservations/:id/payment-verification/reject', reservationController.rejectPaymentProofAdmin);

// Host Earnings Management
const hostEarningController = require('../controllers/hostEarningController');
router.get('/earnings', hostEarningController.getAdminEarnings);
router.patch('/earnings/:id/status', hostEarningController.updateAdminEarningStatus);

// Reviews Management (Phase 9F)
router.get('/reviews', adminController.getReviews);
router.get('/reviews/:id', adminController.getReviewById);
router.delete('/reviews/:id', adminController.deleteReview);

// Cities Management (Phase 9G)
router.get('/cities', adminController.getCities);
router.get('/cities/:id', adminController.getCityById);
router.post('/cities', adminController.createCity);
router.put('/cities/:id', adminController.updateCity);
router.delete('/cities/:id', adminController.deleteCity);

// Communities Management (Phase 9H)
router.get('/communities', adminController.getCommunities);
router.get('/communities/:id', adminController.getCommunityById);
router.post('/communities', adminController.createCommunity);
router.put('/communities/:id', adminController.updateCommunity);
router.delete('/communities/:id', adminController.deleteCommunity);

// Property Types Management (Phase 9I)
router.get('/property-types', adminController.getPropertyTypes);
router.get('/property-types/:id', adminController.getPropertyTypeById);
router.post('/property-types', adminController.createPropertyType);
router.put('/property-types/:id', adminController.updatePropertyType);
router.delete('/property-types/:id', adminController.deletePropertyType);

// Amenities Management (Phase 9J)
router.get('/amenities', adminController.getAmenities);
router.get('/amenities/:id', adminController.getAmenityById);
router.post('/amenities', adminController.createAmenity);
router.put('/amenities/:id', adminController.updateAmenity);
router.delete('/amenities/:id', adminController.deleteAmenity);

// Facilities Management (Phase 9J)
router.get('/facilities', adminController.getFacilities);
router.get('/facilities/:id', adminController.getFacilityById);
router.post('/facilities', adminController.createFacility);
router.put('/facilities/:id', adminController.updateFacility);
router.delete('/facilities/:id', adminController.deleteFacility);

// Invoices Management (Phase 9K)
router.get('/invoices', adminController.getInvoices);
router.get('/invoices/:id', adminController.getInvoiceById);
router.delete('/invoices/:id', adminController.deleteInvoice);

// Messages Management (Phase 9L)
const messageController = require('../controllers/messageController');
router.get('/messages', adminController.getThreads);
router.get('/messages/:id', adminController.getThreadById);
router.post('/messages/:id/reply', messageController.replyToThread);
router.patch('/messages/:id/read', messageController.markThreadAsRead);
router.delete('/messages/:id', adminController.deleteThread);

// Contact Messages Management
router.get('/contact-messages', adminController.getContactMessages);
router.get('/contact-messages/:id', adminController.getContactMessageById);
router.patch('/contact-messages/:id/status', adminController.updateContactMessageStatus);
router.delete('/contact-messages/:id', adminController.deleteContactMessage);

// Site Settings Management (Phase 9M)
router.get('/settings', adminController.getSettings);
router.put('/settings', adminController.updateSettings);

// Homepage CMS Management (Phase 9N)
router.get('/homepage', adminController.getHomepageConfig);
router.put('/homepage', adminController.updateHomepageConfig);

// Full Admin Property Management (Phase 9B + Approval Workflow)
router.get('/properties', adminController.getProperties);
router.post('/properties', adminController.createProperty);
router.get('/properties/:id', adminController.getPropertyById);
router.put('/properties/:id', adminController.updateProperty);
router.patch('/properties/:id/status', adminController.updatePropertyStatus);
router.patch('/properties/:id/featured', adminController.updatePropertyFeatured);
router.patch('/properties/:id/owner', adminController.updatePropertyOwner);
router.delete('/properties/:id', adminController.deleteProperty);

// Admin Property Media Management
router.get('/properties/:id/media', mediaController.getPropertyMedia);
router.post('/properties/:id/media', mediaController.uploadPropertyImage);
router.delete('/properties/:id/media/:imageId', mediaController.deletePropertyImage);
router.patch('/properties/:id/media/:imageId/primary', mediaController.setPrimaryImage);
router.post('/properties/:id/media/reorder', mediaController.reorderPropertyImages);

module.exports = router;
