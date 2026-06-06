import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Game sessions table - tracks individual game plays
 */
export const games = mysqlTable("games", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  theme: mysqlEnum("theme", ["Products", "Features", "Team Members"]).notNull(),
  gridSize: mysqlEnum("gridSize", ["4x4", "6x6", "8x8"]).notNull(),
  moves: int("moves").notNull(),
  timeSeconds: int("timeSeconds").notNull(),
  completed: boolean("completed").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Game = typeof games.$inferSelect;
export type InsertGame = typeof games.$inferInsert;

/**
 * Scores table - tracks best scores per user per theme/grid combination
 */
export const scores = mysqlTable("scores", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  theme: mysqlEnum("theme", ["Products", "Features", "Team Members"]).notNull(),
  gridSize: mysqlEnum("gridSize", ["4x4", "6x6", "8x8"]).notNull(),
  bestMoves: int("bestMoves").notNull(),
  bestTimeSeconds: int("bestTimeSeconds").notNull(),
  totalScore: int("totalScore").notNull(), // Lower is better (moves + time)
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Score = typeof scores.$inferSelect;
export type InsertScore = typeof scores.$inferInsert;

/**
 * Leads table - captures player information for marketing
 */
export const leads = mysqlTable("leads", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  company: varchar("company", { length: 255 }).notNull(),
  gameId: int("gameId"),
  score: int("score"),
  theme: mysqlEnum("theme", ["Products", "Features", "Team Members"]),
  gridSize: mysqlEnum("gridSize", ["4x4", "6x6", "8x8"]),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;

/**
 * Leaderboard entries - denormalized for fast queries
 */
export const leaderboard = mysqlTable("leaderboard", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  playerName: varchar("playerName", { length: 255 }),
  theme: mysqlEnum("theme", ["Products", "Features", "Team Members"]).notNull(),
  gridSize: mysqlEnum("gridSize", ["4x4", "6x6", "8x8"]).notNull(),
  bestScore: int("bestScore").notNull(), // Total score (moves + time)
  bestMoves: int("bestMoves").notNull(),
  bestTimeSeconds: int("bestTimeSeconds").notNull(),
  gamesPlayed: int("gamesPlayed").default(0).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LeaderboardEntry = typeof leaderboard.$inferSelect;
export type InsertLeaderboardEntry = typeof leaderboard.$inferInsert;
