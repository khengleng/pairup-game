import { useEffect, useRef } from "react";

// The Telegram WebApp SDK is loaded globally via a <script> tag at runtime and
// has no bundled TypeScript types, so we access it dynamically and type it as
// `any`. Every call below is guarded for existence and, where the SDK warns on
// old clients, by `isVersionAtLeast` so no console warnings fire on e.g. 6.0.

type TgWebApp = any;

function getTg(): TgWebApp | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as any).Telegram?.WebApp;
}

function atLeast(tg: TgWebApp | undefined, version: string): boolean {
  try {
    return !!tg && typeof tg.isVersionAtLeast === "function" && tg.isVersionAtLeast(version);
  } catch {
    return false;
  }
}

// True when running inside the Telegram Mini App.
export function isTelegram(): boolean {
  const tg = getTg();
  return !!tg && typeof tg === "object";
}

function px(value: unknown): string {
  const n = typeof value === "number" && isFinite(value) ? value : 0;
  return `${n}px`;
}

function applySafeArea(tg: TgWebApp): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (!root) return;

  const content = tg?.contentSafeAreaInset;
  const outer = tg?.safeAreaInset;

  const pick = (key: "top" | "right" | "bottom" | "left"): unknown => {
    if (content && content[key] != null) return content[key];
    if (outer && outer[key] != null) return outer[key];
    return 0;
  };

  try {
    root.style.setProperty("--tg-safe-top", px(pick("top")));
    root.style.setProperty("--tg-safe-right", px(pick("right")));
    root.style.setProperty("--tg-safe-bottom", px(pick("bottom")));
    root.style.setProperty("--tg-safe-left", px(pick("left")));
  } catch {
    // ignore
  }
}

// Call once at app startup (from main.tsx). Safe to call outside Telegram.
export function initTelegramApp(opts?: { headerColor?: string; backgroundColor?: string }): void {
  const tg = getTg();
  if (!tg) return;

  const headerColor = opts?.headerColor ?? "#ffffff";
  const backgroundColor = opts?.backgroundColor ?? "#ffffff";

  try {
    if (typeof tg.ready === "function") tg.ready();
  } catch {
    // ignore
  }

  try {
    if (typeof tg.expand === "function") tg.expand();
  } catch {
    // ignore
  }

  // Header + background color require 6.1+ (warn on older clients).
  if (atLeast(tg, "6.1")) {
    try {
      if (typeof tg.setHeaderColor === "function") tg.setHeaderColor(headerColor);
    } catch {
      // ignore
    }
    try {
      if (typeof tg.setBackgroundColor === "function") tg.setBackgroundColor(backgroundColor);
    } catch {
      // ignore
    }
  }

  // Vertical swipes control requires 7.7+ (warn on older clients).
  if (atLeast(tg, "7.7")) {
    try {
      if (typeof tg.disableVerticalSwipes === "function") tg.disableVerticalSwipes();
    } catch {
      // ignore
    }
  }

  // Safe-area insets require 8.0+.
  if (atLeast(tg, "8.0")) {
    try {
      if (typeof tg.requestSafeArea === "function") tg.requestSafeArea();
    } catch {
      // ignore
    }
    try {
      if (tg.safeAreaInset || tg.contentSafeAreaInset) applySafeArea(tg);
    } catch {
      // ignore
    }
    try {
      if (typeof tg.onEvent === "function") {
        tg.onEvent("safeAreaChanged", () => applySafeArea(tg));
        tg.onEvent("contentSafeAreaChanged", () => applySafeArea(tg));
      }
    } catch {
      // ignore
    }
  }
}

// React hook: shows Telegram's native BackButton while mounted and calls
// `onBack` when tapped; hides it on unmount. No-op outside Telegram.
export function useTelegramBackButton(onBack: () => void): void {
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;

  useEffect(() => {
    const tg = getTg();
    if (!tg || !tg.BackButton || !atLeast(tg, "6.1")) return;

    const handler = () => {
      try {
        onBackRef.current();
      } catch {
        // ignore
      }
    };

    try {
      if (typeof tg.BackButton.onClick === "function") tg.BackButton.onClick(handler);
      if (typeof tg.BackButton.show === "function") tg.BackButton.show();
    } catch {
      // ignore
    }

    return () => {
      try {
        if (typeof tg.BackButton.offClick === "function") tg.BackButton.offClick(handler);
        if (typeof tg.BackButton.hide === "function") tg.BackButton.hide();
      } catch {
        // ignore
      }
    };
  }, []);
}

// Haptic helpers — all version-guarded no-ops when unsupported.
export const haptic = {
  impact(style: "light" | "medium" | "heavy" | "rigid" | "soft" = "light"): void {
    const tg = getTg();
    if (!atLeast(tg, "6.1")) return;
    try {
      tg?.HapticFeedback?.impactOccurred?.(style);
    } catch {
      // ignore
    }
  },
  notify(type: "error" | "success" | "warning"): void {
    const tg = getTg();
    if (!atLeast(tg, "6.1")) return;
    try {
      tg?.HapticFeedback?.notificationOccurred?.(type);
    } catch {
      // ignore
    }
  },
  selection(): void {
    const tg = getTg();
    if (!atLeast(tg, "6.1")) return;
    try {
      tg?.HapticFeedback?.selectionChanged?.();
    } catch {
      // ignore
    }
  },
};
