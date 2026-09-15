import { Router } from "express";
import { randomUUID } from "crypto";
import multer from "multer";
import path from "path";
import { storage } from "../lib/firebase.js";
import { requireAdmin } from "../middlewares/admin-auth.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    cb(null, allowed.includes(file.mimetype));
  },
});

const router = Router();

router.post("/uploads", requireAdmin, upload.single("image"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "No image file provided or invalid file type." });
    return;
  }

  try {
    const ext = path.extname(req.file.originalname).toLowerCase() || ".jpg";
    const filename = `buildings/${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    const downloadToken = randomUUID();

    const bucket = storage.bucket();
    const file = bucket.file(filename);

    await file.save(req.file.buffer, {
      metadata: {
        contentType: req.file.mimetype,
        metadata: { firebaseStorageDownloadTokens: downloadToken },
      },
    });

    const encodedPath = encodeURIComponent(filename);
    const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media&token=${downloadToken}`;

    res.json({ url });
  } catch (err: unknown) {
    req.log.error({ err }, "Failed to upload to Firebase Storage");
    const firebaseError = err as { code?: number | string };
    const isMissingBucket =
      firebaseError.code === 404 || firebaseError.code === "storage/bucket-not-found";

    res.status(isMissingBucket ? 503 : 500).json({
      error: isMissingBucket
        ? "Firebase Storage is not enabled or its bucket does not exist. Create a Storage bucket for this Firebase project, then restart the API server."
        : "Failed to upload image.",
    });
  }
});

export default router;
