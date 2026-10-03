import { Router } from "express";
import { supabase } from "../lib/supabase.js";
import { requireAdmin } from "../middlewares/admin-auth.js";

const router = Router();
const COL = "users";

router.post("/users", async (req, res) => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const username = typeof req.body?.username === "string" ? req.body.username.trim() : "";
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  const picture = typeof req.body?.picture === "string" ? req.body.picture : undefined;

  if (!email.endsWith("@gmail.com") || !username || !/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
    res.status(400).json({ error: "A valid Gmail address and username are required." });
    return;
  }

  try {
    const { data, error } = await supabase
      .from("users")
      .upsert({
        email,
        username,
        name: name || username,
        picture: picture ?? null,
        last_login_at: new Date().toISOString(),
      }, { onConflict: "email" })
      .select("email, username, name, picture")
      .single();
    if (error) throw error;
    res.status(200).json({ id: data.email, ...data });
  } catch (err) {
    req.log.error({ err }, "Failed to save user");
    res.status(500).json({ error: "Failed to save user profile." });
  }
});

router.get("/users", requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("email, username, name, picture, last_login_at")
      .order("last_login_at", { ascending: false });
    if (error) throw error;
    res.json(data.map((user) => ({
      id: user.email,
      email: user.email,
      username: user.username,
      name: user.name,
      picture: user.picture ?? undefined,
      lastLoginAt: user.last_login_at,
    })));
  } catch (err) {
    req.log.error({ err }, "Failed to list users");
    res.status(500).json({ error: "Failed to fetch users." });
  }
});

export default router;
