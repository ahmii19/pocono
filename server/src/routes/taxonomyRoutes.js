const express = require('express');
const router = express.Router();
const taxonomyController = require('../controllers/taxonomyController');

router.get('/cities', taxonomyController.getCities);
router.get('/communities', taxonomyController.getCommunities);
router.get('/property-types', taxonomyController.getPropertyTypes);
router.get('/amenities', taxonomyController.getAmenities);
router.get('/facilities', taxonomyController.getFacilities);

module.exports = router;
