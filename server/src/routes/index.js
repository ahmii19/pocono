const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const taxonomyRoutes = require('./taxonomyRoutes');
const propertyRoutes = require('./propertyRoutes');
const reservationRoutes = require('./reservationRoutes');
const reviewRoutes = require('./reviewRoutes');
const invoiceRoutes = require('./invoiceRoutes');
const userRoutes = require('./userRoutes');
const favoriteRoutes = require('./favoriteRoutes');
const messageRoutes = require('./messageRoutes');
const membershipRoutes = require('./membershipRoutes');
const adminRoutes = require('./adminRoutes');
const hostRoutes = require('./hostRoutes');
const paymentRoutes = require('./paymentRoutes');
const contactRoutes = require('./contactRoutes');

const adminController = require('../controllers/adminController');

router.get('/settings', adminController.getPublicSettings);

router.use('/auth', authRoutes);
router.use('/', taxonomyRoutes);
router.use('/properties', propertyRoutes);
router.use('/reservations', reservationRoutes);
router.use('/reviews', reviewRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/users', userRoutes);
router.use('/favorites', favoriteRoutes);
router.use('/messages', messageRoutes);
router.use('/memberships', membershipRoutes);
router.use('/admin', adminRoutes);
router.use('/host', hostRoutes);
router.use('/payments', paymentRoutes);
router.use('/contact', contactRoutes);

module.exports = router;
