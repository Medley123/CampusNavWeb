import { Router, type Request, type Response } from "express";
import { randomUUID } from "crypto";
import multer from "multer";
import { requireAdmin, requireSuperAdmin } from "../middlewares/admin-auth.js";
import { storageBucket, supabase } from "../lib/supabase.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    cb(null, allowed.includes(file.mimetype));
  },
});

const router = Router();

function uploadHandler(folder: string) {
  return async (req: Request, res: Response) => {
    if (!req.file) {
      res.status(400).json({ error: "No image file provided or invalid file type." });
      return;
    }

    try {
      const filePath = `${folder}/${randomUUID()}`;
      const { error: uploadError } = await supabase.storage
        .from(storageBucket)
        .upload(filePath, new Uint8Array(req.file.buffer).buffer, {
          contentType: req.file.mimetype,
          upsert: false,
        });
      if (uploadError) {
        req.log.error({ err: uploadError }, "Supabase Storage upload failed");
        res.status(502).json({ error: "Supabase Storage could not upload the image." });
        return;
      }
      const { data } = supabase.storage.from(storageBucket).getPublicUrl(filePath);
      res.json({ url: data.publicUrl });
    } catch (err: unknown) {
      req.log.error({ err }, "Failed to upload image to Supabase Storage");
      res.status(500).json({ error: "Failed to upload image." });
    }
  };
}

router.post("/uploads", requireAdmin, upload.single("image"), uploadHandler("buildings"));
router.post("/uploads/floor-plans", requireSuperAdmin, upload.single("image"), uploadHandler("floor-plans"));

export default router;
