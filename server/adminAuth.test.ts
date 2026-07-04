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

  it("mints a session token that resolves back to an admin user", async () => {
    const token = await mod.createAdminSessionToken();
    const user = await mod.getAdminUserFromToken(token);
    expect(user).not.toBeNull();
    expect(user?.role).toBe("admin");
    expect(user?.openId).toBe("admin:password");
  });

  it("rejects missing or tampered tokens", async () => {
    expect(await mod.getAdminUserFromToken(undefined)).toBeNull();
    expect(await mod.getAdminUserFromToken("not-a-jwt")).toBeNull();
    const token = await mod.createAdminSessionToken();
    expect(await mod.getAdminUserFromToken(token + "x")).toBeNull();
  });
});
