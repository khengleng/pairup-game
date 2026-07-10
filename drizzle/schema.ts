import {
  int,
  bigint,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  boolean,
  json,
} from "drizzle-orm/mysql-core";

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
  /** Daily-challenge (memory game) streak tracking. */
  dailyStreak: int("dailyStreak").default(0).notNull(),
  bestStreak: int("bestStreak").default(0).notNull(),
  /** UTC "YYYY-MM-DD" of the last completed daily challenge. */
  lastDailyDate: varchar("lastDailyDate", { length: 10 }),
  /** Walking-challenge streak tracking (goal met on consecutive days). */
  walkStreak: int("walkStreak").default(0).notNull(),
  bestWalkStreak: int("bestWalkStreak").default(0).notNull(),
  lastWalkDate: varchar("lastWalkDate", { length: 10 }),
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
  theme: varchar("theme", { length: 255 }).notNull(),
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
  theme: varchar("theme", { length: 255 }).notNull(),
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
  theme: varchar("theme", { length: 255 }),
  gridSize: mysqlEnum("gridSize", ["4x4", "6x6", "8x8"]),
  /** Email verification: a lead is only "qualified" once verified. */
  verified: boolean("verified").default(false).notNull(),
  verifiedAt: timestamp("verifiedAt"),
  /** Timestamp the player gave marketing consent (PDPA trail). */
  consentAt: timestamp("consentAt"),
  /** SHA-256 hex of the current verification code (never store the code itself). */
  verificationCodeHash: varchar("verificationCodeHash", { length: 64 }),
  verificationExpiresAt: timestamp("verificationExpiresAt"),
  verificationAttempts: int("verificationAttempts").default(0).notNull(),
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
  theme: varchar("theme", { length: 255 }).notNull(),
  gridSize: mysqlEnum("gridSize", ["4x4", "6x6", "8x8"]).notNull(),
  bestScore: int("bestScore").notNull(), // Total score (moves + time)
  bestMoves: int("bestMoves").notNull(),
  bestTimeSeconds: int("bestTimeSeconds").notNull(),
  gamesPlayed: int("gamesPlayed").default(0).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LeaderboardEntry = typeof leaderboard.$inferSelect;
export type InsertLeaderboardEntry = typeof leaderboard.$inferInsert;

/**
 * Admin-managed game themes.
 */
export const gameThemes = mysqlTable("gameThemes", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 120 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description").notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type GameThemeRecord = typeof gameThemes.$inferSelect;
export type InsertGameThemeRecord = typeof gameThemes.$inferInsert;

/**
 * Admin-managed card pairs for each game theme.
 */
export const gameThemePairs = mysqlTable("gameThemePairs", {
  id: int("id").autoincrement().primaryKey(),
  themeId: int("themeId").notNull(),
  pairOrder: int("pairOrder").notNull(),
  term: varchar("term", { length: 255 }).notNull(),
  definition: text("definition").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type GameThemePairRecord = typeof gameThemePairs.$inferSelect;
export type InsertGameThemePairRecord = typeof gameThemePairs.$inferInsert;

/**
 * Daily-challenge results — one best entry per player per day, for the
 * per-day leaderboard.
 */
export const dailyScores = mysqlTable("dailyScores", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  playerName: varchar("playerName", { length: 255 }),
  /** UTC "YYYY-MM-DD" of the challenge. */
  challengeDate: varchar("challengeDate", { length: 10 }).notNull(),
  theme: varchar("theme", { length: 255 }).notNull(),
  gridSize: mysqlEnum("gridSize", ["4x4", "6x6", "8x8"]).notNull(),
  score: int("score").notNull(), // moves + timeSeconds (lower is better)
  moves: int("moves").notNull(),
  timeSeconds: int("timeSeconds").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DailyScore = typeof dailyScores.$inferSelect;
export type InsertDailyScore = typeof dailyScores.$inferInsert;

/**
 * Telegram chats that have engaged with the bot — targets for daily nudges.
 * For private chats, chatId equals the Telegram user id.
 */
export const telegramChats = mysqlTable("telegramChats", {
  chatId: bigint("chatId", { mode: "number" }).primaryKey(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  lastActiveAt: timestamp("lastActiveAt").defaultNow().onUpdateNow().notNull(),
});

export type TelegramChat = typeof telegramChats.$inferSelect;
export type InsertTelegramChat = typeof telegramChats.$inferInsert;

/**
 * Small key/value store for app-level state (e.g. last daily-nudge date).
 */
export const appState = mysqlTable("appState", {
  key: varchar("key", { length: 120 }).primaryKey(),
  value: varchar("value", { length: 255 }),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AppState = typeof appState.$inferSelect;

/**
 * A walking session — created on "Start walk", completed with a step count.
 * Server-recorded start time backs the step-plausibility check.
 */
export const walkSessions = mysqlTable("walkSessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  steps: int("steps").default(0).notNull(),
  completed: boolean("completed").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WalkSession = typeof walkSessions.$inferSelect;
export type InsertWalkSession = typeof walkSessions.$inferInsert;

/**
 * Per-player daily step total — one row per player per day, for the streak
 * and the daily step leaderboard.
 */
export const dailyWalks = mysqlTable("dailyWalks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  playerName: varchar("playerName", { length: 255 }),
  /** UTC "YYYY-MM-DD". */
  walkDate: varchar("walkDate", { length: 10 }).notNull(),
  steps: int("steps").default(0).notNull(),
  goalMet: boolean("goalMet").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DailyWalk = typeof dailyWalks.$inferSelect;
export type InsertDailyWalk = typeof dailyWalks.$inferInsert;

/**
 * Aggregate stats for the shake-to-roll games (Dice & Klaklok) — one row per
 * player per game, backing the all-time leaderboard. Rolls are generated
 * server-side, so these totals can't be gamed by the client.
 * Uniqueness on (userId, game) is enforced in application code (see db.ts),
 * matching the dailyWalks pattern.
 */
export const shakeStats = mysqlTable("shakeStats", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  playerName: varchar("playerName", { length: 255 }),
  game: mysqlEnum("game", ["dice", "klaklok"]).notNull(),
  /** Highest score from a single roll. */
  bestScore: int("bestScore").default(0).notNull(),
  /** Number of rolls the player has made. */
  totalRolls: int("totalRolls").default(0).notNull(),
  /** Sum of every roll's score. */
  totalScore: int("totalScore").default(0).notNull(),
  /** Headline wins: doubles (dice) / three-of-a-kind (klaklok). */
  jackpots: int("jackpots").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ShakeStats = typeof shakeStats.$inferSelect;
export type InsertShakeStats = typeof shakeStats.$inferInsert;

/**
 * Admin-managed on/off switches for each game the app (and the Telegram mini
 * app) presents. One row per game slug; a missing row means "enabled" (the
 * bundled default), so the table only stores admin overrides.
 */
export const appGames = mysqlTable("appGames", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  enabled: boolean("enabled").default(true).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AppGame = typeof appGames.$inferSelect;
export type InsertAppGame = typeof appGames.$inferInsert;

// ---------------------------------------------------------------------------
// Scratch-card promotional platform (Phase 1)
// ---------------------------------------------------------------------------

/**
 * A scratch-card campaign: one game definition + its rules, schedule and
 * eligibility. `config` holds the game-type-specific rule parameters (JSON).
 */
export const scratchCampaigns = mysqlTable("scratchCampaigns", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 80 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  gameType: mysqlEnum("gameType", [
    "matching_numbers",
    "matching_symbols",
    "pattern",
    "matching_amounts",
  ]).notNull(),
  status: mysqlEnum("status", ["draft", "active", "paused", "ended"])
    .default("draft")
    .notNull(),
  /** Game-type rule parameters (see shared/scratch types). */
  config: json("config").notNull(),
  /** Win probability in basis points (0–10000 = 0–100%). */
  winProbabilityBps: int("winProbabilityBps").default(0).notNull(),
  /** Max plays per player per day; 0 = unlimited. */
  dailyPlayLimit: int("dailyPlayLimit").default(0).notNull(),
  /** Minimum age to play; 0 = no gate. */
  minAge: int("minAge").default(0).notNull(),
  /** CSV ISO country allowlist; null = all countries. */
  countries: varchar("countries", { length: 255 }),
  termsUrl: varchar("termsUrl", { length: 512 }),
  startsAt: timestamp("startsAt"),
  expiresAt: timestamp("expiresAt"),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ScratchCampaign = typeof scratchCampaigns.$inferSelect;
export type InsertScratchCampaign = typeof scratchCampaigns.$inferInsert;

/**
 * A prize tier within a campaign, with its own inventory counters. Prizes are
 * never awarded beyond `totalQty`; reservations use row locking (see db.ts).
 */
export const scratchPrizeTiers = mysqlTable("scratchPrizeTiers", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaignId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  /** Player-facing prize label, e.g. "$10 voucher". */
  valueLabel: varchar("valueLabel", { length: 255 }).notNull(),
  /** Numeric value in minor units (cents) for liability reporting. */
  valueCents: int("valueCents").default(0).notNull(),
  /** Matches required for this tier (matching_numbers). */
  requiredMatches: int("requiredMatches").default(0).notNull(),
  totalQty: int("totalQty").default(0).notNull(),
  reservedQty: int("reservedQty").default(0).notNull(),
  claimedQty: int("claimedQty").default(0).notNull(),
  /** Relative weight when picking among winnable tiers. */
  weight: int("weight").default(1).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ScratchPrizeTier = typeof scratchPrizeTiers.$inferSelect;
export type InsertScratchPrizeTier = typeof scratchPrizeTiers.$inferInsert;

/** Voucher-code inventory for a prize tier. */
export const scratchVoucherCodes = mysqlTable("scratchVoucherCodes", {
  id: int("id").autoincrement().primaryKey(),
  prizeTierId: int("prizeTierId").notNull(),
  code: varchar("code", { length: 128 }).notNull(),
  status: mysqlEnum("status", ["available", "reserved", "claimed", "void"])
    .default("available")
    .notNull(),
  /** Session that reserved/claimed this code. */
  sessionId: int("sessionId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ScratchVoucherCode = typeof scratchVoucherCodes.$inferSelect;
export type InsertScratchVoucherCode = typeof scratchVoucherCodes.$inferInsert;

/**
 * A single play. The result is generated + signed server-side at creation
 * (before scratching); the client only reveals it. `card` is the layout shown,
 * `outcome` the authoritative result.
 */
export const scratchSessions = mysqlTable("scratchSessions", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaignId").notNull(),
  userId: int("userId"),
  playerName: varchar("playerName", { length: 255 }),
  status: mysqlEnum("status", ["created", "completed", "expired"])
    .default("created")
    .notNull(),
  isWinner: boolean("isWinner").default(false).notNull(),
  prizeTierId: int("prizeTierId"),
  card: json("card").notNull(),
  outcome: json("outcome").notNull(),
  /** Anti-replay nonce + HMAC signature over the result. */
  nonce: varchar("nonce", { length: 64 }).notNull(),
  signature: varchar("signature", { length: 128 }).notNull(),
  ip: varchar("ip", { length: 64 }),
  deviceHash: varchar("deviceHash", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type ScratchSession = typeof scratchSessions.$inferSelect;
export type InsertScratchSession = typeof scratchSessions.$inferInsert;

/** A won prize, with its claim workflow status. */
export const scratchAwards = mysqlTable("scratchAwards", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull(),
  campaignId: int("campaignId").notNull(),
  userId: int("userId").notNull(),
  prizeTierId: int("prizeTierId").notNull(),
  voucherCodeId: int("voucherCodeId"),
  claimRef: varchar("claimRef", { length: 32 }).notNull().unique(),
  status: mysqlEnum("status", [
    "pending",
    "verification",
    "approved",
    "fulfilled",
    "rejected",
    "expired",
    "cancelled",
  ])
    .default("pending")
    .notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ScratchAward = typeof scratchAwards.$inferSelect;
export type InsertScratchAward = typeof scratchAwards.$inferInsert;

/**
 * Immutable audit trail for sensitive actions. Append-only — never updated or
 * deleted from the admin portal.
 */
export const auditLogs = mysqlTable("auditLogs", {
  id: int("id").autoincrement().primaryKey(),
  actorId: int("actorId"),
  actorRole: varchar("actorRole", { length: 64 }),
  action: varchar("action", { length: 128 }).notNull(),
  entity: varchar("entity", { length: 64 }).notNull(),
  entityId: varchar("entityId", { length: 64 }),
  before: json("before"),
  after: json("after"),
  reason: text("reason"),
  approvalRef: varchar("approvalRef", { length: 64 }),
  ip: varchar("ip", { length: 64 }),
  device: varchar("device", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;
