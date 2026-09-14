import type { ExtractedColor } from "@/store/extractionStore";
import { rgbToString, darkenColor as darkenRgb } from "@chromadance/core";

/** rgb(...) string for an extracted color. */
export const rgbString = (color: ExtractedColor) => rgbToString(color.rgb);

/** Same color, but darker — used for borders/text against a color's own swatch. */
export const darkenColor = (color: ExtractedColor, amount = 0.35) =>
  darkenRgb(color.rgb, amount);
