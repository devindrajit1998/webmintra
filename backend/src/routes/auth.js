import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { Router } from "express";
import jwt from "jsonwebtoken";
import { USER_ROLES, User } from "../models/User.js";
import { sendOtpEmail, sendWelcomeEmail } from "../services/mail.js";
import { requireAuthenticatedUser } from "../middleware/auth.js";
import { clearSecurityCookies, sessionCookieOptions } from "../middleware/security.js";
import { Website } from "../models/Website.js";
import { Template } from "../models/Template.js";

const router = Router();
const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;
const PASSWORD_MIN_LENGTH = 8;

function normalizeEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function validPassword(password) {
  return (
    typeof password === "string" &&
    password.length >= PASSWORD_MIN_LENGTH &&
    password.length <= 128
  );
}

function normalizePhone(value) {
  const phone = typeof value === "string" ? value.replace(/[\s()-]/g, "") : "";
  return /^\+?[1-9][0-9]{7,14}$/.test(phone) ? phone : "";
}

function userRole(user) {
  return USER_ROLES.includes(user.role) ? user.role : "tenant";
}

function sessionUser(user) {
  return { name: user.name, email: user.email, role: userRole(user), onboardingCompleted: Boolean(user.onboardingCompletedAt), avatarUrl: user.avatarUrl };
}

function createOtp() {
  return crypto.randomInt(100000, 1000000).toString();
}

function hashOtp(code) {
  return crypto
    .createHmac("sha256", process.env.OTP_SECRET)
    .update(code)
    .digest("hex");
}

function otpMatches(code, expectedHash) {
  if (!/^[0-9]{6}$/.test(code ?? "") || !expectedHash) return false;
  const actual = Buffer.from(hashOtp(code), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return (
    actual.length === expected.length &&
    crypto.timingSafeEqual(actual, expected)
  );
}

function logDevelopmentOtp({ email, code, purpose }) {
  if (
    process.env.NODE_ENV === "development" &&
    process.env.DEV_OTP_CONSOLE_LOG === "true"
  )
    console.info(`[DEV OTP] purpose=${purpose} email=${email} code=${code}`);
}

function setSessionCookie(response, user) {
  const token = jwt.sign(
    { sub: user.id, email: user.email, role: userRole(user) },
    process.env.JWT_SECRET,
    { expiresIn: "1h", issuer: "webmintra" },
  );
  response.cookie("webmintra_session", token, sessionCookieOptions());
}

async function issueOtp(user, field, purpose) {
  const code = createOtp();
  user[field] = {
    codeHash: hashOtp(code),
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
    attempts: 0,
  };
  await user.save();
  logDevelopmentOtp({ email: user.email, code, purpose });
  await sendOtpEmail({ email: user.email, name: user.name, code, purpose });
}

async function verifyOtp(user, field, code) {
  const verification = user[field];
  if (
    !verification?.expiresAt ||
    verification.expiresAt <= new Date() ||
    verification.attempts >= MAX_OTP_ATTEMPTS
  )
    return false;
  const matches = otpMatches(code, verification.codeHash);
  if (!matches) {
    verification.attempts += 1;
    await user.save();
  }
  return matches;
}

router.post("/register", async (request, response, next) => {
  try {
    const { name, password, recaptchaToken } = request.body ?? {};
    const email = normalizeEmail(request.body?.email);

    // Optional reCAPTCHA v3 verification
    const { verifyRecaptcha } = await import("../services/recaptcha.js");
    const recapResult = await verifyRecaptcha(recaptchaToken, request.ip, "register");
    if (!recapResult.success) {
      return response.status(400).json({ message: recapResult.error || "Security verification failed. Please refresh." });
    }

    if (
      typeof name !== "string" ||
      !name.trim() ||
      name.trim().length > 100 ||
      !/^\S+@\S+\.\S+$/.test(email) ||
      !validPassword(password)
    ) {
      return response
        .status(400)
        .json({
          message:
            "Provide a valid name, email, and password of at least 8 characters.",
        });
    }
    if (await User.exists({ email }))
      return response
        .status(409)
        .json({ message: "An account with that email already exists." });
    const user = await User.create({
      name: name.trim(),
      email,
      passwordHash: await bcrypt.hash(password, 12),
      role: "tenant",
    });
    await issueOtp(user, "emailVerification", "email verification");
    return response.status(201).json({ message: "Verification code sent." });
  } catch (error) {
    return next(error);
  }
});

router.post("/verify-email", async (request, response, next) => {
  try {
    const user = await User.findOne({
      email: normalizeEmail(request.body?.email),
    });
    if (
      !user ||
      !(await verifyOtp(user, "emailVerification", request.body?.code))
    )
      return response
        .status(400)
        .json({
          message:
            "The code is invalid, expired, or has been used too many times.",
        });
    user.isEmailVerified = true;
    user.emailVerification = {};
    await user.save();
    setSessionCookie(response, user);
    return response.json({
      message: "Email verified.",
      user: sessionUser(user),
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/resend-verification", async (request, response, next) => {
  try {
    const user = await User.findOne({
      email: normalizeEmail(request.body?.email),
    });
    if (user && !user.isEmailVerified)
      await issueOtp(user, "emailVerification", "email verification");
    return response.json({
      message: "If the account needs verification, a code has been sent.",
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/login", async (request, response, next) => {
  try {
    const { recaptchaToken } = request.body ?? {};

    // Optional reCAPTCHA v3 verification
    const { verifyRecaptcha } = await import("../services/recaptcha.js");
    const recapResult = await verifyRecaptcha(recaptchaToken, request.ip, "login");
    if (!recapResult.success) {
      return response.status(400).json({ message: recapResult.error || "Security verification failed. Please refresh." });
    }

    const user = await User.findOne({
      email: normalizeEmail(request.body?.email),
    });
    if (
      !user ||
      !(await bcrypt.compare(request.body?.password ?? "", user.passwordHash))
    )
      return response
        .status(401)
        .json({ message: "Invalid email or password." });
    if (!user.isEmailVerified)
      return response
        .status(403)
        .json({
          message: "Verify your email before signing in.",
          needsVerification: true,
        });
    setSessionCookie(response, user);
    return response.json({
      message: "Signed in.",
      user: sessionUser(user),
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/session", requireAuthenticatedUser, (request, response) =>
  response.json({ user: sessionUser(request.user) }),
);

router.put("/profile", requireAuthenticatedUser, async (request, response, next) => {
  try {
    const { name } = request.body;
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return response.status(400).json({ message: "Name is required." });
    }

    request.user.name = name.trim();
    await request.user.save();

    return response.json({ message: "Profile updated.", user: sessionUser(request.user) });
  } catch (error) {
    return next(error);
  }
});

router.put("/password", requireAuthenticatedUser, async (request, response, next) => {
  try {
    const { currentPassword, newPassword } = request.body;

    if (!currentPassword || !newPassword) {
      return response.status(400).json({ message: "Current and new password are required." });
    }

    if (!validPassword(newPassword)) {
      return response.status(400).json({ message: "Use a password with at least 8 characters." });
    }

    if (!(await bcrypt.compare(currentPassword, request.user.passwordHash))) {
      return response.status(400).json({ message: "Current password is incorrect." });
    }

    request.user.passwordHash = await bcrypt.hash(newPassword, 12);
    await request.user.save();

    return response.json({ message: "Password updated successfully." });
  } catch (error) {
    return next(error);
  }
});

router.post("/request-password-reset", async (request, response, next) => {
  try {
    const user = await User.findOne({
      email: normalizeEmail(request.body?.email),
    });
    if (user?.isEmailVerified)
      await issueOtp(user, "passwordReset", "password reset");
    return response.json({
      message: "If an eligible account exists, a reset code has been sent.",
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/reset-password", async (request, response, next) => {
  try {
    const password = request.body?.password;
    if (!validPassword(password))
      return response
        .status(400)
        .json({ message: "Use a password with at least 8 characters." });
    const user = await User.findOne({
      email: normalizeEmail(request.body?.email),
    });
    if (!user || !(await verifyOtp(user, "passwordReset", request.body?.code)))
      return response
        .status(400)
        .json({
          message:
            "The code is invalid, expired, or has been used too many times.",
        });
    user.passwordHash = await bcrypt.hash(password, 12);
    user.passwordReset = {};
    await user.save();
    setSessionCookie(response, user);
    return response.json({
      message: "Password reset. You are now signed in.",
      user: sessionUser(user),
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/logout", (_request, response) => {
  clearSecurityCookies(response);
  return response.status(204).end();
});

router.post("/request-phone-verification", requireAuthenticatedUser, async (request, response, next) => {
  try {
    const phone = normalizePhone(request.body?.phone);
    if (!phone) return response.status(400).json({ message: "Provide a valid phone number with country code." });
    if (process.env.NODE_ENV === "production")
      return response.status(503).json({ message: "Phone verification is not configured yet." });

    request.user.phone = phone;
    request.user.isPhoneVerified = false;
    request.user.phoneVerification = {
      codeHash: hashOtp("123456"),
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
      attempts: 0,
    };
    await request.user.save();
    return response.json({ message: "Use 123456 as the development verification code." });
  } catch (error) {
    return next(error);
  }
});

router.post("/verify-phone", requireAuthenticatedUser, async (request, response, next) => {
  try {
    if (process.env.NODE_ENV === "production")
      return response.status(503).json({ message: "Phone verification is not configured yet." });
    if (!(await verifyOtp(request.user, "phoneVerification", request.body?.code)))
      return response.status(400).json({ message: "The phone verification code is invalid or expired." });
    request.user.isPhoneVerified = true;
    request.user.phoneVerification = {};
    await request.user.save();
    return response.json({ message: "Phone number verified." });
  } catch (error) {
    return next(error);
  }
});

router.post("/complete-onboarding", requireAuthenticatedUser, async (request, response, next) => {
  try {
    if (request.user.onboardingCompletedAt)
      return response.status(400).json({ message: "Onboarding already completed." });

    const business = request.body?.business ?? {};
    const name = typeof business.name === "string" ? business.name.trim() : "";
    const plan = request.body?.plan;
    const templateId = request.body?.templateId;

    if (!name || name.length > 120 || !["starter", "growth", "pro"].includes(plan) || !templateId)
      return response.status(400).json({ message: "Provide valid business details, select a plan, and choose a template." });

    const template = await Template.findOne({ _id: templateId, isActive: true }).lean();
    if (!template)
      return response.status(404).json({ message: "Template not found." });

    const fields = ["logoUrl", "address", "email", "phone", "description"];
    const sanitizedBusiness = { name };
    for (const field of fields) {
      const value = business[field];
      if (typeof value !== "string" || value.length > (field === "description" ? 500 : field === "address" ? 300 : field === "logoUrl" ? 2048 : 254))
        return response.status(400).json({ message: "Provide valid business details." });
      sanitizedBusiness[field] = value.trim();
    }

    request.user.business = sanitizedBusiness;
    request.user.plan = plan;
    request.user.onboardingCompletedAt = new Date();
    request.user.tenantStatus = "active";
    await request.user.save();

    const website = await Website.create({
      owner: request.user.id,
      name,
      templateId: template._id,
      templateName: template.title,
      status: "draft",
    });

    // Send welcome email (non-blocking)
    sendWelcomeEmail({ email: request.user.email, name: request.user.name }).catch((err) => {
      console.error("[onboarding] Welcome email failed:", err.message);
    });

    return response.status(201).json({
      message: "Onboarding complete. Your draft website is ready.",
      website: { id: website.id, name: website.name, status: website.status },
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
