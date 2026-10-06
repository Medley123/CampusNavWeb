import { randomBytes, scryptSync } from "crypto";
import { Router } from "express";
import { requireSuperAdmin } from "../middlewares/admin-auth.js";
import { supabase } from "../lib/supabase.js";

const router = Router();

function hashPassword(password: string, salt: string) {
  return scryptSync(password, salt, 64).toString("hex");
}

function validGmail(email: string) {
  return /^[^\s@]+@gmail\.com$/i.test(email);
}

router.get("/admin/accounts", requireSuperAdmin, async (_req, res) => {
  const { data, error } = await supabase
    .from("admin_accounts")
    .select("id, email, name, role, campus_name, is_active, created_at")
    .eq("role", "campus_admin")
    .order("campus_name");
  if (error) {
    res.status(500).json({ error: "Could not load campus admin accounts." });
    return;
  }
  res.json(data.map((account) => ({
    id: account.id,
    email: account.email,
    name: account.name,
    campusName: account.campus_name,
    isActive: account.is_active,
    createdAt: account.created_at,
  })));
});

router.post("/admin/accounts", requireSuperAdmin, async (req, res) => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  const campusName = typeof req.body?.campusName === "string" ? req.body.campusName.trim() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (!validGmail(email) || name.length < 2 || campusName.length < 2 || password.length < 8) {
    res.status(400).json({ error: "Provide a Gmail address, admin name, campus, and password of at least 8 characters." });
    return;
  }
  const passwordSalt = randomBytes(16).toString("hex");
  const { data, error } = await supabase.from("admin_accounts").insert({
    email,
    name,
    password_salt: passwordSalt,
    password_hash: hashPassword(password, passwordSalt),
    role: "campus_admin",
    campus_name: campusName,
    is_active: true,
  }).select("id, email, name, campus_name, is_active, created_at").single();
  if (error) {
    res.status(error.code === "23505" ? 409 : 500).json({ error: error.code === "23505" ? "An admin with that Gmail already exists." : "Could not create campus admin." });
    return;
  }
  res.status(201).json({ id: data.id, email: data.email, name: data.name, campusName: data.campus_name, isActive: data.is_active, createdAt: data.created_at });
});

router.put("/admin/accounts/:id", requireSuperAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "Invalid admin account ID." });
    return;
  }
  const updates: Record<string, unknown> = {};
  if (typeof req.body?.email === "string") {
    const email = req.body.email.trim().toLowerCase();
    if (!validGmail(email)) {
      res.status(400).json({ error: "Admin email must be a Gmail address." });
      return;
    }
    updates.email = email;
  }
  if (typeof req.body?.name === "string") {
    const name = req.body.name.trim();
    if (name.length < 2) {
      res.status(400).json({ error: "Admin name must be at least 2 characters." });
      return;
    }
    updates.name = name;
  }
  if (typeof req.body?.campusName === "string") {
    const campusName = req.body.campusName.trim();
    if (campusName.length < 2) {
      res.status(400).json({ error: "Campus name must be at least 2 characters." });
      return;
    }
    updates.campus_name = campusName;
  }
  if (typeof req.body?.isActive === "boolean") updates.is_active = req.body.isActive;
  if (typeof req.body?.password === "string" && req.body.password) {
    if (req.body.password.length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters." });
      return;
    }
    const salt = randomBytes(16).toString("hex");
    updates.password_salt = salt;
    updates.password_hash = hashPassword(req.body.password, salt);
  }
  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No valid account changes provided." });
    return;
  }
  const { data, error } = await supabase.from("admin_accounts")
    .update(updates)
    .eq("id", id)
    .eq("role", "campus_admin")
    .select("id, email, name, campus_name, is_active, created_at")
    .maybeSingle();
  if (error) {
    res.status(error.code === "23505" ? 409 : 500).json({ error: error.code === "23505" ? "An admin with that Gmail already exists." : "Could not update campus admin." });
    return;
  }
  if (!data) {
    res.status(404).json({ error: "Campus admin not found." });
    return;
  }
  res.json({ id: data.id, email: data.email, name: data.name, campusName: data.campus_name, isActive: data.is_active, createdAt: data.created_at });
});

router.delete("/admin/accounts/:id", requireSuperAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "Invalid admin account ID." });
    return;
  }
  const { data, error } = await supabase.from("admin_accounts")
    .delete()
    .eq("id", id)
    .eq("role", "campus_admin")
    .select("id")
    .maybeSingle();
  if (error) {
    res.status(500).json({ error: "Could not delete campus admin." });
    return;
  }
  if (!data) {
    res.status(404).json({ error: "Campus admin not found." });
    return;
  }
  res.status(204).end();
});

export default router;