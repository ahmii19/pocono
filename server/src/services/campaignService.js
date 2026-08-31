const prisma = require('../config/prisma');
const emailService = require('./emailService');

/**
 * Server-side HTML Sanitizer:
 * Strips dangerous tags (<script>, <iframe>, <object>, <embed>, <applet>),
 * removes event handlers (onerror=, onload=, onclick=, etc.),
 * and removes javascript: or data: URIs.
 */
function sanitizeHtml(html) {
  if (!html) return '';
  let clean = String(html);
  // Remove script tags and contents
  clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  // Remove iframe, object, embed, applet tags
  clean = clean.replace(/<\/?(iframe|object|embed|applet)[^>]*>/gi, '');
  // Remove inline event handlers like onclick="...", onerror="..."
  clean = clean.replace(/\s+on[a-z]+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '');
  // Remove javascript: URIs
  clean = clean.replace(/href\s*=\s*(?:'javascript:[^']*'|"javascript:[^"]*"|javascript:[^\s>]+)/gi, 'href="#"');
  return clean.trim();
}

/**
 * Server-side Recipient Resolver:
 * Resolves active, non-deleted users according to recipient group and deduplicates by normalized email.
 */
async function resolveRecipients(recipientGroup, selectedUserIds = []) {
  let whereClause = {
    deletedAt: null,
    OR: [
      { status: 'ACTIVE' },
      { status: null }
    ]
  };

  if (recipientGroup === 'ALL_GUESTS') {
    whereClause.role = 'GUEST';
  } else if (recipientGroup === 'ALL_HOSTS') {
    whereClause.role = 'HOST';
  } else if (recipientGroup === 'SELECTED_USERS') {
    if (!Array.isArray(selectedUserIds) || selectedUserIds.length === 0) {
      return [];
    }
    whereClause.id = { in: selectedUserIds };
  }

  const users = await prisma.user.findMany({
    where: whereClause,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true
    },
    orderBy: { createdAt: 'asc' }
  });

  // Deduplicate by normalized email
  const seenEmails = new Set();
  const uniqueRecipients = [];

  for (const user of users) {
    if (!user.email) continue;
    const normalizedEmail = user.email.trim().toLowerCase();
    if (!seenEmails.has(normalizedEmail)) {
      seenEmails.add(normalizedEmail);
      uniqueRecipients.push({
        userId: user.id,
        email: normalizedEmail,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        role: user.role
      });
    }
  }

  return uniqueRecipients;
}

class CampaignService {
  /**
   * Preview recipient count and sample list for a potential campaign.
   */
  async previewRecipients(recipientGroup, selectedUserIds = []) {
    const recipients = await resolveRecipients(recipientGroup, selectedUserIds);
    return {
      totalRecipients: recipients.length,
      sampleRecipients: recipients.slice(0, 10)
    };
  }

  /**
   * List all email campaigns with creator details.
   */
  async getCampaigns() {
    const campaigns = await prisma.emailCampaign.findMany({
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return campaigns;
  }

  /**
   * Get single campaign by ID with recipient delivery logs.
   */
  async getCampaignById(id) {
    const campaign = await prisma.emailCampaign.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        recipients: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true, role: true } }
          },
          orderBy: { id: 'asc' }
        }
      }
    });

    if (!campaign) {
      const error = new Error('Campaign not found');
      error.statusCode = 404;
      throw error;
    }

    return campaign;
  }

  /**
   * Create a new draft campaign.
   */
  async createCampaign({ title, subject, contentHtml, recipientGroup, selectedUserIds, createdById }) {
    if (!title || !subject || !contentHtml || !recipientGroup) {
      const error = new Error('Title, subject, content, and recipient group are required.');
      error.statusCode = 400;
      throw error;
    }

    const sanitizedHtml = sanitizeHtml(contentHtml);
    const resolved = await resolveRecipients(recipientGroup, selectedUserIds);

    const campaign = await prisma.emailCampaign.create({
      data: {
        title: title.trim(),
        subject: subject.trim(),
        contentHtml: sanitizedHtml,
        recipientGroup,
        status: 'DRAFT',
        totalQueued: resolved.length,
        totalSent: 0,
        totalFailed: 0,
        createdById
      }
    });

    return campaign;
  }

  /**
   * Update an existing draft campaign.
   */
  async updateCampaign(id, { title, subject, contentHtml, recipientGroup, selectedUserIds }) {
    const existing = await prisma.emailCampaign.findUnique({ where: { id } });
    if (!existing) {
      const error = new Error('Campaign not found');
      error.statusCode = 404;
      throw error;
    }

    if (existing.status !== 'DRAFT') {
      const error = new Error(`Only DRAFT campaigns can be edited. Current status is ${existing.status}.`);
      error.statusCode = 400;
      throw error;
    }

    const dataToUpdate = {};
    if (title) dataToUpdate.title = title.trim();
    if (subject) dataToUpdate.subject = subject.trim();
    if (contentHtml) dataToUpdate.contentHtml = sanitizeHtml(contentHtml);
    if (recipientGroup) {
      dataToUpdate.recipientGroup = recipientGroup;
      const resolved = await resolveRecipients(recipientGroup, selectedUserIds);
      dataToUpdate.totalQueued = resolved.length;
    }

    const updated = await prisma.emailCampaign.update({
      where: { id },
      data: dataToUpdate
    });

    return updated;
  }

  /**
   * Delete a draft or cancelled campaign.
   */
  async deleteCampaign(id) {
    const existing = await prisma.emailCampaign.findUnique({ where: { id } });
    if (!existing) {
      const error = new Error('Campaign not found');
      error.statusCode = 404;
      throw error;
    }

    if (existing.status === 'SENDING') {
      const error = new Error('Cannot delete a campaign while it is currently sending.');
      error.statusCode = 400;
      throw error;
    }

    await prisma.emailCampaign.delete({ where: { id } });
    return { id, deleted: true };
  }

  /**
   * Send a test email strictly to the current Admin.
   */
  async sendTestEmail(campaignId, adminUser) {
    const campaign = await prisma.emailCampaign.findUnique({ where: { id: campaignId } });
    if (!campaign) {
      const error = new Error('Campaign not found');
      error.statusCode = 404;
      throw error;
    }

    if (!adminUser || !adminUser.email) {
      const error = new Error('Admin email not found for test dispatch.');
      error.statusCode = 400;
      throw error;
    }

    const testSubject = `[Test] ${campaign.subject}`;
    const testHtml = emailService.wrapCampaignTemplate(campaign.contentHtml, campaign.title);

    const success = await emailService.sendEmail({
      to: adminUser.email,
      subject: testSubject,
      html: testHtml
    });

    if (!success) {
      const error = new Error('Failed to send test email via SMTP. Please check SMTP settings.');
      error.statusCode = 500;
      throw error;
    }

    return { success: true, recipient: adminUser.email };
  }

  /**
   * Start campaign broadcast execution.
   * Uses atomic status update and lightweight controlled batching.
   */
  async sendCampaign(campaignId, selectedUserIds = []) {
    // 1. Atomic status check & update from DRAFT -> QUEUED
    const existing = await prisma.emailCampaign.findUnique({ where: { id: campaignId } });
    if (!existing) {
      const error = new Error('Campaign not found');
      error.statusCode = 404;
      throw error;
    }

    if (existing.status === 'QUEUED' || existing.status === 'SENDING' || existing.status === 'SENT') {
      const error = new Error(`Campaign has already been ${existing.status.toLowerCase()}.`);
      error.statusCode = 409; // Conflict
      throw error;
    }

    // 2. Resolve recipients & snapshot
    const recipientsList = await resolveRecipients(existing.recipientGroup, selectedUserIds);
    if (recipientsList.length === 0) {
      const error = new Error('No eligible recipients found for this campaign.');
      error.statusCode = 400;
      throw error;
    }

    // Clear any previous recipient snapshots if re-sending draft
    await prisma.campaignRecipient.deleteMany({ where: { campaignId } });

    // Create recipient snapshot records
    const snapshotData = recipientsList.map(r => ({
      campaignId,
      userId: r.userId,
      email: r.email,
      status: 'QUEUED'
    }));

    await prisma.campaignRecipient.createMany({ data: snapshotData });

    // Update Campaign state to QUEUED / SENDING
    await prisma.emailCampaign.update({
      where: { id: campaignId },
      data: {
        status: 'SENDING',
        totalQueued: recipientsList.length,
        totalSent: 0,
        totalFailed: 0,
        sentAt: new Date()
      }
    });

    // 3. Background Async Controlled Batch Execution (10 emails/batch, 1500ms delay)
    this.executeBatchSending(campaignId, existing.title, existing.subject, existing.contentHtml).catch(err => {
      console.error(`[CAMPAIGN BATCH ERROR] Campaign ${campaignId} failed:`, err);
    });

    return {
      campaignId,
      status: 'SENDING',
      totalQueued: recipientsList.length
    };
  }

  /**
   * Controlled Batch Runner:
   * Processes recipients in batches of 10 with a 1.5 second pause between batches.
   * Updates counters in real-time.
   */
  async executeBatchSending(campaignId, title, subject, contentHtml) {
    const BATCH_SIZE = 10;
    const BATCH_DELAY_MS = 1500;

    const wrappedHtml = emailService.wrapCampaignTemplate(contentHtml, title);
    const recipients = await prisma.campaignRecipient.findMany({
      where: { campaignId, status: 'QUEUED' },
      orderBy: { id: 'asc' }
    });

    let sentCount = 0;
    let failCount = 0;

    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);

      await Promise.all(batch.map(async (rec) => {
        try {
          const ok = await emailService.sendEmail({
            to: rec.email,
            subject,
            html: wrappedHtml
          });

          if (ok) {
            sentCount++;
            await prisma.campaignRecipient.update({
              where: { id: rec.id },
              data: { status: 'SENT', sentAt: new Date() }
            });
          } else {
            failCount++;
            await prisma.campaignRecipient.update({
              where: { id: rec.id },
              data: { status: 'FAILED', errorMessage: 'SMTP delivery returned false' }
            });
          }
        } catch (err) {
          failCount++;
          await prisma.campaignRecipient.update({
            where: { id: rec.id },
            data: { status: 'FAILED', errorMessage: err.message || 'Delivery error' }
          });
        }
      }));

      // Update real-time progress counters on campaign record
      await prisma.emailCampaign.update({
        where: { id: campaignId },
        data: {
          totalSent: sentCount,
          totalFailed: failCount
        }
      });

      // Pause between batches to protect SMTP server
      if (i + BATCH_SIZE < recipients.length) {
        await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
      }
    }

    // Finalize campaign state
    const finalStatus = failCount === recipients.length ? 'FAILED' : 'SENT';
    await prisma.emailCampaign.update({
      where: { id: campaignId },
      data: {
        status: finalStatus,
        sentAt: new Date()
      }
    });

    console.log(`[CAMPAIGN COMPLETE] Campaign ID: ${campaignId} | Sent: ${sentCount} | Failed: ${failCount} | Status: ${finalStatus}`);
  }
}

module.exports = new CampaignService();
