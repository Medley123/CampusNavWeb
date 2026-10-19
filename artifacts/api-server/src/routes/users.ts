import { Router } from "express";
import { createHash, randomBytes, randomInt, scryptSync, timingSafeEqual } from "node:crypto";
import { supabase } from "../lib/supabase.js";
import { isAdminEmailConfigured, sendUserPasswordResetCode } from "../lib/admin-email.js";
import { requireAdmin, requireSuperAdmin } from "../middlewares/admin-auth.js";

const router = Router();
const COL = "users";
const RESET_CODE_TTL_MS = 10 * 60 * 1000;

function hashPassword(password: string, salt: string) {
  return scryptSync(password, salt, 64).toString("hex");
}

function hashResetCode(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

function validEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validPassword(password: string) {
  return password.length >= 8 && password.length <= 128;
}

function publicUser(user: { email: string; username: string; name: string; picture?: string | null }) {
  return { id: user.email, email: user.email, username: user.username, name: user.name, picture: user.picture ?? undefined };
}

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

router.post("/users/password/register", async (req, res) => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const username = typeof req.body?.username === "string" ? req.body.username.trim() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";

  if (!validEmail(email) || !/^[a-zA-Z0-9_]{3,30}$/.test(username) || !validPassword(password)) {
    res.status(400).json({ error: "Enter a valid email, a 3-30 character username, and a password of at least 8 characters." });
    return;
  }

  try {
    const { data: existingEmail, error: emailLookupError } = await supabase
      .from(COL)
      .select("email")
      .eq("email", email)
      .maybeSingle();
    if (emailLookupError) throw emailLookupError;
    if (existingEmail) {
      res.status(409).json({ error: "That email is already registered. Sign in or continue with Google." });
      return;
    }

    const salt = randomBytes(16).toString("hex");
    const { data, error } = await supabase
      .from(COL)
      .insert({ email, username, name: username, password_hash: hashPassword(password, salt), password_salt: salt })
      .select("email, username, name, picture")
      .single();
    if (error) {
      if (error.code === "23505") {
        res.status(409).json({ error: "That email or username is already registered." });
        return;
      }
      throw error;
    }
    res.status(201).json(publicUser(data));
  } catch (err) {
    req.log.error({ err }, "Failed to register user with email and password");
    res.status(500).json({ error: "Could not create your account." });
  }
});

router.post("/users/password/login", async (req, res) => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (!validEmail(email) || !password) {
    res.status(400).json({ error: "Enter your email and password." });
    return;
  }

  try {
    const { data: account, error } = await supabase
      .from(COL)
      .select("email, username, name, picture, password_hash, password_salt")
      .eq("email", email)
      .maybeSingle();
    if (error) throw error;
    if (!account?.password_hash || !account.password_salt) {
      res.status(401).json({ error: "Email or password is incorrect. You can also continue with Google." });
      return;
    }

    const expected = Buffer.from(account.password_hash, "hex");
    const actual = Buffer.from(hashPassword(password, account.password_salt), "hex");
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      res.status(401).json({ error: "Email or password is incorrect." });
      return;
    }

    const { error: updateError } = await supabase
      .from(COL)
      .update({ last_login_at: new Date().toISOString() })
      .eq("email", email);
    if (updateError) throw updateError;
    res.json(publicUser(account));
  } catch (err) {
    req.log.error({ err }, "Failed to sign in user with email and password");
    res.status(500).json({ error: "Could not sign in. Please try again." });
  }
});

router.post("/users/password/forgot", async (req, res) => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  if (!validEmail(email)) {
    res.status(400).json({ error: "Enter a valid email address." });
    return;
  }
  if (!isAdminEmailConfigured()) {
    res.status(503).json({ error: "Password reset email is unavailable. Please contact the campus administrator." });
    return;
  }

  try {
    const { data: account, error: lookupError } = await supabase
      .from(COL)
      .select("email")
      .eq("email", email)
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (account) {
      const code = String(randomInt(100000, 1000000));
      const codeHash = hashResetCode(code);
      const { error: updateError } = await supabase
        .from(COL)
        .update({
          password_reset_code_hash: codeHash,
          password_reset_expires_at: new Date(Date.now() + RESET_CODE_TTL_MS).toISOString(),
        })
        .eq("email", email);
      if (updateError) throw updateError;
      const sent = await sendUserPasswordResetCode(email, code);
      if (!sent) req.log.error({ email }, "Password reset code delivery failed");
    }
    res.json({ message: "If an account exists for that email, a reset code has been sent." });
  } catch (err) {
    req.log.error({ err }, "Failed to request user password reset");
    res.status(500).json({ error: "Could not request a reset code. Please try again." });
  }
});

router.post("/users/password/reset", async (req, res) => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const code = typeof req.body?.code === "string" ? req.body.code.trim() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (!validEmail(email) || !/^\d{6}$/.test(code) || !validPassword(password)) {
    res.status(400).json({ error: "Enter the valid 6-digit code and a password of at least 8 characters." });
    return;
  }

  try {
    const { data: account, error } = await supabase
      .from(COL)
      .select("email, password_reset_code_hash, password_reset_expires_at")
      .eq("email", email)
      .maybeSingle();
    if (error) throw error;
    const codeHash = hashResetCode(code);
    const expected = account?.password_reset_code_hash ? Buffer.from(account.password_reset_code_hash, "hex") : Buffer.alloc(0);
    const actual = Buffer.from(codeHash, "hex");
    if (
      !account?.password_reset_expires_at ||
      new Date(account.password_reset_expires_at).getTime() < Date.now() ||
      expected.length !== actual.length ||
      !timingSafeEqual(expected, actual)
    ) {
      res.status(400).json({ error: "That reset code is invalid or expired." });
      return;
    }

    const salt = randomBytes(16).toString("hex");
    const { error: updateError } = await supabase
      .from(COL)
      .update({
        password_hash: hashPassword(password, salt),
        password_salt: salt,
        password_reset_code_hash: null,
        password_reset_expires_at: null,
      })
      .eq("email", email)
      .eq("password_reset_code_hash", codeHash);
    if (updateError) throw updateError;
    res.json({ message: "Password updated. You can now sign in." });
  } catch (err) {
    req.log.error({ err }, "Failed to reset user password");
    res.status(500).json({ error: "Could not reset your password. Please try again." });
  }
});

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
    if (error?.code === "23505") {
      res.status(409).json({ error: "That username is already taken." });
      return;
    }
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

router.delete("/users/:email", requireSuperAdmin, async (req, res) => {
  const email = typeof req.params.email === "string" ? req.params.email.trim().toLowerCase() : "";
  if (!validEmail(email)) {
    res.status(400).json({ error: "Invalid user email." });
    return;
  }

  try {
    const { data, error } = await supabase
      .from("users")
      .delete()
      .eq("email", email)
      .select("email")
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      res.status(404).json({ error: "User not found." });
      return;
    }
    res.status(204).end();
  } catch (err) {
    req.log.error({ err }, "Failed to delete user");
    res.status(500).json({ error: "Failed to delete user." });
  }
});

export default router;
