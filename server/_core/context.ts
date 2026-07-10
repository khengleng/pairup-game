import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { parse as parseCookies } from "cookie";
import type { User } from "../../drizzle/schema";
import type { AdminRole } from "@shared/rbac";
import { sdk } from "./sdk";
import { ADMIN_COOKIE, getAdminSession, adminUser, BOOTSTRAP_ADMIN_ID } from "../adminAuth";
import { getAdminUserById } from "../adminUsers";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  /** Granular RBAC role when signed in as an admin. */
  adminRole: AdminRole | null;
  /** Admin account id (0 = ADMIN_PASSWORD bootstrap Super Admin). */
  adminUserId: number | null;
  /** Display name for the current admin actor. */
  adminName: string | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;
  let adminRole: AdminRole | null = null;
  let adminUserId: number | null = null;
  let adminName: string | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch {
    // Authentication is optional for public procedures.
    user = null;
  }

  // Standalone admin session (password bootstrap or per-account login).
  if (!user) {
    const cookies = parseCookies(opts.req.headers.cookie ?? "");
    const session = await getAdminSession(cookies[ADMIN_COOKIE]);
    if (session) {
      adminUserId = session.adminUserId;
      if (session.adminUserId === BOOTSTRAP_ADMIN_ID) {
        adminRole = session.role;
        adminName = "Super Admin";
      } else {
        // A deactivated account loses access mid-session.
        const account = await getAdminUserById(session.adminUserId);
        if (!account || !account.active) {
          return { req: opts.req, res: opts.res, user: null, adminRole: null, adminUserId: null, adminName: null };
        }
        adminRole = account.role as AdminRole;
        adminName = account.username;
      }
      user = adminUser(session.adminUserId, adminName ?? "Admin");
    }
  }

  return { req: opts.req, res: opts.res, user, adminRole, adminUserId, adminName };
}
