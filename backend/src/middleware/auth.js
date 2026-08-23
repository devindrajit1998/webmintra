import jwt from "jsonwebtoken";
import { User } from "../models/User.js";

export async function requireAuthenticatedUser(request, response, next) {
  const token = request.cookies?.webmintra_session;
  if (!token) return response.status(401).json({ message: "Not signed in." });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, { issuer: "webmintra" });
    if (typeof payload !== "object" || typeof payload.sub !== "string") {
      return response.status(401).json({ message: "Not signed in." });
    }

    const user = await User.findById(payload.sub);
    if (!user || !user.isEmailVerified) {
      return response.status(401).json({ message: "Not signed in." });
    }
    // Reject tokens issued before the last password change
    if ((payload.tv ?? 0) !== (user.tokenVersion ?? 0)) {
      return response.status(401).json({ message: "Session expired. Please sign in again." });
    }
    if (user.role === "tenant" && ["suspended", "archived"].includes(user.tenantStatus))
      return response.status(403).json({ message: "This tenant workspace is not currently active." });

    request.user = user;
    return next();
  } catch {
    return response.status(401).json({ message: "Not signed in." });
  }
}

export function requireRole(role) {
  return (request, response, next) => {
    if (request.user?.role !== role) {
      return response.status(403).json({ message: "You are not authorized to access this resource." });
    }
    return next();
  };
}

export function establishTenantContext(request, response, next) {
  if (request.user?.role !== "tenant" || !request.user?._id) {
    return response.status(403).json({ message: "You are not authorized to access this resource." });
  }

  if (request.tenantId === undefined) {
    Object.defineProperty(request, "tenantId", {
      value: request.user._id,
      enumerable: true,
      writable: true,
      configurable: true,
    });
  } else {
    request.tenantId = request.user._id;
  }
  return next();
}

