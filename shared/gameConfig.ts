/**
 * PairUp Game Configuration
 * Defines themes, card pairs, and game settings
 */

export const THEMES = {
  Products: "Products",
  Features: "Features",
  TeamMembers: "Team Members",
} as const;

export const GRID_SIZES = {
  easy: "4x4",
  medium: "6x6",
  hard: "8x8",
} as const;

export const GRID_DIMENSIONS = {
  "4x4": { rows: 4, cols: 4, total: 16 },
  "6x6": { rows: 6, cols: 6, total: 36 },
  "8x8": { rows: 8, cols: 8, total: 64 },
} as const;

/**
 * Card pairs for each theme
 * Each pair has a term and its matching definition/benefit
 */
export const CARD_PAIRS = {
  Products: [
    { id: 1, term: "CloudSync", definition: "Real-time data synchronization" },
    { id: 2, term: "DataVault", definition: "Secure encrypted storage" },
    { id: 3, term: "SpeedBoost", definition: "Performance optimization engine" },
    { id: 4, term: "SmartAnalytics", definition: "AI-powered insights" },
    { id: 5, term: "TeamFlow", definition: "Collaboration platform" },
    { id: 6, term: "SecureGate", definition: "Advanced security layer" },
    { id: 7, term: "AutoScale", definition: "Automatic resource management" },
    { id: 8, term: "InsightHub", definition: "Business intelligence dashboard" },
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
  Features: [
    { id: 1, term: "Real-time Sync", definition: "Instant data updates" },
    { id: 2, term: "End-to-End Encryption", definition: "Complete data protection" },
    { id: 3, term: "Auto-scaling", definition: "Handles traffic spikes" },
    { id: 4, term: "Machine Learning", definition: "Smart predictions" },
    { id: 5, term: "Multi-user Collaboration", definition: "Work together seamlessly" },
    { id: 6, term: "Two-Factor Authentication", definition: "Enhanced security" },
    { id: 7, term: "Load Balancing", definition: "Optimal resource distribution" },
    { id: 8, term: "Advanced Reporting", definition: "Comprehensive analytics" },
    { id: 9, term: "One-click Deploy", definition: "Instant go-live" },
    { id: 10, term: "API Integration", definition: "Connect any system" },
    { id: 11, term: "Intrusion Detection", definition: "Threat prevention" },
    { id: 12, term: "Data Pipeline", definition: "Automated workflows" },
    { id: 13, term: "REST API", definition: "Easy integration" },
    { id: 14, term: "Query Optimization", definition: "Faster searches" },
    { id: 15, term: "Blue-Green Deploy", definition: "Zero-downtime updates" },
    { id: 16, term: "CDN Distribution", definition: "Global content delivery" },
    { id: 17, term: "Carbon Neutral", definition: "Eco-friendly operations" },
    { id: 18, term: "Quantum-ready", definition: "Future-proof encryption" },
    { id: 19, term: "Image Recognition", definition: "Visual understanding" },
    { id: 20, term: "Voice Commands", definition: "Hands-free control" },
    { id: 21, term: "Microsecond Response", definition: "Lightning-fast replies" },
    { id: 22, term: "Predictive Analytics", definition: "Forecast trends" },
    { id: 23, term: "Unified Dashboard", definition: "Single control center" },
    { id: 24, term: "Cutting-edge Tech", definition: "Latest innovations" },
    { id: 25, term: "Intelligent Routing", definition: "Smart path selection" },
    { id: 26, term: "Peak Performance", definition: "Maximum efficiency" },
    { id: 27, term: "Rapid Processing", definition: "Quick execution" },
    { id: 28, term: "Crystal Quality", definition: "Pristine clarity" },
    { id: 29, term: "Fortress Security", definition: "Military-grade protection" },
    { id: 30, term: "Optimized Code", definition: "Lean efficiency" },
    { id: 31, term: "Perfect Symmetry", definition: "Balanced design" },
    { id: 32, term: "Premium Support", definition: "Elite service tier" },
  ],
  TeamMembers: [
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
} as const;

export type Theme = keyof typeof THEMES;
export type GridSize = keyof typeof GRID_SIZES;
export type CardPair = (typeof CARD_PAIRS)[Theme][number];

/**
 * Get card pairs for a specific theme
 * Returns only the number needed for the grid size
 */
export function getCardPairsForTheme(theme: Theme, gridSize: string): CardPair[] {
  const dimensions = GRID_DIMENSIONS[gridSize as keyof typeof GRID_DIMENSIONS];
  if (!dimensions) throw new Error(`Invalid grid size: ${gridSize}`);
  
  const pairsNeeded = dimensions.total / 2;
  const themePairs = CARD_PAIRS[theme];
  
  return themePairs.slice(0, pairsNeeded);
}

/**
 * Create shuffled deck of cards from pairs
 * Each pair appears twice (term and definition)
 */
export function createShuffledDeck(pairs: CardPair[]) {
  const deck: Array<{ pairId: number; text: string; isMatch: boolean }> = [];
  
  pairs.forEach((pair) => {
    deck.push({ pairId: pair.id, text: pair.term, isMatch: false });
    deck.push({ pairId: pair.id, text: pair.definition, isMatch: false });
  });
  
  // Fisher-Yates shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  
  return deck;
}
