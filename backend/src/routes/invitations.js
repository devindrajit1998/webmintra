import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { Router } from "express";
import { Invitation } from "../models/Invitation.js";
import { User } from "../models/User.js";
import { sendOtpEmail } from "../services/mail.js";
import { sendInvitationEmail } from "../services/mail.js";
import { requireAuthenticatedUser, requireRole } from "../middleware/auth.js";

const router = Router();
const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");
const validEmail = (email) => typeof email === "string" && /^\S+@\S+\.\S+$/.test(email);

function invitationResponse(invitation, includeToken) {
  const invitationUrl = includeToken ? `${process.env.FRONTEND_ORIGIN ?? "http://localhost:3000"}/accept-invitation?token=${includeToken}` : undefined;
  return { id: invitation.id, businessName: invitation.businessName, ownerName: invitation.ownerName, ownerEmail: invitation.ownerEmail, plan: invitation.plan, trialDays: invitation.trialDays, category: invitation.category, notes: invitation.notes, status: invitation.status, expiresAt: invitation.expiresAt, createdAt: invitation.createdAt, invitationUrl };
}

router.get("/validate", async (request, response, next) => {
  try {
    const token = request.query.token;
    if (typeof token !== "string" || token.length < 32) return response.status(400).json({ message: "Invalid invitation link." });
    const invitation = await Invitation.findOne({ tokenHash: hashToken(token), status: "pending" }).lean();
    if (!invitation || invitation.expiresAt <= new Date()) return response.status(410).json({ message: "This invitation has expired or is no longer available." });
    return response.json({ invitation: invitationResponse(invitation) });
  } catch (error) { return next(error); }
});

router.post("/accept", async (request, response, next) => {
  try {
    const { token, password, acceptedTerms } = request.body ?? {};
    if (typeof token !== "string" || typeof password !== "string" || password.length < 12 || acceptedTerms !== true)
      return response.status(400).json({ message: "Provide a valid invitation, password, and accept the terms." });
    const invitation = await Invitation.findOne({ tokenHash: hashToken(token), status: "pending" });
    if (!invitation || invitation.expiresAt <= new Date()) return response.status(410).json({ message: "This invitation has expired or is no longer available." });
    if (await User.exists({ email: invitation.ownerEmail })) return response.status(409).json({ message: "An account with this email already exists." });
    const user = await User.create({ name: invitation.ownerName, email: invitation.ownerEmail, passwordHash: await bcrypt.hash(password, 12), role: "tenant", business: { name: invitation.businessName }, plan: invitation.plan, invitationId: invitation.id, tenantStatus: "invitation-sent" });
    const code = crypto.randomInt(100000, 1000000).toString();
    user.emailVerification = { codeHash: crypto.createHmac("sha256", process.env.OTP_SECRET).update(code).digest("hex"), expiresAt: new Date(Date.now() + 10 * 60 * 1000), attempts: 0 };
    await user.save();
    await sendOtpEmail({ email: user.email, name: user.name, code, purpose: "email verification" });
    invitation.status = "accepted";
    invitation.acceptedAt = new Date();
    invitation.acceptedUser = user.id;
    await invitation.save();
    return response.status(201).json({ message: "Account created. Verify your email to continue.", email: user.email });
  } catch (error) { return next(error); }
});

router.use(requireAuthenticatedUser, requireRole("admin"));
router.get("/", async (_request, response, next) => { try { const invitations = await Invitation.find().sort({ createdAt: -1 }).lean(); return response.json({ invitations: invitations.map((item) => invitationResponse(item)) }); } catch (error) { return next(error); } });
router.post("/", async (request, response, next) => {
  try {
    const { businessName, ownerName, ownerEmail, plan, trialDays = 0, category, notes = "" } = request.body ?? {};
    if (![businessName, ownerName, category].every((value) => typeof value === "string" && value.trim()) || !validEmail(ownerEmail) || !["starter", "growth", "pro"].includes(plan) || !Number.isInteger(trialDays) || trialDays < 0 || trialDays > 365 || typeof notes !== "string") return response.status(400).json({ message: "Provide valid invitation details." });
    if (await User.exists({ email: ownerEmail.trim().toLowerCase() })) return response.status(409).json({ message: "An account with this email already exists." });
    const token = crypto.randomBytes(32).toString("base64url");
    const invitation = await Invitation.create({ businessName: businessName.trim(), ownerName: ownerName.trim(), ownerEmail: ownerEmail.trim().toLowerCase(), plan, trialDays, category: category.trim(), notes: notes.trim(), tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), invitedBy: request.user.id });
    const invitationUrl = `${process.env.FRONTEND_ORIGIN ?? "http://localhost:3000"}/accept-invitation?token=${token}`;
    await sendInvitationEmail({ email: invitation.ownerEmail, ownerName: invitation.ownerName, businessName: invitation.businessName, invitationUrl });
    return response.status(201).json({ invitation: invitationResponse(invitation, token) });
  } catch (error) { return next(error); }
});
router.post("/:id/cancel", async (request, response, next) => { try { const invitation = await Invitation.findOneAndUpdate({ _id: request.params.id, status: "pending" }, { status: "cancelled", cancelledAt: new Date() }, { new: true }); if (!invitation) return response.status(404).json({ message: "Pending invitation not found." }); return response.json({ invitation: invitationResponse(invitation) }); } catch (error) { return next(error); } });
export default router;
