import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { parse as parseCookies } from "cookie";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { ADMIN_COOKIE, getAdminUserFromToken } from "../adminAuth";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  // Fall back to the standalone password-based admin session (for deployments
  // without Manus OAuth) when there's no Manus user.
  if (!user) {
    const cookies = parseCookies(opts.req.headers.cookie ?? "");
    user = await getAdminUserFromToken(cookies[ADMIN_COOKIE]);
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
