/**
 * Campaign Broadcast Management Service
 *
 * - Filters eligible non-opted-out leads for a tenant
 * - Staggers scheduled messages with safe technical delays (4-7s between sends)
 * - Manages pause, resume, and cancel states
 */

import { WhatsAppCampaign } from "../models/WhatsAppCampaign.js";
import { FormSubmission } from "../models/FormSubmission.js";
import { WhatsAppMessageJob } from "../models/WhatsAppMessageJob.js";
import { whatsAppQueueService } from "./WhatsAppQueueService.js";
import { isValidPhoneNumber, normalizePhoneNumber } from "../lib/phone.js";

class WhatsAppCampaignService {
  /**
   * Fetches eligible lead count for a tenant's campaign.
   */
  async getEligibleLeadsCount(tenantId) {
    return FormSubmission.countDocuments({
      tenantId,
      contactPhone: { $exists: true, $ne: "" },
      whatsappOptOut: { $ne: true },
    });
  }

  /**
   * Creates a new promotional campaign and queues staggered jobs.
   */
  async createCampaign(tenantId, { name, message }) {
    if (!name || typeof name !== "string" || !name.trim()) {
      throw new Error("Campaign name is required.");
    }
    if (!message || typeof message !== "string" || !message.trim()) {
      throw new Error("Campaign message is required.");
    }

    // 1. Fetch all eligible leads for this tenant
    const leads = await FormSubmission.find({
      tenantId,
      contactPhone: { $exists: true, $ne: "" },
      whatsappOptOut: { $ne: true },
    })
      .select("_id contactPhone contactName")
      .lean();

    // De-duplicate by phone number so the same person isn't messaged twice
    const uniqueRecipients = new Map();
    for (const lead of leads) {
      const cleanPhone = normalizePhoneNumber(lead.contactPhone);
      if (cleanPhone && isValidPhoneNumber(cleanPhone) && !uniqueRecipients.has(cleanPhone)) {
        uniqueRecipients.set(cleanPhone, lead);
      }
    }

    const totalRecipients = uniqueRecipients.size;
    if (totalRecipients === 0) {
      throw new Error("No eligible WhatsApp leads found with valid phone numbers.");
    }

    // 2. Create Campaign record
    const campaign = await WhatsAppCampaign.create({
      tenant: tenantId,
      name: name.trim(),
      message: message.trim(),
      status: "sending",
      totalRecipients,
      queuedCount: totalRecipients,
      sentCount: 0,
      failedCount: 0,
      skippedCount: 0,
      startedAt: new Date(),
    });

    // 3. Stagger jobs with safe technical delays (4-7 seconds interval)
    let delaySeconds = 2;
    const now = Date.now();

    for (const [phone, lead] of uniqueRecipients.entries()) {
      const scheduledAt = new Date(now + delaySeconds * 1000);

      await whatsAppQueueService.enqueueMessage({
        tenantId,
        leadId: lead._id,
        campaignId: campaign._id,
        recipient: phone,
        message: message.trim(),
        messageType: "campaign",
        scheduledAt,
      });

      // Increment delay with small random jitter
      delaySeconds += Math.floor(Math.random() * 4) + 4; // 4 to 7 seconds delay
    }

    return campaign;
  }

  /**
   * Pauses an active campaign.
   */
  async pauseCampaign(tenantId, campaignId) {
    const campaign = await WhatsAppCampaign.findOneAndUpdate(
      { _id: campaignId, tenant: tenantId, status: "sending" },
      { $set: { status: "paused" } },
      { new: true }
    );
    if (!campaign) throw new Error("Campaign not found or not currently sending.");

    // Mark pending jobs as paused/cancelled temporarily
    await WhatsAppMessageJob.updateMany(
      { campaign: campaignId, status: "queued" },
      { $set: { status: "paused" } }
    );

    return campaign;
  }

  /**
   * Resumes a paused campaign.
   */
  async resumeCampaign(tenantId, campaignId) {
    const campaign = await WhatsAppCampaign.findOneAndUpdate(
      { _id: campaignId, tenant: tenantId, status: "paused" },
      { $set: { status: "sending" } },
      { new: true }
    );
    if (!campaign) throw new Error("Campaign not found or not currently paused.");

    // Re-schedule paused jobs starting now
    const pausedJobs = await WhatsAppMessageJob.find({
      campaign: campaignId,
      status: "paused",
    });

    let delaySeconds = 2;
    const now = Date.now();
    for (const job of pausedJobs) {
      await WhatsAppMessageJob.updateOne(
        { _id: job._id },
        {
          $set: {
            status: "queued",
            scheduledAt: new Date(now + delaySeconds * 1000),
          },
        }
      );
      delaySeconds += Math.floor(Math.random() * 4) + 4;
    }

    return campaign;
  }

  /**
   * Cancels an active/paused campaign and deletes un-sent jobs.
   */
  async cancelCampaign(tenantId, campaignId) {
    const campaign = await WhatsAppCampaign.findOneAndUpdate(
      { _id: campaignId, tenant: tenantId },
      { $set: { status: "cancelled", completedAt: new Date() } },
      { new: true }
    );
    if (!campaign) throw new Error("Campaign not found.");

    await WhatsAppMessageJob.updateMany(
      { campaign: campaignId, status: { $in: ["queued", "paused"] } },
      { $set: { status: "cancelled" } }
    );

    return campaign;
  }
}

export const whatsAppCampaignService = new WhatsAppCampaignService();
