import { Router } from "express";
import { requireSuperAdmin } from "../middlewares/admin-auth.js";
import { supabase } from "../lib/supabase.js";

const router = Router();

type AppUpdateRow = {
  id: number;
  title: string;
  body: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

type FeedbackRow = {
  id: number;
  user_email: string | null;
  username: string | null;
  user_name: string | null;
  message: string;
  status: "new" | "resolved";
  created_at: string;
};

function toAppUpdate(row: AppUpdateRow) {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    isPublished: row.is_published,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toFeedback(row: FeedbackRow) {
  return {
    id: row.id,
    userEmail: row.user_email,
    username: row.username,
    userName: row.user_name,
    message: row.message,
    status: row.status,
    createdAt: row.created_at,
  };
}

function parseId(value: string | string[] | undefined) {
  if (typeof value !== "string") return null;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

router.get("/app-updates", async (req, res) => {
  try {
    const { data, error } = await supabase.from("app_updates")
      .select("id, title, body, is_published, created_at, updated_at")
      .eq("is_published", true)
      .order("created_at", { ascending: false });
    if (error) throw error;
    res.json((data as AppUpdateRow[]).map(toAppUpdate));
  } catch (err) {
    req.log.error({ err }, "Failed to list published app updates");
    res.status(500).json({ error: "Could not load app updates." });
  }
});

router.get("/admin/app-updates", requireSuperAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase.from("app_updates")
      .select("id, title, body, is_published, created_at, updated_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    res.json((data as AppUpdateRow[]).map(toAppUpdate));
  } catch (err) {
    req.log.error({ err }, "Failed to list app updates for superadmin");
    res.status(500).json({ error: "Could not load app updates." });
  }
});

router.post("/admin/app-updates", requireSuperAdmin, async (req, res) => {
  const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";
  const body = typeof req.body?.body === "string" ? req.body.body.trim() : "";
  const isPublished = req.body?.isPublished === true;
  if (title.length < 1 || title.length > 120 || body.length < 1 || body.length > 5000) {
    res.status(400).json({ error: "Title must be 1-120 characters and update text 1-5000 characters." });
    return;
  }

  try {
    const { data, error } = await supabase.from("app_updates").insert({
      title,
      body,
      is_published: isPublished,
      updated_at: new Date().toISOString(),
    }).select("id, title, body, is_published, created_at, updated_at").single();
    if (error) throw error;
    res.status(201).json(toAppUpdate(data as AppUpdateRow));
  } catch (err) {
    req.log.error({ err }, "Failed to create app update");
    res.status(500).json({ error: "Could not create app update." });
  }
});

router.put("/admin/app-updates/:id", requireSuperAdmin, async (req, res) => {
  const id = parseId(req.params.id);
  const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";
  const body = typeof req.body?.body === "string" ? req.body.body.trim() : "";
  if (!id || title.length < 1 || title.length > 120 || body.length < 1 || body.length > 5000 || typeof req.body?.isPublished !== "boolean") {
    res.status(400).json({ error: "Provide a valid update ID, title, text, and publication state." });
    return;
  }

  try {
    const { data, error } = await supabase.from("app_updates").update({
      title,
      body,
      is_published: req.body.isPublished,
      updated_at: new Date().toISOString(),
    }).eq("id", id).select("id, title, body, is_published, created_at, updated_at").maybeSingle();
    if (error) throw error;
    if (!data) {
      res.status(404).json({ error: "App update not found." });
      return;
    }
    res.json(toAppUpdate(data as AppUpdateRow));
  } catch (err) {
    req.log.error({ err }, "Failed to update app update");
    res.status(500).json({ error: "Could not update app update." });
  }
});

router.delete("/admin/app-updates/:id", requireSuperAdmin, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Invalid app update ID." });
    return;
  }
  try {
    const { data, error } = await supabase.from("app_updates").delete().eq("id", id).select("id").maybeSingle();
    if (error) throw error;
    if (!data) {
      res.status(404).json({ error: "App update not found." });
      return;
    }
    res.status(204).end();
  } catch (err) {
    req.log.error({ err }, "Failed to delete app update");
    res.status(500).json({ error: "Could not delete app update." });
  }
});

router.post("/feedback", async (req, res) => {
  const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
  const userEmail = typeof req.body?.userEmail === "string" ? req.body.userEmail.trim().slice(0, 254) : null;
  const username = typeof req.body?.username === "string" ? req.body.username.trim().slice(0, 80) : null;
  const userName = typeof req.body?.userName === "string" ? req.body.userName.trim().slice(0, 120) : null;
  if (message.length < 5 || message.length > 4000) {
    res.status(400).json({ error: "Feedback must be between 5 and 4000 characters." });
    return;
  }

  try {
    const { data, error } = await supabase.from("app_feedback").insert({
      message,
      user_email: userEmail,
      username,
      user_name: userName,
    }).select("id, created_at").single();
    if (error) throw error;
    res.status(201).json({ id: data.id, createdAt: data.created_at });
  } catch (err) {
    req.log.error({ err }, "Failed to save app feedback");
    res.status(500).json({ error: "Could not send feedback." });
  }
});

router.get("/admin/feedback", requireSuperAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase.from("app_feedback")
      .select("id, user_email, username, user_name, message, status, created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    res.json((data as FeedbackRow[]).map(toFeedback));
  } catch (err) {
    req.log.error({ err }, "Failed to list app feedback");
    res.status(500).json({ error: "Could not load app feedback." });
  }
});

router.patch("/admin/feedback/:id", requireSuperAdmin, async (req, res) => {
  const id = parseId(req.params.id);
  const status = req.body?.status;
  if (!id || (status !== "new" && status !== "resolved")) {
    res.status(400).json({ error: "Provide a valid feedback ID and status." });
    return;
  }
  try {
    const { data, error } = await supabase.from("app_feedback").update({ status })
      .eq("id", id)
      .select("id, user_email, username, user_name, message, status, created_at")
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      res.status(404).json({ error: "Feedback not found." });
      return;
    }
    res.json(toFeedback(data as FeedbackRow));
  } catch (err) {
    req.log.error({ err }, "Failed to update feedback status");
    res.status(500).json({ error: "Could not update feedback status." });
  }
});

router.delete("/admin/feedback", requireSuperAdmin, async (req, res) => {
  const all = req.body?.all === true;
  const ids: number[] = Array.isArray(req.body?.ids)
    ? req.body.ids.map(Number).filter((id: number) => Number.isInteger(id) && id > 0)
    : [];
  if (!all && ids.length === 0) {
    res.status(400).json({ error: "Provide ids or all: true." });
    return;
  }

  try {
    let query = supabase.from("app_feedback").delete();
    query = all ? query.gt("id", 0) : query.in("id", ids);
    const { error } = await query;
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete app feedback");
    res.status(500).json({ error: "Could not delete feedback." });
  }
});

export default router;