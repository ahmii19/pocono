const campaignService = require('../services/campaignService');

class CampaignController {
  async getCampaigns(req, res) {
    try {
      const campaigns = await campaignService.getCampaigns();
      return res.status(200).json({ success: true, data: campaigns });
    } catch (err) {
      console.error('getCampaigns Error:', err);
      return res.status(err.statusCode || 500).json({ success: false, error: err.message });
    }
  }

  async previewRecipients(req, res) {
    try {
      const { recipientGroup, selectedUserIds } = req.body;
      const preview = await campaignService.previewRecipients(recipientGroup, selectedUserIds);
      return res.status(200).json({ success: true, data: preview });
    } catch (err) {
      console.error('previewRecipients Error:', err);
      return res.status(err.statusCode || 500).json({ success: false, error: err.message });
    }
  }

  async getCampaignById(req, res) {
    try {
      const { id } = req.params;
      const campaign = await campaignService.getCampaignById(id);
      return res.status(200).json({ success: true, data: campaign });
    } catch (err) {
      console.error('getCampaignById Error:', err);
      return res.status(err.statusCode || 500).json({ success: false, error: err.message });
    }
  }

  async createCampaign(req, res) {
    try {
      const { title, subject, contentHtml, recipientGroup, selectedUserIds } = req.body;
      const createdById = req.user.id;

      const campaign = await campaignService.createCampaign({
        title,
        subject,
        contentHtml,
        recipientGroup,
        selectedUserIds,
        createdById
      });

      return res.status(201).json({ success: true, data: campaign });
    } catch (err) {
      console.error('createCampaign Error:', err);
      return res.status(err.statusCode || 500).json({ success: false, error: err.message });
    }
  }

  async updateCampaign(req, res) {
    try {
      const { id } = req.params;
      const { title, subject, contentHtml, recipientGroup, selectedUserIds } = req.body;

      const updated = await campaignService.updateCampaign(id, {
        title,
        subject,
        contentHtml,
        recipientGroup,
        selectedUserIds
      });

      return res.status(200).json({ success: true, data: updated });
    } catch (err) {
      console.error('updateCampaign Error:', err);
      return res.status(err.statusCode || 500).json({ success: false, error: err.message });
    }
  }

  async deleteCampaign(req, res) {
    try {
      const { id } = req.params;
      const result = await campaignService.deleteCampaign(id);
      return res.status(200).json({ success: true, data: result });
    } catch (err) {
      console.error('deleteCampaign Error:', err);
      return res.status(err.statusCode || 500).json({ success: false, error: err.message });
    }
  }

  async sendTestEmail(req, res) {
    try {
      const { id } = req.params;
      const adminUser = req.user;

      const result = await campaignService.sendTestEmail(id, adminUser);
      return res.status(200).json({
        success: true,
        message: `Test email successfully sent to ${result.recipient}`,
        data: result
      });
    } catch (err) {
      console.error('sendTestEmail Error:', err);
      return res.status(err.statusCode || 500).json({ success: false, error: err.message });
    }
  }

  async sendCampaign(req, res) {
    try {
      const { id } = req.params;
      const { selectedUserIds } = req.body;

      const result = await campaignService.sendCampaign(id, selectedUserIds);
      return res.status(200).json({
        success: true,
        message: 'Campaign broadcasting initiated in background.',
        data: result
      });
    } catch (err) {
      console.error('sendCampaign Error:', err);
      return res.status(err.statusCode || 500).json({ success: false, error: err.message });
    }
  }
}

module.exports = new CampaignController();
