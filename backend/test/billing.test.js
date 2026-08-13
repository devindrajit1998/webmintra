import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { formatTenantBilling } from "../src/routes/billing.js";

const subscriptionId = new mongoose.Types.ObjectId();
const planId = new mongoose.Types.ObjectId();

const payments = [
    {
        _id: new mongoose.Types.ObjectId(),
        invoiceNumber: "INV-2026-000001",
        amount: 1180,
        subtotal: 1000,
        discountAmount: 0,
        taxAmount: 180,
        currency: "INR",
        status: "succeeded",
        method: "card",
        description: "Professional plan",
        paidAt: new Date("2026-08-01T00:00:00.000Z"),
        createdAt: new Date("2026-08-01T00:00:00.000Z"),
        taxes: [{ name: "GST", rate: 18, amount: 180 }],
        refunds: [{ amount: 180, refundedAt: new Date("2026-08-03T00:00:00.000Z") }],
        metadata: { cardBrand: "Visa", cardLast4: "4242" },
    },
    {
        _id: new mongoose.Types.ObjectId(),
        invoiceNumber: "INV-2026-000002",
        amount: 1180,
        subtotal: 1000,
        discountAmount: 0,
        taxAmount: 180,
        currency: "INR",
        status: "pending",
        method: "manual",
        description: "Professional plan renewal",
        createdAt: new Date("2026-09-01T00:00:00.000Z"),
        taxes: [],
        refunds: [],
    },
];

test("tenant billing formatter returns normalized plan, payment method, totals, and invoices", () => {
    const result = formatTenantBilling({
        subscription: {
            _id: subscriptionId,
            plan: {
                _id: planId,
                name: "Professional",
                description: "For growing teams.",
                pricing: { monthly: 1000, yearly: 10000 },
                currency: "INR",
                highlights: ["Custom domains"],
            },
            planSnapshot: { interval: "monthly", price: 1000, currency: "INR" },
            status: "active",
            startDate: new Date("2026-08-01T00:00:00.000Z"),
            endDate: new Date("2026-09-01T00:00:00.000Z"),
            autoRenew: true,
            limits: { websites: 5 },
        },
        payments,
    });

    assert.equal(result.subscription.id, String(subscriptionId));
    assert.equal(result.subscription.planName, "Professional");
    assert.equal(result.subscription.price, 1000);
    assert.equal(result.subscription.interval, "monthly");
    assert.equal(result.paymentMethod.label, "Visa ending in 4242");
    assert.equal(result.summary.totalPaid, 1180);
    assert.equal(result.summary.refundedAmount, 180);
    assert.equal(result.summary.invoiceCount, 2);
    assert.equal(result.invoices[0].invoiceNumber, "INV-2026-000001");
});

test("tenant billing formatter presents internal pro subscriptions as Business", () => {
    const result = formatTenantBilling({
        subscription: {
            _id: subscriptionId,
            plan: { _id: planId, slug: "pro", name: "Pro", pricing: { monthly: 1999 } },
            planSnapshot: { name: "Pro", interval: "monthly", price: 1999 },
            status: "active",
        },
        payments: [],
    });

    assert.equal(result.subscription.planName, "Business");
});

test("tenant billing formatter supplies a useful fallback for accounts without a subscription", () => {
    const result = formatTenantBilling({ subscription: null, payments: [], fallbackPlanName: "Starter" });

    assert.equal(result.subscription.planName, "Starter");
    assert.equal(result.subscription.price, 0);
    assert.equal(result.subscription.autoRenew, false);
    assert.equal(result.paymentMethod, null);
    assert.deepEqual(result.invoices, []);
});
