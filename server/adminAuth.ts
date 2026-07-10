import { SignJWT, jwtVerify } from "jose";
import { timingSafeEqual, scryptSync, randomBytes } from "crypto";
import type { User } from "../drizzle/schema";
import type { AdminRole } from "@shared/rbac";

/**
 * Admin authentication + RBAC sessions.
 *
 * The shared ADMIN_PASSWORD logs you in as a Super Admin (a "bootstrap"
 * account, id 0). Super Admins then create individual admin accounts with
 * specific roles; those log in with username + password. A session cookie
 * (HS256 JWT) carries the admin's id + granular role.
 */

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "";
const JWT_SECRET = process.env.JWT_SECRET ?? "";

export const ADMIN_COOKIE = "pairup_admin_session";
export const ADMIN_SESSION_MAX_AGE_MS = 12 * 60 * 60 * 1000; // 12 hours

/** The synthetic id for the ADMIN_PASSWORD bootstrap Super Admin. */
export const BOOTSTRAP_ADMIN_ID = 0;

export function isAdminPasswordConfigured(): boolean {
  return ADMIN_PASSWORD.length > 0 && JWT_SECRET.length > 0;
}

function secretKey(): Uint8Array {
  return new TextEncoder().encode(JWT_SECRET);
}

/** Constant-time check of the shared bootstrap password. */
export function verifyAdminPassword(password: string): boolean {
  if (!ADMIN_PASSWORD) return false;
  const a = Buffer.from(password);
  const b = Buffer.from(ADMIN_PASSWORD);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// --- Per-account password hashing (scrypt) ---

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const computed = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return computed.length === expected.length && timingSafeEqual(computed, expected);
}

// --- Sessions ---

export type AdminSession = { adminUserId: number; role: AdminRole };

export async function createAdminSessionToken(session: AdminSession): Promise<string> {
  const expSeconds = Math.floor((Date.now() + ADMIN_SESSION_MAX_AGE_MS) / 1000);
  return new SignJWT({ admin: true, uid: session.adminUserId, role: session.role })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime(expSeconds)
    .sign(secretKey());
}

/** Resolve a token into an admin session, or null. Legacy tokens (no role) map
 * to the Super Admin bootstrap so existing sessions keep working. */
export async function getAdminSession(
  token: string | undefined | null
): Promise<AdminSession | null> {
  if (!token || !JWT_SECRET) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    if (payload.admin !== true) return null;
    const role = (payload.role as AdminRole) ?? "super_admin";
    const adminUserId =
      typeof payload.uid === "number" ? payload.uid : BOOTSTRAP_ADMIN_ID;
    return { adminUserId, role };
  } catch {
    return null;
  }
}

/** Synthetic coarse `User` (role "admin") backing an admin session, so the
 * existing user-shaped context keeps working. Granular role travels separately. */
export function adminUser(id: number, name: string): User {
  const now = new Date();
  return {
    id: id === BOOTSTRAP_ADMIN_ID ? -100 : -100 - id,
    openId: `admin:${id}`,
    name,
    email: null,
    loginMethod: "password",
    role: "admin",
    dailyStreak: 0,
    bestStreak: 0,
    lastDailyDate: null,
    walkStreak: 0,
    bestWalkStreak: 0,
    lastWalkDate: null,
    blocked: false,
    blockReason: null,
    points: 0,
    referredBy: null,
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
  };
}
