/**
 * Telegram Mini App bootstrap.
 *
 * The Telegram WebApp SDK is loaded from index.html and exposes
 * `window.Telegram.WebApp` only when the page is opened inside Telegram.
 * Everywhere else these helpers are safe no-ops.
 */

type TelegramWebApp = {
  ready: () => void;
  expand: () => void;
  disableVerticalSwipes?: () => void;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  colorScheme?: "light" | "dark";
  initData?: string;
  initDataUnsafe?: { user?: { id: number; first_name?: string; username?: string } };
};

function getWebApp(): TelegramWebApp | undefined {
  return (window as unknown as { Telegram?: { WebApp?: TelegramWebApp } })
    .Telegram?.WebApp;
}

/** True when running inside the Telegram in-app browser. */
export function isTelegramMiniApp(): boolean {
  return !!getWebApp();
}

/**
 * The signed initData string to send to the server so it can verify the
 * Telegram identity. Undefined outside Telegram (or if empty).
 */
export function getTelegramInitData(): string | undefined {
  const data = getWebApp()?.initData;
  return data && data.length > 0 ? data : undefined;
}

/** Signal readiness and make the game fill the Telegram viewport. */
export function initTelegramWebApp(): void {
  const webApp = getWebApp();
  if (!webApp) return;

  try {
    webApp.ready();
    webApp.expand();
    webApp.disableVerticalSwipes?.();
    // Match the game's light surface so the Telegram chrome blends in.
    webApp.setHeaderColor?.("#ffffff");
    webApp.setBackgroundColor?.("#ffffff");
    document.documentElement.classList.add("telegram-mini-app");
  } catch (error) {
    console.warn("[Telegram] WebApp init failed:", error);
  }
}
