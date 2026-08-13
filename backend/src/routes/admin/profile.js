/**
 * Admin Profile & Security Routes
 * /api/admin/profile
 */

import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { Router } from "express";
import { requireAuthenticatedUser, requireRole } from "../../middleware/auth.js";
import { User } from "../../models/User.js";
import { logActivity, buildLogContext } from "../../services/activityLog.js";

const router = Router();
router.use(requireAuthenticatedUser, requireRole("admin"));

// ── Get Profile ───────────────────────────────────────────────
router.get("/", (req, res) => {
  const u = req.user;
  return res.json({
    profile: {
      id: u._id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      avatarUrl: u.avatarUrl,
      isEmailVerified: u.isEmailVerified,
      isPhoneVerified: u.isPhoneVerified,
      role: u.role,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    },
  });
});

// ── Update Profile ────────────────────────────────────────────
router.patch("/", async (req, res, next) => {
  try {
    const { name, phone, avatarUrl } = req.body ?? {};
    const update = {};

    if (typeof name === "string" && name.trim() && name.trim().length <= 100) {
      update.name = name.trim();
    }

    if (typeof phone === "string") {
      const cleanPhone = phone.replace(/[\s()-]/g, "");
      if (!cleanPhone || /^\+?[1-9][0-9]{7,14}$/.test(cleanPhone)) update.phone = cleanPhone;
    }

    if (typeof avatarUrl === "string") {
      const cleanAvatarUrl = avatarUrl.trim();
      if (!cleanAvatarUrl || (/^https:\/\//i.test(cleanAvatarUrl) && cleanAvatarUrl.length <= 2048)) {
        update.avatarUrl = cleanAvatarUrl;
      }
    }

    if (Object.keys(update).length === 0)
      return res.status(400).json({ message: "No valid fields to update." });

    const user = await User.findByIdAndUpdate(req.user._id, { $set: update }, { new: true })
      .select("-passwordHash -emailVerification -passwordReset -phoneVerification");

    return res.json({ profile: { id: user._id, name: user.name, email: user.email, phone: user.phone, avatarUrl: user.avatarUrl, role: user.role, updatedAt: user.updatedAt } });
  } catch (error) {
    return next(error);
  }
});

// ── Change Password ───────────────────────────────────────────
router.post("/change-password", async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body ?? {};

    if (!currentPassword || !newPassword)
      return res.status(400).json({ message: "currentPassword and newPassword are required." });

    if (typeof newPassword !== "string" || newPassword.length < 12 || newPassword.length > 128)
      return res.status(400).json({ message: "New password must be 12–128 characters." });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found." });

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) return res.status(400).json({ message: "Current password is incorrect." });

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    await user.save();

    await logActivity({
      ...buildLogContext(req),
      action: "admin_password_changed",
      description: "Admin changed their password.",
    });

    return res.json({ message: "Password changed successfully." });
  } catch (error) {
    return next(error);
  }
});

// ── List Admins ───────────────────────────────────────────────
router.get("/admins", async (req, res, next) => {
  try {
    const admins = await User.find({ role: "admin" })
      .select("-passwordHash -emailVerification -passwordReset -phoneVerification")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      admins: admins.map((a) => ({
        id: a._id,
        name: a.name,
        email: a.email,
        phone: a.phone,
        isEmailVerified: a.isEmailVerified,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
      })),
    });
  } catch (error) {
    return next(error);
  }
});

// ── Create Admin ──────────────────────────────────────────────
router.post("/admins", async (req, res, next) => {
  try {
    const { name, email, password } = req.body ?? {};

    if (!name?.trim() || !email?.trim() || !password)
      return res.status(400).json({ message: "name, email, and password are required." });

    if (!/^\S+@\S+\.\S+$/.test(email.trim()))
      return res.status(400).json({ message: "Invalid email address." });

    if (typeof password !== "string" || password.length < 12)
      return res.status(400).json({ message: "Password must be at least 12 characters." });

    if (await User.exists({ email: email.trim().toLowerCase() }))
      return res.status(409).json({ message: "An account with this email already exists." });

    const admin = await User.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      passwordHash: await bcrypt.hash(password, 12),
      role: "admin",
      isEmailVerified: true,
    });

    await logActivity({
      ...buildLogContext(req),
      action: "admin_created",
      description: `New admin "${admin.name}" (${admin.email}) created.`,
      resource: { type: "admin", id: String(admin._id), name: admin.name },
    });

    return res.status(201).json({
      admin: { id: admin._id, name: admin.name, email: admin.email, role: admin.role },
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
