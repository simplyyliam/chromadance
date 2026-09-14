// Re-exports the seed-selection (King Of The Colors) tournament from
// @chromadance/core. Implementation lives in the package.
export {
  createSeedTournament,
  scoreContender,
  fight,
  SEED_RULES,
} from "@chromadance/core";

export type {
  SeedRule,
  SeedScore,
  SeedBattle,
  SeedTournament,
} from "@chromadance/core";
