import { Router } from "express";
import { requireAuthenticatedUser, requireRole } from "../../middleware/auth.js";
import { Testimonial, DEFAULT_TESTIMONIALS } from "../../models/Testimonial.js";
import { logActivity, buildLogContext } from "../../services/activityLog.js";

const router = Router();
router.use(requireAuthenticatedUser, requireRole("admin"));

// GET /api/admin/testimonials - List all testimonials
router.get("/", async (req, res) => {
  try {
    let count = await Testimonial.countDocuments();
    if (count === 0) {
      await Testimonial.insertMany(DEFAULT_TESTIMONIALS);
    }
    const testimonials = await Testimonial.find().sort({ sortOrder: 1, createdAt: -1 });
    return res.json({ testimonials });
  } catch (error) {
    console.error("Failed to fetch admin testimonials:", error);
    return res.status(500).json({ message: "Failed to fetch testimonials" });
  }
});

// POST /api/admin/testimonials - Create a new testimonial
router.post("/", async (req, res) => {
  try {
    const {
      authorName,
      roleOrTitle,
      businessName,
      location,
      quote,
      rating = 5,
      avatarUrl,
      category,
      isFeatured = true,
      isActive = true,
      sortOrder = 0,
    } = req.body;

    if (!authorName || !quote) {
      return res.status(400).json({ message: "Author name and quote are required." });
    }

    const testimonial = await Testimonial.create({
      authorName: String(authorName).trim(),
      roleOrTitle: String(roleOrTitle || "").trim(),
      businessName: String(businessName || "").trim(),
      location: String(location || "India").trim(),
      quote: String(quote).trim(),
      rating: Math.max(1, Math.min(5, Number(rating) || 5)),
      avatarUrl: String(avatarUrl || "").trim(),
      category: String(category || "General").trim(),
      isFeatured: Boolean(isFeatured),
      isActive: Boolean(isActive),
      sortOrder: Number(sortOrder) || 0,
    });

    await logActivity({
      ...buildLogContext(req),
      action: "testimonial.created",
      resourceType: "testimonial",
      resourceId: testimonial._id,
      details: { authorName, businessName },
    });

    return res.status(201).json({ testimonial });
  } catch (error) {
    console.error("Failed to create testimonial:", error);
    return res.status(500).json({ message: "Failed to create testimonial" });
  }
});

// PUT /api/admin/testimonials/:id - Update a testimonial
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      authorName,
      roleOrTitle,
      businessName,
      location,
      quote,
      rating,
      avatarUrl,
      category,
      isFeatured,
      isActive,
      sortOrder,
    } = req.body;

    const testimonial = await Testimonial.findById(id);
    if (!testimonial) {
      return res.status(404).json({ message: "Testimonial not found." });
    }

    if (authorName !== undefined) testimonial.authorName = String(authorName).trim();
    if (roleOrTitle !== undefined) testimonial.roleOrTitle = String(roleOrTitle).trim();
    if (businessName !== undefined) testimonial.businessName = String(businessName).trim();
    if (location !== undefined) testimonial.location = String(location).trim();
    if (quote !== undefined) testimonial.quote = String(quote).trim();
    if (rating !== undefined) testimonial.rating = Math.max(1, Math.min(5, Number(rating) || 5));
    if (avatarUrl !== undefined) testimonial.avatarUrl = String(avatarUrl).trim();
    if (category !== undefined) testimonial.category = String(category).trim();
    if (isFeatured !== undefined) testimonial.isFeatured = Boolean(isFeatured);
    if (isActive !== undefined) testimonial.isActive = Boolean(isActive);
    if (sortOrder !== undefined) testimonial.sortOrder = Number(sortOrder) || 0;

    await testimonial.save();

    await logActivity({
      ...buildLogContext(req),
      action: "testimonial.updated",
      resourceType: "testimonial",
      resourceId: testimonial._id,
      details: { authorName: testimonial.authorName },
    });

    return res.json({ testimonial });
  } catch (error) {
    console.error("Failed to update testimonial:", error);
    return res.status(500).json({ message: "Failed to update testimonial" });
  }
});

// DELETE /api/admin/testimonials/:id - Delete a testimonial
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const testimonial = await Testimonial.findByIdAndDelete(id);
    if (!testimonial) {
      return res.status(404).json({ message: "Testimonial not found." });
    }

    await logActivity({
      ...buildLogContext(req),
      action: "testimonial.deleted",
      resourceType: "testimonial",
      resourceId: id,
      details: { authorName: testimonial.authorName },
    });

    return res.json({ message: "Testimonial deleted successfully" });
  } catch (error) {
    console.error("Failed to delete testimonial:", error);
    return res.status(500).json({ message: "Failed to delete testimonial" });
  }
});

export default router;
