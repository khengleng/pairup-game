import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { notifyOwner } from "./_core/notification";
import { TRPCError } from "@trpc/server";
import type { Game } from "../drizzle/schema";

const guestGames = new Map<number, Game>();
let nextGuestGameId = -1;

function createGuestGame(gameData: Omit<Game, "id" | "createdAt">): Game {
  const game: Game = {
    ...gameData,
    id: nextGuestGameId--,
    createdAt: new Date(),
  };
  guestGames.set(game.id, game);
  return game;
}

function updateGuestGameScore(gameId: number, moves: number, timeSeconds: number) {
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

  // Game procedures
  game: router({
    createGame: publicProcedure
      .input(z.object({
        theme: z.enum(["Products", "Features", "Team Members"]),
        gridSize: z.enum(["4x4", "6x6", "8x8"]),
      }))
      .mutation(async ({ input, ctx }) => {
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
          return { gameId: (result as any).insertId || 0 };
        } catch (error) {
          if (ctx.user?.id) throw error;

          console.error("Failed to create guest game in database; using in-memory fallback:", error);
          const guestGame = createGuestGame(gameData);
          return { gameId: guestGame.id };
        }
      }),

    completeGame: publicProcedure
      .input(z.object({
        gameId: z.number(),
        moves: z.number(),
        timeSeconds: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        const game = input.gameId < 0
          ? guestGames.get(input.gameId) ?? null
          : await db.getGameById(input.gameId);
        if (!game) throw new TRPCError({ code: "NOT_FOUND" });

        if (input.gameId < 0) {
          updateGuestGameScore(input.gameId, input.moves, input.timeSeconds);
        } else {
          await db.updateGameScore(input.gameId, input.moves, input.timeSeconds);
        }

        // Update user's best score if authenticated
        if (ctx.user?.id) {
          await db.upsertScore(ctx.user.id, game.theme, game.gridSize, input.moves, input.timeSeconds);
          await db.updateLeaderboard(ctx.user.id, ctx.user.name || undefined, game.theme, game.gridSize, input.moves, input.timeSeconds);
        }

        return { success: true };
      }),

    getGame: publicProcedure
      .input(z.number())
      .query(async ({ input }) => {
        if (input < 0) return guestGames.get(input) ?? null;
        return await db.getGameById(input);
      }),
  }),

  // Score procedures
  score: router({
    getUserBest: publicProcedure
      .input(z.object({
        theme: z.enum(["Products", "Features", "Team Members"]),
        gridSize: z.enum(["4x4", "6x6", "8x8"]),
      }))
      .query(async ({ input, ctx }) => {
        if (!ctx.user?.id) return null;
        return await db.getUserBestScore(ctx.user.id, input.theme, input.gridSize);
      }),
  }),

  // Lead procedures
  lead: router({
    submit: publicProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        email: z.string().email().max(320),
        company: z.string().min(1).max(255),
        gameId: z.number().optional(),
        score: z.number().optional(),
        theme: z.enum(["Products", "Features", "Team Members"]).optional(),
        gridSize: z.enum(["4x4", "6x6", "8x8"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const leadData = {
          name: input.name,
          email: input.email,
          company: input.company,
          gameId: input.gameId,
          score: input.score,
          theme: input.theme,
          gridSize: input.gridSize,
        };

        const result = await db.createLead(leadData);

        // Notify owner of new lead
        try {
          await notifyOwner({
            title: "🎮 New PairUp Lead Captured!",
            content: `New player: ${input.name} from ${input.company} (${input.email})\nScore: ${input.score || "N/A"} | Theme: ${input.theme || "N/A"}`,
          });
        } catch (error) {
          console.error("Failed to notify owner of new lead:", error);
        }

        return { success: true, leadId: (result as any).insertId || 0 };
      }),

    getAll: protectedProcedure
      .query(async ({ ctx }) => {
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
      .input(z.object({
        theme: z.enum(["Products", "Features", "Team Members"]),
        gridSize: z.enum(["4x4", "6x6", "8x8"]),
        limit: z.number().default(10),
      }))
      .query(async ({ input }) => {
        return await db.getLeaderboard(input.theme, input.gridSize, input.limit);
      }),

    getAll: publicProcedure
      .query(async () => {
        return await db.getAllLeaderboardEntries();
      }),
  }),
});

export type AppRouter = typeof appRouter;
