export { Chromadance } from "./Chromadance";
export type { ChromadanceProps } from "./Chromadance";

export { ChromadanceContext, useChromadance } from "./context";
export type { ChromadanceContextValue } from "./context";

export { useChromadanceExtraction } from "./useChromadanceExtraction";
export type {
  ExtractionResult,
  ExtractionStatus,
  ExtractionOptions,
} from "./useChromadanceExtraction";

export { sourceToCanvas } from "./loadImage";
export type { ImageSource } from "./loadImage";

// Re-export the core token/color types most consumers will want alongside the
// React API, so a single import from "@chromadance/react" is enough.
export type {
  RGB,
  ExtractedColor,
  PaletteColor,
  UiTokenColor,
  ThemeMode,
} from "@chromadance/core";
