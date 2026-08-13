import { Router } from "express";
import multer from "multer";
import { Template } from "../../models/Template.js";
import { requireAuthenticatedUser, requireRole } from "../../middleware/auth.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(requireAuthenticatedUser, requireRole("admin"));

// Get all templates
router.get("/", async (req, res) => {
  try {
    const templates = await Template.find().sort({ createdAt: -1 });
    res.json({ templates });
  } catch (error) {
    console.error("Error fetching templates:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Import a new template via raw HTML or ZIP (simplified to HTML for now, ZIP can be added later)
router.post("/import", upload.single("file"), async (req, res) => {
  try {
    const { title, description, category, thumbnailUrl, stats, issuesCount } = req.body;
    let htmlContent = req.body.htmlContent;
    
    // If a file was uploaded, read it as HTML content
    if (req.file) {
      htmlContent = req.file.buffer.toString("utf-8");
    }

    if (!htmlContent) {
      return res.status(400).json({ message: "HTML content or file is required." });
    }

    const template = new Template({
      title,
      description,
      category,
      thumbnailUrl,
      htmlContent,
      pages: [],
      stats: stats ? JSON.parse(stats) : {},
      issuesCount: issuesCount ? parseInt(issuesCount) : 0,
    });

    await template.save();
    res.status(201).json({ message: "Template imported successfully", template });
  } catch (error) {
    console.error("Error importing template:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Update a template
router.put("/:id", async (req, res) => {
  try {
    const { title, description, category, thumbnailUrl, htmlContent, pages } = req.body;
    const template = await Template.findByIdAndUpdate(
      req.params.id,
      { title, description, category, thumbnailUrl, htmlContent, pages: pages || [] },
      { new: true }
    );
    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }
    res.json({ message: "Template updated successfully", template });
  } catch (error) {
    console.error("Error updating template:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Delete a template
router.delete("/:id", async (req, res) => {
  try {
    const template = await Template.findByIdAndDelete(req.params.id);
    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }
    res.json({ message: "Template deleted successfully" });
  } catch (error) {
    console.error("Error deleting template:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
