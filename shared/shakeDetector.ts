/**
 * Shake detection (pure, testable).
 *
 * Feed it acceleration-magnitude samples (sqrt(x²+y²+z²), including gravity, in
 * m/s²) with timestamps. It reports a "shake" once the device jerks past a
 * threshold enough times in quick succession, then goes quiet (cooldown) so one
 * physical shake fires exactly once.
 *
 * Reuses the same signal shape the step detector consumes, but tuned for the
 * bigger, faster spikes of an intentional shake rather than a walking stride.
 */

export type ShakeDetectorOptions = {
  /** Jerk above the smoothed baseline (m/s²) that counts as a shake spike. */
  threshold?: number;
  /** Distinct spikes required within `windowMs` before a shake fires. */
  requiredSpikes?: number;
  /** Time window (ms) the spikes must fall inside. */
  windowMs?: number;
  /** Quiet period (ms) after a shake before another can fire. */
  cooldownMs?: number;
  /** Baseline smoothing factor (0–1); higher = slower to adapt. */
  smoothing?: number;
};

export function createShakeDetector(options: ShakeDetectorOptions = {}) {
  const threshold = options.threshold ?? 12;
  const requiredSpikes = options.requiredSpikes ?? 3;
  const windowMs = options.windowMs ?? 700;
  const cooldownMs = options.cooldownMs ?? 1000;
  const smoothing = options.smoothing ?? 0.8;

  const GRAVITY = 9.81;
  let baseline = GRAVITY;
  let armed = true;
  let lastShakeTime = -Infinity;
  let spikeTimes: number[] = [];

  return {
    /**
     * Process one sample. Returns true exactly on the sample that completes a
     * shake, false otherwise.
     */
    process(magnitude: number, timeMs: number): boolean {
      if (!Number.isFinite(magnitude)) return false;
      baseline = smoothing * baseline + (1 - smoothing) * magnitude;
      const delta = Math.abs(magnitude - baseline);

      // Still cooling down from the previous shake.
      if (timeMs - lastShakeTime < cooldownMs) {
        armed = delta <= threshold * 0.5 ? true : armed;
        return false;
      }

      if (armed && delta > threshold) {
        armed = false;
        spikeTimes.push(timeMs);
        // Keep only spikes inside the rolling window.
        spikeTimes = spikeTimes.filter(t => timeMs - t <= windowMs);
        if (spikeTimes.length >= requiredSpikes) {
          lastShakeTime = timeMs;
          spikeTimes = [];
          return true;
        }
      } else if (delta <= threshold * 0.5) {
        // Signal settled — ready to register the next spike.
        armed = true;
      }
      return false;
    },
    reset() {
      baseline = GRAVITY;
      armed = true;
      lastShakeTime = -Infinity;
      spikeTimes = [];
    },
  };
}
