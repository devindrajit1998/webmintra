/**
 * Google OAuth Routes
 * POST /api/auth/google
 *
 * Accepts a Google ID token from the frontend (Google Identity Services)
 * and either signs in an existing user or creates a new tenant account.
 *
 * Required env var:
 *   GOOGLE_CLIENT_ID  — Your OAuth 2.0 Client ID from Google Cloud Console
 *
 * How to set up:
 *   1. Go to https://console.cloud.google.com/
 *   2. Create a project → APIs & Services → Credentials → Create OAuth 2.0 Client ID
 *   3. Set Authorized JS origins to your frontend URL (e.g. https://app.webmintra.in)
 *   4. Copy the Client ID into GOOGLE_CLIENT_ID env var
 */

import { Router } from "express";
import { OAuth2Client } from "google-auth-library";
import { User } from "../models/User.js";
import { sessionCookieOptions } from "../middleware/security.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";

const router = Router();

function userRole(user) {
    return ["admin", "tenant"].includes(user.role) ? user.role : "tenant";
}

function sessionUser(user) {
    return {
        name: user.name,
        email: user.email,
        role: userRole(user),
        onboardingCompleted: Boolean(user.onboardingCompletedAt),
        avatarUrl: user.avatarUrl,
    };
}

function setSessionCookie(response, user) {
    const token = jwt.sign(
        { sub: user.id, email: user.email, role: userRole(user), tv: user.tokenVersion ?? 0 },
        process.env.JWT_SECRET,
        { expiresIn: "1h", issuer: "webmintra" },
    );
    response.cookie("webmintra_session", token, sessionCookieOptions());
}

/**
 * POST /api/auth/google
 * Body: { credential: "<Google ID Token>" }
 *
 * Validates the Google ID token server-side, then:
 *   - If user exists → sign in
 *   - If user is new → create account (email pre-verified via Google)
 */
router.post("/google", async (req, res, next) => {
    try {
        const clientId = process.env.GOOGLE_CLIENT_ID;
        if (!clientId) {
            return res.status(503).json({ message: "Google sign-in is not configured on this server." });
        }

        const { credential } = req.body ?? {};
        if (typeof credential !== "string" || !credential.trim()) {
            return res.status(400).json({ message: "Google credential token is required." });
        }

        // Verify the ID token with Google
        const client = new OAuth2Client(clientId);
        let payload;
        try {
            const ticket = await client.verifyIdToken({
                idToken: credential,
                audience: clientId,
            });
            payload = ticket.getPayload();
        } catch {
            return res.status(401).json({ message: "Google sign-in verification failed. Please try again." });
        }

        if (!payload?.email_verified || !payload.email) {
            return res.status(400).json({ message: "Your Google account email is not verified." });
        }

        const email = payload.email.toLowerCase().trim();
        const name = payload.name || payload.given_name || email.split("@")[0];
        const avatarUrl = payload.picture || "";

        let user = await User.findOne({ email });

        if (user) {
            // Existing user — update avatar from Google if not set
            if (!user.avatarUrl && avatarUrl) {
                user.avatarUrl = avatarUrl;
                await user.save();
            }
            // Check tenant status
            if (user.role === "tenant" && ["suspended", "archived"].includes(user.tenantStatus)) {
                return res.status(403).json({ message: "This tenant workspace is not currently active." });
            }
        } else {
            // New user — create account with Google-verified email
            // Generate a secure random password (user can never know it — they always sign in via Google)
            const randomPassword = crypto.randomBytes(32).toString("hex");
            user = await User.create({
                name: name.slice(0, 100),
                email,
                passwordHash: await bcrypt.hash(randomPassword, 12),
                role: "tenant",
                isEmailVerified: true, // Google already verified the email
                avatarUrl,
            });
        }

        setSessionCookie(res, user);
        return res.json({
            message: "Signed in with Google.",
            user: sessionUser(user),
        });
    } catch (error) {
        return next(error);
    }
});

export default router;
