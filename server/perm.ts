import { TRPCError } from "@trpc/server";
import { hasPermission, type Permission, type AdminRole } from "@shared/rbac";

type Ctx = {
  adminRole: AdminRole | null;
  user: { role: string } | null;
};

/**
 * The effective RBAC role for the request. Standalone admin sessions carry a
 * granular role; a Manus/OAuth admin (role "admin", no granular role) is
 * treated as Super Admin so existing access is preserved.
 */
export function effectiveRole(ctx: Ctx): AdminRole | null {
  if (ctx.adminRole) return ctx.adminRole;
  if (ctx.user?.role === "admin") return "super_admin";
  return null;
}

export function can(ctx: Ctx, perm: Permission): boolean {
  const role = effectiveRole(ctx);
  return !!role && hasPermission(role, perm);
}

export function requirePermission(ctx: Ctx, perm: Permission): AdminRole {
  const role = effectiveRole(ctx);
  if (!role || !hasPermission(role, perm)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You don't have permission to do that.",
    });
  }
  return role;
}
