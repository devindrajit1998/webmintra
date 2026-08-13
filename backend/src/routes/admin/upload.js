import { Router } from "express";
import multer from "multer";
import { imagekit } from "../../lib/imagekit.js";
import { requireAuthenticatedUser, requireRole } from "../../middleware/auth.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(requireAuthenticatedUser, requireRole("admin"));

// Generic upload endpoint
router.post("/", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const response = await imagekit.upload({
      file: req.file.buffer.toString("base64"), // required
      fileName: req.file.originalname || `upload_${Date.now()}`, // required
      folder: "/webmintra",
    });

    res.status(200).json({ 
      message: "File uploaded successfully", 
      url: response.url,
      fileId: response.fileId
    });
  } catch (error) {
    console.error("Error uploading to ImageKit:", error);
    res.status(500).json({ message: "Failed to upload image" });
  }
});

export default router;
