import type { RGB } from "../types";

const toHexByte = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");

/** `{ r, g, b }` → `#rrggbb`. */
export const rgbToHex = ({ r, g, b }: RGB): string => `#${toHexByte(r)}${toHexByte(g)}${toHexByte(b)}`;

/** `{ r, g, b }` → `rgb(r, g, b)`. */
export const rgbToString = ({ r, g, b }: RGB): string => `rgb(${r}, ${g}, ${b})`;

/**
 * Averages a flat RGBA byte buffer (as returned by `CanvasRenderingContext2D
 * .getImageData().data`) into a single mean color.
 */
export const averageRgba = (data: Uint8ClampedArray): RGB & { color: string } => {
  let r = 0;
  let g = 0;
  let b = 0;

  for (let i = 0; i < data.length; i += 4) {
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
  }

  const pixels = data.length / 4;
  const rVal = pixels > 0 ? Math.round(r / pixels) : 0;
  const gVal = pixels > 0 ? Math.round(g / pixels) : 0;
  const bVal = pixels > 0 ? Math.round(b / pixels) : 0;

  return { r: rVal, g: gVal, b: bVal, color: `rgb(${rVal} ${gVal} ${bVal})` };
};

/** Relative luminance (0–1) using the sRGB coefficients. */
export const luminance = ({ r, g, b }: RGB): number =>
  (r * 0.2126 + g * 0.7152 + b * 0.0722) / 255;

/** Picks black or white for readable text on top of the given color. */
export const contrastText = (rgb: RGB): "#000000" | "#ffffff" =>
  luminance(rgb) > 0.6 ? "#000000" : "#ffffff";

type HSL = { h: number; s: number; l: number };

/** RGB (0–255) → HSL (h in [0,1), s/l in [0,1]). */
export const rgbToHsl = ({ r, g, b }: RGB): HSL => {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;

  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;

  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
    else if (max === gn) h = ((bn - rn) / d + 2) / 6;
    else h = ((rn - gn) / d + 4) / 6;
  }

  return { h, s, l };
};

/** HSL → RGB (0–255). */
export const hslToRgb = ({ h, s, l }: HSL): RGB => {
  if (s === 0) {
    const v = Math.round(l * 255);
    return { r: v, g: v, b: v };
  }

  const hueToRgb = (p: number, q: number, t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  return {
    r: Math.round(hueToRgb(p, q, h + 1 / 3) * 255),
    g: Math.round(hueToRgb(p, q, h) * 255),
    b: Math.round(hueToRgb(p, q, h - 1 / 3) * 255),
  };
};

/** Returns an HSL css string for a darker variant of the given color. */
export const darkenColor = (rgb: RGB, amount = 0.35): string => {
  const { h, s, l } = rgbToHsl(rgb);
  const darkerL = Math.max(0, l * (1 - amount));
  return `hsl(${h * 360}, ${s * 100}%, ${darkerL * 100}%)`;
};
