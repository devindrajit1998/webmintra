/**
 * Tenant Self-Service Onboarding Routes
 * /api/onboarding
 *
 * These endpoints are used during the multi-step onboarding wizard.
 * A user must be authenticated (email verified) but need NOT have completed onboarding.
 */

import crypto from "node:crypto";
import Razorpay from "razorpay";
import { Router } from "express";
import { requireAuthenticatedUser } from "../middleware/auth.js";
import { Plan } from "../models/Plan.js";
import { Template } from "../models/Template.js";
import { Subscription } from "../models/Subscription.js";
import { Payment } from "../models/Payment.js";
import { Website } from "../models/Website.js";
import { User } from "../models/User.js";
import { sendWelcomeEmail } from "../services/mail.js";

const router = Router();

// ── Razorpay client (lazy-init so it doesn't crash at import if keys are missing) ──
function getRazorpay() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw new Error("Razorpay credentials are not configured.");
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

// All onboarding routes require the user to be signed in
router.use(requireAuthenticatedUser);

// ── GET /api/onboarding/plans ─────────────────────────────────
// Returns all active public plans with pricing info
router.get("/plans", async (req, res, next) => {
  try {
    const plans = await Plan.find({ status: "active", isPublic: true })
      .sort({ sortOrder: 1 })
      .select("name slug description pricing currency trialDays limits features highlights sortOrder")
      .lean();

    return res.json({
      plans: plans.map((plan) => ({
        id: plan._id,
        name: plan.slug === "pro" ? "Business" : plan.name,
        slug: plan.slug,
        description: plan.description,
        pricing: {
          monthly: plan.pricing?.monthly ?? 0,
          yearly: plan.pricing?.yearly ?? 0,
        },
        currency: plan.currency || "INR",
        trialDays: plan.trialDays || 0,
        limits: plan.limits,
        features: plan.features,
        highlights: plan.highlights || [],
        // Used by the frontend to filter templates
        maxPages: plan.limits?.pagesPerWebsite ?? 0,
      })),
    });
  } catch (error) {
    return next(error);
  }
});

// ── GET /api/onboarding/templates ─────────────────────────────
// Returns templates compatible with selected plan (page count) + optional category filter
// Query params: planId (required), category (optional)
router.get("/templates", async (req, res, next) => {
  try {
    const { planId, category } = req.query;

    if (!planId) return res.status(400).json({ message: "planId is required." });

    const plan = await Plan.findOne({ _id: planId, status: "active" })
      .select("limits")
      .lean();

    if (!plan) return res.status(404).json({ message: "Plan not found." });

    const maxPages = plan.limits?.pagesPerWebsite ?? 0;

    const filter = { isActive: true };

    // pagesPerWebsite: 0 means unlimited → no page count restriction
    if (maxPages > 0) {
      filter.pageCount = { $lte: maxPages };
    }

    if (category && typeof category === "string" && category.trim()) {
      filter.category = { $regex: category.trim(), $options: "i" };
    }

    const templates = await Template.find(filter)
      .sort({ pageCount: 1, title: 1 })
      .select("title description category pageCount thumbnailUrl issuesCount")
      .lean();

    // Distinct categories for filter chips on the frontend
    const categories = await Template.distinct("category", { isActive: true });

    return res.json({
      templates: templates.map((t) => ({
        id: t._id,
        title: t.title,
        description: t.description || "",
        category: t.category,
        pageCount: t.pageCount || 1,
        thumbnailUrl: t.thumbnailUrl || null,
      })),
      categories: categories.sort(),
    });
  } catch (error) {
    return next(error);
  }
});

// ── GET /api/onboarding/templates/:id ─────────────────────────
// Returns full template data including htmlContent and pages for previewing
router.get("/templates/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const template = await Template.findOne({ _id: id, isActive: true })
      .select("title description category pageCount thumbnailUrl htmlContent pages")
      .lean();

    if (!template) return res.status(404).json({ message: "Template not found." });

    return res.json({
      template: {
        id: template._id,
        title: template.title,
        description: template.description || "",
        category: template.category,
        pageCount: template.pageCount || 1,
        thumbnailUrl: template.thumbnailUrl || null,
        htmlContent: template.htmlContent || "",
        pages: (template.pages || []).map((p) => ({
          name: p.name,
          htmlContent: p.htmlContent,
        })),
      },
    });
  } catch (error) {
    return next(error);
  }
});

// ── POST /api/onboarding/create-order ─────────────────────────
// Creates a Razorpay order before showing the payment widget
// Body: { planId, interval: "monthly"|"yearly" }
router.post("/create-order", async (req, res, next) => {
  try {
    if (req.user.onboardingCompletedAt) {
      return res.status(400).json({ message: "Onboarding already completed." });
    }

    const { planId, interval = "monthly" } = req.body ?? {};
    if (!planId) return res.status(400).json({ message: "planId is required." });
    if (!["monthly", "yearly"].includes(interval)) {
      return res.status(400).json({ message: "interval must be monthly or yearly." });
    }

    const plan = await Plan.findOne({ _id: planId, status: "active", isPublic: true }).lean();
    if (!plan) return res.status(404).json({ message: "Plan not found." });

    const priceInRupees = interval === "yearly"
      ? (plan.pricing?.yearly ?? 0)
      : (plan.pricing?.monthly ?? 0);

    // Free plans (₹0) skip Razorpay — handled by verify-payment with amount=0
    if (priceInRupees === 0) {
      return res.json({ free: true, planId, interval, amount: 0 });
    }

    const razorpay = getRazorpay();
    const order = await razorpay.orders.create({
      amount: Math.round(priceInRupees * 100), // paise
      currency: plan.currency || "INR",
      receipt: `onb_${req.user.id}_${Date.now()}`,
      notes: {
        tenantId: String(req.user.id),
        planId: String(plan._id),
        interval,
      },
    });

    return res.json({
      free: false,
      razorpayOrderId: order.id,
      amount: priceInRupees,
      currency: plan.currency || "INR",
      planId,
      interval,
    });
  } catch (error) {
    return next(error);
  }
});

// ── POST /api/onboarding/verify-payment ───────────────────────
// Verifies Razorpay signature (or handles free plans), then finalises onboarding:
//   • Creates Subscription + Payment records
//   • Creates Website in draft status
//   • Marks onboarding as complete
//   • Sends welcome email
// Body: { planId, templateId, interval, business, razorpayOrderId?, razorpayPaymentId?, razorpaySignature? }
router.post("/verify-payment", async (req, res, next) => {
  try {
    if (req.user.onboardingCompletedAt) {
      return res.status(400).json({ message: "Onboarding already completed." });
    }

    const {
      planId,
      templateId,
      interval = "monthly",
      business,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    } = req.body ?? {};

    // ── Validate plan ──
    if (!planId) return res.status(400).json({ message: "planId is required." });
    if (!["monthly", "yearly"].includes(interval)) {
      return res.status(400).json({ message: "interval must be monthly or yearly." });
    }
    const plan = await Plan.findOne({ _id: planId, status: "active", isPublic: true }).lean();
    if (!plan) return res.status(404).json({ message: "Plan not found." });

    // ── Validate template ──
    if (!templateId) return res.status(400).json({ message: "templateId is required." });
    const template = await Template.findOne({ _id: templateId, isActive: true })
      .select("_id title pageCount")
      .lean();
    if (!template) return res.status(404).json({ message: "Template not found." });

    // ── Validate business details ──
    const { validateBusiness } = await import("./tenants.js");
    const bizResult = validateBusiness(business);
    if (bizResult.error) return res.status(400).json({ message: bizResult.error });

    // ── Verify Razorpay payment signature (unless free) ──
    const priceInRupees = interval === "yearly"
      ? (plan.pricing?.yearly ?? 0)
      : (plan.pricing?.monthly ?? 0);

    const isPaid = priceInRupees > 0;

    if (isPaid) {
      if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
        return res.status(400).json({ message: "Payment details are incomplete." });
      }
      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      if (!keySecret) throw new Error("Razorpay credentials are not configured.");
      const expectedSignature = crypto
        .createHmac("sha256", keySecret)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest("hex");
      if (expectedSignature !== razorpaySignature) {
        return res.status(400).json({ message: "Payment signature is invalid." });
      }
    }

    // ── All valid → create records ──────────────────────────────
    const now = new Date();
    const endDate = new Date(now);
    if (interval === "yearly") endDate.setFullYear(endDate.getFullYear() + 1);
    else endDate.setMonth(endDate.getMonth() + 1);

    const subscription = await Subscription.create({
      tenant: req.user._id,
      plan: plan._id,
      planSnapshot: {
        name: plan.name,
        interval,
        price: priceInRupees,
        currency: plan.currency || "INR",
        limits: plan.limits,
      },
      status: isPaid ? "active" : "trialing",
      startDate: now,
      endDate,
      limits: {
        websites: plan.limits?.websites ?? 1,
        storageMb: plan.limits?.storageMb ?? 500,
        bandwidthGb: plan.limits?.bandwidthGb ?? 10,
        customDomains: plan.limits?.customDomains ?? 0,
        collaborators: plan.limits?.collaborators ?? 1,
      },
    });

    const payment = await Payment.create({
      tenant: req.user._id,
      subscription: subscription._id,
      amount: priceInRupees,
      currency: plan.currency || "INR",
      subtotal: priceInRupees,
      status: isPaid ? "succeeded" : "succeeded",
      method: isPaid ? "card" : "free",
      externalTransactionId: razorpayPaymentId || null,
      paidAt: now,
      description: `${plan.slug === "pro" ? "Business" : plan.name} subscription – ${interval}`,
      metadata: {
        razorpayOrderId: razorpayOrderId || null,
        razorpayPaymentId: razorpayPaymentId || null,
      },
    });

    const website = await Website.create({
      owner: req.user._id,
      name: bizResult.business.name,
      templateId: template._id,
      templateName: template.title,
      status: "draft",
    });

    // Update user record atomically
    await User.findByIdAndUpdate(req.user._id, {
      $set: {
        business: bizResult.business,
        plan: plan.slug,
        onboardingCompletedAt: now,
        tenantStatus: "active",
      },
    });

    // Send welcome email (non-blocking)
    sendWelcomeEmail({ email: req.user.email, name: req.user.name }).catch((err) => {
      console.error("[onboarding] Welcome email failed:", err.message);
    });

    return res.status(201).json({
      message: "Onboarding complete. Your draft website is ready.",
      website: { id: website._id, name: website.name, status: website.status },
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
