/**
 * Coupon Management Routes
 * /api/admin/coupons
 */

import { Router } from "express";
import { requireAuthenticatedUser, requireRole } from "../../middleware/auth.js";
import { Coupon, COUPON_TYPES, COUPON_STATUSES } from "../../models/Coupon.js";
import { parsePagination, parseSort, isMongoId, isString, stripUndefined } from "../../lib/validate.js";

const router = Router();
router.use(requireAuthenticatedUser, requireRole("admin"));

router.get("/", async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = {};
    if (req.query.status && COUPON_STATUSES.includes(req.query.status)) filter.status = req.query.status;
    if (req.query.search) filter.code = { $regex: req.query.search, $options: "i" };

    const [coupons, total] = await Promise.all([
      Coupon.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Coupon.countDocuments(filter),
    ]);

    return res.json({ coupons, pagination: { total, page, limit } });
  } catch (error) {
    return next(error);
  }
});

router.get("/:couponId", async (req, res, next) => {
  try {
    if (!isMongoId(req.params.couponId)) return res.status(400).json({ message: "Invalid ID." });
    const coupon = await Coupon.findById(req.params.couponId).lean();
    if (!coupon) return res.status(404).json({ message: "Coupon not found." });
    return res.json({ coupon });
  } catch (error) {
    return next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const b = req.body ?? {};
    const errors = [];
    if (!isString(b.code, { max: 50 })) errors.push("code is required.");
    if (!COUPON_TYPES.includes(b.discountType)) errors.push("discountType must be 'percent' or 'flat'.");
    if (typeof b.discountValue !== "number" || b.discountValue < 0) errors.push("discountValue must be a non-negative number.");
    if (b.discountType === "percent" && b.discountValue > 100) errors.push("Percent discount cannot exceed 100.");
    if (errors.length) return res.status(400).json({ message: errors.join(" "), errors });

    const code = b.code.trim().toUpperCase();
    if (await Coupon.exists({ code })) return res.status(409).json({ message: "A coupon with this code already exists." });

    const coupon = await Coupon.create({
      code,
      description: b.description?.trim() || "",
      discountType: b.discountType,
      discountValue: b.discountValue,
      maxUses: b.maxUses ?? null,
      minimumAmount: b.minimumAmount ?? 0,
      applicablePlans: b.applicablePlans ?? [],
      applicableIntervals: b.applicableIntervals ?? [],
      expiresAt: b.expiresAt ? new Date(b.expiresAt) : undefined,
      validFrom: b.validFrom ? new Date(b.validFrom) : new Date(),
      createdBy: req.user._id,
    });

    return res.status(201).json({ coupon });
  } catch (error) {
    return next(error);
  }
});

router.patch("/:couponId", async (req, res, next) => {
  try {
    if (!isMongoId(req.params.couponId)) return res.status(400).json({ message: "Invalid ID." });
    const b = req.body ?? {};
    const update = stripUndefined({
      description: b.description?.trim(),
      maxUses: b.maxUses,
      minimumAmount: b.minimumAmount,
      applicablePlans: b.applicablePlans,
      applicableIntervals: b.applicableIntervals,
      status: COUPON_STATUSES.includes(b.status) ? b.status : undefined,
      expiresAt: b.expiresAt ? new Date(b.expiresAt) : undefined,
      validFrom: b.validFrom ? new Date(b.validFrom) : undefined,
    });

    const coupon = await Coupon.findByIdAndUpdate(req.params.couponId, { $set: update }, { new: true });
    if (!coupon) return res.status(404).json({ message: "Coupon not found." });
    return res.json({ coupon });
  } catch (error) {
    return next(error);
  }
});

router.delete("/:couponId", async (req, res, next) => {
  try {
    if (!isMongoId(req.params.couponId)) return res.status(400).json({ message: "Invalid ID." });
    const coupon = await Coupon.findByIdAndUpdate(req.params.couponId, { status: "disabled" }, { new: true });
    if (!coupon) return res.status(404).json({ message: "Coupon not found." });
    return res.json({ message: "Coupon disabled.", coupon });
  } catch (error) {
    return next(error);
  }
});

// ── Validate coupon ───────────────────────────────────────────
router.post("/validate", async (req, res, next) => {
  try {
    const { code, amount, planId, interval } = req.body ?? {};
    if (!code) return res.status(400).json({ message: "code is required." });

    const coupon = await Coupon.findOne({ code: code.trim().toUpperCase() });
    if (!coupon) return res.status(404).json({ message: "Coupon not found." });

    if (!coupon.isValid(planId, interval)) return res.status(400).json({ message: "This coupon is not valid or has expired.", valid: false });

    if (amount && coupon.minimumAmount > 0 && amount < coupon.minimumAmount)
      return res.status(400).json({ message: `Minimum order amount is $${coupon.minimumAmount}.`, valid: false });

    const discount = coupon.discountType === "percent"
      ? Math.min((amount ?? 0) * coupon.discountValue / 100, amount ?? Infinity)
      : Math.min(coupon.discountValue, amount ?? Infinity);

    return res.json({
      valid: true,
      coupon: { code: coupon.code, discountType: coupon.discountType, discountValue: coupon.discountValue },
      calculatedDiscount: discount,
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
