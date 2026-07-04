import { SignJWT, jwtVerify } from "jose";
import { timingSafeEqual } from "crypto";
import type { User } from "../drizzle/schema";

/**
 * Standalone, password-based admin login for deployments without Manus OAuth.
 *
 * Set ADMIN_PASSWORD (and the existing JWT_SECRET) in the environment. Signing
 * in mints a short-lived HS256 session cookie; the tRPC context turns a valid
 * cookie into a synthetic admin `User`, so the existing `role === "admin"`
 * checks keep working unchanged.
 */

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "";
const JWT_SECRET = process.env.JWT_SECRET ?? "";

export const ADMIN_COOKIE = "pairup_admin_session";
export const ADMIN_SESSION_MAX_AGE_MS = 12 * 60 * 60 * 1000; // 12 hours

export function isAdminPasswordConfigured(): boolean {
  return ADMIN_PASSWORD.length > 0 && JWT_SECRET.length > 0;
}

function secretKey(): Uint8Array {
  return new TextEncoder().encode(JWT_SECRET);
}

/** Constant-time password check. */
export function verifyAdminPassword(password: string): boolean {
  if (!ADMIN_PASSWORD) return false;
  const a = Buffer.from(password);
  const b = Buffer.from(ADMIN_PASSWORD);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function createAdminSessionToken(): Promise<string> {
  const expSeconds = Math.floor((Date.now() + ADMIN_SESSION_MAX_AGE_MS) / 1000);
  return new SignJWT({ admin: true })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime(expSeconds)
    .sign(secretKey());
}

/** Synthetic admin user backing a valid password session. */
function adminUser(): User {
  const now = new Date();
  return {
    id: -100,
    openId: "admin:password",
    name: "Admin",
    email: null,
    loginMethod: "password",
    role: "admin",
    dailyStreak: 0,
    bestStreak: 0,
    lastDailyDate: null,
    walkStreak: 0,
    bestWalkStreak: 0,
    lastWalkDate: null,
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
  };
}

/** Resolve a session token into an admin User, or null if invalid/expired. */
export async function getAdminUserFromToken(
  token: string | undefined | null
): Promise<User | null> {
  if (!token || !JWT_SECRET) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      algorithms: ["HS256"],
    });
    return payload.admin === true ? adminUser() : null;
  } catch {
    return null;
  }
}
