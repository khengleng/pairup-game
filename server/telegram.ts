import type { Express, Request, Response } from "express";
import { createHash } from "crypto";
import * as db from "./db";
import { getDailyDateKey } from "@shared/gameConfig";

/**
 * Telegram bot + Mini App integration.
 *
 * The bot launches the existing web game as a Telegram Mini App (Web App): a
 * `/start` message replies with a button that opens the deployed site inside
 * Telegram, and the chat menu button does the same. Updates arrive via webhook.
 *
 * Configure with env vars:
 *   TELEGRAM_BOT_TOKEN – bot token from @BotFather (required to enable the bot)
 *   PUBLIC_URL         – public https base URL of the app (optional; falls back
 *                        to RAILWAY_PUBLIC_DOMAIN, which Railway sets for you)
 */

const TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "";
const WEBHOOK_PATH = "/api/telegram/webhook";

/** Secret sent to Telegram and echoed back in a header so we can trust updates. */
const WEBHOOK_SECRET = TOKEN
  ? createHash("sha256").update(TOKEN).digest("hex")
  : "";

export function isTelegramConfigured(): boolean {
  return TOKEN.length > 0;
}

let cachedBotUsername: string | null = null;

/** The bot's @username (cached), used to build shareable deep links. */
export async function getBotUsername(): Promise<string | null> {
  if (!isTelegramConfigured()) return null;
  if (cachedBotUsername) return cachedBotUsername;
  const res = await callTelegram("getMe", {});
  if (res?.ok && res.result?.username) {
    cachedBotUsername = res.result.username as string;
    return cachedBotUsername;
  }
  return null;
}

/** A link recipients can tap to open the bot (falls back to the web URL). */
export async function getBotShareUrl(): Promise<string | null> {
  const username = await getBotUsername();
  if (username) return `https://t.me/${username}`;
  return getPublicBaseUrl() || null;
}

/** Public https base URL used for the Mini App and webhook. */
export function getPublicBaseUrl(): string {
  const explicit = process.env.PUBLIC_URL ?? process.env.APP_BASE_URL ?? "";
  if (explicit) return explicit.replace(/\/+$/, "");
  const railway = process.env.RAILWAY_PUBLIC_DOMAIN ?? "";
  if (railway) return `https://${railway.replace(/\/+$/, "")}`;
  return "";
}

async function callTelegram(method: string, body: unknown): Promise<any> {
  const response = await fetch(
    `https://api.telegram.org/bot${TOKEN}/${method}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.ok === false) {
    console.error(`[Telegram] ${method} failed:`, data);
  }
  return data;
}

function playButton(text: string) {
  const url = getPublicBaseUrl();
  return {
    text,
    reply_markup: {
      inline_keyboard: [[{ text: "▶️ Play Games", web_app: { url } }]],
    },
  };
}

async function sendPlayPrompt(chatId: number, greeting: string) {
  const btn = playButton(greeting);
  await callTelegram("sendMessage", {
    chat_id: chatId,
    text: greeting,
    reply_markup: btn.reply_markup,
  });
}

/** Handle a single Telegram update (webhook payload). */
export async function handleTelegramUpdate(update: any): Promise<void> {
  const message = update?.message;
  if (!message?.chat?.id) return;

  // Remember this chat so we can send daily nudges.
  await db.upsertTelegramChat(message.chat.id).catch(() => {});

  const text: string = message.text ?? "";
  if (text.startsWith("/start")) {
    await sendPlayPrompt(
      message.chat.id,
      "🎮 Welcome to PairUp — the memory match game. Tap Play to start!"
    );
  } else {
    await sendPlayPrompt(message.chat.id, "Tap Play to start a round of PairUp 🎮");
  }
}

/** Register the webhook route. No-op if the bot isn't configured. */
export function registerTelegramBot(app: Express): void {
  if (!isTelegramConfigured()) return;

  app.post(WEBHOOK_PATH, async (req: Request, res: Response) => {
    // Validate the update actually came from Telegram.
    if (req.header("X-Telegram-Bot-Api-Secret-Token") !== WEBHOOK_SECRET) {
      res.sendStatus(401);
      return;
    }
    // Ack immediately; process best-effort.
    res.sendStatus(200);
    try {
      await handleTelegramUpdate(req.body);
    } catch (error) {
      console.error("[Telegram] Failed to handle update:", error);
    }
  });
}

/**
 * Point Telegram at our webhook and set the Mini App menu button. Run once at
 * startup. No-op if the bot token or public URL is missing.
 */
export async function setupTelegramWebhook(): Promise<void> {
  if (!isTelegramConfigured()) return;

  const base = getPublicBaseUrl();
  if (!base) {
    console.warn(
      "[Telegram] Bot token set but no public URL (set PUBLIC_URL or deploy on Railway). Skipping webhook setup."
    );
    return;
  }

  await callTelegram("setWebhook", {
    url: `${base}${WEBHOOK_PATH}`,
    secret_token: WEBHOOK_SECRET,
    allowed_updates: ["message"],
  });

  await callTelegram("setChatMenuButton", {
    menu_button: {
      type: "web_app",
      text: "Play Games",
      web_app: { url: base },
    },
  });

  await callTelegram("setMyCommands", {
    commands: [{ command: "start", description: "Play Games" }],
  });

  console.log(`[Telegram] Bot ready — Mini App at ${base}`);
}

// ---------------------------------------------------------------------------
// Daily nudge — re-engage players once a day to keep streaks alive.
// ---------------------------------------------------------------------------

/** UTC hour to send the daily nudge (default 1 = ~08:00 ICT). */
export const DAILY_NUDGE_HOUR_UTC = Number(process.env.DAILY_NUDGE_HOUR_UTC ?? "1");
const NUDGE_CHECK_INTERVAL_MS = 15 * 60_000;
const LAST_NUDGE_KEY = "lastDailyNudge";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/** Pure decision: send once, when we're in the target UTC hour on a new day. */
export function shouldSendDailyNudge(
  nowUtcHour: number,
  targetHour: number,
  lastNudgeDate: string | null,
  todayKey: string
): boolean {
  return nowUtcHour === targetHour && lastNudgeDate !== todayKey;
}

/** Send today's nudge to every active chat; deactivate chats that blocked us. */
export async function broadcastDailyNudge(): Promise<{
  sent: number;
  deactivated: number;
}> {
  if (!isTelegramConfigured()) return { sent: 0, deactivated: 0 };

  const url = getPublicBaseUrl();
  const chatIds = await db.getActiveTelegramChatIds();
  const replyMarkup = {
    inline_keyboard: [[{ text: "▶️ Play Daily", web_app: { url } }]],
  };

  let sent = 0;
  let deactivated = 0;
  for (const chatId of chatIds) {
    const res = await callTelegram("sendMessage", {
      chat_id: chatId,
      text: "🔥 Today's PairUp daily challenge is live! Same board for everyone — top the leaderboard and keep your streak alive.",
      reply_markup: replyMarkup,
    });
    if (res?.ok) {
      sent++;
    } else if (res?.error_code === 403) {
      // Bot was blocked / chat unavailable — stop nudging them.
      await db.deactivateTelegramChat(chatId).catch(() => {});
      deactivated++;
    }
    await delay(50); // stay well under Telegram's rate limits
  }

  console.log(`[Telegram] Daily nudge: sent ${sent}, deactivated ${deactivated}`);
  return { sent, deactivated };
}

/** Start the in-app hourly-ish scheduler that fires the daily nudge. */
export function startDailyNudgeScheduler(): void {
  if (!isTelegramConfigured() || !getPublicBaseUrl()) return;

  const check = async () => {
    try {
      const now = new Date();
      const todayKey = getDailyDateKey(now);
      const last = await db.getAppState(LAST_NUDGE_KEY);
      if (
        shouldSendDailyNudge(
          now.getUTCHours(),
          DAILY_NUDGE_HOUR_UTC,
          last,
          todayKey
        )
      ) {
        // Mark first so a slow broadcast can't double-send on the next tick.
        await db.setAppState(LAST_NUDGE_KEY, todayKey);
        await broadcastDailyNudge();
      }
    } catch (error) {
      console.error("[Telegram] Nudge check failed:", error);
    }
  };

  setInterval(check, NUDGE_CHECK_INTERVAL_MS);
  console.log(
    `[Telegram] Daily nudge scheduler started (hour ${DAILY_NUDGE_HOUR_UTC} UTC)`
  );
}
