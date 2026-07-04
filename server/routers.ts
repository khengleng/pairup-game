import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { notifyOwner } from "./_core/notification";
import { TRPCError } from "@trpc/server";
import type { Game, User } from "../drizzle/schema";
import {
  GAME_THEMES,
  isGridSizeValue,
  type CardPair,
  type GridSizeValue,
} from "@shared/gameConfig";
import { validateAndNormalizeCompletion } from "./gameLogic";
import { rateLimit } from "./rateLimit";
import { isEmailConfigured, sendEmail } from "./email";
import {
  validateInitData,
  telegramDisplayName,
  telegramOpenId,
} from "./telegramAuth";
import {
  codeMatches,
  expiryFromNow,
  generateCode,
  hashCode,
  isExpired,
  MAX_VERIFICATION_ATTEMPTS,
  verificationEmail,
} from "./leadVerification";

/** Best-effort client IP for rate limiting (respects a single proxy hop). */
function getClientIp(req: { headers: Record<string, unknown>; socket?: { remoteAddress?: string } }): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }
  return req.socket?.remoteAddress ?? "unknown";
}

const themeSchema = z.string().trim().min(1).max(255);
const gridSizeSchema = z.custom<GridSizeValue>(
  value => typeof value === "string" && isGridSizeValue(value),
  {
    message: "Invalid grid size",
  }
);
const cardPairSchema = z.object({
  term: z.string().trim().min(1).max(255),
  definition: z.string().trim().min(1),
});
const createThemeSchema = z.object({
  name: z.string().trim().min(1).max(255),
  description: z.string().trim().min(1),
  pairs: z
    .array(cardPairSchema)
    .min(32, "Add at least 32 pairs for the 8x8 game"),
});

const guestGames = new Map<number, Game>();
let nextGuestGameId = -1;

/** Evict stale guest games so the in-memory map cannot grow unbounded. */
const GUEST_GAME_TTL_MS = 2 * 60 * 60 * 1000;
function pruneGuestGames() {
  const cutoff = Date.now() - GUEST_GAME_TTL_MS;
  guestGames.forEach((game, id) => {
    if (game.createdAt.getTime() < cutoff) guestGames.delete(id);
  });
}

type AvailableGameTheme = {
  id: string;
  databaseId?: number;
  name: string;
  description: string;
  enabled: boolean;
  sortOrder?: number;
  source: "static" | "database";
  pairs: CardPair[];
};

function createGuestGame(gameData: Omit<Game, "id" | "createdAt">): Game {
  pruneGuestGames();
  const game: Game = {
    ...gameData,
    id: nextGuestGameId--,
    createdAt: new Date(),
  };
  guestGames.set(game.id, game);
  return game;
}

function updateGuestGameScore(
  gameId: number,
  moves: number,
  timeSeconds: number
) {
  const game = guestGames.get(gameId);
  if (!game) return null;

  const updated = {
    ...game,
    moves,
    timeSeconds,
    completed: true,
  };
  guestGames.set(gameId, updated);
  return updated;
}

async function getAvailableGameThemes(includeDisabled = false) {
  const staticThemes: AvailableGameTheme[] = GAME_THEMES.map(theme => ({
    id: theme.id,
    name: theme.name,
    description: theme.description,
    enabled: true,
    source: "static" as const,
    pairs: theme.pairs.map(pair => ({ ...pair })),
  }));

  try {
    const storedThemes = await db.getStoredGameThemes(includeDisabled);
    // Key on the lowercased name so a stored theme overrides a bundled one of
    // the same name regardless of case (matches createTheme's dedup check).
    const themesByName = new Map<string, AvailableGameTheme>(
      staticThemes.map(theme => [theme.name.toLowerCase(), theme])
    );
    for (const theme of storedThemes) {
      themesByName.set(theme.name.toLowerCase(), theme);
    }
    return Array.from(themesByName.values());
  } catch (error) {
    console.warn("[GameConfig] Falling back to bundled themes:", error);
    return staticThemes;
  }
}

/**
 * Resolve a Telegram Mini App player from signed initData into a real users
 * row (creating it on first play), so their scores can hit the leaderboard.
 * Returns null if there's no/invalid initData or the bot isn't configured.
 */
async function resolveTelegramUser(initData?: string): Promise<User | null> {
  const token = process.env.TELEGRAM_BOT_TOKEN ?? "";
  if (!initData || !token) return null;

  const result = validateInitData(initData, token);
  if (!result.ok) return null;

  const openId = telegramOpenId(result.user);
  try {
    await db.upsertUser({
      openId,
      name: telegramDisplayName(result.user),
      loginMethod: "telegram",
      lastSignedIn: new Date(),
    });
    return (await db.getUserByOpenId(openId)) ?? null;
  } catch (error) {
    console.error("[Telegram] Failed to resolve player:", error);
    return null;
  }
}

/** Notify the owner of a captured lead (best-effort; never throws). */
async function notifyOwnerOfLead(lead: {
  name: string;
  company: string;
  email: string;
  score?: number;
  theme?: string;
}) {
  try {
    await notifyOwner({
      title: "🎮 New PairUp Lead Captured!",
      content: `New player: ${lead.name} from ${lead.company} (${lead.email})\nScore: ${lead.score ?? "N/A"} | Theme: ${lead.theme ?? "N/A"}`,
    });
  } catch (error) {
    console.error("Failed to notify owner of new lead:", error);
  }
}

async function requireTheme(themeName: string) {
  const theme = (await getAvailableGameThemes(false)).find(
    theme => theme.name === themeName
  );
  if (!theme) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid theme" });
  }
  return theme;
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  gameConfig: router({
    getThemes: publicProcedure.query(async () => {
      return await getAvailableGameThemes(false);
    }),

    getAllThemes: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return await getAvailableGameThemes(true);
    }),

    createTheme: protectedProcedure
      .input(createThemeSchema)
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        const existingTheme = (await getAvailableGameThemes(true)).find(
          theme => theme.name.toLowerCase() === input.name.toLowerCase()
        );
        if (existingTheme) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "A theme with this name already exists",
          });
        }

        const result = await db.createStoredGameTheme({
          name: input.name,
          description: input.description,
          pairs: input.pairs.map((pair, index) => ({
            id: index + 1,
            term: pair.term,
            definition: pair.definition,
          })),
        });

        return { success: true, ...result };
      }),

    setThemeEnabled: protectedProcedure
      .input(
        z.object({
          themeId: z.number(),
          enabled: z.boolean(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        await db.updateStoredGameThemeEnabled(input.themeId, input.enabled);
        return { success: true };
      }),

    setThemeOrder: protectedProcedure
      .input(
        z.object({
          themeId: z.number(),
          sortOrder: z.number().int(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        await db.updateStoredGameThemeOrder(input.themeId, input.sortOrder);
        return { success: true };
      }),
  }),

  // Game procedures
  game: router({
    createGame: publicProcedure
      .input(
        z.object({
          theme: themeSchema,
          gridSize: gridSizeSchema,
        })
      )
      .mutation(async ({ input, ctx }) => {
        // Throttle game creation per IP so the guest-game store / games table
        // can't be flooded by a scripted client.
        const ip = getClientIp(ctx.req);
        if (!rateLimit(`createGame:${ip}`, 30, 60_000).allowed) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: "Too many games started. Please slow down.",
          });
        }

        await requireTheme(input.theme);

        const gameData = {
          userId: ctx.user?.id ?? 0,
          theme: input.theme,
          gridSize: input.gridSize,
          moves: 0,
          timeSeconds: 0,
          completed: false,
        };

        try {
          const result = await db.createGame(gameData);
          return { gameId: result.insertId || 0 };
        } catch (error) {
          if (ctx.user?.id) throw error;

          console.error(
            "Failed to create guest game in database; using in-memory fallback:",
            error
          );
          const guestGame = createGuestGame(gameData);
          return { gameId: guestGame.id };
        }
      }),

    completeGame: publicProcedure
      .input(
        z.object({
          gameId: z.number().int(),
          moves: z.number().int().nonnegative(),
          timeSeconds: z.number().int().nonnegative(),
          // Signed Telegram Mini App initData, so Telegram players rank too.
          initData: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const game =
          input.gameId < 0
            ? (guestGames.get(input.gameId) ?? null)
            : await db.getGameById(input.gameId);
        if (!game) throw new TRPCError({ code: "NOT_FOUND" });

        // Reject re-submissions: a game may only be completed once.
        if (game.completed) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "This game has already been completed.",
          });
        }

        // Server-authoritative scoring: the client's numbers are only trusted
        // after clearing the physical checks in validateAndNormalizeCompletion,
        // using the server-measured wall clock since the game was created.
        const elapsedSeconds =
          (Date.now() - game.createdAt.getTime()) / 1000;
        const { moves, timeSeconds } = validateAndNormalizeCompletion({
          gridSize: game.gridSize,
          moves: input.moves,
          timeSeconds: input.timeSeconds,
          elapsedSeconds,
        });

        if (input.gameId < 0) {
          updateGuestGameScore(input.gameId, moves, timeSeconds);
        } else {
          await db.updateGameScore(input.gameId, moves, timeSeconds);
        }

        // Identify the player: a logged-in Manus user, or a verified Telegram
        // Mini App user. Either way their best score hits the leaderboard.
        const player = ctx.user ?? (await resolveTelegramUser(input.initData));
        if (player?.id) {
          await db.upsertScore(
            player.id,
            game.theme,
            game.gridSize,
            moves,
            timeSeconds
          );
          await db.updateLeaderboard(
            player.id,
            player.name || undefined,
            game.theme,
            game.gridSize,
            moves,
            timeSeconds
          );
        }

        // Return the validated values so the client shows the recorded score.
        return { success: true, moves, timeSeconds, totalScore: moves + timeSeconds };
      }),

    getGame: publicProcedure.input(z.number()).query(async ({ input }) => {
      if (input < 0) return guestGames.get(input) ?? null;
      return await db.getGameById(input);
    }),
  }),

  // Score procedures
  score: router({
    getUserBest: publicProcedure
      .input(
        z.object({
          theme: themeSchema,
          gridSize: gridSizeSchema,
          initData: z.string().optional(),
        })
      )
      .query(async ({ input, ctx }) => {
        await requireTheme(input.theme);

        const player = ctx.user ?? (await resolveTelegramUser(input.initData));
        if (!player?.id) return null;
        return await db.getUserBestScore(
          player.id,
          input.theme,
          input.gridSize
        );
      }),
  }),

  // Lead procedures
  lead: router({
    submit: publicProcedure
      .input(
        z.object({
          name: z.string().min(1).max(255),
          email: z.string().email().max(320),
          company: z.string().min(1).max(255),
          gameId: z.number().optional(),
          score: z.number().optional(),
          theme: themeSchema.optional(),
          gridSize: gridSizeSchema.optional(),
          consent: z.literal(true, {
            message: "Consent is required to submit your details.",
          }),
          // Honeypot: real users never fill this hidden field; bots do.
          // Accept any value here and silently trap it in the handler.
          website: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        // Bot trap: pretend success without recording or notifying.
        if (input.website) {
          return { success: true, leadId: 0, verificationRequired: false };
        }

        // Rate limit by IP and by email to blunt spam / notification floods.
        const ip = getClientIp(ctx.req);
        const email = input.email.toLowerCase();
        if (
          !rateLimit(`lead:ip:${ip}`, 5, 60_000).allowed ||
          !rateLimit(`lead:email:${email}`, 3, 60 * 60_000).allowed
        ) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: "Too many submissions. Please try again later.",
          });
        }

        if (input.theme) {
          await requireTheme(input.theme);
        }

        const emailEnabled = isEmailConfigured();
        const code = generateCode();

        const { insertId } = await db.createLead({
          name: input.name,
          email: input.email,
          company: input.company,
          gameId: input.gameId,
          score: input.score,
          theme: input.theme,
          gridSize: input.gridSize,
          consentAt: new Date(),
          // Only leads that verify their email count as qualified.
          verified: !emailEnabled,
          verifiedAt: emailEnabled ? null : new Date(),
          verificationCodeHash: emailEnabled ? hashCode(code) : null,
          verificationExpiresAt: emailEnabled ? expiryFromNow() : null,
        });

        // Email not configured (e.g. local dev): fall back to the old behavior —
        // the lead is trusted immediately and the owner is notified.
        if (!emailEnabled) {
          await notifyOwnerOfLead(input);
          return { success: true, leadId: insertId, verificationRequired: false };
        }

        try {
          const mail = verificationEmail(code);
          await sendEmail({ to: input.email, ...mail });
        } catch (error) {
          console.error("Failed to send verification email:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Could not send the verification email. Please try again.",
          });
        }

        return { success: true, leadId: insertId, verificationRequired: true };
      }),

    verify: publicProcedure
      .input(
        z.object({
          leadId: z.number().int().positive(),
          code: z.string().trim().length(6),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const ip = getClientIp(ctx.req);
        if (
          !rateLimit(`verify:ip:${ip}`, 20, 60_000).allowed ||
          !rateLimit(`verify:lead:${input.leadId}`, 10, 60 * 60_000).allowed
        ) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: "Too many attempts. Please try again later.",
          });
        }

        const lead = await db.getLeadById(input.leadId);
        if (!lead) throw new TRPCError({ code: "NOT_FOUND" });

        // Idempotent: already-verified leads just succeed.
        if (lead.verified) return { success: true };

        if (lead.verificationAttempts >= MAX_VERIFICATION_ATTEMPTS) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: "Too many incorrect attempts. Request a new code.",
          });
        }

        if (isExpired(lead.verificationExpiresAt)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "This code has expired. Request a new one.",
          });
        }

        if (!codeMatches(input.code, lead.verificationCodeHash)) {
          await db.incrementLeadVerificationAttempts(lead.id);
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Incorrect code. Please try again.",
          });
        }

        await db.markLeadVerified(lead.id);

        // Notify the owner only now that the lead is a verified, qualified lead.
        await notifyOwnerOfLead({
          name: lead.name,
          company: lead.company,
          email: lead.email,
          score: lead.score ?? undefined,
          theme: lead.theme ?? undefined,
        });

        return { success: true };
      }),

    resend: publicProcedure
      .input(z.object({ leadId: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        const ip = getClientIp(ctx.req);
        if (
          !rateLimit(`resend:ip:${ip}`, 5, 60_000).allowed ||
          !rateLimit(`resend:lead:${input.leadId}`, 3, 10 * 60_000).allowed
        ) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: "Please wait before requesting another code.",
          });
        }

        if (!isEmailConfigured()) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Email verification is not enabled.",
          });
        }

        const lead = await db.getLeadById(input.leadId);
        if (!lead) throw new TRPCError({ code: "NOT_FOUND" });
        if (lead.verified) return { success: true };

        const code = generateCode();
        await db.setLeadVerification(lead.id, hashCode(code), expiryFromNow());

        try {
          const mail = verificationEmail(code);
          await sendEmail({ to: lead.email, ...mail });
        } catch (error) {
          console.error("Failed to resend verification email:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Could not resend the verification email.",
          });
        }

        return { success: true };
      }),

    getAll: protectedProcedure.query(async ({ ctx }) => {
      // Only allow owner to view all leads
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return await db.getAllLeads();
    }),
  }),

  // Leaderboard procedures
  leaderboard: router({
    getByThemeAndSize: publicProcedure
      .input(
        z.object({
          theme: themeSchema,
          gridSize: gridSizeSchema,
          limit: z.number().default(10),
        })
      )
      .query(async ({ input }) => {
        await requireTheme(input.theme);

        return await db.getLeaderboard(
          input.theme,
          input.gridSize,
          input.limit
        );
      }),

    getAll: publicProcedure.query(async () => {
      return await db.getAllLeaderboardEntries();
    }),
  }),
});

export type AppRouter = typeof appRouter;
