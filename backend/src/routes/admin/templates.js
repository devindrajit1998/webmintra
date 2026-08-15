import { Router } from "express";
import multer from "multer";
import { Template } from "../../models/Template.js";
import { Website } from "../../models/Website.js";
import { requireAuthenticatedUser, requireRole } from "../../middleware/auth.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const MAX_IMPORTED_PAGES = 100;

function parseImportedPages(value) {
  if (value === undefined || value === "") {
    return [];
  }

  let pages;
  try {
    pages = typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    const error = new Error("Pages must be valid JSON.");
    error.statusCode = 400;
    throw error;
  }

  if (!Array.isArray(pages) || pages.length > MAX_IMPORTED_PAGES) {
    const error = new Error(`Pages must be an array of at most ${MAX_IMPORTED_PAGES} items.`);
    error.statusCode = 400;
    throw error;
  }

  const seenNames = new Set();
  return pages.map((page, index) => {
    if (
      !page ||
      typeof page.name !== "string" ||
      !page.name.trim() ||
      typeof page.htmlContent !== "string" ||
      !page.htmlContent.trim()
    ) {
      const error = new Error(`Page ${index + 1} must include a name and HTML content.`);
      error.statusCode = 400;
      throw error;
    }

    const name = page.name.trim();
    if (seenNames.has(name)) {
      const error = new Error(`Duplicate page name: ${name}`);
      error.statusCode = 400;
      throw error;
    }
    seenNames.add(name);

    return { name, htmlContent: page.htmlContent };
  });
}

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
    const { title, description, category, thumbnailUrl, stats, issuesCount, pageCount } = req.body;
    let htmlContent = req.body.htmlContent;

    // A single uploaded file remains the home page; multipart pages contain the additional pages.
    if (req.file) {
      htmlContent = req.file.buffer.toString("utf-8");
    }

    if (typeof htmlContent !== "string" || !htmlContent.trim()) {
      return res.status(400).json({ message: "HTML content or file is required." });
    }

    const pages = parseImportedPages(req.body.pages);
    const pageNames = new Set(["index.html", ...pages.map((page) => page.name)]);
    if (pageNames.size !== pages.length + 1) {
      return res.status(400).json({ message: "The home page cannot also be listed as an additional page." });
    }

    const parsedPageCount = pageCount === undefined || pageCount === ""
      ? pages.length + 1
      : Number.parseInt(pageCount, 10);
    if (!Number.isInteger(parsedPageCount) || parsedPageCount !== pages.length + 1) {
      return res.status(400).json({ message: "Page count must match the imported pages." });
    }

    const parsedStats = stats ? JSON.parse(stats) : {};
    const parsedIssuesCount = issuesCount === undefined || issuesCount === ""
      ? 0
      : Number.parseInt(issuesCount, 10);

    if (!Number.isInteger(parsedIssuesCount) || parsedIssuesCount < 0) {
      return res.status(400).json({ message: "Issues count must be a non-negative integer." });
    }

    const template = new Template({
      title,
      description,
      category,
      thumbnailUrl,
      htmlContent,
      pages,
      pageCount: parsedPageCount,
      stats: parsedStats,
      issuesCount: parsedIssuesCount,
    });

    await template.save();
    res.status(201).json({ message: "Template imported successfully", template });
  } catch (error) {
    if (error.statusCode === 400 || error instanceof SyntaxError) {
      return res.status(400).json({ message: error.message || "Invalid template import data." });
    }
    console.error("Error importing template:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Update a template
router.put("/:id", async (req, res) => {
  try {
    const { title, description, category, thumbnailUrl, htmlContent, pages, isActive } = req.body;
    const normalizedPages = parseImportedPages(pages);
    const updateData = {
      title,
      description,
      category,
      thumbnailUrl,
      htmlContent,
      pages: normalizedPages,
      pageCount: normalizedPages.length + 1,
    };
    if (typeof isActive === "boolean") {
      updateData.isActive = isActive;
    }

    const template = await Template.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }
    res.json({ message: "Template updated successfully", template });
  } catch (error) {
    if (error.statusCode === 400 || error instanceof SyntaxError) {
      return res.status(400).json({ message: error.message || "Invalid template data." });
    }
    console.error("Error updating template:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Toggle Archive / Active status of a template
router.patch("/:id/toggle-status", async (req, res) => {
  try {
    const template = await Template.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }

    template.isActive = !template.isActive;
    await template.save();

    const statusText = template.isActive ? "activated (visible on onboarding)" : "archived (hidden from onboarding)";
    return res.json({
      message: `Template "${template.title}" is now ${statusText}.`,
      template,
    });
  } catch (error) {
    console.error("Error toggling template status:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Delete a template (blocked if assigned to any tenant websites)
router.delete("/:id", async (req, res) => {
  try {
    const template = await Template.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }

    const assignedWebsites = await Website.find({ templateId: template._id })
      .populate("owner", "name email business")
      .lean();

    if (assignedWebsites.length > 0) {
      const siteCount = assignedWebsites.length;
      const siteNames = assignedWebsites.slice(0, 3).map(w => w.name).join(", ");
      const extra = siteCount > 3 ? ` and ${siteCount - 3} other(s)` : "";

      return res.status(400).json({
        message: `Cannot delete template "${template.title}". It is currently assigned to ${siteCount} tenant website(s) (${siteNames}${extra}). Please reassign or delete those websites first.`
      });
    }

    await Template.deleteOne({ _id: template._id });
    return res.json({ message: `Template "${template.title}" deleted successfully.` });
  } catch (error) {
    console.error("Error deleting template:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
