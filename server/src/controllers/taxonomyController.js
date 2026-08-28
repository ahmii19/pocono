const taxonomyService = require('../services/taxonomyService');

async function getCities(req, res, next) {
  try {
    const cities = await taxonomyService.getCities();
    res.json({ success: true, count: cities.length, data: cities });
  } catch (err) { next(err); }
}

async function getCommunities(req, res, next) {
  try {
    const communities = await taxonomyService.getCommunities();
    res.json({ success: true, count: communities.length, data: communities });
  } catch (err) { next(err); }
}

async function getPropertyTypes(req, res, next) {
  try {
    const types = await taxonomyService.getPropertyTypes();
    res.json({ success: true, count: types.length, data: types });
  } catch (err) { next(err); }
}

async function getAmenities(req, res, next) {
  try {
    const amenities = await taxonomyService.getAmenities();
    res.json({ success: true, count: amenities.length, data: amenities });
  } catch (err) { next(err); }
}

async function getFacilities(req, res, next) {
  try {
    const facilities = await taxonomyService.getFacilities();
    res.json({ success: true, count: facilities.length, data: facilities });
  } catch (err) { next(err); }
}

module.exports = { getCities, getCommunities, getPropertyTypes, getAmenities, getFacilities };
