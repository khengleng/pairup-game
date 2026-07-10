import { describe, it, expect, beforeAll } from "vitest";

// The module reads ADMIN_PASSWORD / JWT_SECRET at import time, so set them
// before importing it dynamically.
let mod: typeof import("./adminAuth");

beforeAll(async () => {
  // Node 18 under vitest loads jose's WebCrypto build but doesn't expose
  // globalThis.crypto; polyfill it so signing works (production uses the node build).
  if (!(globalThis as any).crypto?.subtle) {
    const { webcrypto } = await import("crypto");
    (globalThis as any).crypto = webcrypto;
  }
  process.env.ADMIN_PASSWORD = "sup3r-secret";
  process.env.JWT_SECRET = "unit-test-jwt-secret";
  mod = await import("./adminAuth");
});

describe("admin password auth", () => {
  it("reports configured when password + secret are present", () => {
    expect(mod.isAdminPasswordConfigured()).toBe(true);
  });

  it("accepts the correct password (constant-time)", () => {
    expect(mod.verifyAdminPassword("sup3r-secret")).toBe(true);
  });

  it("rejects a wrong password", () => {
    expect(mod.verifyAdminPassword("wrong")).toBe(false);
    expect(mod.verifyAdminPassword("sup3r-secre")).toBe(false); // shorter
    expect(mod.verifyAdminPassword("sup3r-secret!")).toBe(false); // longer
  });

  it("mints a session token that resolves back to a role-bearing session", async () => {
    const token = await mod.createAdminSessionToken({ adminUserId: 0, role: "super_admin" });
    const session = await mod.getAdminSession(token);
    expect(session).not.toBeNull();
    expect(session?.role).toBe("super_admin");
    expect(session?.adminUserId).toBe(0);
  });

  it("carries a specific account id + role", async () => {
    const token = await mod.createAdminSessionToken({ adminUserId: 7, role: "approver" });
    const session = await mod.getAdminSession(token);
    expect(session?.adminUserId).toBe(7);
    expect(session?.role).toBe("approver");
  });

  it("rejects missing or tampered tokens", async () => {
    expect(await mod.getAdminSession(undefined)).toBeNull();
    expect(await mod.getAdminSession("not-a-jwt")).toBeNull();
    const token = await mod.createAdminSessionToken({ adminUserId: 0, role: "super_admin" });
    expect(await mod.getAdminSession(token + "x")).toBeNull();
  });

  it("hashes + verifies account passwords", () => {
    const hash = mod.hashPassword("correct horse");
    expect(mod.verifyPassword("correct horse", hash)).toBe(true);
    expect(mod.verifyPassword("wrong", hash)).toBe(false);
  });
});
