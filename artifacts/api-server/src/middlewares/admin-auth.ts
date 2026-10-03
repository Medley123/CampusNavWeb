import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import type { NextFunction, Request, Response } from "express";
import { supabase } from "../lib/supabase.js";

const COOKIE_NAME = "campusnav_admin_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

type AdminSession = {
  username: string;
  expiresAt: number;
};

export type AdminAccount = {
  email: string;
  name: string;
  passwordHash: string;
  passwordSalt: string;
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

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const session = getAdminSession(req);
  if (!session) {
    res.status(401).json({ error: "Admin authentication required." });
    return;
  }
  next();
}

function hashPassword(password: string, salt: string) {
  return scryptSync(password, salt, 64).toString("hex");
}

function isValidPassword(password: string, account: AdminAccount) {
  const actual = Buffer.from(hashPassword(password, account.passwordSalt), "hex");
  const expected = Buffer.from(account.passwordHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function getAdminAccount() {
  const { data, error } = await supabase
    .from("admin_settings")
    .select("email, name, password_hash, password_salt")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw error;
  if (data) {
    return {
      email: data.email,
      name: data.name,
      passwordHash: data.password_hash,
      passwordSalt: data.password_salt,
    } as AdminAccount;
  }

  const email = process.env["ADMIN_USERNAME"] || "";
  const password = process.env["ADMIN_PASSWORD"] || "";
  if (!email || !password) return null;

  const account: AdminAccount = {
    email,
    name: process.env["ADMIN_NAME"] || "CampusNav Administrator",
    passwordSalt: randomBytes(16).toString("hex"),
    passwordHash: "",
  };
  account.passwordHash = hashPassword(password, account.passwordSalt);
  const { error: insertError } = await supabase.from("admin_settings").insert({
    id: 1,
    email: account.email,
    name: account.name,
    password_hash: account.passwordHash,
    password_salt: account.passwordSalt,
  });
  if (insertError) throw insertError;
  return account;
}

export async function verifyAdminCredentials(email: string, password: string) {
  const account = await getAdminAccount();
  if (!account || email.toLowerCase() !== account.email.toLowerCase() || !isValidPassword(password, account)) return null;
  return account;
}

export async function updateAdminAccount(input: { email?: string; name?: string; password?: string }) {
  const current = await getAdminAccount();
  if (!current) throw new Error("Admin account is not configured.");
  const update: Record<string, string> = {};
  if (input.email) update.email = input.email;
  if (input.name) update.name = input.name;
  if (input.password) {
    update.password_salt = randomBytes(16).toString("hex");
    update.password_hash = hashPassword(input.password, update.password_salt);
  }
  const { data, error } = await supabase
    .from("admin_settings")
    .update(update)
    .eq("id", 1)
    .select("email, name, password_hash, password_salt")
    .single();
  if (error) throw error;
  return {
    email: data.email,
    name: data.name,
    passwordHash: data.password_hash,
    passwordSalt: data.password_salt,
  } as AdminAccount;
}
