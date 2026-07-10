import { useCallback, useEffect, useRef, useState } from "react";
import { createShakeDetector } from "@shared/shakeDetector";

/**
 * Fires `onShake` when the device is shaken. Prefers Telegram's Mini App sensor
 * API (Bot API 8.0+), falls back to the standard DeviceMotion event, and does
 * nothing gracefully where motion sensors aren't available (desktop) — callers
 * should always offer a tap-to-roll button too.
 *
 * Mirrors the plumbing of useStepCounter, but tuned for intentional shakes.
 */

type Source = "telegram" | "devicemotion" | null;

function getTelegramAccelerometer(): any {
  const tg = (window as unknown as { Telegram?: { WebApp?: any } }).Telegram
    ?.WebApp;
  return tg?.Accelerometer && tg?.onEvent ? tg : null;
}

/** True if this device can plausibly report motion (so we can prompt to shake). */
export function motionSupported(): boolean {
  return (
    getTelegramAccelerometer() != null ||
    typeof window.DeviceMotionEvent !== "undefined"
  );
}

/**
 * True when Telegram's accelerometer is available — motion that needs NO
 * permission gesture, so we can safely start listening on mount. Standard
 * DeviceMotion on iOS requires a user tap first, so we don't auto-start there.
 */
export function hasTelegramMotion(): boolean {
  return getTelegramAccelerometer() != null;
}

export function useShakeDetector(onShake: () => void) {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const detectorRef = useRef(createShakeDetector());
  const sourceRef = useRef<Source>(null);
  const tgHandlerRef = useRef<(() => void) | null>(null);
  const dmHandlerRef = useRef<((e: DeviceMotionEvent) => void) | null>(null);
  // Keep the latest callback without re-subscribing the sensor.
  const onShakeRef = useRef(onShake);
  useEffect(() => {
    onShakeRef.current = onShake;
  }, [onShake]);

  const onMagnitude = useCallback((mag: number, t: number) => {
    if (detectorRef.current.process(mag, t)) onShakeRef.current();
  }, []);

  const stop = useCallback(() => {
    const tg = getTelegramAccelerometer();
    if (sourceRef.current === "telegram" && tg) {
      if (tgHandlerRef.current)
        tg.offEvent?.("accelerometerChanged", tgHandlerRef.current);
      tg.Accelerometer?.stop?.();
    } else if (sourceRef.current === "devicemotion" && dmHandlerRef.current) {
      window.removeEventListener("devicemotion", dmHandlerRef.current);
    }
    tgHandlerRef.current = null;
    dmHandlerRef.current = null;
    sourceRef.current = null;
    setIsListening(false);
  }, []);

  const start = useCallback(async () => {
    setError(null);
    detectorRef.current.reset();

    // 1) Telegram Mini App accelerometer
    const tg = getTelegramAccelerometer();
    if (tg) {
      try {
        tg.Accelerometer.start({ refresh_rate: 60 });
        const handler = () => {
          const { x, y, z } = tg.Accelerometer;
          if (x == null) return;
          onMagnitude(Math.sqrt(x * x + y * y + z * z), performance.now());
        };
        tg.onEvent("accelerometerChanged", handler);
        tgHandlerRef.current = handler;
        sourceRef.current = "telegram";
        setIsListening(true);
        return;
      } catch {
        // fall through to DeviceMotion
      }
    }

    // 2) Standard DeviceMotion
    if (typeof window.DeviceMotionEvent !== "undefined") {
      try {
        const DME = window.DeviceMotionEvent as unknown as {
          requestPermission?: () => Promise<"granted" | "denied">;
        };
        if (typeof DME.requestPermission === "function") {
          const perm = await DME.requestPermission();
          if (perm !== "granted") {
            setError("Motion access was denied. Enable it to shake, or tap to roll.");
            return;
          }
        }
        const handler = (e: DeviceMotionEvent) => {
          const a = e.accelerationIncludingGravity;
          if (!a || a.x == null) return;
          onMagnitude(
            Math.sqrt(a.x * a.x + (a.y ?? 0) ** 2 + (a.z ?? 0) ** 2),
            e.timeStamp || performance.now()
          );
        };
        window.addEventListener("devicemotion", handler);
        dmHandlerRef.current = handler;
        sourceRef.current = "devicemotion";
        setIsListening(true);
        return;
      } catch {
        setError("Could not access motion sensors. Tap to roll instead.");
        return;
      }
    }

    setError("Motion sensors aren't available here — tap to roll.");
  }, [onMagnitude]);

  // Clean up on unmount.
  useEffect(() => () => stop(), [stop]);

  return { isListening, error, start, stop };
}
