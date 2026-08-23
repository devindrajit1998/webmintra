/**
 * Admin Lead Management & CRM Routes
 * /api/admin/leads
 */

import { Router } from "express";
import { requireAuthenticatedUser, requireRole } from "../../middleware/auth.js";
import { Lead, LEAD_STATUSES, LEAD_PRIORITIES, LEAD_SOURCES } from "../../models/Lead.js";
import { Invitation } from "../../models/Invitation.js";
import { logActivity, buildLogContext } from "../../services/activityLog.js";

const router = Router();
router.use(requireAuthenticatedUser, requireRole("admin"));

// ── 1. Get Pipeline Summary & Stats ───────────────────────────
router.get("/stats", async (req, res, next) => {
  try {
    const totalLeads = await Lead.countDocuments();
    const wonLeads = await Lead.countDocuments({ status: "won" });
    const newLeads = await Lead.countDocuments({ status: "new" });
    
    // Aggregation for status counts
    const statusCounts = await Lead.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 }, totalValue: { $sum: "$estimatedValue" } } },
    ]);

    // Calculate total pipeline value (excluding won/lost)
    const pipelineValueResult = await Lead.aggregate([
      { $match: { status: { $nin: ["won", "lost"] } } },
      { $group: { _id: null, total: { $sum: "$estimatedValue" } } },
    ]);
    const pipelineValue = pipelineValueResult[0]?.total || 0;

    // Follow-ups due today or overdue
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    const followUpsDue = await Lead.countDocuments({
      status: { $nin: ["won", "lost"] },
      followUpDate: { $ne: null, $lte: todayEnd },
    });

    const statusMap = Object.fromEntries(
      LEAD_STATUSES.map((s) => [s, { count: 0, totalValue: 0 }])
    );
    statusCounts.forEach((item) => {
      if (statusMap[item._id]) {
        statusMap[item._id] = { count: item.count, totalValue: item.totalValue };
      }
    });

    const conversionRate = totalLeads > 0 ? ((wonLeads / totalLeads) * 100).toFixed(1) : "0.0";

    return res.json({
      totalLeads,
      newLeads,
      wonLeads,
      pipelineValue,
      followUpsDue,
      conversionRate,
      statusBreakdown: statusMap,
    });
  } catch (error) {
    return next(error);
  }
});

// ── 2. List Leads (Search, Filter, Pagination) ─────────────────
router.get("/", async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 25,
      status,
      priority,
      category,
      source,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const filter = {};

    if (status && status !== "all") {
      filter.status = status;
    }
    if (priority && priority !== "all") {
      filter.priority = priority;
    }
    if (category && category !== "all") {
      filter.category = category;
    }
    if (source && source !== "all") {
      filter.source = source;
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [
        { name: regex },
        { businessName: regex },
        { phone: regex },
        { email: regex },
        { city: regex },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;
    const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

    const [leads, total] = await Promise.all([
      Lead.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .populate("assignedTo", "name email")
        .populate("convertedTenantId", "name email businessName")
        .lean(),
      Lead.countDocuments(filter),
    ]);

    return res.json({
      leads,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    return next(error);
  }
});

// ── 3. Create Single Lead Manually ─────────────────────────────
router.post("/", async (req, res, next) => {
  try {
    const {
      name,
      businessName = "",
      phone = "",
      email = "",
      city = "",
      state = "",
      address = "",
      website = "",
      mapUrl = "",
      category = "General",
      status = "new",
      priority = "medium",
      source = "manual",
      estimatedValue = 0,
      followUpDate = null,
      tags = [],
      initialNote = "",
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Lead name is required." });
    }

    const notes = [];
    if (initialNote && initialNote.trim()) {
      notes.push({
        note: initialNote.trim(),
        authorName: req.user?.name || "Admin",
        createdAt: new Date(),
      });
    }

    const lead = await Lead.create({
      name: name.trim(),
      businessName: businessName.trim(),
      phone: phone.trim(),
      email: email.trim().toLowerCase(),
      city: city.trim(),
      state: state.trim(),
      address: address.trim(),
      website: website.trim(),
      mapUrl: mapUrl.trim(),
      category: category.trim() || "General",
      status: LEAD_STATUSES.includes(status) ? status : "new",
      priority: LEAD_PRIORITIES.includes(priority) ? priority : "medium",
      source: LEAD_SOURCES.includes(source) ? source : "manual",
      estimatedValue: Number(estimatedValue) || 0,
      followUpDate: followUpDate ? new Date(followUpDate) : null,
      tags: Array.isArray(tags) ? tags.map((t) => String(t).trim()).filter(Boolean) : [],
      notes,
      createdBy: req.user?._id,
    });

    logActivity({
      eventType: "admin_lead_created",
      userId: req.user?._id,
      description: `Created new lead: "${lead.name}" (${lead.businessName || "No business name"})`,
      metadata: { leadId: lead._id, name: lead.name, status: lead.status },
      req,
    });

    return res.status(201).json({ message: "Lead created successfully.", lead });
  } catch (error) {
    return next(error);
  }
});

// ── 4. Bulk Import Leads (Excel / CSV parsed items) ────────────
router.post("/bulk-import", async (req, res, next) => {
  try {
    const { leads = [], skipDuplicates = true } = req.body;

    if (!Array.isArray(leads) || leads.length === 0) {
      return res.status(400).json({ message: "Please provide a valid list of leads to import." });
    }

    let insertedCount = 0;
    let skippedCount = 0;
    let updatedCount = 0;
    const errors = [];

    for (let i = 0; i < leads.length; i++) {
      const raw = leads[i];
      const name = String(raw.name || raw.title || raw.contactName || raw.fullName || raw.businessName || "").trim();
      const phone = String(raw.phone || raw.phoneNumber || raw.mobile || raw.whatsapp || "").replace(/[^0-9+]/g, "").trim();
      const email = String(raw.email || "").trim().toLowerCase();
      const businessName = String(raw.businessName || raw.company || raw.title || raw.storeName || "").trim();
      const city = String(raw.city || raw.location || "").trim();
      const address = String(raw.address || raw.websiteAddress || raw.fullAddress || "").trim();
      const website = String(raw.website || raw.websiteUrl || raw.site || "").trim();
      const mapUrl = String(raw.mapUrl || raw.googleMapUrl || raw.mapsUrl || raw.gmbUrl || "").trim();
      const category = String(raw.category || raw.type || raw.industry || "General").trim();
      const estimatedValue = Number(raw.estimatedValue || raw.value || raw.dealValue || 0) || 0;
      const noteText = String(raw.note || raw.notes || raw.comment || "").trim();

      if (!name) {
        skippedCount++;
        continue;
      }

      // Check duplicate
      const duplicateQuery = [];
      if (phone) duplicateQuery.push({ phone });
      if (email) duplicateQuery.push({ email });

      let existing = null;
      if (duplicateQuery.length > 0) {
        existing = await Lead.findOne({ $or: duplicateQuery });
      }

      const websiteClean = website.includes(".") ? website : "";
      // If no website present, omit Google Map link to help identify high-priority cold leads
      const finalMapUrl = websiteClean ? mapUrl : "";

      if (existing) {
        if (skipDuplicates) {
          skippedCount++;
          continue;
        } else {
          // Update existing with new details if missing
          if (!existing.businessName && businessName) existing.businessName = businessName;
          if (!existing.city && city) existing.city = city;
          if (!existing.address && address) existing.address = address;
          if (!existing.website && websiteClean) existing.website = websiteClean;
          if (!existing.mapUrl && finalMapUrl) existing.mapUrl = finalMapUrl;
          if (noteText) {
            existing.notes.push({
              note: `[Imported Note]: ${noteText}`,
              authorName: req.user?.name || "Admin (Excel Import)",
              createdAt: new Date(),
            });
          }
          await existing.save();
          updatedCount++;
          continue;
        }
      }

      const notes = [];
      if (noteText) {
        notes.push({
          note: noteText,
          authorName: req.user?.name || "Admin (Excel Import)",
          createdAt: new Date(),
        });
      }

      await Lead.create({
        name,
        businessName: businessName !== name ? businessName : "",
        phone,
        email,
        city,
        address,
        website: websiteClean,
        mapUrl: finalMapUrl,
        category: category || "General",
        status: "new",
        priority: "medium",
        source: "excel_import",
        estimatedValue,
        notes,
        createdBy: req.user?._id,
      });

      insertedCount++;
    }

    logActivity({
      eventType: "admin_leads_imported",
      userId: req.user?._id,
      description: `Bulk imported leads: ${insertedCount} inserted, ${updatedCount} updated, ${skippedCount} skipped.`,
      metadata: { insertedCount, updatedCount, skippedCount, totalProcessed: leads.length },
      req,
    });

    return res.json({
      message: `Import complete. Inserted: ${insertedCount}, Updated: ${updatedCount}, Skipped: ${skippedCount}.`,
      summary: {
        total: leads.length,
        insertedCount,
        updatedCount,
        skippedCount,
      },
    });
  } catch (error) {
    return next(error);
  }
});

// ── 5. Update Lead Details / Status ────────────────────────────
router.patch("/:leadId", async (req, res, next) => {
  try {
    const { leadId } = req.params;
    const allowed = [
      "name",
      "businessName",
      "phone",
      "email",
      "city",
      "state",
      "address",
      "website",
      "mapUrl",
      "category",
      "status",
      "priority",
      "source",
      "estimatedValue",
      "followUpDate",
      "tags",
    ];

    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    if (updates.status && !LEAD_STATUSES.includes(updates.status)) {
      return res.status(400).json({ message: "Invalid status value." });
    }

    const lead = await Lead.findByIdAndUpdate(leadId, { $set: updates }, { new: true });
    if (!lead) {
      return res.status(404).json({ message: "Lead not found." });
    }

    return res.json({ message: "Lead updated successfully.", lead });
  } catch (error) {
    return next(error);
  }
});

// ── 6. Add Progress Note to Lead ──────────────────────────────
router.post("/:leadId/notes", async (req, res, next) => {
  try {
    const { leadId } = req.params;
    const { note } = req.body;

    if (!note || !note.trim()) {
      return res.status(400).json({ message: "Note content is required." });
    }

    const lead = await Lead.findById(leadId);
    if (!lead) {
      return res.status(404).json({ message: "Lead not found." });
    }

    lead.notes.unshift({
      note: note.trim(),
      authorName: req.user?.name || "Admin",
      createdAt: new Date(),
    });

    await lead.save();

    return res.json({ message: "Note added successfully.", notes: lead.notes });
  } catch (error) {
    return next(error);
  }
});

// ── 7. Convert Lead to Tenant Invitation ───────────────────────
router.post("/:leadId/convert", async (req, res, next) => {
  try {
    const { leadId } = req.params;
    const lead = await Lead.findById(leadId);
    if (!lead) {
      return res.status(404).json({ message: "Lead not found." });
    }

    if (!lead.email || !lead.email.trim()) {
      return res.status(400).json({ message: "Lead must have an email address to send an invitation." });
    }

    const { User } = await import("../../models/User.js");
    const existingUser = await User.findOne({ email: lead.email.trim().toLowerCase() }).lean();
    if (existingUser) {
      return res.status(409).json({ message: "An active tenant account with this email already exists." });
    }

    const crypto = await import("node:crypto");
    const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

    // Check if pending invitation already exists
    let invitation = await Invitation.findOne({ ownerEmail: lead.email.trim().toLowerCase(), status: "pending" });
    if (!invitation) {
      const token = crypto.randomBytes(32).toString("base64url");
      invitation = await Invitation.create({
        businessName: (lead.businessName || lead.name || "My Business").trim(),
        ownerName: (lead.name || "Business Owner").trim(),
        ownerEmail: lead.email.trim().toLowerCase(),
        plan: req.body?.plan || "starter",
        trialDays: 14,
        category: (lead.category || "General").trim(),
        notes: `Converted from CRM Lead (ID: ${lead._id}). Phone: ${lead.phone || "N/A"}`,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        invitedBy: req.user?._id,
      });

      const invitationUrl = `${process.env.FRONTEND_ORIGIN ?? "http://localhost:8080"}/accept-invitation?token=${token}`;
      const { sendInvitationEmail } = await import("../../services/mail.js");
      await sendInvitationEmail({
        email: invitation.ownerEmail,
        ownerName: invitation.ownerName,
        businessName: invitation.businessName,
        invitationUrl,
      }).catch((err) => console.warn("Could not dispatch invitation email:", err?.message));
    }

    lead.status = "won";
    lead.convertedAt = new Date();
    lead.notes.unshift({
      note: `Converted to Tenant Invitation by ${req.user?.name || "Admin"}. Invitation sent to ${lead.email}.`,
      authorName: "System",
      createdAt: new Date(),
    });
    await lead.save();

    await logActivity({
      ...buildLogContext(req),
      action: "admin_lead_converted",
      description: `Converted lead "${lead.name}" (${lead.email}) to Tenant invitation.`,
      resource: { type: "lead", id: String(lead._id), name: lead.name },
    });

    return res.json({ message: `Invitation sent to ${lead.email}! Lead marked as Won.`, lead });
  } catch (error) {
    return next(error);
  }
});

// ── 8. Delete Lead ────────────────────────────────────────────
router.delete("/:leadId", async (req, res, next) => {
  try {
    const { leadId } = req.params;
    const lead = await Lead.findByIdAndDelete(leadId);
    if (!lead) {
      return res.status(404).json({ message: "Lead not found." });
    }

    return res.json({ message: "Lead deleted successfully." });
  } catch (error) {
    return next(error);
  }
});

// ── 9. Bulk Status Change ──────────────────────────────────────
router.post("/bulk-status", async (req, res, next) => {
  try {
    const { leadIds = [], status } = req.body;

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({ message: "No leads selected for status update." });
    }

    if (!status || !LEAD_STATUSES.includes(status)) {
      return res.status(400).json({ message: "Invalid status value provided." });
    }

    const result = await Lead.updateMany(
      { _id: { $in: leadIds } },
      { $set: { status } }
    );

    logActivity({
      eventType: "admin_leads_bulk_status",
      userId: req.user?._id,
      description: `Bulk updated status to "${status}" for ${result.modifiedCount} leads.`,
      metadata: { status, modifiedCount: result.modifiedCount, leadIds },
      req,
    });

    return res.json({
      message: `Successfully updated status for ${result.modifiedCount} lead(s).`,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    return next(error);
  }
});

// ── 10. Bulk Delete Leads ──────────────────────────────────────
router.post("/bulk-delete", async (req, res, next) => {
  try {
    const { leadIds = [] } = req.body;

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({ message: "No leads selected for deletion." });
    }

    const result = await Lead.deleteMany({ _id: { $in: leadIds } });

    logActivity({
      eventType: "admin_leads_bulk_delete",
      userId: req.user?._id,
      description: `Bulk deleted ${result.deletedCount} leads.`,
      metadata: { deletedCount: result.deletedCount, leadIds },
      req,
    });

    return res.json({
      message: `Successfully deleted ${result.deletedCount} lead(s).`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
