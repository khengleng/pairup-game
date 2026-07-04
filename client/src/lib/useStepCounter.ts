import { useCallback, useEffect, useRef, useState } from "react";
import { createStepDetector } from "@shared/stepDetector";

/**
 * Counts steps from the device accelerometer while active. Prefers Telegram's
 * Mini App sensor API (Bot API 8.0+), falls back to the standard DeviceMotion
 * event. Only works while the app is open/foreground.
 */

type Source = "telegram" | "devicemotion" | null;

function getTelegramAccelerometer(): any {
  const tg = (window as unknown as { Telegram?: { WebApp?: any } }).Telegram
    ?.WebApp;
  return tg?.Accelerometer && tg?.onEvent ? tg : null;
}

export function useStepCounter() {
  const [steps, setSteps] = useState(0);
  const [isCounting, setIsCounting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const detectorRef = useRef(createStepDetector());
  const sourceRef = useRef<Source>(null);
  const tgHandlerRef = useRef<(() => void) | null>(null);
  const dmHandlerRef = useRef<((e: DeviceMotionEvent) => void) | null>(null);

  const onMagnitude = useCallback((mag: number, t: number) => {
    setSteps(detectorRef.current.process(mag, t));
  }, []);

  const stop = useCallback(() => {
    const tg = getTelegramAccelerometer();
    if (sourceRef.current === "telegram" && tg) {
      if (tgHandlerRef.current) tg.offEvent?.("accelerometerChanged", tgHandlerRef.current);
      tg.Accelerometer?.stop?.();
    } else if (sourceRef.current === "devicemotion" && dmHandlerRef.current) {
      window.removeEventListener("devicemotion", dmHandlerRef.current);
    }
    tgHandlerRef.current = null;
    dmHandlerRef.current = null;
    sourceRef.current = null;
    setIsCounting(false);
  }, []);

  const start = useCallback(async () => {
    setError(null);
    detectorRef.current.reset();
    setSteps(0);

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
        setIsCounting(true);
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
            setError("Motion access was denied. Enable it to count steps.");
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
        setIsCounting(true);
        return;
      } catch {
        setError("Could not access motion sensors.");
        return;
      }
    }

    setError("Motion sensors aren't available on this device.");
  }, [onMagnitude]);

  // Clean up on unmount.
  useEffect(() => () => stop(), [stop]);

  return { steps, isCounting, error, start, stop };
}
