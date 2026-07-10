/**
 * Shake-game logic (pure, testable): the two shake-to-roll games.
 *
 *  - "dice": roll two six-sided dice; score is the pip total.
 *  - "klaklok": the Cambodian "Kla Klouk" game — roll three symbols drawn from
 *    tiger, gourd, shrimp, fish, chicken (rooster) and crab; score rewards
 *    matching symbols.
 *
 * Rolls are produced server-side (using an injectable RNG for tests) so the
 * leaderboard can't be gamed by a client reporting its own results.
 */

export type ShakeGame = "dice" | "klaklok";

/** A source of randomness in [0, 1); defaults to Math.random. */
export type Rng = () => number;

// ---------------------------------------------------------------------------
// Dice
// ---------------------------------------------------------------------------

export const DICE_COUNT = 2;
export const DIE_FACES = 6;

export type DiceRoll = {
  /** Each die's pip value, 1–6. */
  dice: number[];
  /** Sum of the dice — this is the roll's score. */
  total: number;
  /** True when every die shows the same value. */
  isDoubles: boolean;
};

export function rollDice(rng: Rng = Math.random, count = DICE_COUNT): DiceRoll {
  const dice: number[] = [];
  for (let i = 0; i < count; i++) {
    dice.push(1 + Math.floor(rng() * DIE_FACES));
  }
  const total = dice.reduce((sum, d) => sum + d, 0);
  const isDoubles = dice.length > 1 && dice.every(d => d === dice[0]);
  return { dice, total, isDoubles };
}

// ---------------------------------------------------------------------------
// Klaklok
// ---------------------------------------------------------------------------

export type KlaklokSymbol = {
  /** Stable id — also the icon id in the client icon registry. */
  id: string;
  /** English display name. */
  name: string;
  /** Khmer display name. */
  khmer: string;
};

/** The six faces of a Klaklok die, in the traditional order. */
export const KLAKLOK_SYMBOLS: readonly KlaklokSymbol[] = [
  { id: "tiger", name: "Tiger", khmer: "ខ្លា" },
  { id: "gourd", name: "Gourd", khmer: "ឃ្លោក" },
  { id: "shrimp", name: "Shrimp", khmer: "បង្គង" },
  { id: "fish", name: "Fish", khmer: "ត្រី" },
  { id: "chicken", name: "Rooster", khmer: "មាន់" },
  { id: "crab", name: "Crab", khmer: "ក្ដាម" },
] as const;

export const KLAKLOK_DICE_COUNT = 3;

export type KlaklokMatch = "triple" | "pair" | "single";

export type KlaklokRoll = {
  /** The three rolled symbol ids. */
  symbols: string[];
  /** Best match among the three symbols. */
  match: KlaklokMatch;
  /** Points for this roll. */
  score: number;
};

const KLAKLOK_SCORES: Record<KlaklokMatch, number> = {
  triple: 30,
  pair: 10,
  single: 5,
};

/** Classify three symbols as a triple, a pair, or all-different. */
export function classifyKlaklok(symbols: string[]): KlaklokMatch {
  const counts = new Map<string, number>();
  for (const s of symbols) counts.set(s, (counts.get(s) ?? 0) + 1);
  const max = Math.max(...Array.from(counts.values()));
  if (max >= 3) return "triple";
  if (max === 2) return "pair";
  return "single";
}

export function rollKlaklok(
  rng: Rng = Math.random,
  count = KLAKLOK_DICE_COUNT
): KlaklokRoll {
  const symbols: string[] = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(rng() * KLAKLOK_SYMBOLS.length);
    symbols.push(KLAKLOK_SYMBOLS[idx].id);
  }
  const match = classifyKlaklok(symbols);
  return { symbols, match, score: KLAKLOK_SCORES[match] };
}

export function getKlaklokSymbol(id: string): KlaklokSymbol | undefined {
  return KLAKLOK_SYMBOLS.find(s => s.id === id);
}

export function isKlaklokSymbol(id: string): boolean {
  return KLAKLOK_SYMBOLS.some(s => s.id === id);
}

// ---------------------------------------------------------------------------
// Klaklok betting — the authentic payout: pick a symbol, stake chips, and win
// by how many of that symbol land. Miss = lose the stake; one/two/three land =
// win 1×/2×/3× the stake (the traditional Kla Klouk / fish-prawn-crab payout).
// ---------------------------------------------------------------------------

/** Stakes a player can bet, in chips. */
export const KLAKLOK_STAKES = [5, 10, 25, 50] as const;

export function isKlaklokStake(value: number): boolean {
  return (KLAKLOK_STAKES as readonly number[]).includes(value);
}

export type KlaklokBet = {
  /** The three rolled symbol ids. */
  symbols: string[];
  /** The symbol the player bet on. */
  pick: string;
  /** Chips staked. */
  stake: number;
  /** How many of the three dice matched the pick (0–3). */
  count: number;
  /** Net chips: +count×stake on a hit, −stake on a miss. */
  net: number;
  /** Payout multiplier applied to the stake (0 on a miss). */
  multiplier: number;
  /** True when all three dice matched the pick. */
  isJackpot: boolean;
};

/** Settle a Klaklok bet against a rolled set of symbols. */
export function scoreKlaklokBet(
  symbols: string[],
  pick: string,
  stake: number
): KlaklokBet {
  const count = symbols.filter(s => s === pick).length;
  const net = count > 0 ? count * stake : -stake;
  return {
    symbols,
    pick,
    stake,
    count,
    net,
    multiplier: count,
    isJackpot: count === 3,
  };
}

/** A "jackpot" is the headline win a game tracks a running count of. */
export function isDiceJackpot(roll: DiceRoll): boolean {
  return roll.isDoubles;
}

export function isKlaklokJackpot(roll: KlaklokRoll): boolean {
  return roll.match === "triple";
}
