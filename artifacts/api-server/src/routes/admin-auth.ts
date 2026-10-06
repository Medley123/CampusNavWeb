import { Router } from "express";
import {
  clearAdminCookie,
  createAdminSession,
  getAdminAccount,
  getAdminSession,
  requireAdmin,
  setAdminCookie,
  updateAdminAccount,
  verifyAdminCredentials,
} from "../middlewares/admin-auth.js";
import { sendAdminNotification } from "../lib/admin-email.js";

const router = Router();

router.post("/admin/login", async (req, res) => {
  const username = typeof req.body?.username === "string" ? req.body.username.trim() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  const account = await verifyAdminCredentials(username, password);
  if (!account) {
    res.status(401).json({ error: "Invalid admin username or password." });
    return;
  }

  setAdminCookie(res, createAdminSession(account.email));
  await sendAdminNotification(
    "CampusNav Admin login",
    `A CampusNav Admin Panel login was detected for ${account.email}. If this was not you, change your password in Admin Settings.`,
    account.email,
  );
  res.json({ username: account.email, name: account.name, role: account.role, campusName: account.campusName });
});

router.get("/admin/me", async (req, res) => {
  const session = getAdminSession(req);
  if (!session) {
    res.status(401).json({ error: "Not authenticated." });
    return;
  }
  const account = await getAdminAccount(session.username);
  if (!account?.isActive) {
    clearAdminCookie(res);
    res.status(401).json({ error: "Admin account is unavailable." });
    return;
  }
  res.json({ username: account.email, name: account.name, role: account.role, campusName: account.campusName });
});

router.get("/admin/settings", requireAdmin, async (_req, res) => {
  const account = res.locals.adminAccount;
  res.json({ email: account.email, name: account.name });
});

router.put("/admin/settings", requireAdmin, async (req, res) => {
  const currentAccount = res.locals.adminAccount;
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : undefined;
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : undefined;
  const password = typeof req.body?.password === "string" ? req.body.password : undefined;
  if (email && !email.endsWith("@gmail.com")) {
    res.status(400).json({ error: "Admin email must be a Gmail address." });
    return;
  }
  if (password && password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters." });
    return;
  }
  try {
    const previousEmail = currentAccount.email;
    const account = await updateAdminAccount(currentAccount.email, { email, name, password });
    setAdminCookie(res, createAdminSession(account.email));
    const changedFields = [
      name ? "admin name" : "",
      email && email !== previousEmail ? "admin Gmail address" : "",
      password ? "admin password" : "",
    ].filter(Boolean).join(", ");
    const recipients = [...new Set([previousEmail, account.email].filter((value): value is string => Boolean(value)))];
    await Promise.all(recipients.map((recipient) => sendAdminNotification(
      "CampusNav Admin account security alert",
      `Your CampusNav Admin account was updated in CampusNav. Changed: ${changedFields || "account settings"}. CampusNav may use your registered Gmail address to identify the administrator and send security notifications. If you did not make this change, contact the CampusNav administrator immediately and change the password.`,
      recipient,
    )));
    res.json({ email: account.email, name: account.name });
  } catch {
    res.status(500).json({ error: "Could not update admin settings." });
  }
});

router.post("/admin/logout", (_req, res) => {
  clearAdminCookie(res);
  res.status(204).end();
});

export default router;