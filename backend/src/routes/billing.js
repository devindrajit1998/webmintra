import mongoose from "mongoose";
import { Router } from "express";
import { requireAuthenticatedUser, requireRole } from "../middleware/auth.js";
import { Payment } from "../models/Payment.js";
import { Plan } from "../models/Plan.js";
import { Subscription } from "../models/Subscription.js";
import { Coupon } from "../models/Coupon.js";
import { displayPlanName } from "../lib/tenant-seo-entitlements.js";

const router = Router();

router.use(requireAuthenticatedUser, requireRole("tenant"));

router.get("/plans", async (_request, response, next) => {
    try {
        const plans = await Plan.find({ status: "active", isPublic: true })
            .sort({ sortOrder: 1, createdAt: 1 })
            .select("name slug description pricing currency trialDays limits features highlights sortOrder")
            .lean();
        return response.json({
            plans: plans.map((plan) => ({
                ...plan,
                name: displayPlanName(plan.slug === "pro" ? "pro" : plan.name),
            })),
        });
    } catch (error) {
        return next(error);
    }
});

router.post("/coupon/validate", async (request, response, next) => {
    try {
        const { code, planId, interval } = request.body ?? {};
        if (!code || !mongoose.isValidObjectId(planId) || !["monthly", "yearly"].includes(interval)) {
            return response.status(400).json({ message: "code, planId, and interval are required." });
        }

        const plan = await Plan.findOne({ _id: planId, status: "active", isPublic: true }).lean();
        if (!plan) return response.status(404).json({ message: "Plan not found." });

        const price = plan.pricing?.[interval];
        if (price == null) return response.status(400).json({ message: "That plan does not support the selected billing interval." });

        const coupon = await Coupon.findOne({ code: code.trim().toUpperCase() });
        if (!coupon) return response.status(404).json({ message: "Coupon not found." });

        if (!coupon.isValid(planId, interval)) return response.status(400).json({ message: "This coupon is not valid for the selected plan or has expired.", valid: false });

        if (price && coupon.minimumAmount > 0 && price < coupon.minimumAmount)
            return response.status(400).json({ message: `Minimum amount is ${coupon.minimumAmount}.`, valid: false });

        const discount = coupon.discountType === "percent"
            ? Math.min((price ?? 0) * coupon.discountValue / 100, price ?? Infinity)
            : Math.min(coupon.discountValue, price ?? Infinity);

        return response.json({
            valid: true,
            originalPrice: price,
            discountedPrice: Math.max(0, price - discount),
            discount,
            coupon: { code: coupon.code, discountType: coupon.discountType, discountValue: coupon.discountValue }
        });
    } catch (error) {
        return next(error);
    }
});

router.patch("/subscription", async (request, response, next) => {
    try {
        const { planId, interval, couponCode } = request.body ?? {};
        if (!mongoose.isValidObjectId(planId) || !["monthly", "yearly"].includes(interval)) {
            return response.status(400).json({ message: "A valid planId and billing interval are required." });
        }

        const [plan, subscription] = await Promise.all([
            Plan.findOne({ _id: planId, status: "active", isPublic: true }).lean(),
            Subscription.findOne({ tenant: request.user._id, status: { $in: ["trialing", "active", "past_due", "paused"] } }).sort({ createdAt: -1 }),
        ]);
        if (!plan) return response.status(404).json({ message: "That plan is no longer available." });
        if (!subscription) return response.status(404).json({ message: "No active subscription was found." });

        let price = plan.pricing?.[interval];
        if (price == null) return response.status(400).json({ message: "That plan does not support the selected billing interval." });

        let appliedCoupon = null;
        if (couponCode) {
            const coupon = await Coupon.findOne({ code: couponCode.trim().toUpperCase() });
            if (!coupon) return response.status(404).json({ message: "Coupon not found." });
            if (!coupon.isValid(planId, interval)) return response.status(400).json({ message: "This coupon is not valid or has expired.", valid: false });
            if (price && coupon.minimumAmount > 0 && price < coupon.minimumAmount)
                return response.status(400).json({ message: `Minimum amount is ${coupon.minimumAmount}.`, valid: false });

            const discount = coupon.discountType === "percent"
                ? Math.min((price ?? 0) * coupon.discountValue / 100, price ?? Infinity)
                : Math.min(coupon.discountValue, price ?? Infinity);

            price = Math.max(0, price - discount);
            appliedCoupon = coupon;
        }

        const now = new Date();
        const endDate = new Date(now);
        if (interval === "yearly") endDate.setFullYear(endDate.getFullYear() + 1);
        else endDate.setMonth(endDate.getMonth() + 1);

        subscription.plan = plan._id;
        subscription.planSnapshot = { name: plan.name, interval, price, currency: plan.currency || "INR", limits: plan.limits };
        if (appliedCoupon) {
            subscription.planSnapshot.coupon = {
                code: appliedCoupon.code,
                discountType: appliedCoupon.discountType,
                discountValue: appliedCoupon.discountValue
            };
        }
        subscription.limits = plan.limits;
        subscription.startDate = now;
        subscription.endDate = endDate;
        subscription.autoRenew = true;
        await subscription.save();

        if (appliedCoupon) {
            await Coupon.updateOne({ _id: appliedCoupon._id }, { $inc: { usedCount: 1 } });
        }

        const planName = displayPlanName(plan.slug === "pro" ? "pro" : plan.name);
        return response.json({ message: `Your plan was changed to ${planName}.`, subscription: { planName, interval, price, currency: plan.currency || "INR", renewalDate: endDate, limits: plan.limits } });
    } catch (error) {
        return next(error);
    }
});

router.get("/", async (request, response, next) => {
    try {
        const tenantId = request.user._id;
        const [subscription, payments] = await Promise.all([
            Subscription.findOne({
                tenant: tenantId,
                status: { $in: ["trialing", "active", "past_due", "paused"] },
            })
                .sort({ createdAt: -1 })
                .populate("plan", "name slug description pricing currency limits features highlights")
                .lean(),
            Payment.find({ tenant: tenantId }).sort({ createdAt: -1 }).limit(100).lean(),
        ]);

        return response.json(formatTenantBilling({
            subscription,
            payments,
            fallbackPlanName: request.user.plan,
        }));
    } catch (error) {
        return next(error);
    }
});

export function formatTenantBilling({ subscription, payments = [], fallbackPlanName = "Starter" }) {
    const plan = subscription?.plan && typeof subscription.plan === "object" ? subscription.plan : null;
    const snapshot = subscription?.planSnapshot ?? {};
    const interval = snapshot.interval || inferInterval(subscription, plan);
    const currency = snapshot.currency || plan?.currency || payments[0]?.currency || "INR";
    const price = snapshot.price ?? priceForInterval(plan?.pricing, interval) ?? 0;
    const successfulPayments = payments.filter((payment) => payment.status === "succeeded");
    const refundedAmount = payments.reduce((total, payment) => (
        total + (payment.refunds ?? []).reduce((sum, refund) => sum + (refund.amount ?? 0), 0)
    ), 0);
    const lastPaymentWithMethod = payments.find((payment) => !["free", "manual"].includes(payment.method));

    return {
        subscription: {
            id: subscription?._id ? String(subscription._id) : null,
            planName: displayPlanName(plan?.slug === "pro" ? "pro" : snapshot.name || plan?.name || fallbackPlanName),
            description: plan?.description || "Your current WebMintra workspace plan.",
            status: subscription?.status || "active",
            interval,
            price,
            currency,
            startDate: subscription?.startDate ?? null,
            renewalDate: subscription?.endDate ?? null,
            trialEndsAt: subscription?.trialEndsAt ?? null,
            autoRenew: subscription?.autoRenew ?? false,
            limits: subscription?.limits || snapshot.limits || plan?.limits || {},
            highlights: plan?.highlights || [],
        },
        paymentMethod: lastPaymentWithMethod ? {
            type: lastPaymentWithMethod.method,
            label: paymentMethodLabel(lastPaymentWithMethod),
            lastUsedAt: lastPaymentWithMethod.paidAt || lastPaymentWithMethod.createdAt,
        } : null,
        summary: {
            totalPaid: successfulPayments.reduce((total, payment) => total + payment.amount, 0),
            refundedAmount,
            invoiceCount: payments.length,
            currency,
        },
        invoices: payments.map(formatInvoice),
    };
}

function inferInterval(subscription, plan) {
    if (subscription?.startDate && subscription?.endDate) {
        const duration = new Date(subscription.endDate).getTime() - new Date(subscription.startDate).getTime();
        if (duration > 300 * 24 * 60 * 60 * 1000) return "yearly";
    }
    if (plan?.pricing?.monthly != null) return "monthly";
    if (plan?.pricing?.yearly != null) return "yearly";
    return "monthly";
}

function priceForInterval(pricing, interval) {
    if (!pricing) return null;
    return interval === "yearly" ? pricing.yearly : pricing.monthly;
}

function paymentMethodLabel(payment) {
    const metadata = payment.metadata ?? {};
    if (payment.method === "card" && metadata.cardLast4) {
        return `${metadata.cardBrand || "Card"} ending in ${metadata.cardLast4}`;
    }
    return payment.method.split("_").map((part) => part[0]?.toUpperCase() + part.slice(1)).join(" ");
}

function formatInvoice(payment) {
    return {
        id: String(payment._id),
        invoiceNumber: payment.invoiceNumber,
        description: payment.description || "WebMintra subscription",
        amount: payment.amount,
        subtotal: payment.subtotal,
        discountAmount: payment.discountAmount,
        taxAmount: payment.taxAmount,
        currency: payment.currency,
        status: payment.status,
        method: payment.method,
        methodLabel: paymentMethodLabel(payment),
        transactionId: payment.externalTransactionId ?? null,
        createdAt: payment.createdAt,
        paidAt: payment.paidAt ?? null,
        dueDate: payment.dueDate ?? null,
        taxes: payment.taxes ?? [],
        refunds: payment.refunds ?? [],
        billingAddress: payment.billingAddress ?? {},
    };
}

export default router;
