const propertyService = require('../services/propertyService');

async function getProperties(req, res, next) {
  try {
    const result = await propertyService.getProperties(req.query);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
}

async function getPropertyBySlug(req, res, next) {
  try {
    const property = await propertyService.getPropertyBySlug(req.params.slug);
    res.json({ success: true, data: property });
  } catch (err) { res.status(404).json({ success: false, error: err.message }); }
}

async function getPropertyById(req, res, next) {
  try {
    const property = await propertyService.getPropertyById(req.params.id);
    res.json({ success: true, data: property });
  } catch (err) { res.status(404).json({ success: false, error: err.message }); }
}

async function createProperty(req, res, next) {
  try {
    const property = await propertyService.createProperty(req.body, req.user.id);
    res.status(201).json({ success: true, data: property });
  } catch (err) { next(err); }
}

async function updateProperty(req, res, next) {
  try {
    const property = await propertyService.updateProperty(req.params.id, req.body, req.user);
    res.json({ success: true, data: property });
  } catch (err) { next(err); }
}

async function updateStatus(req, res, next) {
  try {
    const property = await propertyService.updatePropertyStatus(req.params.id, req.body.status, req.user);
    res.json({ success: true, data: property });
  } catch (err) { next(err); }
}

async function addExtraPrice(req, res, next) {
  try {
    const extraPrice = await propertyService.addExtraPrice(req.params.id, req.body, req.user);
    res.status(201).json({ success: true, data: extraPrice });
  } catch (err) { next(err); }
}

async function deleteProperty(req, res, next) {
  try {
    const rawMode = req.query?.deleteMode ?? req.body?.deleteMode ?? req.query?.mode ?? req.body?.mode;
    const deleteMode = String(rawMode || 'soft').trim().toLowerCase();

    console.log(`\n==================================================`);
    console.log(`[PERMANENT DELETE TRACE - CONTROLLER (propertyController)]`);
    console.log(`propertyId:          ${req.params.id}`);
    console.log(`req.method:          ${req.method}`);
    console.log(`req.originalUrl:     ${req.originalUrl}`);
    console.log(`req.query:          `, req.query);
    console.log(`req.body:           `, req.body);
    console.log(`resolvedDeleteMode:  ${deleteMode}`);
    console.log(`==================================================\n`);

    const result = await propertyService.deleteProperty(req.params.id, req.user, { deleteMode });
    res.json({ success: true, message: result.message, deleteMode: result.deleteMode, data: result.data });
  } catch (err) { next(err); }
}

module.exports = {
  getProperties,
  getPropertyBySlug,
  getPropertyById,
  createProperty,
  updateProperty,
  updateStatus,
  addExtraPrice,
  deleteProperty
};
