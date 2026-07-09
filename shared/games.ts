/**
 * The catalog of games the app (and the Telegram mini app) can present.
 *
 * Admins toggle these on/off in the admin portal; a game with no stored row is
 * treated as enabled. This list is the single source of truth shared by the
 * home screen, the admin portal, and the server.
 */

export type GameId = "memory" | "photos" | "dice" | "klaklok" | "walk";

export type GameCatalogEntry = {
  id: GameId;
  /** Human-readable name shown to players and admins. */
  name: string;
  /** Short blurb for cards / admin rows. */
  description: string;
  /** Client route the game lives at. */
  path: string;
};

export const GAME_CATALOG: readonly GameCatalogEntry[] = [
  {
    id: "memory",
    name: "Memory Match",
    description: "Flip cards to match pairs of Cambodian temples & culture.",
    path: "/",
  },
  {
    id: "photos",
    name: "My Photos",
    description: "Upload your own pictures and match them.",
    path: "/photos",
  },
  {
    id: "dice",
    name: "Shake Dice",
    description: "Shake your phone to roll the dice.",
    path: "/dice",
  },
  {
    id: "klaklok",
    name: "Klaklok",
    description: "Cambodia's tiger–gourd–fish shake game.",
    path: "/klaklok",
  },
  {
    id: "walk",
    name: "Walking Challenge",
    description: "Hit your daily step goal and keep your streak.",
    path: "/walk",
  },
];

export const GAME_IDS: readonly GameId[] = GAME_CATALOG.map(g => g.id);

export function isGameId(value: string): value is GameId {
  return GAME_IDS.includes(value as GameId);
}

/** A game's enabled state, with the "missing row = enabled" default applied. */
export type GameToggle = { id: GameId; enabled: boolean };

/**
 * Merge stored overrides (slug → enabled) onto the catalog, defaulting any
 * game without a stored row to enabled.
 */
export function resolveGameToggles(
  overrides: Record<string, boolean>
): GameToggle[] {
  return GAME_CATALOG.map(g => ({
    id: g.id,
    enabled: overrides[g.id] ?? true,
  }));
}
