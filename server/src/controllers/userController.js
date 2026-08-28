const userService = require('../services/userService');

async function updateProfile(req, res, next) {
  try {
    const user = await userService.updateProfile(req.user.id, req.body);
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
}

async function getHostProfile(req, res, next) {
  try {
    const host = await userService.getHostProfile(req.params.id);
    res.json({ success: true, data: host });
  } catch (err) { res.status(404).json({ success: false, error: err.message }); }
}

module.exports = { updateProfile, getHostProfile };
