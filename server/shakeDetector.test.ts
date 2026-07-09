import { describe, it, expect } from "vitest";
import { createShakeDetector } from "@shared/shakeDetector";

/**
 * Simulate a vigorous shake: gravity plus alternating hard jerks at `hz`, for
 * `seconds`. Returns how many distinct shakes the detector reported.
 */
function shakeCount(
  hz: number,
  seconds: number,
  amplitude = 18,
  sampleHz = 60
): number {
  const detector = createShakeDetector();
  const dt = 1000 / sampleHz;
  const total = Math.floor(seconds * sampleHz);
  let shakes = 0;
  for (let i = 0; i < total; i++) {
    const t = i * dt;
    const mag = 9.81 + amplitude * Math.sin((2 * Math.PI * hz * t) / 1000);
    if (detector.process(mag, t)) shakes++;
  }
  return shakes;
}

describe("createShakeDetector", () => {
  it("does not fire while the device is still", () => {
    const detector = createShakeDetector();
    let fired = false;
    for (let i = 0; i < 300; i++) {
      // Gentle sensor noise around gravity.
      const mag = 9.81 + Math.sin(i) * 0.3;
      if (detector.process(mag, i * 16)) fired = true;
    }
    expect(fired).toBe(false);
  });

  it("does not fire for a gentle walking motion", () => {
    // Walking bounce ~2 Hz, small amplitude — well under the shake threshold.
    expect(shakeCount(2, 5, 3)).toBe(0);
  });

  it("fires on a vigorous shake", () => {
    expect(shakeCount(6, 2, 20)).toBeGreaterThanOrEqual(1);
  });

  it("fires once per shake, not continuously (cooldown)", () => {
    // Two seconds of hard shaking should yield a handful of shakes, not dozens.
    const count = shakeCount(6, 2, 22);
    expect(count).toBeGreaterThanOrEqual(1);
    expect(count).toBeLessThanOrEqual(3);
  });

  it("ignores NaN samples", () => {
    const detector = createShakeDetector();
    expect(detector.process(NaN, 0)).toBe(false);
  });

  it("reset clears accumulated spikes", () => {
    const detector = createShakeDetector();
    // Feed two spikes (not yet enough to fire with default requiredSpikes=3).
    detector.process(40, 0);
    detector.process(9.81, 50);
    detector.process(40, 100);
    detector.reset();
    // After reset, a lone spike must not immediately complete a shake.
    expect(detector.process(40, 150)).toBe(false);
  });
});
