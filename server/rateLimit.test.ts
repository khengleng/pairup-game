import { describe, it, expect, beforeEach } from "vitest";
import { rateLimit, __resetRateLimits } from "./rateLimit";

describe("rateLimit", () => {
  beforeEach(() => __resetRateLimits());

  it("allows hits up to the limit within a window", () => {
    const t0 = 1_000_000;
    expect(rateLimit("k", 3, 1000, t0).allowed).toBe(true);
    expect(rateLimit("k", 3, 1000, t0).allowed).toBe(true);
    expect(rateLimit("k", 3, 1000, t0).allowed).toBe(true);
  });

  it("blocks once the limit is exceeded and reports retryAfter", () => {
    const t0 = 1_000_000;
    rateLimit("k", 2, 1000, t0);
    rateLimit("k", 2, 1000, t0);
    const blocked = rateLimit("k", 2, 1000, t0 + 200);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBe(800);
  });

  it("resets after the window elapses", () => {
    const t0 = 1_000_000;
    rateLimit("k", 1, 1000, t0);
    expect(rateLimit("k", 1, 1000, t0 + 500).allowed).toBe(false);
    expect(rateLimit("k", 1, 1000, t0 + 1001).allowed).toBe(true);
  });

  it("tracks keys independently", () => {
    const t0 = 1_000_000;
    rateLimit("a", 1, 1000, t0);
    expect(rateLimit("a", 1, 1000, t0).allowed).toBe(false);
    expect(rateLimit("b", 1, 1000, t0).allowed).toBe(true);
  });
});
