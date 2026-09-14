// This module now re-exports the framework-agnostic palette/HCT logic from
// @chromadance/core. The implementation lives in the package; the app keeps
// this file as a stable import path for existing feature code.
export {
  generateHctTokens,
  generateHctPalette,
  generateHslPalette,
  tokensToCssVariables,
  HCT_ROLES,
  UI_TOKENS,
  PALETTE_TONES,
} from "@chromadance/core";

export type {
  Seed,
  HctRole,
  UiToken,
  UiTokenColor,
  PaletteTone,
  PaletteColor,
} from "@chromadance/core";
