const express = require('express');
const router = express.Router();
const campaignController = require('../controllers/campaignController');
const { authenticate, authorize } = require('../middleware/auth');

// All email campaign routes require ADMIN authorization
router.use(authenticate, authorize('ADMIN'));

router.get('/', campaignController.getCampaigns);
router.post('/', campaignController.createCampaign);
router.post('/preview-recipients', campaignController.previewRecipients);

router.get('/:id', campaignController.getCampaignById);
router.put('/:id', campaignController.updateCampaign);
router.delete('/:id', campaignController.deleteCampaign);

router.post('/:id/test', campaignController.sendTestEmail);
router.post('/:id/send', campaignController.sendCampaign);

module.exports = router;
