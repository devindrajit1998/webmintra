/**
 * Razorpay Payment & Subscription Webhook Handler
 * /api/webhooks/razorpay
 *
 * Handles asynchronous server-to-server events from Razorpay for 100% reliable
 * transaction processing, automatic recurring subscription renewals, and invoice generation.
 */

import crypto from "node:crypto";
import { Router } from "express";
import { Payment } from "../../models/Payment.js";
import { Subscription } from "../../models/Subscription.js";
import { User } from "../../models/User.js";
import { Plan } from "../../models/Plan.js";
import { sendSubscriptionEmail } from "../../services/mail.js";

const router = Router();

router.post("/", async (req, res) => {
  try {
    const signature = req.headers["x-razorpay-signature"];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    // Verify webhook signature if secret is configured
    if (webhookSecret && signature) {
      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(JSON.stringify(req.body))
        .digest("hex");

      if (expectedSignature !== signature) {
        console.warn("[Razorpay Webhook]: Signature mismatch detected.");
        return res.status(400).json({ message: "Invalid webhook signature." });
      }
    }

    const event = req.body.event;
    const payload = req.body.payload;

    if (!event || !payload) {
      return res.status(400).json({ message: "Invalid webhook payload structure." });
    }

    console.log(`[Razorpay Webhook Event Received]: ${event}`);

    switch (event) {
      // ── 1. Payment Captured / Succeeded ────────────────────────
      case "payment.captured":
      case "order.paid": {
        const paymentEntity = payload.payment?.entity;
        const orderEntity = payload.order?.entity;
        const orderId = paymentEntity?.order_id || orderEntity?.id;
        const paymentId = paymentEntity?.id;
        const amountInRupees = (paymentEntity?.amount || orderEntity?.amount_paid || 0) / 100;
        const notes = paymentEntity?.notes || orderEntity?.notes || {};
        const tenantId = notes.tenantId;
        const planId = notes.planId;
        const interval = notes.interval || "monthly";

        if (!tenantId) {
          console.warn("[Razorpay Webhook]: payment.captured missing tenantId note.");
          break;
        }

        const user = await User.findById(tenantId);
        if (!user) break;

        // Find or check existing payment record
        let paymentRecord = await Payment.findOne({
          $or: [
            { externalTransactionId: paymentId },
            { "metadata.razorpayOrderId": orderId },
          ],
        });

        if (paymentRecord) {
          if (paymentRecord.status !== "succeeded") {
            paymentRecord.status = "succeeded";
            paymentRecord.paidAt = new Date();
            paymentRecord.externalTransactionId = paymentId;
            await paymentRecord.save();
          }
        } else {
          // Create payment record if not yet created by client verify
          paymentRecord = await Payment.create({
            tenant: user._id,
            amount: amountInRupees,
            currency: paymentEntity?.currency || "INR",
            subtotal: amountInRupees,
            status: "succeeded",
            method: paymentEntity?.method || "card",
            externalTransactionId: paymentId,
            paidAt: new Date(),
            description: `Payment for WebMintra ${interval} plan`,
            metadata: {
              razorpayOrderId: orderId,
              razorpayPaymentId: paymentId,
              bank: paymentEntity?.bank,
              wallet: paymentEntity?.wallet,
              vpa: paymentEntity?.vpa,
            },
          });
        }

        // Activate / Extend Subscription
        let subscription = await Subscription.findOne({ tenant: user._id }).sort({ createdAt: -1 });
        const now = new Date();
        const endDate = new Date(now);
        if (interval === "yearly") endDate.setFullYear(endDate.getFullYear() + 1);
        else endDate.setMonth(endDate.getMonth() + 1);

        if (subscription) {
          subscription.status = "active";
          subscription.startDate = now;
          subscription.endDate = endDate;
          subscription.trialEndsAt = null;
          await subscription.save();

          if (!paymentRecord.subscription) {
            paymentRecord.subscription = subscription._id;
            await paymentRecord.save();
          }
        }

        // Ensure user tenantStatus is active
        if (user.tenantStatus !== "active") {
          user.tenantStatus = "active";
          await user.save();
        }

        // Send non-blocking payment confirmation email
        sendSubscriptionEmail({
          type: "subscription_payment_success",
          email: user.email,
          name: user.name,
          planName: subscription?.planSnapshot?.name || "WebMintra",
          amount: amountInRupees,
          currency: paymentEntity?.currency || "INR",
          nextBillingDate: endDate.toLocaleDateString("en-IN"),
        }).catch((e) => console.warn("[Razorpay Webhook Email Error]:", e.message));

        break;
      }

      // ── 2. Payment Failed ──────────────────────────────────────
      case "payment.failed": {
        const paymentEntity = payload.payment?.entity;
        const paymentId = paymentEntity?.id;
        const notes = paymentEntity?.notes || {};
        const tenantId = notes.tenantId;

        if (tenantId) {
          const user = await User.findById(tenantId);
          if (user) {
            await Payment.create({
              tenant: user._id,
              amount: (paymentEntity?.amount || 0) / 100,
              currency: paymentEntity?.currency || "INR",
              status: "failed",
              method: paymentEntity?.method || "card",
              externalTransactionId: paymentId,
              failedAt: new Date(),
              failureReason: paymentEntity?.error_description || "Payment failed via gateway",
              description: "Failed payment transaction",
            });

            sendSubscriptionEmail({
              type: "subscription_payment_failed",
              email: user.email,
              name: user.name,
              planName: "WebMintra Plan",
              amount: (paymentEntity?.amount || 0) / 100,
              currency: paymentEntity?.currency || "INR",
            }).catch((e) => console.warn("[Razorpay Webhook Failure Email Error]:", e.message));
          }
        }
        break;
      }

      // ── 3. Recurring Subscription Charged / Renewed ─────────────
      case "subscription.charged": {
        const subEntity = payload.subscription?.entity;
        const paymentEntity = payload.payment?.entity;
        const notes = subEntity?.notes || paymentEntity?.notes || {};
        const tenantId = notes.tenantId;

        if (tenantId) {
          const user = await User.findById(tenantId);
          if (user) {
            const amountInRupees = (paymentEntity?.amount || 0) / 100;
            const now = new Date();
            const endDate = new Date(now);
            endDate.setMonth(endDate.getMonth() + 1);

            const subscription = await Subscription.findOne({ tenant: user._id }).sort({ createdAt: -1 });
            if (subscription) {
              subscription.status = "active";
              subscription.endDate = endDate;
              await subscription.save();

              await Payment.create({
                tenant: user._id,
                subscription: subscription._id,
                amount: amountInRupees,
                currency: paymentEntity?.currency || "INR",
                status: "succeeded",
                method: paymentEntity?.method || "card",
                externalTransactionId: paymentEntity?.id,
                paidAt: now,
                description: `Recurring subscription renewal (${subscription.planSnapshot?.name || "Plan"})`,
              });
            }
          }
        }
        break;
      }

      default:
        console.log(`[Razorpay Webhook]: Unhandled event ${event}`);
        break;
    }

    return res.status(200).json({ status: "ok" });
  } catch (error) {
    console.error("[Razorpay Webhook Error]:", error);
    return res.status(500).json({ message: "Webhook handler failed: " + error.message });
  }
});

export default router;
