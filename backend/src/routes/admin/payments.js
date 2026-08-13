/**
 * Payment Management Routes
 * /api/admin/payments
 */

import { Router } from "express";
import { requireAuthenticatedUser, requireRole } from "../../middleware/auth.js";
import { Payment, PAYMENT_STATUSES, PAYMENT_METHODS } from "../../models/Payment.js";
import { logActivity, buildLogContext } from "../../services/activityLog.js";
import { parsePagination, parseSort, isMongoId, isNumber, stripUndefined } from "../../lib/validate.js";

const router = Router();
router.use(requireAuthenticatedUser, requireRole("admin"));

// ── List Payments ─────────────────────────────────────────────
router.get("/", async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const sort = parseSort(req.query, ["createdAt", "paidAt", "amount"]);
    const filter = {};

    if (req.query.status && PAYMENT_STATUSES.includes(req.query.status)) filter.status = req.query.status;
    if (req.query.tenant && isMongoId(req.query.tenant)) filter.tenant = req.query.tenant;
    if (req.query.method && PAYMENT_METHODS.includes(req.query.method)) filter.method = req.query.method;

    // Date range
    if (req.query.from || req.query.to) {
      filter.createdAt = {};
      if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
      if (req.query.to) filter.createdAt.$lte = new Date(req.query.to);
    }

    // Search by invoice number
    if (req.query.search) {
      filter.invoiceNumber = { $regex: req.query.search, $options: "i" };
    }

    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate("tenant", "name email business")
        .lean(),
      Payment.countDocuments(filter),
    ]);

    // Revenue stats
    const [succeeded, failed, refunded] = await Promise.all([
      Payment.aggregate([{ $match: { status: "succeeded" } }, { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }]),
      Payment.countDocuments({ status: "failed" }),
      Payment.aggregate([{ $match: { status: "refunded" } }, { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }]),
    ]);

    return res.json({
      payments: payments.map(formatPayment),
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      summary: {
        totalRevenue: succeeded[0]?.total ?? 0,
        totalTransactions: succeeded[0]?.count ?? 0,
        failedCount: failed,
        refundedTotal: refunded[0]?.total ?? 0,
        refundedCount: refunded[0]?.count ?? 0,
      },
    });
  } catch (error) {
    return next(error);
  }
});

// ── Get Single Payment ────────────────────────────────────────
router.get("/:paymentId", async (req, res, next) => {
  try {
    if (!isMongoId(req.params.paymentId))
      return res.status(400).json({ message: "Invalid payment ID." });

    const payment = await Payment.findById(req.params.paymentId)
      .populate("tenant", "name email business")
      .populate("subscription")
      .lean();

    if (!payment) return res.status(404).json({ message: "Payment not found." });

    return res.json({ payment: formatPayment(payment) });
  } catch (error) {
    return next(error);
  }
});

// ── Create Payment (Manual) ───────────────────────────────────
router.post("/", async (req, res, next) => {
  try {
    const b = req.body ?? {};
    const errors = [];

    if (!isMongoId(b.tenant)) errors.push("Valid tenant ID is required.");
    if (!isNumber(b.amount, { min: 0 })) errors.push("amount must be a non-negative number.");
    if (b.status && !PAYMENT_STATUSES.includes(b.status)) errors.push("Invalid status.");
    if (b.method && !PAYMENT_METHODS.includes(b.method)) errors.push("Invalid method.");

    if (errors.length) return res.status(400).json({ message: errors.join(" "), errors });

    const payment = await Payment.create({
      tenant: b.tenant,
      subscription: b.subscription || undefined,
      amount: b.amount,
      currency: b.currency?.toUpperCase() || "INR",
      subtotal: b.subtotal ?? b.amount,
      discountAmount: b.discountAmount ?? 0,
      taxAmount: b.taxAmount ?? 0,
      status: b.status || "pending",
      method: b.method || "manual",
      description: b.description?.trim() || "",
      notes: b.notes?.trim() || "",
      dueDate: b.dueDate ? new Date(b.dueDate) : undefined,
      paidAt: b.status === "succeeded" ? new Date() : undefined,
      billingAddress: b.billingAddress || {},
      createdBy: req.user._id,
    });

    await logActivity({
      ...buildLogContext(req),
      action: "payment_created",
      description: `Payment ${payment.invoiceNumber} of $${payment.amount} created.`,
      resource: { type: "payment", id: String(payment._id), name: payment.invoiceNumber },
    });

    return res.status(201).json({ payment: formatPayment(payment.toObject()) });
  } catch (error) {
    return next(error);
  }
});

// ── Update Payment ────────────────────────────────────────────
router.patch("/:paymentId", async (req, res, next) => {
  try {
    if (!isMongoId(req.params.paymentId))
      return res.status(400).json({ message: "Invalid payment ID." });

    const b = req.body ?? {};
    const update = stripUndefined({
      status: PAYMENT_STATUSES.includes(b.status) ? b.status : undefined,
      method: PAYMENT_METHODS.includes(b.method) ? b.method : undefined,
      notes: b.notes?.trim(),
      description: b.description?.trim(),
      externalTransactionId: b.externalTransactionId?.trim(),
      paidAt: b.status === "succeeded" ? (b.paidAt ? new Date(b.paidAt) : new Date()) : undefined,
      failedAt: b.status === "failed" ? new Date() : undefined,
      failureReason: b.failureReason?.trim(),
    });

    const payment = await Payment.findByIdAndUpdate(req.params.paymentId, { $set: update }, { new: true })
      .populate("tenant", "name email");

    if (!payment) return res.status(404).json({ message: "Payment not found." });

    await logActivity({
      ...buildLogContext(req),
      action: "payment_updated",
      description: `Payment ${payment.invoiceNumber} updated to status: ${payment.status}.`,
      resource: { type: "payment", id: String(payment._id), name: payment.invoiceNumber },
    });

    return res.json({ payment: formatPayment(payment.toObject()) });
  } catch (error) {
    return next(error);
  }
});

// ── Issue Refund ──────────────────────────────────────────────
router.post("/:paymentId/refund", async (req, res, next) => {
  try {
    if (!isMongoId(req.params.paymentId))
      return res.status(400).json({ message: "Invalid payment ID." });

    const payment = await Payment.findById(req.params.paymentId);
    if (!payment) return res.status(404).json({ message: "Payment not found." });

    if (!["succeeded", "partially_refunded"].includes(payment.status))
      return res.status(400).json({ message: "Only succeeded payments can be refunded." });

    const amount = Number(req.body?.amount);
    if (!amount || amount <= 0 || amount > payment.amount)
      return res.status(400).json({ message: "Provide a valid refund amount not exceeding the payment amount." });

    const reason = req.body?.reason?.trim() || "";

    const totalRefunded = payment.refunds.reduce((acc, r) => acc + r.amount, 0);
    if (totalRefunded + amount > payment.amount)
      return res.status(400).json({ message: "Total refunds would exceed payment amount." });

    payment.refunds.push({ amount, reason, refundedAt: new Date(), refundedBy: req.user._id });
    payment.status = totalRefunded + amount >= payment.amount ? "refunded" : "partially_refunded";
    await payment.save();

    await logActivity({
      ...buildLogContext(req),
      action: "payment_refunded",
      description: `Refund of $${amount} issued on ${payment.invoiceNumber}. Reason: ${reason || "None"}`,
      resource: { type: "payment", id: String(payment._id), name: payment.invoiceNumber },
    });

    return res.json({ message: "Refund issued.", payment: formatPayment(payment.toObject()) });
  } catch (error) {
    return next(error);
  }
});

// ── Revenue Report ────────────────────────────────────────────
router.get("/reports/revenue", async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [daily, byMethod, byStatus] = await Promise.all([
      Payment.aggregate([
        { $match: { status: "succeeded", paidAt: { $gte: from } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$paidAt" } }, total: { $sum: "$amount" }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Payment.aggregate([
        { $match: { status: "succeeded", paidAt: { $gte: from } } },
        { $group: { _id: "$method", total: { $sum: "$amount" }, count: { $sum: 1 } } },
      ]),
      Payment.aggregate([
        { $match: { createdAt: { $gte: from } } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
    ]);

    return res.json({ daily, byMethod, byStatus, from, days });
  } catch (error) {
    return next(error);
  }
});

// ── Helpers ───────────────────────────────────────────────────
function formatPayment(p) {
  return {
    id: p._id,
    invoiceNumber: p.invoiceNumber,
    amount: p.amount,
    currency: p.currency,
    subtotal: p.subtotal,
    discountAmount: p.discountAmount,
    taxAmount: p.taxAmount,
    status: p.status,
    method: p.method,
    description: p.description,
    notes: p.notes,
    externalTransactionId: p.externalTransactionId,
    paidAt: p.paidAt,
    failedAt: p.failedAt,
    failureReason: p.failureReason,
    dueDate: p.dueDate,
    taxes: p.taxes,
    refunds: p.refunds,
    billingAddress: p.billingAddress,
    tenant: p.tenant ? {
      id: p.tenant._id || p.tenant,
      name: p.tenant.name,
      email: p.tenant.email,
      businessName: p.tenant.business?.name,
    } : { id: p.tenant },
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

export default router;
