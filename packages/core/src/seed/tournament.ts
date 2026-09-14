import type { ExtractedColor } from "../types";

/**
 * A scoring rule for picking a seed color. Each rule:
 * - receives one extracted color
 * - returns a normalized score between 0 and 1
 * - has a `weight` controlling its importance
 */
export type SeedRule = {
  name: string;
  weight: number;
  /** Returns a score in [0, 1]; higher scores are more likely to win. */
  score: (color: ExtractedColor) => number;
};

const channel = (value: number) => value / 255;

/** Rewards vivid colors: dull → 0, strong → 1. */
const saturationRule: SeedRule = {
  name: "Vibrance",
  weight: 1.2,
  score: ({ rgb }) => {
    const highest = Math.max(rgb.r, rgb.g, rgb.b);
    const lowest = Math.min(rgb.r, rgb.g, rgb.b);
    if (highest === 0) return 0;
    return (highest - lowest) / highest;
  },
};

/** Rewards mid-range luminance; near-black and near-white score low. */
const balanceRule: SeedRule = {
  name: "Balance",
  weight: 0.8,
  score: ({ rgb }) => {
    const lum = channel(rgb.r) * 0.2126 + channel(rgb.g) * 0.7152 + channel(rgb.b) * 0.0722;
    return 1 - Math.abs(lum - 0.5) * 2;
  },
};

/** Rewards strong channel separation, giving a color a clear identity. */
const presenceRule: SeedRule = {
  name: "Presence",
  weight: 1,
  score: ({ rgb }) => (Math.max(rgb.r, rgb.g, rgb.b) - Math.min(rgb.r, rgb.g, rgb.b)) / 255,
};

export const SEED_RULES: SeedRule[] = [saturationRule, balanceRule, presenceRule];

export type SeedScore = {
  total: number;
  rules: {
    name: string;
    score: number;
    weightedScore: number;
  }[];
};

export const scoreContender = (color: ExtractedColor, rules = SEED_RULES): SeedScore => {
  const results = rules.map((rule) => {
    const score = rule.score(color);
    return { name: rule.name, score, weightedScore: score * rule.weight };
  });

  return {
    total: results.reduce((total, result) => total + result.weightedScore, 0),
    rules: results,
  };
};

export type SeedBattle = {
  challenger: ExtractedColor;
  defender: ExtractedColor;
  challengerScore: SeedScore;
  defendererScore: SeedScore;
  winner: ExtractedColor;
  loser: ExtractedColor;
};

export const fight = (challenger: ExtractedColor, defender: ExtractedColor): SeedBattle => {
  const challengerScore = scoreContender(challenger);
  const defendererScore = scoreContender(defender);

  // Deterministic tie-breaker (id compare) so the winner never changes between
  // runs on identical input.
  const challengerWins =
    challengerScore.total > defendererScore.total ||
    (challengerScore.total === defendererScore.total &&
      challenger.id.localeCompare(defender.id) < 0);

  return {
    challenger,
    defender,
    challengerScore,
    defendererScore,
    winner: challengerWins ? challenger : defender,
    loser: challengerWins ? defender : challenger,
  };
};

export type SeedTournament = {
  battles: SeedBattle[];
  seed: ExtractedColor | null;
};

/**
 * Runs a single-elimination bracket over all contenders and returns the
 * King Of The Colors (the seed) plus every battle that happened.
 */
export const createSeedTournament = (contenders: ExtractedColor[]): SeedTournament => {
  if (contenders.length === 0) {
    return { battles: [], seed: null };
  }

  const remaining = [...contenders];
  const battles: SeedBattle[] = [];

  while (remaining.length > 1) {
    const nextRound: ExtractedColor[] = [];
    for (let i = 0; i < remaining.length; i += 2) {
      const challenger = remaining[i];
      const defender = remaining[i + 1];

      if (!defender) {
        nextRound.push(challenger);
        continue;
      }

      const battle = fight(challenger, defender);
      battles.push(battle);
      nextRound.push(battle.winner);
    }
    remaining.splice(0, remaining.length, ...nextRound);
  }

  return { battles, seed: remaining[0] };
};
