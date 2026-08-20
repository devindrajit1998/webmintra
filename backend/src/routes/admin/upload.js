import { Router } from "express";
import multer from "multer";
import { imagekit } from "../../lib/imagekit.js";
import { requireAuthenticatedUser, requireRole } from "../../middleware/auth.js";

const router = Router();

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
  "image/gif",
  "image/x-icon",
  "application/pdf",
];
const MAX_UPLOAD_SIZE = 15 * 1024 * 1024; // 15MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only standard images and documents are allowed."), false);
    }
  },
});

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
      fileId: response.fileId,
    });
  } catch (error) {
    console.error("Error uploading to ImageKit:", error);
    res.status(500).json({ message: "Failed to upload image" });
  }
});

export default router;
