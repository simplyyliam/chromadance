// Types
export type { RGB, ExtractedColor, PaletteColor, ThemeMode } from "./types";

// Color utilities
export {
  rgbToHex,
  rgbToString,
  averageRgba,
  luminance,
  contrastText,
  rgbToHsl,
  hslToRgb,
  darkenColor,
} from "./color/utils";

// Canvas sampling
export { sampleGridColors, extractRegion } from "./color/sample";

// HCT tokens + palettes
export {
  generateHctTokens,
  generateHctPalette,
  generateHslPalette,
  tokensToCssVariables,
  HCT_ROLES,
  UI_TOKENS,
  PALETTE_TONES,
} from "./hct/tokens";
export type {
  Seed,
  HctRole,
  UiToken,
  UiTokenColor,
  PaletteTone,
} from "./hct/tokens";

// Seed selection (King Of The Colors)
export {
  createSeedTournament,
  scoreContender,
  fight,
  SEED_RULES,
} from "./seed/tournament";
export type {
  SeedRule,
  SeedScore,
  SeedBattle,
  SeedTournament,
} from "./seed/tournament";
