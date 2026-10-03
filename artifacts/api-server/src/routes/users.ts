import { Router } from "express";
import { supabase } from "../lib/supabase.js";
import { requireAdmin } from "../middlewares/admin-auth.js";

const router = Router();
const COL = "users";

type GoogleProfile = {
  email: string;
  name?: string;
  picture?: string;
  verified_email?: boolean;
};

async function getVerifiedGoogleProfile(accessToken: unknown) {
  if (typeof accessToken !== "string" || !accessToken) return null;

  const response = await fetch("https://www.googleapis.com/userinfo/v2/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) return null;

  const profile = await response.json() as GoogleProfile;
  const email = typeof profile.email === "string" ? profile.email.trim().toLowerCase() : "";
  if (!email.endsWith("@gmail.com") || profile.verified_email !== true) return null;

  return { email, name: profile.name?.trim() || email.split("@")[0], picture: profile.picture };
}

router.post("/users/login", async (req, res) => {
  try {
    const profile = await getVerifiedGoogleProfile(req.body?.accessToken);
    if (!profile) {
      res.status(401).json({ error: "Google sign-in could not be verified. Please try again." });
      return;
    }

    const { data: existing, error: lookupError } = await supabase
      .from(COL)
      .select("email, username, name, picture")
      .eq("email", profile.email)
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (!existing) {
      res.status(404).json({ error: "This Gmail is not registered yet." });
      return;
    }

    const { data, error } = await supabase
      .from(COL)
      .update({
        name: profile.name || existing.name,
        picture: profile.picture ?? existing.picture,
        last_login_at: new Date().toISOString(),
      })
      .eq("email", profile.email)
      .select("email, username, name, picture")
      .single();
    if (error) throw error;

    res.json({ id: data.email, ...data });
  } catch (err) {
    req.log.error({ err }, "Failed to sign in user");
    res.status(500).json({ error: "Could not sign in with this Gmail." });
  }
});

router.post("/users", async (req, res) => {
  const username = typeof req.body?.username === "string" ? req.body.username.trim() : "";

  if (!username || !/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
    res.status(400).json({ error: "A valid username is required." });
    return;
  }

  try {
    const profile = await getVerifiedGoogleProfile(req.body?.accessToken);
    if (!profile) {
      res.status(401).json({ error: "Google sign-in could not be verified. Please try again." });
      return;
    }

    const { data, error } = await supabase
      .from("users")
      .upsert({
        email: profile.email,
        username,
        name: profile.name || username,
        picture: profile.picture ?? null,
        last_login_at: new Date().toISOString(),
      }, { onConflict: "email" })
      .select("email, username, name, picture")
      .single();
    if (error) throw error;
    res.status(201).json({ id: data.email, ...data });
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
