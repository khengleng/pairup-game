import { useCallback, useEffect, useRef } from "react";
import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";

export type ScratchCardProps = {
  /** Content revealed underneath the scratch layer. */
  children: ReactNode;
  /** Reveal fraction 0..1 at which the card is considered "revealed". Default 0.5. */
  threshold?: number;
  /** Fired exactly once, when reveal fraction first crosses `threshold` OR when forceReveal is set. */
  onReveal?: () => void;
  /** When it flips to true, the overlay clears (animated) and onReveal fires if not already. For the "Reveal Result" accessibility fallback button the parent renders. */
  forceReveal?: boolean;
  /** Disable scratching (e.g., before the session/result is ready). Default false. */
  disabled?: boolean;
  /** Brush radius in px. Default 22. */
  brushRadius?: number;
  /** Overlay fill (solid color or usable as gradient base). Default a silver "#B9BEC6". */
  coverColor?: string;
  /** Small hint text drawn centered on the overlay, e.g. "Scratch to reveal". Optional. */
  coverLabel?: string;
  /** className for the outer wrapper. */
  className?: string;
};

type Point = { x: number; y: number };

/** Clamp a number into the 0..255 byte range. */
function clampByte(n: number): number {
  return n < 0 ? 0 : n > 255 ? 255 : Math.round(n);
}

/**
 * Parse a #rgb / #rrggbb hex string into [r,g,b]. Falls back to the default
 * silver if the string is not a recognizable hex color.
 */
function parseHex(hex: string): [number, number, number] {
  const fallback: [number, number, number] = [185, 190, 198];
  let h = hex.trim();
  if (h.charAt(0) !== "#") return fallback;
  h = h.slice(1);
  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (h.length !== 6) return fallback;
  const num = Number.parseInt(h, 16);
  if (Number.isNaN(num)) return fallback;
  return [(num >> 16) & 0xff, (num >> 8) & 0xff, num & 0xff];
}

/** Lighten (amount > 0) or darken (amount < 0) a hex color; returns an rgb() string. */
function shade(hex: string, amount: number): string {
  const [r, g, b] = parseHex(hex);
  const t = amount < 0 ? 0 : 255;
  const p = Math.abs(amount);
  const nr = clampByte(r + (t - r) * p);
  const ng = clampByte(g + (t - g) * p);
  const nb = clampByte(b + (t - b) * p);
  return `rgb(${nr}, ${ng}, ${nb})`;
}

export default function ScratchCard({
  children,
  threshold = 0.5,
  onReveal,
  forceReveal = false,
  disabled = false,
  brushRadius = 22,
  coverColor = "#B9BEC6",
  coverLabel,
  className,
}: ScratchCardProps): React.ReactElement {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Mutable drawing state kept in refs so it survives re-renders without
  // triggering them.
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const dprRef = useRef<number>(1);
  const cssSizeRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });
  const lastPointRef = useRef<Point | null>(null);
  const isDrawingRef = useRef<boolean>(false);
  const revealedRef = useRef<boolean>(false);
  const lastSampleRef = useRef<number>(0);
  const clearingRef = useRef<boolean>(false);
  const rafRef = useRef<number | null>(null);

  // Keep the latest callback / props in refs so the imperative pointer and
  // animation code always uses fresh values without re-binding listeners.
  const onRevealRef = useRef<typeof onReveal>(onReveal);
  const thresholdRef = useRef<number>(threshold);
  const brushRadiusRef = useRef<number>(brushRadius);
  const disabledRef = useRef<boolean>(disabled);

  useEffect(() => {
    onRevealRef.current = onReveal;
  }, [onReveal]);
  useEffect(() => {
    thresholdRef.current = threshold;
  }, [threshold]);
  useEffect(() => {
    brushRadiusRef.current = brushRadius;
  }, [brushRadius]);
  useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);

  const prefersReducedMotion = useCallback((): boolean => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  /** Fire onReveal exactly once across all reveal paths. */
  const fireRevealOnce = useCallback((): void => {
    if (revealedRef.current) return;
    revealedRef.current = true;
    const cb = onRevealRef.current;
    if (cb) cb();
  }, []);

  /** Paint the opaque cover (gradient + optional label) onto the canvas. */
  const paintCover = useCallback((): void => {
    const ctx = ctxRef.current;
    const { w, h } = cssSizeRef.current;
    if (!ctx || w <= 0 || h <= 0) return;

    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, w, h);

    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, shade(coverColor, 0.16));
    gradient.addColorStop(1, shade(coverColor, -0.14));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    if (coverLabel) {
      ctx.fillStyle = "rgba(70, 74, 82, 0.85)";
      ctx.font = "600 14px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(coverLabel, w / 2, h / 2);
    }
  }, [coverColor, coverLabel]);

  /**
   * Measure the transparent fraction of the overlay by sampling a coarse grid
   * (every 8th device pixel) rather than every pixel — cheap enough to run on
   * a throttle and on pointerup.
   */
  const measureRevealFraction = useCallback((): number => {
    const ctx = ctxRef.current;
    const { w, h } = cssSizeRef.current;
    if (!ctx || w <= 0 || h <= 0) return 0;

    const dpr = dprRef.current;
    const pw = Math.max(1, Math.floor(w * dpr));
    const ph = Math.max(1, Math.floor(h * dpr));
    let image: ImageData;
    try {
      image = ctx.getImageData(0, 0, pw, ph);
    } catch {
      // getImageData can throw if the canvas is tainted; treat as not revealed.
      return 0;
    }
    const data = image.data;
    const step = 8; // sample every 8th pixel in each axis
    const rowStride = pw * 4;
    let total = 0;
    let transparent = 0;
    for (let y = 0; y < ph; y += step) {
      const rowStart = y * rowStride;
      for (let x = 0; x < pw; x += step) {
        const alpha = data[rowStart + x * 4 + 3];
        total += 1;
        if (alpha < 128) transparent += 1;
      }
    }
    return total === 0 ? 0 : transparent / total;
  }, []);

  /** Animate-clear (fade out) the remaining overlay, then fire reveal. */
  const animateClear = useCallback((): void => {
    const ctx = ctxRef.current;
    if (!ctx) {
      fireRevealOnce();
      return;
    }
    if (clearingRef.current) return;
    clearingRef.current = true;

    const finish = (): void => {
      const c = ctxRef.current;
      const { w, h } = cssSizeRef.current;
      if (c) {
        c.globalCompositeOperation = "source-over";
        c.clearRect(0, 0, w, h);
      }
      clearingRef.current = false;
      fireRevealOnce();
    };

    if (prefersReducedMotion()) {
      finish();
      return;
    }

    const duration = 320;
    const start =
      typeof performance !== "undefined" ? performance.now() : Date.now();

    const tick = (now: number): void => {
      const c = ctxRef.current;
      const { w, h } = cssSizeRef.current;
      if (!c || w <= 0 || h <= 0) {
        finish();
        return;
      }
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      // Progressively erase the whole surface using a rising alpha so the
      // remaining cover fades out smoothly.
      c.globalCompositeOperation = "destination-out";
      c.fillStyle = `rgba(0, 0, 0, ${0.18 + t * 0.5})`;
      c.fillRect(0, 0, w, h);
      if (t >= 1) {
        rafRef.current = null;
        finish();
        return;
      }
      rafRef.current = window.requestAnimationFrame(tick);
    };

    rafRef.current = window.requestAnimationFrame(tick);
  }, [fireRevealOnce, prefersReducedMotion]);

  /** Convert a pointer event to canvas CSS coordinates. */
  const pointFromEvent = useCallback(
    (e: ReactPointerEvent<HTMLCanvasElement>): Point => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    },
    [],
  );

  /** Erase a circle at `p`, connecting to the previous point with a stroke. */
  const scratchAt = useCallback((p: Point): void => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const r = brushRadiusRef.current;
    ctx.globalCompositeOperation = "destination-out";

    const last = lastPointRef.current;
    if (last) {
      ctx.lineWidth = r * 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();

    lastPointRef.current = p;
  }, []);

  /** Check reveal progress and, if past threshold, reveal + clear. */
  const maybeReveal = useCallback((): void => {
    if (revealedRef.current || clearingRef.current) return;
    const fraction = measureRevealFraction();
    if (fraction >= thresholdRef.current) {
      // Reveal fires when the clear animation completes (or instantly with
      // reduced motion); guarded by revealedRef so it only happens once.
      animateClear();
    }
  }, [measureRevealFraction, animateClear]);

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLCanvasElement>): void => {
      if (disabledRef.current || revealedRef.current || clearingRef.current) {
        return;
      }
      const canvas = canvasRef.current;
      if (canvas) {
        try {
          canvas.setPointerCapture(e.pointerId);
        } catch {
          // Ignore browsers that reject capture for this pointer.
        }
      }
      isDrawingRef.current = true;
      lastPointRef.current = null;
      scratchAt(pointFromEvent(e));
    },
    [pointFromEvent, scratchAt],
  );

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLCanvasElement>): void => {
      if (!isDrawingRef.current || disabledRef.current) return;
      if (revealedRef.current || clearingRef.current) return;
      scratchAt(pointFromEvent(e));

      const now =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      if (now - lastSampleRef.current >= 250) {
        lastSampleRef.current = now;
        maybeReveal();
      }
    },
    [pointFromEvent, scratchAt, maybeReveal],
  );

  const endStroke = useCallback(
    (e: ReactPointerEvent<HTMLCanvasElement>): void => {
      if (!isDrawingRef.current) return;
      isDrawingRef.current = false;
      lastPointRef.current = null;
      const canvas = canvasRef.current;
      if (canvas) {
        try {
          canvas.releasePointerCapture(e.pointerId);
        } catch {
          // Pointer may already be released.
        }
      }
      if (disabledRef.current) return;
      maybeReveal();
    },
    [maybeReveal],
  );

  // Initialize / re-initialize the canvas whenever the wrapper size changes.
  // Defers real setup until the wrapper reports a non-zero size.
  useEffect(() => {
    const wrapper = wrapperRef.current;
    const canvas = canvasRef.current;
    if (!wrapper || !canvas) return;

    const initForSize = (cssW: number, cssH: number): void => {
      if (cssW <= 0 || cssH <= 0) return;
      const dpr =
        typeof window !== "undefined" && window.devicePixelRatio
          ? window.devicePixelRatio
          : 1;
      dprRef.current = dpr;
      cssSizeRef.current = { w: cssW, h: cssH };

      canvas.width = Math.max(1, Math.floor(cssW * dpr));
      canvas.height = Math.max(1, Math.floor(cssH * dpr));
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        ctxRef.current = null;
        return;
      }
      // Reset any prior transform, then scale so all drawing uses CSS pixels.
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      ctxRef.current = ctx;

      // If already revealed/forced, keep it clear; otherwise repaint cover.
      if (revealedRef.current) {
        ctx.globalCompositeOperation = "source-over";
        ctx.clearRect(0, 0, cssW, cssH);
      } else {
        clearingRef.current = false;
        paintCover();
      }
    };

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const box = entry.contentRect;
        initForSize(box.width, box.height);
      }
    });
    observer.observe(wrapper);

    // Attempt an immediate init in case layout is already settled.
    const rect = wrapper.getBoundingClientRect();
    initForSize(rect.width, rect.height);

    return () => {
      observer.disconnect();
    };
  }, [paintCover]);

  // Drive the forceReveal path.
  useEffect(() => {
    if (!forceReveal) return;
    if (revealedRef.current) {
      fireRevealOnce();
      return;
    }
    if (ctxRef.current) {
      animateClear();
    } else {
      // Canvas not ready yet — still honor the reveal contract.
      fireRevealOnce();
    }
  }, [forceReveal, animateClear, fireRevealOnce]);

  // Cancel any in-flight animation frame on unmount.
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);

  return (
    <div ref={wrapperRef} className={className} style={{ position: "relative" }}>
      {children}
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Scratch card — scratch to reveal, or use the Reveal button"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endStroke}
        onPointerCancel={endStroke}
        onPointerLeave={endStroke}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          touchAction: "none",
          cursor: disabled ? "default" : "grab",
          pointerEvents: disabled ? "none" : "auto",
        }}
      />
    </div>
  );
}
