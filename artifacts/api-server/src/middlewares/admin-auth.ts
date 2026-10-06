import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import type { NextFunction, Request, Response } from "express";
import { supabase } from "../lib/supabase.js";

const COOKIE_NAME = "campusnav_admin_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

type AdminSession = {
  username: string;
  expiresAt: number;
};

export type AdminRole = "super_admin" | "campus_admin";

export type AdminAccount = {
  id: number;
  email: string;
  name: string;
  passwordHash: string;
  passwordSalt: string;
  role: AdminRole;
  campusName: string | null;
  isActive: boolean;
};

function getSecret() {
  const secret = process.env["ADMIN_SESSION_SECRET"];
  if (!secret) throw new Error("ADMIN_SESSION_SECRET must be configured.");
  return secret;
}

function sign(payload: string) {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

function encodeSession(session: AdminSession) {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function decodeSession(value: string | undefined): AdminSession | null {
  if (!value) return null;
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;

  const expected = sign(payload);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) return null;

  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString()) as AdminSession;
    return session.expiresAt > Date.now() ? session : null;
  } catch {
    return null;
  }
}

function parseCookies(header: string | undefined) {
  return Object.fromEntries(
    (header ?? "").split(";").map((part) => {
      const [key, ...value] = part.trim().split("=");
      return [key, value.join("=")];
    }).filter(([key]) => key),
  );
}

export function createAdminSession(username: string) {
  return encodeSession({ username, expiresAt: Date.now() + SESSION_MAX_AGE_SECONDS * 1000 });
}

export function setAdminCookie(res: Response, token: string) {
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=${token}; Max-Age=${SESSION_MAX_AGE_SECONDS}; Path=/; HttpOnly; SameSite=Lax${process.env["NODE_ENV"] === "production" ? "; Secure" : ""}`,
  );
}

export function clearAdminCookie(res: Response) {
  res.setHeader("Set-Cookie", `${COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax`);
}

export function getAdminSession(req: Request) {
  return decodeSession(parseCookies(req.headers.cookie)[COOKIE_NAME]);
}

async function getSessionAccount(req: Request) {
  const session = getAdminSession(req);
  if (!session) return null;
  const account = await getAdminAccount(session.username);
  return account?.isActive ? account : null;
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const account = await getSessionAccount(req);
    if (!account) {
      res.status(401).json({ error: "Admin authentication required." });
      return;
    }
    res.locals.adminAccount = account;
    next();
  } catch (error) {
    next(error);
  }
}

export async function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const account = await getSessionAccount(req);
    if (!account) {
      res.status(401).json({ error: "Admin authentication required." });
      return;
    }
    if (account.role !== "super_admin") {
      res.status(403).json({ error: "Super admin access required." });
      return;
    }
    res.locals.adminAccount = account;
    next();
  } catch (error) {
    next(error);
  }
}

function hashPassword(password: string, salt: string) {
  return scryptSync(password, salt, 64).toString("hex");
}

function isValidPassword(password: string, account: AdminAccount) {
  const actual = Buffer.from(hashPassword(password, account.passwordSalt), "hex");
  const expected = Buffer.from(account.passwordHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function getAdminAccount(email: string) {
  const { data, error } = await supabase
    .from("admin_accounts")
    .select("id, email, name, password_hash, password_salt, role, campus_name, is_active")
    .eq("email", email.toLowerCase())
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    email: data.email,
    name: data.name,
    passwordHash: data.password_hash,
    passwordSalt: data.password_salt,
    role: data.role as AdminRole,
    campusName: data.campus_name,
    isActive: data.is_active,
  } as AdminAccount;
}

async function ensureSuperAdminAccount() {
  const email = process.env["SUPER_ADMIN_USERNAME"]?.trim().toLowerCase() || "";
  const password = process.env["SUPER_ADMIN_PASSWORD"] || "";
  if (!email && !password) return null;
  if (!email || !password) throw new Error("SUPER_ADMIN_USERNAME and SUPER_ADMIN_PASSWORD must both be configured.");

  const existing = await getAdminAccount(email);
  if (existing) {
    if (existing.role !== "super_admin") {
      throw new Error("SUPER_ADMIN_USERNAME is already assigned to a campus admin account.");
    }
    return existing;
  }

  const account: AdminAccount = {
    id: 0,
    email,
    name: process.env["SUPER_ADMIN_NAME"] || "CampusNav Super Admin",
    passwordSalt: randomBytes(16).toString("hex"),
    passwordHash: "",
    role: "super_admin",
    campusName: null,
    isActive: true,
  };
  account.passwordHash = hashPassword(password, account.passwordSalt);
  const { error: insertError } = await supabase.from("admin_accounts").insert({
    email: account.email,
    name: account.name,
    password_hash: account.passwordHash,
    password_salt: account.passwordSalt,
    role: account.role,
    campus_name: account.campusName,
  });
  if (insertError) throw insertError;
  return account;
}

async function ensureLegacyCampusAdmin() {
  const email = process.env["ADMIN_USERNAME"]?.trim().toLowerCase() || "";
  const password = process.env["ADMIN_PASSWORD"] || "";
  if (!email || !password || await getAdminAccount(email)) return;
  const { count, error: countError } = await supabase
    .from("admin_accounts")
    .select("id", { count: "exact", head: true });
  if (countError) throw countError;
  if ((count ?? 0) > 0) return;
  const salt = randomBytes(16).toString("hex");
  const { error } = await supabase.from("admin_accounts").insert({
    email,
    name: process.env["ADMIN_NAME"] || "CTU Danao Campus Admin",
    password_salt: salt,
    password_hash: hashPassword(password, salt),
    role: "campus_admin",
    campus_name: "CTU Danao Campus",
    is_active: true,
  });
  if (error && error.code !== "23505") throw error;
}

export async function verifyAdminCredentials(email: string, password: string) {
  await ensureLegacyCampusAdmin();
  await ensureSuperAdminAccount();
  const account = await getAdminAccount(email.trim().toLowerCase());
  if (!account || !account.isActive || !isValidPassword(password, account)) return null;
  return account;
}

export async function updateAdminAccount(currentEmail: string, input: { email?: string; name?: string; password?: string }) {
  const current = await getAdminAccount(currentEmail);
  if (!current) throw new Error("Admin account was not found.");
  const update: Record<string, string> = {};
  if (input.email) update.email = input.email.toLowerCase();
  if (input.name) update.name = input.name;
  if (input.password) {
    update.password_salt = randomBytes(16).toString("hex");
    update.password_hash = hashPassword(input.password, update.password_salt);
  }
  const { data, error } = await supabase
    .from("admin_accounts")
    .update(update)
    .eq("id", current.id)
    .select("id, email, name, password_hash, password_salt, role, campus_name, is_active")
    .single();
  if (error) throw error;
  return {
    id: data.id,
    email: data.email,
    name: data.name,
    passwordHash: data.password_hash,
    passwordSalt: data.password_salt,
    role: data.role as AdminRole,
    campusName: data.campus_name,
    isActive: data.is_active,
  } as AdminAccount;
}
