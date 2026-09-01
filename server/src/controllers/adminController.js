const adminService = require('../services/adminService');

async function getStats(req, res, next) {
  try {
    const stats = await adminService.getAdminStats();
    res.json({ success: true, data: stats });
  } catch (err) { next(err); }
}

// Users Management (9D)
async function getUsers(req, res, next) {
  try {
    const users = await adminService.getAllUsers(req.query);
    res.json({ success: true, count: users.length, data: users });
  } catch (err) { next(err); }
}

async function getUserById(req, res, next) {
  try {
    const user = await adminService.getUserById(req.params.id);
    res.json({ success: true, data: user });
  } catch (err) { res.status(404).json({ success: false, error: err.message }); }
}

async function updateUserProfile(req, res, next) {
  try {
    const user = await adminService.updateUserProfile(req.params.id, req.body);
    res.json({ success: true, data: user });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
}

async function updateUserRole(req, res, next) {
  try {
    const user = await adminService.updateUserRole(req.params.id, req.body.role, req.user);
    res.json({ success: true, data: user });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
}

async function deleteUser(req, res, next) {
  try {
    await adminService.deleteUser(req.params.id, req.user);
    res.json({ success: true, message: 'User account deleted successfully' });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
}

// Reservations Management (9E)
async function getReservations(req, res, next) {
  try {
    const result = await adminService.getAllReservations(req.query);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
}

async function getReservationById(req, res, next) {
  try {
    const reservation = await adminService.getReservationById(req.params.id);
    res.json({ success: true, data: reservation });
  } catch (err) { res.status(404).json({ success: false, error: err.message }); }
}

async function updateReservationStatus(req, res, next) {
  try {
    const { status, reason, notifyGuest, notifyHost } = req.body;
    const reservation = await adminService.updateReservationStatus(req.params.id, status, { reason, notifyGuest, notifyHost });
    res.json({ success: true, data: reservation });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
}

async function updatePaymentVerificationStatus(req, res, next) {
  try {
    const reservation = await adminService.updatePaymentVerificationStatusAdmin(
      req.params.id,
      req.body.paymentVerificationStatus,
      req.user
    );
    res.json({ success: true, data: reservation });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
}

async function deleteReservation(req, res, next) {
  try {
    await adminService.deleteReservation(req.params.id);
    res.json({ success: true, message: 'Reservation cancelled' });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
}

// Reviews Management (9F)
async function getReviews(req, res, next) {
  try {
    const result = await adminService.getAllReviews(req.query);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
}

async function getReviewById(req, res, next) {
  try {
    const review = await adminService.getReviewById(req.params.id);
    res.json({ success: true, data: review });
  } catch (err) { res.status(404).json({ success: false, error: err.message }); }
}

async function deleteReview(req, res, next) {
  try {
    await adminService.deleteReview(req.params.id);
    res.json({ success: true, message: 'Review deleted successfully' });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
}

// Cities Management (9G)
async function getCities(req, res, next) {
  try {
    const cities = await adminService.getAllCities(req.query);
    res.json({ success: true, count: cities.length, data: cities });
  } catch (err) { next(err); }
}

async function getCityById(req, res, next) {
  try {
    const city = await adminService.getCityById(req.params.id);
    res.json({ success: true, data: city });
  } catch (err) { res.status(404).json({ success: false, error: err.message }); }
}

async function createCity(req, res, next) {
  try {
    const city = await adminService.createCity(req.body);
    res.status(201).json({ success: true, data: city });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
}

async function updateCity(req, res, next) {
  try {
    const city = await adminService.updateCity(req.params.id, req.body);
    res.json({ success: true, data: city });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
}

async function deleteCity(req, res, next) {
  try {
    await adminService.deleteCity(req.params.id);
    res.json({ success: true, message: 'City deleted successfully' });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
}

// Communities Management (9H)
async function getCommunities(req, res, next) {
  try {
    const communities = await adminService.getAllCommunities(req.query);
    res.json({ success: true, count: communities.length, data: communities });
  } catch (err) { next(err); }
}

async function getCommunityById(req, res, next) {
  try {
    const community = await adminService.getCommunityById(req.params.id);
    res.json({ success: true, data: community });
  } catch (err) { res.status(404).json({ success: false, error: err.message }); }
}

async function createCommunity(req, res, next) {
  try {
    const community = await adminService.createCommunity(req.body);
    res.status(201).json({ success: true, data: community });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
}

async function updateCommunity(req, res, next) {
  try {
    const community = await adminService.updateCommunity(req.params.id, req.body);
    res.json({ success: true, data: community });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
}

async function deleteCommunity(req, res, next) {
  try {
    await adminService.deleteCommunity(req.params.id);
    res.json({ success: true, message: 'Community deleted successfully' });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
}

// Property Types Management (9I)
async function getPropertyTypes(req, res, next) {
  try {
    const propertyTypes = await adminService.getAllPropertyTypes(req.query);
    res.json({ success: true, count: propertyTypes.length, data: propertyTypes });
  } catch (err) { next(err); }
}

async function getPropertyTypeById(req, res, next) {
  try {
    const pt = await adminService.getPropertyTypeById(req.params.id);
    res.json({ success: true, data: pt });
  } catch (err) { res.status(404).json({ success: false, error: err.message }); }
}

async function createPropertyType(req, res, next) {
  try {
    const pt = await adminService.createPropertyType(req.body);
    res.status(201).json({ success: true, data: pt });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
}

async function updatePropertyType(req, res, next) {
  try {
    const pt = await adminService.updatePropertyType(req.params.id, req.body);
    res.json({ success: true, data: pt });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
}

async function deletePropertyType(req, res, next) {
  try {
    await adminService.deletePropertyType(req.params.id);
    res.json({ success: true, message: 'Property type deleted successfully' });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
}

// Amenities & Facilities Management (9J)
async function getAmenities(req, res, next) {
  try {
    const amenities = await adminService.getAllAmenities(req.query);
    res.json({ success: true, count: amenities.length, data: amenities });
  } catch (err) { next(err); }
}

async function getAmenityById(req, res, next) {
  try {
    const amenity = await adminService.getAmenityById(req.params.id);
    res.json({ success: true, data: amenity });
  } catch (err) { res.status(404).json({ success: false, error: err.message }); }
}

async function createAmenity(req, res, next) {
  try {
    const amenity = await adminService.createAmenity(req.body);
    res.status(201).json({ success: true, data: amenity });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
}

async function updateAmenity(req, res, next) {
  try {
    const amenity = await adminService.updateAmenity(req.params.id, req.body);
    res.json({ success: true, data: amenity });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
}

async function deleteAmenity(req, res, next) {
  try {
    await adminService.deleteAmenity(req.params.id);
    res.json({ success: true, message: 'Amenity deleted successfully' });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
}

async function getFacilities(req, res, next) {
  try {
    const facilities = await adminService.getAllFacilities(req.query);
    res.json({ success: true, count: facilities.length, data: facilities });
  } catch (err) { next(err); }
}

async function getFacilityById(req, res, next) {
  try {
    const facility = await adminService.getFacilityById(req.params.id);
    res.json({ success: true, data: facility });
  } catch (err) { res.status(404).json({ success: false, error: err.message }); }
}

async function createFacility(req, res, next) {
  try {
    const facility = await adminService.createFacility(req.body);
    res.status(201).json({ success: true, data: facility });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
}

async function updateFacility(req, res, next) {
  try {
    const facility = await adminService.updateFacility(req.params.id, req.body);
    res.json({ success: true, data: facility });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
}

async function deleteFacility(req, res, next) {
  try {
    await adminService.deleteFacility(req.params.id);
    res.json({ success: true, message: 'Facility deleted successfully' });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
}

// Invoices Management (9K)
async function getInvoices(req, res, next) {
  try {
    const result = await adminService.getAllInvoices(req.query);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
}

async function getInvoiceById(req, res, next) {
  try {
    const invoice = await adminService.getInvoiceById(req.params.id);
    res.json({ success: true, data: invoice });
  } catch (err) { res.status(404).json({ success: false, error: err.message }); }
}

async function deleteInvoice(req, res, next) {
  try {
    await adminService.deleteInvoice(req.params.id);
    res.json({ success: true, message: 'Invoice archived' });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
}

// Messages Management (9L)
async function getThreads(req, res, next) {
  try {
    const result = await adminService.getAllThreads(req.query);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
}

async function getThreadById(req, res, next) {
  try {
    const thread = await adminService.getThreadById(req.params.id);
    res.json({ success: true, data: thread });
  } catch (err) { res.status(404).json({ success: false, error: err.message }); }
}

async function deleteThread(req, res, next) {
  try {
    await adminService.deleteThread(req.params.id);
    res.json({ success: true, message: 'Message thread deleted successfully' });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
}

// Contact Messages Controllers
async function getContactMessages(req, res, next) {
  try {
    const result = await adminService.getAllContactMessages(req.query);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
}

async function getContactMessageById(req, res, next) {
  try {
    const message = await adminService.getContactMessageById(req.params.id);
    res.json({ success: true, data: message });
  } catch (err) { res.status(404).json({ success: false, error: err.message }); }
}

async function updateContactMessageStatus(req, res, next) {
  try {
    const message = await adminService.updateContactMessageStatus(req.params.id, req.body.status);
    res.json({ success: true, data: message });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
}

async function deleteContactMessage(req, res, next) {
  try {
    await adminService.deleteContactMessage(req.params.id);
    res.json({ success: true, message: 'Contact message deleted successfully' });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
}

// Site Settings Management (9M)
async function getSettings(req, res, next) {
  try {
    const settings = adminService.getSiteSettings();
    res.json({ success: true, data: settings });
  } catch (err) { next(err); }
}

async function getPublicSettings(req, res, next) {
  try {
    const settings = adminService.getPublicSiteSettings();
    res.json({ success: true, data: settings });
  } catch (err) { next(err); }
}

async function updateSettings(req, res, next) {
  try {
    const updated = adminService.updateSiteSettings(req.body);
    res.json({ success: true, data: updated });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
}

// Homepage CMS Management (9N)
async function getHomepageConfig(req, res, next) {
  try {
    const config = adminService.getHomepageConfig();
    res.json({ success: true, data: config });
  } catch (err) { next(err); }
}

async function updateHomepageConfig(req, res, next) {
  try {
    const updated = adminService.updateHomepageConfig(req.body);
    res.json({ success: true, data: updated });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
}

// Full Admin Property Management
async function getProperties(req, res, next) {
  try {
    const result = await adminService.getAllPropertiesAdmin(req.query);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
}

async function getPropertyById(req, res, next) {
  try {
    const property = await adminService.getPropertyByIdAdmin(req.params.id);
    res.json({ success: true, data: property });
  } catch (err) { res.status(404).json({ success: false, error: err.message }); }
}

async function createProperty(req, res, next) {
  try {
    const property = await adminService.createPropertyAdmin(req.body, req.user);
    res.status(201).json({ success: true, message: 'Property created successfully.', data: property });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
}

async function updateProperty(req, res, next) {
  try {
    const property = await adminService.updatePropertyAdmin(req.params.id, req.body);
    res.json({ success: true, message: 'Property updated successfully.', data: property });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
}

async function updatePropertyStatus(req, res, next) {
  try {
    const property = await adminService.updatePropertyStatusAdmin(req.params.id, req.body.status);
    res.json({ success: true, message: `Property status updated to ${property.status}`, data: property });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
}

async function updatePropertyFeatured(req, res, next) {
  try {
    const property = await adminService.updatePropertyFeaturedAdmin(req.params.id, req.body.isFeatured);
    res.json({ success: true, message: `Property featured state updated to ${property.isFeatured}`, data: property });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
}

async function updatePropertyOwner(req, res, next) {
  try {
    const property = await adminService.updatePropertyOwnerAdmin(req.params.id, req.body.hostId);
    res.json({ success: true, message: 'Property ownership reassigned successfully.', data: property });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
}

async function deleteProperty(req, res, next) {
  try {
    const rawMode = req.query?.deleteMode ?? req.body?.deleteMode ?? req.query?.mode ?? req.body?.mode;
    const deleteMode = String(rawMode || 'soft').trim().toLowerCase();

    console.log(`\n==================================================`);
    console.log(`[PERMANENT DELETE TRACE - CONTROLLER]`);
    console.log(`propertyId:          ${req.params.id}`);
    console.log(`req.method:          ${req.method}`);
    console.log(`req.originalUrl:     ${req.originalUrl}`);
    console.log(`req.query:          `, req.query);
    console.log(`req.body:           `, req.body);
    console.log(`resolvedDeleteMode:  ${deleteMode}`);
    console.log(`==================================================\n`);

    const result = await adminService.deletePropertyAdmin(req.params.id, { deleteMode });
    res.json({ success: true, message: result.message, deleteMode: result.deleteMode, data: result.data });
  } catch (err) { res.status(err.statusCode || 400).json({ success: false, error: err.message }); }
}

module.exports = {
  getStats,
  getUsers,
  getUserById,
  updateUserProfile,
  updateUserRole,
  deleteUser,
  getReservations,
  getReservationById,
  updateReservationStatus,
  deleteReservation,
  getReviews,
  getReviewById,
  deleteReview,
  getCities,
  getCityById,
  createCity,
  updateCity,
  deleteCity,
  getCommunities,
  getCommunityById,
  createCommunity,
  updateCommunity,
  deleteCommunity,
  getPropertyTypes,
  getPropertyTypeById,
  createPropertyType,
  updatePropertyType,
  deletePropertyType,
  getAmenities,
  getAmenityById,
  createAmenity,
  updateAmenity,
  deleteAmenity,
  getFacilities,
  getFacilityById,
  createFacility,
  updateFacility,
  deleteFacility,
  getInvoices,
  getInvoiceById,
  deleteInvoice,
  getThreads,
  getThreadById,
  deleteThread,
  getContactMessages,
  getContactMessageById,
  updateContactMessageStatus,
  deleteContactMessage,
  getSettings,
  getPublicSettings,
  updateSettings,
  getHomepageConfig,
  updateHomepageConfig,
  getProperties,
  getPropertyById,
  createProperty,
  updateProperty,
  updatePropertyStatus,
  updatePropertyFeatured,
  updatePropertyOwner,
  deleteProperty,
  updatePaymentVerificationStatus
};
