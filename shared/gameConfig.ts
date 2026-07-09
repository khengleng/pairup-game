/**
 * PairUp Game Configuration
 * Defines themes, card pairs, and game settings
 */

export const GRID_SIZES = {
  easy: "4x4",
  medium: "6x6",
  hard: "8x8",
} as const;

export const GRID_SIZE_OPTIONS = Object.entries(GRID_SIZES).map(
  ([id, label]) => ({
    id,
    label,
  })
);

export const GRID_SIZE_VALUES = Object.values(GRID_SIZES);

export const GRID_DIMENSIONS = {
  "4x4": { rows: 4, cols: 4, total: 16 },
  "6x6": { rows: 6, cols: 6, total: 36 },
  "8x8": { rows: 8, cols: 8, total: 64 },
} as const;

export type CardPair = {
  id: number;
  term: string;
  definition: string;
  /**
   * When set, this is an *image* pair: both cards of the pair show this icon
   * (matched by the client icon registry). `term`/`definition` hold the label.
   */
  icon?: string;
};

export type GameTheme = {
  id: string;
  name: string;
  description: string;
  /**
   * "words" (default) matches a term with its definition; "images" matches two
   * identical picture cards. Drives how the client renders each card face.
   */
  kind?: "words" | "images";
  pairs: CardPair[];
};

/**
 * Bundled word-matching themes (term ↔ definition).
 * Add a new object here with at least 32 pairs to make it available in the UI.
 */
const WORD_THEMES = [
  {
    id: "products",
    name: "Products",
    description: "Match product names with their descriptions",
    pairs: [
      {
        id: 1,
        term: "CloudSync",
        definition: "Real-time data synchronization",
      },
      { id: 2, term: "DataVault", definition: "Secure encrypted storage" },
      {
        id: 3,
        term: "SpeedBoost",
        definition: "Performance optimization engine",
      },
      { id: 4, term: "SmartAnalytics", definition: "AI-powered insights" },
      { id: 5, term: "TeamFlow", definition: "Collaboration platform" },
      { id: 6, term: "SecureGate", definition: "Advanced security layer" },
      { id: 7, term: "AutoScale", definition: "Automatic resource management" },
      {
        id: 8,
        term: "InsightHub",
        definition: "Business intelligence dashboard",
      },
      { id: 9, term: "FastTrack", definition: "Quick deployment system" },
      { id: 10, term: "ProConnect", definition: "Enterprise integration" },
      { id: 11, term: "CloudGuard", definition: "Threat detection system" },
      { id: 12, term: "DataFlow", definition: "Seamless data pipeline" },
      { id: 13, term: "PowerAPI", definition: "Robust API framework" },
      { id: 14, term: "SmartCache", definition: "Intelligent caching layer" },
      { id: 15, term: "ZeroDowntime", definition: "Continuous availability" },
      { id: 16, term: "GlobalReach", definition: "Multi-region deployment" },
      { id: 17, term: "EcoMode", definition: "Energy-efficient operations" },
      { id: 18, term: "QuantumShield", definition: "Post-quantum encryption" },
      { id: 19, term: "VisionAI", definition: "Computer vision capabilities" },
      { id: 20, term: "SoundWave", definition: "Audio processing engine" },
      { id: 21, term: "LightSpeed", definition: "Ultra-fast transactions" },
      { id: 22, term: "MindMeld", definition: "Predictive analytics" },
      { id: 23, term: "FusionCore", definition: "Unified platform core" },
      { id: 24, term: "NexGen", definition: "Next-generation technology" },
      { id: 25, term: "PrimeLogic", definition: "Advanced algorithms" },
      { id: 26, term: "StellarPerf", definition: "Outstanding performance" },
      { id: 27, term: "VortexSpeed", definition: "Extreme velocity" },
      { id: 28, term: "CrystalClear", definition: "Perfect clarity" },
      { id: 29, term: "IronClad", definition: "Unbreakable security" },
      { id: 30, term: "SilverLining", definition: "Optimized efficiency" },
      { id: 31, term: "GoldenRatio", definition: "Perfect balance" },
      { id: 32, term: "DiamondEdge", definition: "Premium quality" },
    ],
  },
  {
    id: "features",
    name: "Features",
    description: "Match features with their benefits",
    pairs: [
      { id: 1, term: "Real-time Sync", definition: "Instant data updates" },
      {
        id: 2,
        term: "End-to-End Encryption",
        definition: "Complete data protection",
      },
      { id: 3, term: "Auto-scaling", definition: "Handles traffic spikes" },
      { id: 4, term: "Machine Learning", definition: "Smart predictions" },
      {
        id: 5,
        term: "Multi-user Collaboration",
        definition: "Work together seamlessly",
      },
      {
        id: 6,
        term: "Two-Factor Authentication",
        definition: "Enhanced security",
      },
      {
        id: 7,
        term: "Load Balancing",
        definition: "Optimal resource distribution",
      },
      {
        id: 8,
        term: "Advanced Reporting",
        definition: "Comprehensive analytics",
      },
      { id: 9, term: "One-click Deploy", definition: "Instant go-live" },
      { id: 10, term: "API Integration", definition: "Connect any system" },
      { id: 11, term: "Intrusion Detection", definition: "Threat prevention" },
      { id: 12, term: "Data Pipeline", definition: "Automated workflows" },
      { id: 13, term: "REST API", definition: "Easy integration" },
      { id: 14, term: "Query Optimization", definition: "Faster searches" },
      {
        id: 15,
        term: "Blue-Green Deploy",
        definition: "Zero-downtime updates",
      },
      {
        id: 16,
        term: "CDN Distribution",
        definition: "Global content delivery",
      },
      { id: 17, term: "Carbon Neutral", definition: "Eco-friendly operations" },
      { id: 18, term: "Quantum-ready", definition: "Future-proof encryption" },
      { id: 19, term: "Image Recognition", definition: "Visual understanding" },
      { id: 20, term: "Voice Commands", definition: "Hands-free control" },
      {
        id: 21,
        term: "Microsecond Response",
        definition: "Lightning-fast replies",
      },
      { id: 22, term: "Predictive Analytics", definition: "Forecast trends" },
      {
        id: 23,
        term: "Unified Dashboard",
        definition: "Single control center",
      },
      { id: 24, term: "Cutting-edge Tech", definition: "Latest innovations" },
      {
        id: 25,
        term: "Intelligent Routing",
        definition: "Smart path selection",
      },
      { id: 26, term: "Peak Performance", definition: "Maximum efficiency" },
      { id: 27, term: "Rapid Processing", definition: "Quick execution" },
      { id: 28, term: "Crystal Quality", definition: "Pristine clarity" },
      {
        id: 29,
        term: "Fortress Security",
        definition: "Military-grade protection",
      },
      { id: 30, term: "Optimized Code", definition: "Lean efficiency" },
      { id: 31, term: "Perfect Symmetry", definition: "Balanced design" },
      { id: 32, term: "Premium Support", definition: "Elite service tier" },
    ],
  },
  {
    id: "team-members",
    name: "Team Members",
    description: "Match team members with their roles",
    pairs: [
      { id: 1, term: "Alice Chen", definition: "Product Lead" },
      { id: 2, term: "Bob Martinez", definition: "Engineering Manager" },
      { id: 3, term: "Carol Singh", definition: "UX Designer" },
      { id: 4, term: "David Kim", definition: "Backend Engineer" },
      { id: 5, term: "Emma Johnson", definition: "Frontend Developer" },
      { id: 6, term: "Frank Lee", definition: "Security Officer" },
      { id: 7, term: "Grace Wu", definition: "DevOps Engineer" },
      { id: 8, term: "Henry Brown", definition: "QA Lead" },
      { id: 9, term: "Iris Patel", definition: "Data Scientist" },
      { id: 10, term: "Jack Wilson", definition: "Solutions Architect" },
      { id: 11, term: "Karen Davis", definition: "Marketing Manager" },
      { id: 12, term: "Leo Thompson", definition: "Business Analyst" },
      { id: 13, term: "Mia Anderson", definition: "HR Specialist" },
      { id: 14, term: "Noah Taylor", definition: "Finance Director" },
      { id: 15, term: "Olivia Garcia", definition: "Sales Executive" },
      { id: 16, term: "Paul Rodriguez", definition: "Operations Manager" },
      { id: 17, term: "Quinn Roberts", definition: "Community Manager" },
      { id: 18, term: "Rachel Green", definition: "Content Writer" },
      { id: 19, term: "Sam Jackson", definition: "Mobile Developer" },
      { id: 20, term: "Tina White", definition: "Product Manager" },
      { id: 21, term: "Uma Verma", definition: "Tech Lead" },
      { id: 22, term: "Victor Chen", definition: "Infrastructure Engineer" },
      { id: 23, term: "Wendy Liu", definition: "Brand Designer" },
      { id: 24, term: "Xavier Lopez", definition: "Full Stack Developer" },
      { id: 25, term: "Yara Hassan", definition: "Research Lead" },
      { id: 26, term: "Zoe Martin", definition: "Customer Success" },
      { id: 27, term: "Adam Scott", definition: "API Specialist" },
      { id: 28, term: "Bella Moore", definition: "Performance Expert" },
      { id: 29, term: "Chris Evans", definition: "System Architect" },
      { id: 30, term: "Diana Prince", definition: "Security Engineer" },
      { id: 31, term: "Ethan Hunt", definition: "Integration Lead" },
      { id: 32, term: "Fiona Apple", definition: "Quality Assurance" },
    ],
  },
] as const satisfies readonly GameTheme[];

/**
 * Image-matching theme: match two identical pictures of Cambodian temples,
 * culture and wildlife. Each entry's `icon` id MUST have a matching component
 * in the client icon registry (client/src/lib/khmerIcons.tsx → KHMER_ICONS);
 * keep this list in sync with MEMORY_ICON_IDS there.
 */
const CAMBODIA_IMAGE_PAIRS: ReadonlyArray<{ icon: string; label: string }> = [
  { icon: "angkor-wat", label: "Angkor Wat" },
  { icon: "bayon-face", label: "Bayon Face" },
  { icon: "ta-prohm", label: "Ta Prohm" },
  { icon: "banteay-srei", label: "Banteay Srei" },
  { icon: "preah-vihear", label: "Preah Vihear" },
  { icon: "angkor-thom-gate", label: "Angkor Thom Gate" },
  { icon: "stupa", label: "Stupa" },
  { icon: "prasat-tower", label: "Prasat Tower" },
  { icon: "silver-pagoda", label: "Silver Pagoda" },
  { icon: "independence-monument", label: "Independence Monument" },
  { icon: "apsara-dancer", label: "Apsara Dancer" },
  { icon: "monk", label: "Monk" },
  { icon: "krama-scarf", label: "Krama Scarf" },
  { icon: "oxcart", label: "Oxcart" },
  { icon: "pirogue-boat", label: "Pirogue Boat" },
  { icon: "tuk-tuk", label: "Tuk-Tuk" },
  { icon: "drum", label: "Skor Drum" },
  { icon: "khmer-mask", label: "Khmer Mask" },
  { icon: "lotus", label: "Lotus" },
  { icon: "incense-holder", label: "Incense" },
  { icon: "palm-sugar-pot", label: "Palm Sugar" },
  { icon: "elephant", label: "Elephant" },
  { icon: "water-buffalo", label: "Water Buffalo" },
  { icon: "gecko", label: "Gecko" },
  { icon: "naga-serpent", label: "Naga" },
  { icon: "garuda", label: "Garuda" },
  { icon: "hamsa-bird", label: "Hamsa Bird" },
  { icon: "sugar-palm-tree", label: "Sugar Palm" },
  { icon: "coconut", label: "Coconut" },
  { icon: "rice-bowl", label: "Rice Bowl" },
  { icon: "jasmine-flower", label: "Jasmine" },
  { icon: "kouprey", label: "Kouprey" },
];

const CAMBODIA_THEME: GameTheme = {
  id: "cambodia",
  name: "Cambodia",
  kind: "images",
  description: "Match the temples, culture & wildlife of Cambodia",
  pairs: CAMBODIA_IMAGE_PAIRS.map((entry, index) => ({
    id: index + 1,
    term: entry.label,
    definition: entry.label,
    icon: entry.icon,
  })),
};

/**
 * All bundled themes shown in the UI. The Cambodia image theme leads so new
 * players see the picture-matching game first (words are harder to parse).
 */
export const GAME_THEMES: readonly GameTheme[] = [CAMBODIA_THEME, ...WORD_THEMES];

export type GridSize = keyof typeof GRID_SIZES;
export type GridSizeValue = (typeof GRID_SIZES)[GridSize];

export const THEMES = Object.fromEntries(
  GAME_THEMES.map(theme => [theme.id, theme.name])
) as Record<string, string>;

export const CARD_PAIRS = Object.fromEntries(
  GAME_THEMES.map(theme => [theme.name, theme.pairs])
) as Record<string, CardPair[]>;

export function isThemeName(themeName: string): boolean {
  return GAME_THEMES.some(theme => theme.name === themeName);
}

export function isGridSizeValue(gridSize: string): gridSize is GridSizeValue {
  return GRID_SIZE_VALUES.includes(gridSize as GridSizeValue);
}

export function getThemeById(themeId: string): GameTheme | undefined {
  return GAME_THEMES.find(theme => theme.id === themeId);
}

export function getThemeByName(themeName: string): GameTheme | undefined {
  return GAME_THEMES.find(theme => theme.name === themeName);
}

/**
 * Get card pairs for a specific theme
 * Returns only the number needed for the grid size
 */
export function getCardPairsForTheme(
  themeName: string,
  gridSize: string
): CardPair[] {
  const dimensions = GRID_DIMENSIONS[gridSize as keyof typeof GRID_DIMENSIONS];
  if (!dimensions) throw new Error(`Invalid grid size: ${gridSize}`);

  const pairsNeeded = dimensions.total / 2;
  const themePairs = getThemeByName(themeName)?.pairs;
  if (!themePairs) throw new Error(`Invalid theme: ${themeName}`);

  return themePairs.slice(0, pairsNeeded);
}

export type DeckCard = {
  pairId: number;
  text: string;
  /** Icon id for image pairs; absent for word pairs. */
  icon?: string;
  isMatch: boolean;
};

/**
 * Expand a pair into its two face-up cards. Word pairs become a term card and a
 * definition card; image pairs become two identical picture cards.
 */
function pairToCards(pair: CardPair): [DeckCard, DeckCard] {
  if (pair.icon) {
    return [
      { pairId: pair.id, text: pair.term, icon: pair.icon, isMatch: false },
      { pairId: pair.id, text: pair.definition, icon: pair.icon, isMatch: false },
    ];
  }
  return [
    { pairId: pair.id, text: pair.term, isMatch: false },
    { pairId: pair.id, text: pair.definition, isMatch: false },
  ];
}

/**
 * Create shuffled deck of cards from pairs
 * Each pair appears twice (term and definition, or two identical images)
 */
export function createShuffledDeck(pairs: CardPair[]): DeckCard[] {
  const deck: DeckCard[] = pairs.flatMap(pairToCards);

  // Fisher-Yates shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
}

// ---------------------------------------------------------------------------
// Daily challenge: a deterministic board everyone gets for a given day.
// ---------------------------------------------------------------------------

/** Deterministic 32-bit seed from a string. */
export function hashStringToSeed(input: string): number {
  let hash = 2166136261; // FNV-1a offset basis
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Small seeded PRNG (mulberry32) returning [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic deck shuffle from a seed — same seed → same board. */
export function createSeededDeck(pairs: CardPair[], seed: number): DeckCard[] {
  const deck: DeckCard[] = pairs.flatMap(pairToCards);

  const rand = mulberry32(seed);
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

/** UTC date key "YYYY-MM-DD" used to scope the daily challenge. */
export function getDailyDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export type DailyChallenge = {
  date: string;
  theme: string;
  gridSize: GridSizeValue;
  seed: number;
};

/**
 * Pick the day's challenge deterministically from the date + available themes.
 * `themeNames` should be passed sorted by the caller for stability.
 */
export function pickDailyChallenge(
  dateKey: string,
  themeNames: string[]
): DailyChallenge {
  const names = themeNames.length > 0 ? themeNames : ["Products"];
  const rand = mulberry32(hashStringToSeed(`challenge:${dateKey}`));
  const theme = names[Math.floor(rand() * names.length)];
  const gridSize = GRID_SIZE_VALUES[
    Math.floor(rand() * GRID_SIZE_VALUES.length)
  ] as GridSizeValue;
  const seed = hashStringToSeed(`${dateKey}:${theme}:${gridSize}`);
  return { date: dateKey, theme, gridSize, seed };
}

/** The deck seed for a given daily challenge (client + server agree on this). */
export function dailyDeckSeed(
  dateKey: string,
  theme: string,
  gridSize: string
): number {
  return hashStringToSeed(`${dateKey}:${theme}:${gridSize}`);
}
