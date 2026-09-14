import { averageRgba } from "@chromadance/core";

/** Averages an RGBA byte buffer into a single color. Backed by @chromadance/core. */
export const Unit8ToRGB = (data: Uint8ClampedArray) => averageRgba(data);
