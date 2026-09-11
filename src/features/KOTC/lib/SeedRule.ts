// Each rule:

// - receives one extracted color
// - returns a normalized score between `0` and `1`
// - has a `weight` controlling its importance

import type { ExtractedColor } from "@/store/extractionStore"

export type SeedRule = {
  name: string
  weight: number
  score: (color: ExtractedColor) => number // Returns a score between 0 and 1 with the highest score having a chance of wining
}

const channel = (value: number) => value / 255

// Rewarding vivid colors. Dull colors = 0, and Strong colors= 1
const saturationRule: SeedRule = {
  name: "Vibrance",
  weight: 1.2,

  score: ({ rgb }) => {
    const highest = Math.max(rgb.r, rgb.g, rgb.b)
    const lowest = Math.min(rgb.r, rgb.g, rgb.b)

    if (highest === 0) return 0

    return (highest - lowest) / highest
  }
}

// Rewards colors that arent almost blacks, and whites. Mid-range luminance gets the highest score
const balanceRule: SeedRule = {
  name: "Balance",
  weight: 0.8,
  score: ({ rgb }) => {
    const luminance =
      channel(rgb.r) * 0.2126 +
      channel(rgb.g) * 0.7152 +
      channel(rgb.b) * 0.0722

    return 1 - Math.abs(luminance - 0.5) * 2
  }
}


// Rewards the colors with the strongest channel separation, giving the colors a clear identity (presence)
const presenceRuleL: SeedRule = {
  name: "Presence",
  weight: 1,
  score: ({ rgb }) => {
    const values = [rgb.r, rgb.g, rgb.b]
    return (Math.max(...values) - Math.min(...values)) / 255
  }
}


// This preserves the individual scores for displaying them and to see why a contender won:

// Vibrance: 0.82
// Balance: 0.66
// Presence: 0.79
// Total: 2.09

export const SEED_RULES: SeedRule[] = [
  saturationRule,
  balanceRule,
  presenceRuleL
]

export type SeedScore = {
  total: number,
  rules: {
    name: string
    score: number,
    weightedScore: number
  }[]
}

export const scoreContender = (color: ExtractedColor, rules = SEED_RULES): SeedScore => {
  const results = rules.map((rule) => {
    const score = rule.score(color)
    return {
      name: rule.name,
      score,
      weightedScore: score * rule.weight
    }
  })

  return {
    total: results.reduce((total, result) => total + result.weightedScore, 0),
    rules: results
  }
}


export type SeedBattle = {
  challenger: ExtractedColor
  defender: ExtractedColor
  challengerScore: SeedScore
  defendererScore: SeedScore
  winner: ExtractedColor
  loser: ExtractedColor
}


export const fight = (challenger: ExtractedColor, defender: ExtractedColor): SeedBattle => {
  const challengerScore = scoreContender(challenger)
  const defendererScore = scoreContender(challenger)

  const challengerWins =
    challengerScore.total > defendererScore.total ||
    (
      challengerScore.total === defendererScore.total &&
      challenger.id.localeCompare(defender.id) < 0 // id.localeCompare is deterministic (tie-breaker). This is set because using a method like Math.random would make the winner change every time.
    )

  return {
    challenger,
    defender,
    challengerScore,
    defendererScore,
    winner: challengerWins ? challenger : defender,
    loser: challengerWins ? defender : challenger
  }
}

// This finds the KOTC (King of The Colors) and gets the Seed. 

// Round 1:
// A vs B → A wins
// C vs D → D wins

// Round 2:
// A vs D → D wins

// The Seed: D

export type SeedTournament = {
  battles: SeedBattle[]
  seed: ExtractedColor | null
}

export const createSeedTournament = (contenders: ExtractedColor[]): SeedTournament => {
  if (contenders.length === 0) {
    return {
      battles: [],
      seed: null
    }
  }

  const remaining = [...contenders]
  const battles: SeedBattle[] = []
  while (remaining.length > 1) {
    const nextRound: ExtractedColor[] = []
    for (let i = 0; i < remaining.length; i += 2) {
      const challenger = remaining[i]
      const defender = remaining[i + 1]

      // Unpaired contender now advances
      if (!defender) {
        nextRound.push(challenger)
        continue
      }

      const battle = fight(challenger, defender)
      
      battles.push(battle)
      nextRound.push(battle.winner)
    }

    remaining.splice(0, remaining.length, ...nextRound)
  }
  
  return {
    battles, 
    seed: remaining[0]
  }
}
