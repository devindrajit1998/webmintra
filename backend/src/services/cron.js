import cron from "node-cron";
import { BlogPost } from "../models/Blog.js";
import { TenantBlogPost } from "../models/TenantBlogPost.js";
import { Subscription } from "../models/Subscription.js";
import { Payment } from "../models/Payment.js";
import { sendRawEmail } from "./mail.js";
import { Notification } from "../models/Notification.js";

/**
 * Initializes and starts all background cron jobs.
 */
export function initCronJobs() {
    console.log("Initializing background cron jobs...");

    // 1. Auto-publish scheduled blog posts
    // Runs every 5 minutes
    cron.schedule("*/5 * * * *", async () => {
        console.log("[CRON] Running scheduled blog post publisher...");
        try {
            const now = new Date();
            
            // Publish admin blog posts
            const adminPosts = await BlogPost.updateMany(
                { status: "scheduled", scheduledAt: { $lte: now } },
                { $set: { status: "published", publishedAt: now } }
            );
            
            // Publish tenant blog posts
            const tenantPosts = await TenantBlogPost.updateMany(
                { status: "scheduled", scheduledAt: { $lte: now } },
                { $set: { status: "published", publishedAt: now } }
            );

            if (adminPosts.modifiedCount > 0 || tenantPosts.modifiedCount > 0) {
                console.log(`[CRON] Published ${adminPosts.modifiedCount} admin posts and ${tenantPosts.modifiedCount} tenant posts.`);
            }
        } catch (error) {
            console.error("[CRON] Error publishing scheduled posts:", error);
        }
    });

    // 2. Expire subscriptions
    // Runs daily at midnight
    cron.schedule("0 0 * * *", async () => {
        console.log("[CRON] Running subscription expiry check...");
        try {
            const now = new Date();
            
            const expired = await Subscription.updateMany(
                { 
                    status: { $in: ["active", "trialing", "past_due"] },
                    endDate: { $lte: now } 
                },
                { $set: { status: "expired" } }
            );
            
            if (expired.modifiedCount > 0) {
                console.log(`[CRON] Expired ${expired.modifiedCount} subscriptions.`);
            }
        } catch (error) {
            console.error("[CRON] Error expiring subscriptions:", error);
        }
    });

    // 3. Send renewal reminders
    // Runs daily at 8:00 AM
    cron.schedule("0 8 * * *", async () => {
        console.log("[CRON] Running renewal reminders...");
        try {
            const today = new Date();
            const sevenDaysFromNow = new Date(today);
            sevenDaysFromNow.setDate(today.getDate() + 7);
            
            const startOfDay = new Date(sevenDaysFromNow);
            startOfDay.setHours(0, 0, 0, 0);
            
            const endOfDay = new Date(sevenDaysFromNow);
            endOfDay.setHours(23, 59, 59, 999);

            const subscriptionsToRenew = await Subscription.find({
                autoRenew: true,
                status: "active",
                endDate: { $gte: startOfDay, $lte: endOfDay }
            }).populate("tenant plan");

            for (const sub of subscriptionsToRenew) {
                if (!sub.tenant || !sub.tenant.email) continue;
                
                // Note: Normally we'd use sendEmail with a template, but using raw for simplicity
                await sendRawEmail({
                    to: sub.tenant.email,
                    subject: "Your WebMintra Subscription is Renewing Soon",
                    text: `Hi ${sub.tenant.name},\n\nThis is a reminder that your ${sub.planSnapshot?.name || "WebMintra"} subscription will renew in 7 days on ${sub.endDate.toLocaleDateString()}.\n\nThank you for using WebMintra!`,
                    html: `<p>Hi ${sub.tenant.name},</p><p>This is a reminder that your ${sub.planSnapshot?.name || "WebMintra"} subscription will renew in 7 days on ${sub.endDate.toLocaleDateString()}.</p><p>Thank you for using WebMintra!</p>`
                });
                
                await Notification.create({
                    recipient: sub.tenant._id,
                    type: "billing",
                    title: "Subscription Renewing Soon",
                    message: `Your subscription will renew on ${sub.endDate.toLocaleDateString()}.`,
                    link: "/tenant/billing"
                });
            }
            
            if (subscriptionsToRenew.length > 0) {
                console.log(`[CRON] Sent ${subscriptionsToRenew.length} renewal reminders.`);
            }
        } catch (error) {
            console.error("[CRON] Error sending renewal reminders:", error);
        }
    });

    // 4. Billing Dunning (Retry / Failed Payments)
    // Runs daily at 9:00 AM
    cron.schedule("0 9 * * *", async () => {
        console.log("[CRON] Running billing dunning check...");
        try {
            const today = new Date();
            const threeDaysAgo = new Date(today);
            threeDaysAgo.setDate(today.getDate() - 3);
            
            const startOfDay = new Date(threeDaysAgo);
            startOfDay.setHours(0, 0, 0, 0);
            
            const endOfDay = new Date(threeDaysAgo);
            endOfDay.setHours(23, 59, 59, 999);

            const failedPayments = await Payment.find({
                status: "failed",
                createdAt: { $gte: startOfDay, $lte: endOfDay }
            }).populate("tenant");

            for (const payment of failedPayments) {
                if (!payment.tenant || !payment.tenant.email) continue;
                
                await sendRawEmail({
                    to: payment.tenant.email,
                    subject: "Action Required: Failed Payment",
                    text: `Hi ${payment.tenant.name},\n\nWe were unable to process your recent payment of ${payment.currency} ${payment.amount} for invoice ${payment.invoiceNumber}.\n\nPlease update your payment method to avoid service interruption.\n\nThank you, WebMintra`,
                    html: `<p>Hi ${payment.tenant.name},</p><p>We were unable to process your recent payment of ${payment.currency} ${payment.amount} for invoice ${payment.invoiceNumber}.</p><p>Please update your payment method to avoid service interruption.</p><p>Thank you, WebMintra</p>`
                });
                
                await Notification.create({
                    recipient: payment.tenant._id,
                    type: "billing",
                    title: "Payment Failed",
                    message: `We couldn't process your payment for invoice ${payment.invoiceNumber}.`,
                    link: "/tenant/billing"
                });
            }
            
            if (failedPayments.length > 0) {
                console.log(`[CRON] Sent ${failedPayments.length} dunning notices.`);
            }
        } catch (error) {
            console.error("[CRON] Error processing dunning:", error);
        }
    });

    console.log("Background cron jobs initialized.");
}
