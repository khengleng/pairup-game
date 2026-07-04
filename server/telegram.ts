import type { Express, Request, Response } from "express";
import { createHash } from "crypto";

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
      inline_keyboard: [[{ text: "▶️ Play PairUp", web_app: { url } }]],
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
      text: "Play PairUp",
      web_app: { url: base },
    },
  });

  await callTelegram("setMyCommands", {
    commands: [{ command: "start", description: "Play PairUp" }],
  });

  console.log(`[Telegram] Bot ready — Mini App at ${base}`);
}
