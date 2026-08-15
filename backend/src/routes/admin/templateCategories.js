import { Router } from "express";
import { TemplateCategory } from "../../models/TemplateCategory.js";
import { requireAuthenticatedUser, requireRole } from "../../middleware/auth.js";

const router = Router();

router.use(requireAuthenticatedUser, requireRole("admin"));

// Get all categories
router.get("/", async (req, res) => {
  try {
    const categories = await TemplateCategory.find().sort({ name: 1 });
    res.json({ categories });
  } catch (error) {
    console.error("Error fetching template categories:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Create a category
router.post("/", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Name is required" });
    }
    const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    
    const existing = await TemplateCategory.findOne({ slug });
    if (existing) {
      return res.status(400).json({ message: "A category with this name already exists" });
    }

    const category = await TemplateCategory.create({ name: name.trim(), slug });
    res.status(201).json({ category });
  } catch (error) {
    console.error("Error creating template category:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Update a category
router.put("/:id", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Name is required" });
    }
    const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    
    const existing = await TemplateCategory.findOne({ slug, _id: { $ne: req.params.id } });
    if (existing) {
      return res.status(400).json({ message: "A category with this name already exists" });
    }

    const category = await TemplateCategory.findByIdAndUpdate(
      req.params.id,
      { name: name.trim(), slug },
      { new: true }
    );
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }
    res.json({ category });
  } catch (error) {
    console.error("Error updating template category:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Delete a category
router.delete("/:id", async (req, res) => {
  try {
    const category = await TemplateCategory.findByIdAndDelete(req.params.id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }
    res.json({ message: "Category deleted successfully" });
  } catch (error) {
    console.error("Error deleting template category:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
