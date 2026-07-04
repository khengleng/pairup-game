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
