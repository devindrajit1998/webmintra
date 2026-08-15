/**
 * Support Ticket Management Routes
 * /api/admin/support
 */

import { Router } from "express";
import { requireAuthenticatedUser, requireRole } from "../../middleware/auth.js";
import { SupportTicket, TICKET_STATUSES, TICKET_PRIORITIES } from "../../models/SupportTicket.js";
import { Notification } from "../../models/Notification.js";
import { logActivity, buildLogContext } from "../../services/activityLog.js";
import { parsePagination, parseSort, isMongoId, isString, stripUndefined, escapeRegex } from "../../lib/validate.js";

const router = Router();
router.use(requireAuthenticatedUser, requireRole("admin"));

// ── List Tickets ──────────────────────────────────────────────
router.get("/", async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const sort = parseSort(req.query, ["createdAt", "updatedAt", "lastRepliedAt", "priority"]);
    const filter = {};

    if (req.query.status && TICKET_STATUSES.includes(req.query.status)) filter.status = req.query.status;
    if (req.query.priority && TICKET_PRIORITIES.includes(req.query.priority)) filter.priority = req.query.priority;
    if (req.query.tenant && isMongoId(req.query.tenant)) filter.tenant = req.query.tenant;
    if (req.query.assignedTo && isMongoId(req.query.assignedTo)) filter.assignedTo = req.query.assignedTo;
    if (req.query.unassigned === "true") filter.assignedTo = { $exists: false };
    if (req.query.search && typeof req.query.search === "string") {
      const q = escapeRegex(req.query.search.trim());
      filter.$or = [
        { subject: { $regex: q, $options: "i" } },
        { ticketNumber: { $regex: q, $options: "i" } },
      ];
    }

    const [tickets, total] = await Promise.all([
      SupportTicket.find(filter)
        .sort(sort).skip(skip).limit(limit)
        .populate("tenant", "name email business")
        .populate("assignedTo", "name email")
        .select("-replies.content")  // exclude content in list view
        .lean(),
      SupportTicket.countDocuments(filter),
    ]);

    // Status summary
    const summary = await SupportTicket.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    return res.json({
      tickets: tickets.map(formatTicket),
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      summary: summary.reduce((acc, s) => { acc[s._id] = s.count; return acc; }, {}),
    });
  } catch (error) {
    return next(error);
  }
});

// ── Get Single Ticket ─────────────────────────────────────────
router.get("/:ticketId", async (req, res, next) => {
  try {
    if (!isMongoId(req.params.ticketId)) return res.status(400).json({ message: "Invalid ticket ID." });
    const ticket = await SupportTicket.findById(req.params.ticketId)
      .populate("tenant", "name email business plan")
      .populate("assignedTo", "name email")
      .populate("replies.author", "name email role")
      .lean();
    if (!ticket) return res.status(404).json({ message: "Ticket not found." });
    return res.json({ ticket: formatTicketDetail(ticket) });
  } catch (error) {
    return next(error);
  }
});

// ── Update Ticket (status, priority, assignment) ──────────────
router.patch("/:ticketId", async (req, res, next) => {
  try {
    if (!isMongoId(req.params.ticketId)) return res.status(400).json({ message: "Invalid ticket ID." });
    const b = req.body ?? {};
    const update = stripUndefined({
      status: TICKET_STATUSES.includes(b.status) ? b.status : undefined,
      priority: TICKET_PRIORITIES.includes(b.priority) ? b.priority : undefined,
      assignedTo: b.assignedTo && isMongoId(b.assignedTo) ? b.assignedTo : undefined,
      category: b.category?.trim(),
      tags: Array.isArray(b.tags) ? b.tags : undefined,
      resolvedAt: b.status === "resolved" ? new Date() : undefined,
      closedAt: b.status === "closed" ? new Date() : undefined,
    });

    const ticket = await SupportTicket.findByIdAndUpdate(req.params.ticketId, { $set: update }, { new: true })
      .populate("tenant", "name email")
      .populate("assignedTo", "name email");

    if (!ticket) return res.status(404).json({ message: "Ticket not found." });

    if (update.assignedTo) {
      await logActivity({
        ...buildLogContext(req),
        action: "ticket_assigned",
        description: `Ticket ${ticket.ticketNumber} assigned to agent.`,
        resource: { type: "support_ticket", id: String(ticket._id), name: ticket.ticketNumber },
      });
    }

    return res.json({ ticket: formatTicket(ticket.toObject()) });
  } catch (error) {
    return next(error);
  }
});

// ── Add Reply ─────────────────────────────────────────────────
router.post("/:ticketId/reply", async (req, res, next) => {
  try {
    if (!isMongoId(req.params.ticketId)) return res.status(400).json({ message: "Invalid ticket ID." });

    const content = req.body?.content;
    if (!isString(content, { min: 1, max: 5000 }))
      return res.status(400).json({ message: "Reply content is required (max 5000 chars)." });

    const isInternal = req.body?.isInternal === true;

    const ticket = await SupportTicket.findById(req.params.ticketId);
    if (!ticket) return res.status(404).json({ message: "Ticket not found." });

    ticket.replies.push({
      author: req.user._id,
      content: content.trim(),
      isInternal,
      attachments: Array.isArray(req.body?.attachments) ? req.body.attachments : [],
    });
    ticket.lastRepliedAt = new Date();
    ticket.lastRepliedBy = req.user._id;

    if (!ticket.firstResponseAt) ticket.firstResponseAt = new Date();
    if (ticket.status === "open") ticket.status = "in_progress";

    await ticket.save();

    // Notify tenant (if not internal note)
    if (!isInternal) {
      await Notification.create({
        recipient: ticket.tenant,
        type: "ticket",
        title: "New reply on your support ticket",
        message: `An admin has replied to your ticket #${ticket.ticketNumber}.`,
        link: `/tickets/${ticket._id}`,
      });
    }

    await logActivity({
      ...buildLogContext(req),
      action: "ticket_replied",
      description: `Admin replied to ticket ${ticket.ticketNumber}${isInternal ? " (internal note)" : ""}.`,
      resource: { type: "support_ticket", id: String(ticket._id), name: ticket.ticketNumber },
    });

    const updatedTicket = await SupportTicket.findById(ticket._id)
      .populate("tenant", "name email business plan")
      .populate("assignedTo", "name email")
      .populate("replies.author", "name email role")
      .lean();

    return res.json({ message: "Reply added.", ticket: formatTicketDetail(updatedTicket) });
  } catch (error) {
    return next(error);
  }
});

// ── Resolve / Close Ticket ────────────────────────────────────
router.post("/:ticketId/resolve", async (req, res, next) => {
  try {
    if (!isMongoId(req.params.ticketId)) return res.status(400).json({ message: "Invalid ticket ID." });

    const ticket = await SupportTicket.findByIdAndUpdate(
      req.params.ticketId,
      { status: "resolved", resolvedAt: new Date() },
      { new: true },
    );

    if (!ticket) return res.status(404).json({ message: "Ticket not found." });

    await logActivity({
      ...buildLogContext(req),
      action: "ticket_resolved",
      description: `Ticket ${ticket.ticketNumber} resolved.`,
      resource: { type: "support_ticket", id: String(ticket._id), name: ticket.ticketNumber },
    });

    return res.json({ message: "Ticket resolved.", ticket: formatTicket(ticket.toObject()) });
  } catch (error) {
    return next(error);
  }
});

// ── Helpers ───────────────────────────────────────────────────
function formatTicket(t) {
  return {
    id: t._id,
    ticketNumber: t.ticketNumber,
    subject: t.subject,
    description: t.description,
    status: t.status,
    priority: t.priority,
    category: t.category,
    tags: t.tags,
    replyCount: t.replies?.length ?? 0,
    firstResponseAt: t.firstResponseAt,
    resolvedAt: t.resolvedAt,
    closedAt: t.closedAt,
    lastRepliedAt: t.lastRepliedAt,
    satisfactionRating: t.satisfactionRating,
    tenant: t.tenant
      ? { id: t.tenant._id || t.tenant, name: t.tenant.name, email: t.tenant.email, businessName: t.tenant.business?.name }
      : { id: t.tenant },
    assignedTo: t.assignedTo
      ? { id: t.assignedTo._id || t.assignedTo, name: t.assignedTo.name, email: t.assignedTo.email }
      : null,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

function formatTicketDetail(t) {
  return {
    ...formatTicket(t),
    replies: (t.replies ?? []).map((r) => ({
      id: r._id,
      content: r.content,
      isInternal: r.isInternal,
      createdAt: r.createdAt,
      author: r.author && typeof r.author === "object" && r.author.name
        ? { id: r.author._id, name: r.author.name, email: r.author.email, role: r.author.role }
        : { id: r.author },
    })),
  };
}

export default router;
