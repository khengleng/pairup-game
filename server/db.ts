import { eq, and, desc, asc, inArray } from "drizzle-orm";
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
} from "../drizzle/schema";
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

  return await db.insert(leads).values(leadData);
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
