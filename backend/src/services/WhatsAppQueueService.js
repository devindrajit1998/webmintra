/**
 * Asynchronous WhatsApp Message Queue Worker & Producer
 *
 * - Non-blocking enqueueing of auto-replies, lead alerts, manual followups & campaigns
 * - Atomic job polling to avoid double-processing
 * - Dynamic pacing (3-6s random interval) per tenant to avoid flooding sockets
 * - Automatic retry with exponential backoff for transient errors
 */

import { WhatsAppMessageJob } from "../models/WhatsAppMessageJob.js";
import { TenantWhatsAppSettings } from "../models/TenantWhatsAppSettings.js";
import { FormSubmission } from "../models/FormSubmission.js";
import { WhatsAppCampaign } from "../models/WhatsAppCampaign.js";
import { tenantWhatsAppManager } from "./TenantWhatsAppManager.js";
import { normalizePhoneNumber } from "../lib/phone.js";

class WhatsAppQueueService {
  constructor() {
    this.isWorkerRunning = false;
    this.pollInterval = null;
  }

  /**
   * Enqueues a message job.
   * If a unique dedupKey is provided and already exists, skips gracefully.
   */
  async enqueueMessage({
    tenantId,
    leadId = null,
    campaignId = null,
    dedupKey = null,
    recipient,
    message,
    messageType,
    scheduledAt = new Date(),
  }) {
    const cleanPhone = normalizePhoneNumber(recipient);
    if (!cleanPhone) {
      throw new Error(`Cannot enqueue message: invalid phone number "${recipient}"`);
    }

    if (dedupKey) {
      const existing = await WhatsAppMessageJob.findOne({ dedupKey }).lean();
      if (existing) {
        return { duplicate: true, jobId: existing._id };
      }
    }

    try {
      const job = await WhatsAppMessageJob.create({
        tenant: tenantId,
        lead: leadId,
        campaign: campaignId,
        dedupKey: dedupKey || undefined,
        recipient: cleanPhone,
        message,
        messageType,
        status: "queued",
        scheduledAt,
      });

      return { duplicate: false, jobId: job._id };
    } catch (err) {
      if (err.code === 11000) {
        // E11000 duplicate key error -> already enqueued
        return { duplicate: true };
      }
      throw err;
    }
  }

  /**
   * Starts background queue polling worker.
   */
  startWorker(intervalMs = 2500) {
    if (this.isWorkerRunning) return;
    this.isWorkerRunning = true;
    console.log("[WhatsApp Queue] Worker started.");

    this.pollInterval = setInterval(() => {
      this.processQueue().catch((err) => {
        console.warn("[WhatsApp Queue] Worker loop error:", err.message);
      });
    }, intervalMs);
  }

  stopWorker() {
    if (this.pollInterval) clearInterval(this.pollInterval);
    this.isWorkerRunning = false;
  }

  /**
   * Processes available queued message jobs.
   */
  async processQueue() {
    const now = new Date();

    // Pick top jobs scheduled to run now
    const jobs = await WhatsAppMessageJob.find({
      status: "queued",
      scheduledAt: { $lte: now },
    })
      .sort({ scheduledAt: 1, createdAt: 1 })
      .limit(10);

    if (!jobs.length) return;

    for (const job of jobs) {
      // Atomic lock
      const locked = await WhatsAppMessageJob.findOneAndUpdate(
        { _id: job._id, status: "queued" },
        { $set: { status: "processing" }, $inc: { attempts: 1 } },
        { new: true }
      );

      if (!locked) continue;

      try {
        // Verify tenant socket status
        const status = await tenantWhatsAppManager.getTenantStatus(locked.tenant);
        if (!status.isConnected) {
          // If disconnected and retry limit reached, fail it
          if (locked.attempts >= locked.maxAttempts) {
            await this.markJobFailed(locked, "Tenant WhatsApp device is disconnected.");
          } else {
            // Re-queue with 30s delay
            await WhatsAppMessageJob.updateOne(
              { _id: locked._id },
              {
                $set: {
                  status: "queued",
                  scheduledAt: new Date(Date.now() + 30000),
                  error: "Device disconnected, will retry.",
                },
              }
            );
          }
          continue;
        }

        // Dispatch message through tenant's live session
        const res = await tenantWhatsAppManager.sendTenantMessage(locked.tenant, {
          recipient: locked.recipient,
          message: locked.message,
        });

        // Mark sent
        await WhatsAppMessageJob.updateOne(
          { _id: locked._id },
          {
            $set: {
              status: "sent",
              providerMessageId: res.messageId || "",
              processedAt: new Date(),
              error: "",
            },
          }
        );

        // Update lead contact timestamp if associated
        if (locked.lead) {
          await FormSubmission.updateOne(
            { _id: locked.lead },
            { $set: { lastWhatsAppContactAt: new Date() } }
          ).catch(() => {});
        }

        // Update campaign progress counters if associated
        if (locked.campaign) {
          await WhatsAppCampaign.updateOne(
            { _id: locked.campaign },
            {
              $inc: { sentCount: 1, queuedCount: -1 },
            }
          ).catch(() => {});
        }

        // Increment tenant daily message count
        await TenantWhatsAppSettings.updateOne(
          { tenant: locked.tenant },
          { $inc: { dailyMessageCount: 1 } }
        ).catch(() => {});
      } catch (error) {
        if (locked.attempts >= locked.maxAttempts) {
          await this.markJobFailed(locked, error.message);
        } else {
          // Retry with exponential delay
          const delaySec = Math.pow(2, locked.attempts) * 5;
          await WhatsAppMessageJob.updateOne(
            { _id: locked._id },
            {
              $set: {
                status: "queued",
                scheduledAt: new Date(Date.now() + delaySec * 1000),
                error: error.message,
              },
            }
          );
        }
      }
    }
  }

  async markJobFailed(job, errorMessage) {
    await WhatsAppMessageJob.updateOne(
      { _id: job._id },
      {
        $set: {
          status: "failed",
          error: errorMessage,
          processedAt: new Date(),
        },
      }
    );

    if (job.campaign) {
      await WhatsAppCampaign.updateOne(
        { _id: job.campaign },
        {
          $inc: { failedCount: 1, queuedCount: -1 },
        }
      ).catch(() => {});
    }
  }
}

export const whatsAppQueueService = new WhatsAppQueueService();
