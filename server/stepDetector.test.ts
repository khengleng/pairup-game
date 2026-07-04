import { describe, it, expect } from "vitest";
import { createStepDetector } from "@shared/stepDetector";

/** Simulate walking: gravity + a sinusoidal stride bounce at `hz` steps/sec. */
function walkCount(
  hz: number,
  seconds: number,
  amplitude = 3,
  sampleHz = 50
): number {
  const detector = createStepDetector();
  const dt = 1000 / sampleHz;
  const total = Math.floor(seconds * sampleHz);
  for (let i = 0; i < total; i++) {
    const t = i * dt;
    const mag = 9.81 + amplitude * Math.sin((2 * Math.PI * hz * t) / 1000);
    detector.process(mag, t);
  }
  return detector.count;
}

describe("step detector", () => {
  it("counts roughly one step per stride oscillation", () => {
    // 2 steps/sec for 5s ≈ 10 steps (allow detector tolerance).
    const count = walkCount(2, 5);
    expect(count).toBeGreaterThanOrEqual(8);
    expect(count).toBeLessThanOrEqual(12);
  });

  it("counts nothing when stationary (flat gravity signal)", () => {
    const detector = createStepDetector();
    for (let i = 0; i < 250; i++) detector.process(9.81, i * 20);
    expect(detector.count).toBe(0);
  });

  it("does not count faster than the debounce allows", () => {
    // 20 steps/sec is impossibly fast; debounce (300ms) caps it well below.
    const count = walkCount(20, 2);
    expect(count).toBeLessThanOrEqual(Math.ceil(2000 / 300) + 1);
  });

  it("resets to zero", () => {
    const detector = createStepDetector();
    detector.process(9.81 + 5, 0);
    detector.reset();
    expect(detector.count).toBe(0);
  });

  it("ignores non-finite samples", () => {
    const detector = createStepDetector();
    detector.process(NaN, 0);
    detector.process(Infinity, 20);
    expect(detector.count).toBe(0);
  });
});
