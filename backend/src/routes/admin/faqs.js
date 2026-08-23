import { Router } from "express";
import { requireAuthenticatedUser, requireRole } from "../../middleware/auth.js";
import { FAQ } from "../../models/Faq.js";
import { logActivity, buildLogContext } from "../../services/activityLog.js";
import { isMongoId, isString } from "../../lib/validate.js";

const router = Router();
router.use(requireAuthenticatedUser, requireRole("admin"));

// GET all FAQs (admin)
router.get("/", async (req, res, next) => {
  try {
    const faqs = await FAQ.find().sort({ sortOrder: 1, createdAt: -1 }).lean();
    return res.json({ faqs });
  } catch (error) {
    return next(error);
  }
});

// POST create FAQ
router.post("/", async (req, res, next) => {
  try {
    const { question, answer, category, isPublished, sortOrder } = req.body || {};
    if (!isString(question, { min: 3, max: 300 })) {
      return res.status(400).json({ message: "Question is required (3-300 characters)." });
    }
    if (!isString(answer, { min: 3, max: 2000 })) {
      return res.status(400).json({ message: "Answer is required (3-2000 characters)." });
    }

    const faq = await FAQ.create({
      question: question.trim(),
      answer: answer.trim(),
      category: typeof category === "string" ? category.trim() : "General",
      isPublished: isPublished !== false,
      sortOrder: Number(sortOrder) || 0,
    });

    await logActivity({
      ...buildLogContext(req),
      action: "faq_created",
      description: `Created FAQ "${faq.question}".`,
    }).catch(() => { });

    return res.status(201).json({ faq });
  } catch (error) {
    return next(error);
  }
});

// PATCH update FAQ
router.patch("/:id", async (req, res, next) => {
  try {
    if (!isMongoId(req.params.id)) {
      return res.status(400).json({ message: "Invalid FAQ ID." });
    }

    const { question, answer, category, isPublished, sortOrder } = req.body || {};
    const update = {};
    if (typeof question === "string") update.question = question.trim();
    if (typeof answer === "string") update.answer = answer.trim();
    if (typeof category === "string") update.category = category.trim();
    if (typeof isPublished === "boolean") update.isPublished = isPublished;
    if (typeof sortOrder === "number") update.sortOrder = sortOrder;

    const faq = await FAQ.findByIdAndUpdate(req.params.id, { $set: update }, { new: true });
    if (!faq) return res.status(404).json({ message: "FAQ not found." });

    await logActivity({
      ...buildLogContext(req),
      action: "faq_updated",
      description: `Updated FAQ "${faq.question}".`,
    }).catch(() => { });

    return res.json({ faq });
  } catch (error) {
    return next(error);
  }
});

// DELETE FAQ
router.delete("/:id", async (req, res, next) => {
  try {
    if (!isMongoId(req.params.id)) {
      return res.status(400).json({ message: "Invalid FAQ ID." });
    }

    const faq = await FAQ.findByIdAndDelete(req.params.id);
    if (!faq) return res.status(404).json({ message: "FAQ not found." });

    await logActivity({
      ...buildLogContext(req),
      action: "faq_deleted",
      description: `Deleted FAQ "${faq.question}".`,
    }).catch(() => { });

    return res.json({ message: "FAQ deleted successfully." });
  } catch (error) {
    return next(error);
  }
});

export default router;
