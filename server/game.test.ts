import { describe, it, expect } from "vitest";
import { getDb, createGame, getGameById, updateGameScore, upsertScore, getUserBestScore } from "./db";

describe("Game Logic", () => {
  describe("Game Creation and Retrieval", () => {
    it("should create a game with theme and gridSize", async () => {
      const gameData = { 
        theme: "Products" as const, 
        gridSize: "4x4" as const, 
        moves: 0, 
        timeSeconds: 0, 
        completed: false 
      };
      const result = await createGame(gameData);
      expect(result).toBeDefined();
    });

    it("should retrieve a game by ID", async () => {
      const gameData = { 
        theme: "Features" as const, 
        gridSize: "6x6" as const, 
        moves: 0, 
        timeSeconds: 0, 
        completed: false 
      };
      const result = await createGame(gameData);
      const gameId = (result as any).insertId || (Array.isArray(result) ? result[0]?.id : null);
      
      if (gameId) {
        const retrieved = await getGameById(gameId);
        expect(retrieved).toBeDefined();
        expect(retrieved?.theme).toBe("Features");
        expect(retrieved?.gridSize).toBe("6x6");
      }
    });
  });

  describe("Score Tracking", () => {
    it("should save the first game score", async () => {
      const userId = 1;
      const theme = "Products";
      const gridSize = "4x4";
      const moves = 10;
      const timeSeconds = 45;

      const result = await upsertScore(userId, theme, gridSize, moves, timeSeconds);
      expect(result).toBeDefined();

      const best = await getUserBestScore(userId, theme, gridSize);
      expect(best).toBeDefined();
      expect(best?.bestMoves).toBe(10);
      expect(best?.totalScore).toBe(55); // 10 + 45
    });

    it("should update score only if new score is better", async () => {
      const userId = Math.floor(Math.random() * 100000); // Use random ID to avoid conflicts
      const theme = "Features";
      const gridSize = "6x6";

      // First game: 15 moves, 60 seconds = 75 total
      await upsertScore(userId, theme, gridSize, 15, 60);
      let best = await getUserBestScore(userId, theme, gridSize);
      expect(best?.totalScore).toBe(75);

      // Second game: 20 moves, 50 seconds = 70 total (better)
      await upsertScore(userId, theme, gridSize, 20, 50);
      best = await getUserBestScore(userId, theme, gridSize);
      expect(best?.totalScore).toBe(70);
      expect(best?.bestMoves).toBe(20);

      // Third game: 25 moves, 70 seconds = 95 total (worse, should not update)
      await upsertScore(userId, theme, gridSize, 25, 70);
      best = await getUserBestScore(userId, theme, gridSize);
      expect(best?.totalScore).toBe(70); // Should remain 70
      expect(best?.bestMoves).toBe(20); // Should remain 20
    });

    it("should track scores per theme and gridSize", async () => {
      const userId = 98;

      // Save score for Products 4x4
      await upsertScore(userId, "Products", "4x4", 8, 30);
      const products4x4 = await getUserBestScore(userId, "Products", "4x4");
      expect(products4x4?.totalScore).toBe(38);

      // Save score for Features 6x6
      await upsertScore(userId, "Features", "6x6", 12, 50);
      const features6x6 = await getUserBestScore(userId, "Features", "6x6");
      expect(features6x6?.totalScore).toBe(62);

      // Verify they're separate records
      expect(products4x4?.id).not.toBe(features6x6?.id);
    });
  });

  describe("Game Completion", () => {
    it("should update game with completion status and scores", async () => {
      const gameData = { 
        theme: "Team Members" as const, 
        gridSize: "8x8" as const, 
        moves: 0, 
        timeSeconds: 0, 
        completed: false 
      };
      const result = await createGame(gameData);
      const gameId = (result as any).insertId || (Array.isArray(result) ? result[0]?.id : null);
      
      if (gameId) {
        const moves = 32;
        const timeSeconds = 120;

        await updateGameScore(gameId, moves, timeSeconds);

        const updated = await getGameById(gameId);
        expect(updated?.completed).toBe(true);
        expect(updated?.moves).toBe(32);
        expect(updated?.timeSeconds).toBe(120);
      }
    });
  });

  describe("Edge Cases", () => {
    it("should handle undefined userId gracefully", async () => {
      const result = await upsertScore(undefined, "Products", "4x4", 10, 30);
      expect(result).toBeNull();
    });

    it("should handle different grid sizes independently", async () => {
      const userId = 97;
      const theme = "Products";

      await upsertScore(userId, theme, "4x4", 5, 20);
      await upsertScore(userId, theme, "6x6", 10, 40);
      await upsertScore(userId, theme, "8x8", 15, 60);

      const score4x4 = await getUserBestScore(userId, theme, "4x4");
      const score6x6 = await getUserBestScore(userId, theme, "6x6");
      const score8x8 = await getUserBestScore(userId, theme, "8x8");

      expect(score4x4?.totalScore).toBe(25);
      expect(score6x6?.totalScore).toBe(50);
      expect(score8x8?.totalScore).toBe(75);
    });
  });
});
