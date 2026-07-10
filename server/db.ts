import { eq, and, desc, asc, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  games,
  scores,
  leads,
  leaderboard,
  gameThemes,
  gameThemePairs,
  dailyScores,
  telegramChats,
  appState,
  walkSessions,
  dailyWalks,
  shakeStats,
  appGames,
} from "../drizzle/schema";
import { computeStreak, type StreakState } from "./streak";
import { ENV } from "./_core/env";
import type { CardPair, GameTheme } from "@shared/gameConfig";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

/**
 * Apply any pending Drizzle migrations at server startup.
 *
 * Idempotent: Drizzle tracks applied migrations in `__drizzle_migrations`, so
 * only new migration files run. Safe to call on every boot. Failures are logged
 * but do not crash the server — check the logs if a schema-dependent feature
 * misbehaves after deploy.
 */
export async function runMigrations(): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Skipping migrations: database not available");
    return;
  }

  try {
    const { migrate } = await import("drizzle-orm/mysql2/migrator");
    await migrate(db, { migrationsFolder: "drizzle" });
    console.log("[Database] Migrations up to date");
  } catch (error) {
    console.error("[Database] Migration failed:", error);
  }
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Game-related queries
export async function createGame(gameData: typeof games.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(games).values(gameData);
  // Extract the inserted ID from the result
  // Drizzle with MySQL returns an array-like result with insertId property
  const insertId = (result as any)[0]?.insertId || (result as any).insertId;
  if (!insertId) {
    // If we can't get insertId, query for the most recent game by this user
    if (gameData.userId) {
      const recentGames = await db
        .select()
        .from(games)
        .where(eq(games.userId, gameData.userId))
        .orderBy(desc(games.createdAt))
        .limit(1);
      return { insertId: recentGames[0]?.id || 0 };
    }
    // If no userId, return 0
    return { insertId: 0 };
  }
  return { insertId };
}

export async function updateGameScore(
  gameId: number,
  moves: number,
  timeSeconds: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .update(games)
    .set({ moves, timeSeconds, completed: true })
    .where(eq(games.id, gameId));
}

export async function getGameById(gameId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(games)
    .where(eq(games.id, gameId))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

// Score-related queries
export async function upsertScore(
  userId: number | undefined,
  theme: string,
  gridSize: string,
  moves: number,
  timeSeconds: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const totalScore = moves + timeSeconds;

  if (!userId) return null;

  const existing = await db
    .select()
    .from(scores)
    .where(
      and(
        eq(scores.userId, userId),
        eq(scores.theme, theme as any),
        eq(scores.gridSize, gridSize as any)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    // Only update if new score is better
    if (totalScore < existing[0].totalScore) {
      return await db
        .update(scores)
        .set({ bestMoves: moves, bestTimeSeconds: timeSeconds, totalScore })
        .where(eq(scores.id, existing[0].id));
    }
    return existing[0];
  } else {
    return await db.insert(scores).values({
      userId,
      theme: theme as any,
      gridSize: gridSize as any,
      bestMoves: moves,
      bestTimeSeconds: timeSeconds,
      totalScore,
    });
  }
}

export async function getUserBestScore(
  userId: number,
  theme: string,
  gridSize: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(scores)
    .where(
      and(
        eq(scores.userId, userId),
        eq(scores.theme, theme as any),
        eq(scores.gridSize, gridSize as any)
      )
    )
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

// Lead-related queries
export async function createLead(leadData: typeof leads.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(leads).values(leadData);
  const insertId =
    (result as any)?.[0]?.insertId ?? (result as any)?.insertId ?? 0;
  return { insertId } as { insertId: number };
}

export async function getLeadById(leadId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(leads)
    .where(eq(leads.id, leadId))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function setLeadVerification(
  leadId: number,
  codeHash: string,
  expiresAt: Date
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .update(leads)
    .set({
      verificationCodeHash: codeHash,
      verificationExpiresAt: expiresAt,
      verificationAttempts: 0,
    })
    .where(eq(leads.id, leadId));
}

export async function incrementLeadVerificationAttempts(leadId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .update(leads)
    .set({ verificationAttempts: sql`${leads.verificationAttempts} + 1` })
    .where(eq(leads.id, leadId));
}

export async function markLeadVerified(leadId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .update(leads)
    .set({
      verified: true,
      verifiedAt: new Date(),
      verificationCodeHash: null,
      verificationExpiresAt: null,
    })
    .where(eq(leads.id, leadId));
}

export async function getAllLeads() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(leads).orderBy(desc(leads.createdAt));
}

// Leaderboard queries
export async function getLeaderboard(
  theme: string,
  gridSize: string,
  topN: number = 10
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .select()
    .from(leaderboard)
    .where(
      and(
        eq(leaderboard.theme, theme as any),
        eq(leaderboard.gridSize, gridSize as any)
      )
    )
    .orderBy(asc(leaderboard.bestScore))
    .limit(topN);
}

export async function updateLeaderboard(
  userId: number | undefined,
  playerName: string | undefined,
  theme: string,
  gridSize: string,
  moves: number,
  timeSeconds: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const totalScore = moves + timeSeconds;

  if (!userId) return null;

  const existing = await db
    .select()
    .from(leaderboard)
    .where(
      and(
        eq(leaderboard.userId, userId),
        eq(leaderboard.theme, theme as any),
        eq(leaderboard.gridSize, gridSize as any)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    // Only update if new score is better
    if (totalScore < existing[0].bestScore) {
      return await db
        .update(leaderboard)
        .set({
          bestScore: totalScore,
          bestMoves: moves,
          bestTimeSeconds: timeSeconds,
          gamesPlayed: (existing[0].gamesPlayed || 0) + 1,
        })
        .where(eq(leaderboard.id, existing[0].id));
    }
  } else {
    return await db.insert(leaderboard).values({
      userId,
      playerName: playerName || "Anonymous",
      theme: theme as any,
      gridSize: gridSize as any,
      bestScore: totalScore,
      bestMoves: moves,
      bestTimeSeconds: timeSeconds,
      gamesPlayed: 1,
    });
  }
}

// Daily-challenge queries
export async function upsertDailyScore(
  userId: number,
  playerName: string | undefined,
  challengeDate: string,
  theme: string,
  gridSize: string,
  moves: number,
  timeSeconds: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const score = moves + timeSeconds;
  const existing = await db
    .select()
    .from(dailyScores)
    .where(
      and(
        eq(dailyScores.userId, userId),
        eq(dailyScores.challengeDate, challengeDate)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    if (score < existing[0].score) {
      await db
        .update(dailyScores)
        .set({ score, moves, timeSeconds, playerName: playerName ?? null })
        .where(eq(dailyScores.id, existing[0].id));
    }
    return;
  }

  await db.insert(dailyScores).values({
    userId,
    playerName: playerName ?? null,
    challengeDate,
    theme,
    gridSize: gridSize as any,
    score,
    moves,
    timeSeconds,
  });
}

export async function getDailyLeaderboard(
  challengeDate: string,
  topN: number = 10
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .select()
    .from(dailyScores)
    .where(eq(dailyScores.challengeDate, challengeDate))
    .orderBy(asc(dailyScores.score))
    .limit(topN);
}

export async function getUserDailyResult(userId: number, challengeDate: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(dailyScores)
    .where(
      and(
        eq(dailyScores.userId, userId),
        eq(dailyScores.challengeDate, challengeDate)
      )
    )
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

/** Advance (or reset) a player's daily streak; returns the new state. */
export async function updateUserStreak(
  userId: number,
  todayKey: string
): Promise<StreakState | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const rows = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const user = rows[0];
  if (!user) return null;

  const state = computeStreak(
    user.lastDailyDate ?? null,
    todayKey,
    user.dailyStreak,
    user.bestStreak
  );

  if (!state.alreadyPlayedToday) {
    await db
      .update(users)
      .set({
        dailyStreak: state.streak,
        bestStreak: state.bestStreak,
        lastDailyDate: todayKey,
      })
      .where(eq(users.id, userId));
  }

  return state;
}

// Telegram chat + app-state queries (for daily nudges)
export async function upsertTelegramChat(chatId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .insert(telegramChats)
    .values({ chatId, active: true })
    .onDuplicateKeyUpdate({ set: { active: true, lastActiveAt: new Date() } });
}

export async function getActiveTelegramChatIds(): Promise<number[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({ chatId: telegramChats.chatId })
    .from(telegramChats)
    .where(eq(telegramChats.active, true));
  return rows.map(r => r.chatId);
}

export async function deactivateTelegramChat(chatId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(telegramChats)
    .set({ active: false })
    .where(eq(telegramChats.chatId, chatId));
}

export async function getAppState(key: string): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(appState)
    .where(eq(appState.key, key))
    .limit(1);
  return rows.length > 0 ? (rows[0].value ?? null) : null;
}

export async function setAppState(key: string, value: string) {
  const db = await getDb();
  if (!db) return;
  await db
    .insert(appState)
    .values({ key, value })
    .onDuplicateKeyUpdate({ set: { value } });
}

// Walking-challenge queries
export async function createWalkSession(userId: number | null) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(walkSessions).values({ userId: userId ?? undefined });
  const insertId =
    (result as any)?.[0]?.insertId ?? (result as any)?.insertId ?? 0;
  return { insertId } as { insertId: number };
}

export async function getWalkSessionById(sessionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db
    .select()
    .from(walkSessions)
    .where(eq(walkSessions.id, sessionId))
    .limit(1);
  return rows.length > 0 ? rows[0] : null;
}

export async function completeWalkSession(sessionId: number, steps: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(walkSessions)
    .set({ steps, completed: true })
    .where(eq(walkSessions.id, sessionId));
}

/** Add steps to today's total; returns the new total and whether the goal is met. */
export async function addDailyWalkSteps(
  userId: number,
  playerName: string | undefined,
  walkDate: string,
  addSteps: number,
  goal: number
): Promise<{ total: number; goalMet: boolean }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db
    .select()
    .from(dailyWalks)
    .where(and(eq(dailyWalks.userId, userId), eq(dailyWalks.walkDate, walkDate)))
    .limit(1);

  if (existing.length > 0) {
    const total = existing[0].steps + addSteps;
    const goalMet = total >= goal;
    await db
      .update(dailyWalks)
      .set({ steps: total, goalMet, playerName: playerName ?? existing[0].playerName })
      .where(eq(dailyWalks.id, existing[0].id));
    return { total, goalMet };
  }

  const goalMet = addSteps >= goal;
  await db.insert(dailyWalks).values({
    userId,
    playerName: playerName ?? null,
    walkDate,
    steps: addSteps,
    goalMet,
  });
  return { total: addSteps, goalMet };
}

export async function getUserDailyWalk(userId: number, walkDate: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db
    .select()
    .from(dailyWalks)
    .where(and(eq(dailyWalks.userId, userId), eq(dailyWalks.walkDate, walkDate)))
    .limit(1);
  return rows.length > 0 ? rows[0] : null;
}

export async function getWalkLeaderboard(walkDate: string, topN: number = 20) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db
    .select()
    .from(dailyWalks)
    .where(eq(dailyWalks.walkDate, walkDate))
    .orderBy(desc(dailyWalks.steps))
    .limit(topN);
}

/** Advance the walk streak (goal met on consecutive days); idempotent per day. */
export async function updateUserWalkStreak(
  userId: number,
  todayKey: string
): Promise<StreakState | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const rows = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const user = rows[0];
  if (!user) return null;

  const state = computeStreak(
    user.lastWalkDate ?? null,
    todayKey,
    user.walkStreak,
    user.bestWalkStreak
  );

  if (!state.alreadyPlayedToday) {
    await db
      .update(users)
      .set({
        walkStreak: state.streak,
        bestWalkStreak: state.bestStreak,
        lastWalkDate: todayKey,
      })
      .where(eq(users.id, userId));
  }

  return state;
}

// Helper to get all leaderboard entries for all themes/sizes
export async function getAllLeaderboardEntries() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .select()
    .from(leaderboard)
    .orderBy(
      leaderboard.theme,
      leaderboard.gridSize,
      asc(leaderboard.bestScore)
    );
}

export type StoredGameTheme = GameTheme & {
  databaseId: number;
  enabled: boolean;
  sortOrder: number;
  source: "database";
};

export async function getStoredGameThemes(
  includeDisabled = false
): Promise<StoredGameTheme[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const themeRows = await db
    .select()
    .from(gameThemes)
    .orderBy(asc(gameThemes.sortOrder), asc(gameThemes.id));

  const visibleThemeRows = includeDisabled
    ? themeRows
    : themeRows.filter(theme => theme.enabled);

  if (visibleThemeRows.length === 0) return [];

  const themeIds = visibleThemeRows.map(theme => theme.id);
  const pairRows = await db
    .select()
    .from(gameThemePairs)
    .where(inArray(gameThemePairs.themeId, themeIds))
    .orderBy(asc(gameThemePairs.themeId), asc(gameThemePairs.pairOrder));

  const pairsByThemeId = new Map<number, CardPair[]>();
  for (const pair of pairRows) {
    const pairs = pairsByThemeId.get(pair.themeId) ?? [];
    pairs.push({
      id: pair.pairOrder,
      term: pair.term,
      definition: pair.definition,
    });
    pairsByThemeId.set(pair.themeId, pairs);
  }

  return visibleThemeRows.map(theme => ({
    databaseId: theme.id,
    id: theme.slug,
    name: theme.name,
    description: theme.description,
    enabled: theme.enabled,
    sortOrder: theme.sortOrder,
    source: "database",
    pairs: pairsByThemeId.get(theme.id) ?? [],
  }));
}

export async function createStoredGameTheme(
  theme: Omit<GameTheme, "id"> & { id?: string }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const slug = theme.id || slugifyThemeName(theme.name);
  const result = await db.insert(gameThemes).values({
    slug,
    name: theme.name,
    description: theme.description,
    enabled: true,
    sortOrder: 100,
  });
  const insertId = (result as any)[0]?.insertId || (result as any).insertId;

  if (!insertId) {
    throw new Error("Failed to create game theme");
  }

  await db.insert(gameThemePairs).values(
    theme.pairs.map((pair, index) => ({
      themeId: insertId,
      pairOrder: index + 1,
      term: pair.term,
      definition: pair.definition,
    }))
  );

  return { id: insertId, slug };
}

export async function updateStoredGameThemeEnabled(
  themeId: number,
  enabled: boolean
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .update(gameThemes)
    .set({ enabled })
    .where(eq(gameThemes.id, themeId));
}

export async function updateStoredGameThemeOrder(
  themeId: number,
  sortOrder: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .update(gameThemes)
    .set({ sortOrder })
    .where(eq(gameThemes.id, themeId));
}

function slugifyThemeName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

// ---------------------------------------------------------------------------
// Shake games (Dice & Klaklok)
// ---------------------------------------------------------------------------

/**
 * Fold one roll into a player's aggregate stats for a game, creating the row on
 * first play. Uniqueness on (userId, game) is enforced here (no DB constraint),
 * mirroring the dailyWalks pattern. Returns the updated row.
 */
export async function recordShakeRoll(params: {
  userId: number;
  playerName?: string;
  game: "dice" | "klaklok";
  score: number;
  isJackpot: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db
    .select()
    .from(shakeStats)
    .where(
      and(eq(shakeStats.userId, params.userId), eq(shakeStats.game, params.game))
    )
    .limit(1);

  if (existing.length > 0) {
    const row = existing[0];
    const updated = {
      bestScore: Math.max(row.bestScore, params.score),
      totalRolls: row.totalRolls + 1,
      totalScore: row.totalScore + params.score,
      jackpots: row.jackpots + (params.isJackpot ? 1 : 0),
      playerName: params.playerName ?? row.playerName,
    };
    await db
      .update(shakeStats)
      .set(updated)
      .where(eq(shakeStats.id, row.id));
    return { ...row, ...updated };
  }

  await db.insert(shakeStats).values({
    userId: params.userId,
    playerName: params.playerName ?? null,
    game: params.game,
    // bestScore tracks the best single win, so never let a loss seed it negative.
    bestScore: Math.max(0, params.score),
    totalRolls: 1,
    totalScore: params.score,
    jackpots: params.isJackpot ? 1 : 0,
  });
  const rows = await db
    .select()
    .from(shakeStats)
    .where(
      and(eq(shakeStats.userId, params.userId), eq(shakeStats.game, params.game))
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function getShakeStats(
  userId: number,
  game: "dice" | "klaklok"
) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(shakeStats)
    .where(and(eq(shakeStats.userId, userId), eq(shakeStats.game, game)))
    .limit(1);
  return rows.length > 0 ? rows[0] : null;
}

export async function getShakeLeaderboard(
  game: "dice" | "klaklok",
  topN: number = 20
) {
  const db = await getDb();
  if (!db) return [];
  // Klaklok is a betting game — rank by total winnings; dice by best roll.
  const order =
    game === "klaklok"
      ? [desc(shakeStats.totalScore), desc(shakeStats.bestScore)]
      : [desc(shakeStats.bestScore), desc(shakeStats.totalScore)];
  return await db
    .select()
    .from(shakeStats)
    .where(eq(shakeStats.game, game))
    .orderBy(...order)
    .limit(topN);
}

// ---------------------------------------------------------------------------
// Game visibility toggles (admin-managed)
// ---------------------------------------------------------------------------

/** Stored slug → enabled overrides. Games without a row default to enabled. */
export async function getGameToggleOverrides(): Promise<
  Record<string, boolean>
> {
  const db = await getDb();
  if (!db) return {};
  const rows = await db.select().from(appGames);
  const map: Record<string, boolean> = {};
  for (const row of rows) map[row.slug] = row.enabled;
  return map;
}

export async function setGameEnabled(slug: string, enabled: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db
    .select()
    .from(appGames)
    .where(eq(appGames.slug, slug))
    .limit(1);
  if (existing.length > 0) {
    await db
      .update(appGames)
      .set({ enabled })
      .where(eq(appGames.slug, slug));
  } else {
    await db.insert(appGames).values({ slug, enabled });
  }
}
