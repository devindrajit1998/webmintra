/**
 * Global Search Route
 * /api/admin/search
 */

import { Router } from "express";
import { requireAuthenticatedUser, requireRole } from "../../middleware/auth.js";
import { User } from "../../models/User.js";
import { Website } from "../../models/Website.js";
import { Payment } from "../../models/Payment.js";
import { Domain } from "../../models/Domain.js";
import { SupportTicket } from "../../models/SupportTicket.js";
import { Invitation } from "../../models/Invitation.js";
import { Lead } from "../../models/Lead.js";

const router = Router();
router.use(requireAuthenticatedUser, requireRole("admin"));

router.get("/", async (req, res, next) => {
  try {
    const q = req.query.q;
    if (!q || typeof q !== "string" || q.trim().length < 2)
      return res.status(400).json({ message: "Provide a search query of at least 2 characters." });

    const { escapeRegex } = await import("../../lib/validate.js");
    const query = escapeRegex(q.trim());
    const regex = { $regex: query, $options: "i" };
    const limit = 8;

    const [tenants, websites, payments, domains, tickets, invitations, leads] = await Promise.all([
      User.find({
        role: "tenant",
        $or: [{ name: regex }, { email: regex }, { "business.name": regex }],
      }).select("name email business plan tenantStatus").limit(limit).lean(),

      Website.find({
        $or: [{ name: regex }, { templateName: regex }],
      }).select("name status templateName").populate("owner", "name email").limit(limit).lean(),

      Payment.find({
        $or: [{ invoiceNumber: regex }, { description: regex }],
      }).select("invoiceNumber amount currency status paidAt").populate("tenant", "name email").limit(limit).lean(),

      Domain.find({ domain: regex }).select("domain status sslStatus isPrimary")
        .populate("tenant", "name email").limit(limit).lean(),

      SupportTicket.find({
        $or: [{ ticketNumber: regex }, { subject: regex }],
      }).select("ticketNumber subject status priority createdAt").populate("tenant", "name email").limit(limit).lean(),

      Invitation.find({
        $or: [{ ownerEmail: regex }, { businessName: regex }, { ownerName: regex }],
      }).select("businessName ownerName ownerEmail status plan createdAt").limit(limit).lean(),

      Lead.find({
        $or: [
          { name: regex },
          { businessName: regex },
          { phone: regex },
          { email: regex },
          { city: regex },
        ],
      }).select("name businessName phone email city status priority category").limit(limit).lean(),
    ]);

    const totalResults =
      tenants.length +
      websites.length +
      payments.length +
      domains.length +
      tickets.length +
      invitations.length +
      leads.length;

    return res.json({
      query,
      totalResults,
      results: {
        tenants: tenants.map((t) => ({
          type: "tenant",
          id: t._id,
          title: t.business?.name || t.name,
          subtitle: t.email,
          meta: t.tenantStatus || "active",
        })),
        websites: websites.map((w) => ({
          type: "website",
          id: w._id,
          title: w.name,
          subtitle: `Template: ${w.templateName || "Custom"} • ${w.owner?.email || "No Owner"}`,
          meta: w.status,
        })),
        payments: payments.map((p) => ({
          type: "payment",
          id: p._id,
          title: p.invoiceNumber,
          subtitle: p.tenant?.email || "Unknown Tenant",
          meta: `₹${p.amount} ${p.currency || "INR"} • ${p.status}`,
        })),
        domains: domains.map((d) => ({
          type: "domain",
          id: d._id,
          title: d.domain,
          subtitle: d.tenant?.email || "Unknown Tenant",
          meta: d.status,
        })),
        tickets: tickets.map((t) => ({
          type: "ticket",
          id: t._id,
          title: `${t.ticketNumber}: ${t.subject}`,
          subtitle: t.tenant?.email || "Support Requester",
          meta: t.status,
        })),
        invitations: invitations.map((i) => ({
          type: "invitation",
          id: i._id,
          title: i.businessName || i.ownerName,
          subtitle: i.ownerEmail,
          meta: i.status,
        })),
        leads: leads.map((l) => ({
          type: "lead",
          id: l._id,
          title: l.name,
          subtitle: `${l.businessName || l.category || "Lead"} • ${l.phone || l.email || l.city || "No contact"}`,
          meta: l.status,
        })),
      },
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
