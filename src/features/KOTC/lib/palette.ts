import { Hct, argbFromRgb, redFromArgb, greenFromArgb, blueFromArgb } from "@material/material-color-utilities";
import type { ExtractedColor } from "@/store/extractionStore";

export type PaletteColor = {
  id: string;
  name: string;
  rgb: { r: number; g: number; b: number };
  hex: string;
};

const toHex = (v: number) => v.toString(16).padStart(2, "0");

const toPaletteColor = (
  id: string,
  name: string,
  rgb: { r: number; g: number; b: number },
): PaletteColor => ({
  id,
  name,
  rgb,
  hex: `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`,
});

/* ============================================================================
 *  HSL PALETTE (original approximation) — single hue, 5 lightness/saturation
 *  stops. Kept as-is for comparison against the HCT rows below.
 * ==========================================================================*/

export type PaletteTone = {
  name: string;
  lightnessShift: number;
  saturationShift: number;
};

export const PALETTE_TONES: PaletteTone[] = [
  { name: "Lightest", lightnessShift: 0.32, saturationShift: -0.18 },
  { name: "Light", lightnessShift: 0.16, saturationShift: -0.06 },
  { name: "Seed", lightnessShift: 0, saturationShift: 0 },
  { name: "Dark", lightnessShift: -0.16, saturationShift: -0.04 },
  { name: "Darkest", lightnessShift: -0.3, saturationShift: -0.14 },
];

type HSL = { h: number; s: number; l: number };

const rgbToHsl = (r: number, g: number, b: number): HSL => {
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

const hslToRgb = ({ h, s, l }: HSL): { r: number; g: number; b: number } => {
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

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

const applyTone = (base: HSL, tone: PaletteTone): HSL => ({
  h: base.h,
  s: clamp01(base.s + tone.saturationShift),
  l: clamp01(base.l + tone.lightnessShift),
});

/** Original approximation: 5 tones of the seed's own hue, in HSL space. */
export const generateHslPalette = (
  seed: ExtractedColor,
  tones: PaletteTone[] = PALETTE_TONES,
): PaletteColor[] => {
  const baseHsl = rgbToHsl(seed.rgb.r, seed.rgb.g, seed.rgb.b);

  return tones.map((tone) => {
    const rgb = tone.name === "Seed" ? seed.rgb : hslToRgb(applyTone(baseHsl, tone));
    return toPaletteColor(`${seed.id}-hsl-${tone.name.toLowerCase()}`, tone.name, rgb);
  });
};

/* ============================================================================
 *  HCT PALETTE — Phase 1 (5 roles) + Phase 2 (Role Mapping / Tone Steps).
 *  Hue/Chroma are real CAM16 values via @material/material-color-utilities.
 * ==========================================================================*/

export type HctRole = {
  name: string;
  /** Hue offset in degrees, added to the seed's hue (mod 360). */
  hueOffset: number;
  /** Given the seed's chroma, returns this role's chroma. */
  chroma: (seedChroma: number) => number;
};

// Phase 1: Key Palette Generation (HCT Parameters)
export const HCT_ROLES: HctRole[] = [
  { name: "Accent 1", hueOffset: 0, chroma: (Cs) => Math.max(Cs, 48) },
  { name: "Accent 2", hueOffset: 0, chroma: (Cs) => Math.max(Cs * 0.33, 16) },
  { name: "Accent 3", hueOffset: 60, chroma: (Cs) => Math.max(Cs * 0.5, 24) },
  { name: "Neutral 1", hueOffset: 0, chroma: () => 5 }, // 4-6 range, midpoint
  { name: "Neutral 2", hueOffset: 0, chroma: () => 10 }, // 8-12 range, midpoint
];

/** Phase 2: which role + which Tone each UI token pulls, split by mode. */
export type UiToken = {
  token: string;
  description: string;
  role: string; // must match an HctRole.name
  lightTone: number;
  darkTone: number;
};

export const UI_TOKENS: UiToken[] = [
  { token: "surface", description: "Canvas", role: "Neutral 1", lightTone: 98, darkTone: 6 },
  { token: "primary-container", description: "Main Button", role: "Accent 1", lightTone: 90, darkTone: 30 },
  { token: "on-primary-container", description: "Button Text/Icon", role: "Accent 1", lightTone: 10, darkTone: 90 },
  { token: "secondary-container", description: "Path/Pills", role: "Accent 2", lightTone: 90, darkTone: 30 },
  { token: "on-secondary-container", description: "Pill Text", role: "Accent 2", lightTone: 10, darkTone: 90 },
  { token: "tertiary-container", description: "Accent Badges", role: "Accent 3", lightTone: 90, darkTone: 30 },
  { token: "on-tertiary-container", description: "Badge Text", role: "Accent 3", lightTone: 10, darkTone: 90 },
  { token: "outline-variant", description: "Grid lines/Dividers", role: "Neutral 2", lightTone: 80, darkTone: 30 },
];

const argbToRgb = (argb: number) => ({
  r: redFromArgb(argb),
  g: greenFromArgb(argb),
  b: blueFromArgb(argb),
});

export type UiTokenColor = PaletteColor & {
  token: string;
  role: string;
  tone: number;
};

/** Resolves every Phase 2 UI token to an actual RGB color for one seed,
 *  in the given mode. Each role's Hue/Chroma is derived once (Phase 1),
 *  then every token pulls its own Tone from that role (Phase 2). */
export const generateHctTokens = (
  seed: ExtractedColor,
  mode: "light" | "dark",
  roles: HctRole[] = HCT_ROLES,
  tokens: UiToken[] = UI_TOKENS,
): UiTokenColor[] => {
  const seedHct = Hct.fromInt(argbFromRgb(seed.rgb.r, seed.rgb.g, seed.rgb.b));

  // Phase 1: one Hue/Chroma pair per role, computed once and reused by
  // every token that references that role.
  const roleHueChroma = new Map(
    roles.map((role) => [
      role.name,
      {
        hue: (seedHct.hue + role.hueOffset + 360) % 360,
        chroma: role.chroma(seedHct.chroma),
      },
    ]),
  );

  return tokens.map((token) => {
    const hc = roleHueChroma.get(token.role);
    if (!hc) {
      throw new Error(`UI token "${token.token}" references unknown role "${token.role}"`);
    }

    const tone = mode === "light" ? token.lightTone : token.darkTone;
    const rgb = argbToRgb(Hct.from(hc.hue, hc.chroma, tone).toInt());

    return {
      ...toPaletteColor(`${seed.id}-${token.token}-${mode}`, token.description, rgb),
      token: token.token,
      role: token.role,
      tone,
    };
  });
};

/** The 5 raw HCT roles, each shown at the seed's own Tone — a simple
 *  "5 swatches" view for comparison against the HSL row, separate from
 *  the fully-resolved UI tokens above. */
export const generateHctPalette = (
  seed: ExtractedColor,
  roles: HctRole[] = HCT_ROLES,
): PaletteColor[] => {
  const seedHct = Hct.fromInt(argbFromRgb(seed.rgb.r, seed.rgb.g, seed.rgb.b));

  return roles.map((role) => {
    const hue = (seedHct.hue + role.hueOffset + 360) % 360;
    const chroma = role.chroma(seedHct.chroma);
    const rgb = argbToRgb(Hct.from(hue, chroma, seedHct.tone).toInt());

    return toPaletteColor(
      `${seed.id}-hct-${role.name.toLowerCase().replace(/\s+/g, "-")}`,
      role.name,
      rgb,
    );
  });
};
