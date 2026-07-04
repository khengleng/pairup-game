/**
 * Accelerometer step detection (pure, testable).
 *
 * Feed it acceleration-magnitude samples (sqrt(x²+y²+z²), including gravity, in
 * m/s²) with timestamps; it counts steps via peak detection over an adaptive
 * baseline, with hysteresis + a debounce so a single stride counts once.
 *
 * Real-device signals vary, so `threshold` may need tuning per platform.
 */

export type StepDetectorOptions = {
  /** Peak height above the smoothed baseline (m/s²) that counts as a step. */
  threshold?: number;
  /** Minimum time between steps (ms) — debounces double counts. */
  minIntervalMs?: number;
  /** Baseline smoothing factor (0–1); higher = slower to adapt. */
  smoothing?: number;
};

export function createStepDetector(options: StepDetectorOptions = {}) {
  const threshold = options.threshold ?? 1.2;
  const minIntervalMs = options.minIntervalMs ?? 300;
  const smoothing = options.smoothing ?? 0.9;

  const GRAVITY = 9.81;
  let baseline = GRAVITY;
  let lastStepTime = -Infinity;
  let armed = true;
  let steps = 0;

  return {
    /** Process one sample; returns the running step count. */
    process(magnitude: number, timeMs: number): number {
      if (!Number.isFinite(magnitude)) return steps;
      baseline = smoothing * baseline + (1 - smoothing) * magnitude;
      const delta = magnitude - baseline;

      if (armed && delta > threshold && timeMs - lastStepTime > minIntervalMs) {
        steps++;
        lastStepTime = timeMs;
        armed = false;
      } else if (delta < threshold * 0.5) {
        // Signal fell back — ready to detect the next peak.
        armed = true;
      }
      return steps;
    },
    get count() {
      return steps;
    },
    reset() {
      baseline = GRAVITY;
      lastStepTime = -Infinity;
      armed = true;
      steps = 0;
    },
  };
}
