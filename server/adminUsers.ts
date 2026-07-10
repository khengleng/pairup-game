/** Admin account management (RBAC). Passwords are scrypt-hashed. */

import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { getDb } from "./db";
import { adminUsers } from "../drizzle/schema";
import { hashPassword, verifyPassword } from "./adminAuth";
import {
  generateTotpSecret,
  otpauthUri,
  verifyTotp,
  encryptSecret,
  decryptSecret,
} from "./totp";
import type { AdminRole } from "@shared/rbac";

export async function getAdminUserById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(adminUsers).where(eq(adminUsers.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getAdminUserByUsername(username: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.username, username))
    .limit(1);
  return rows[0] ?? null;
}

export async function listAdminUsers() {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(adminUsers).orderBy(adminUsers.createdAt);
  return rows.map(r => ({
    id: r.id,
    username: r.username,
    role: r.role,
    active: r.active,
    createdAt: r.createdAt,
    lastLoginAt: r.lastLoginAt,
  }));
}

export async function createAdminUser(
  input: { username: string; password: string; role: AdminRole },
  createdBy: number
) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
  const username = input.username.trim().toLowerCase();
  if (username.length < 3) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Username must be at least 3 characters." });
  }
  if (input.password.length < 8) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Password must be at least 8 characters." });
  }
  const existing = await getAdminUserByUsername(username);
  if (existing) throw new TRPCError({ code: "CONFLICT", message: "That username is taken." });

  await db.insert(adminUsers).values({
    username,
    passwordHash: hashPassword(input.password),
    role: input.role,
    createdBy,
  });
  return { success: true };
}

export async function setAdminUserActive(id: number, active: boolean) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
  await db.update(adminUsers).set({ active }).where(eq(adminUsers.id, id));
  return { success: true };
}

export async function resetAdminPassword(id: number, password: string) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
  if (password.length < 8) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Password must be at least 8 characters." });
  }
  await db.update(adminUsers).set({ passwordHash: hashPassword(password) }).where(eq(adminUsers.id, id));
  return { success: true };
}

/** Verify a username+password login. Returns the account (incl. MFA state) or null.
 * Does NOT stamp lastLogin — that happens after any MFA step succeeds. */
export async function verifyAdminAccount(username: string, password: string) {
  const account = await getAdminUserByUsername(username.trim().toLowerCase());
  if (!account || !account.active) return null;
  if (!verifyPassword(password, account.passwordHash)) return null;
  return { id: account.id, role: account.role as AdminRole, mfaEnabled: account.mfaEnabled };
}

export async function stampLogin(id: number) {
  const db = await getDb();
  if (db) await db.update(adminUsers).set({ lastLoginAt: new Date() }).where(eq(adminUsers.id, id));
}

/** Verify a TOTP code for an account with MFA enabled. */
export async function verifyMfaCode(accountId: number, code: string): Promise<boolean> {
  const account = await getAdminUserById(accountId);
  if (!account || !account.mfaEnabled || !account.mfaSecret) return false;
  const secret = decryptSecret(account.mfaSecret);
  if (!secret) return false;
  return verifyTotp(secret, code);
}

/** Start enrollment: store an encrypted secret (not yet enabled), return it + URI. */
export async function setupMfa(accountId: number) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
  const account = await getAdminUserById(accountId);
  if (!account) throw new TRPCError({ code: "NOT_FOUND" });
  const secret = generateTotpSecret();
  await db
    .update(adminUsers)
    .set({ mfaSecret: encryptSecret(secret), mfaEnabled: false })
    .where(eq(adminUsers.id, accountId));
  return { secret, otpauthUri: `${otpauthUri(account.username)}&secret=${secret}` };
}

/** Confirm a code against the pending secret and turn MFA on. */
export async function enableMfa(accountId: number, code: string) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
  const account = await getAdminUserById(accountId);
  if (!account?.mfaSecret) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Start 2FA setup first." });
  }
  const secret = decryptSecret(account.mfaSecret);
  if (!secret || !verifyTotp(secret, code)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "That code didn't match. Try again." });
  }
  await db.update(adminUsers).set({ mfaEnabled: true }).where(eq(adminUsers.id, accountId));
  return { success: true };
}

export async function disableMfa(accountId: number) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
  await db.update(adminUsers).set({ mfaEnabled: false, mfaSecret: null }).where(eq(adminUsers.id, accountId));
  return { success: true };
}
