import {
  Hct,
  argbFromRgb,
  redFromArgb,
  greenFromArgb,
  blueFromArgb,
} from "@material/material-color-utilities";
import type { PaletteColor, RGB, ThemeMode } from "../types";
import { rgbToHex, hslToRgb, rgbToHsl } from "../color/utils";

/** Minimal seed shape needed to generate a palette: an id and an rgb color. */
export type Seed = { id: string; rgb: RGB };

const toPaletteColor = (id: string, name: string, rgb: RGB): PaletteColor => ({
  id,
  name,
  rgb,
  hex: rgbToHex(rgb),
});

/* ============================================================================
 *  HSL PALETTE (original approximation) — single hue, 5 lightness/saturation
 *  stops. Kept for comparison against the HCT rows below.
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

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Original approximation: 5 tones of the seed's own hue, in HSL space. */
export const generateHslPalette = (
  seed: Seed,
  tones: PaletteTone[] = PALETTE_TONES,
): PaletteColor[] => {
  const baseHsl = rgbToHsl(seed.rgb);

  return tones.map((tone) => {
    const rgb =
      tone.name === "Seed"
        ? seed.rgb
        : hslToRgb({
            h: baseHsl.h,
            s: clamp01(baseHsl.s + tone.saturationShift),
            l: clamp01(baseHsl.l + tone.lightnessShift),
          });
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

/** Phase 1: Key Palette Generation (HCT parameters). */
export const HCT_ROLES: HctRole[] = [
  { name: "Accent 1", hueOffset: 0, chroma: (Cs) => Math.max(Cs, 48) },
  { name: "Accent 2", hueOffset: 0, chroma: (Cs) => Math.max(Cs * 0.33, 16) },
  { name: "Accent 3", hueOffset: 60, chroma: (Cs) => Math.max(Cs * 0.5, 24) },
  { name: "Neutral 1", hueOffset: 0, chroma: () => 5 },
  { name: "Neutral 2", hueOffset: 0, chroma: () => 10 },
];

/** Phase 2: which role + which Tone each UI token pulls, split by mode. */
export type UiToken = {
  token: string;
  description: string;
  /** Must match an `HctRole.name`. */
  role: string;
  lightTone: number;
  darkTone: number;
};

export const UI_TOKENS: UiToken[] = [
  { token: "primary-container", description: "Main Button", role: "Accent 1", lightTone: 90, darkTone: 30 },
  { token: "on-primary-container", description: "Button Text/Icon", role: "Accent 1", lightTone: 10, darkTone: 90 },
  { token: "surface", description: "Canvas", role: "Neutral 1", lightTone: 98, darkTone: 6 },
  { token: "secondary-container", description: "Path/Pills", role: "Accent 2", lightTone: 90, darkTone: 30 },
  { token: "on-secondary-container", description: "Pill Text", role: "Accent 2", lightTone: 10, darkTone: 90 },
  { token: "tertiary-container", description: "Accent Badges", role: "Accent 3", lightTone: 90, darkTone: 30 },
  { token: "on-tertiary-container", description: "Badge Text", role: "Accent 3", lightTone: 10, darkTone: 90 },
  { token: "outline-variant", description: "Grid lines/Dividers", role: "Neutral 2", lightTone: 80, darkTone: 30 },
];

const argbToRgb = (argb: number): RGB => ({
  r: redFromArgb(argb),
  g: greenFromArgb(argb),
  b: blueFromArgb(argb),
});

export type UiTokenColor = PaletteColor & {
  token: string;
  role: string;
  tone: number;
};

/**
 * Resolves every Phase 2 UI token to an actual RGB color for one seed, in the
 * given mode. Each role's Hue/Chroma is derived once (Phase 1), then every
 * token pulls its own Tone from that role (Phase 2).
 */
export const generateHctTokens = (
  seed: Seed,
  mode: ThemeMode,
  roles: HctRole[] = HCT_ROLES,
  tokens: UiToken[] = UI_TOKENS,
): UiTokenColor[] => {
  const seedHct = Hct.fromInt(argbFromRgb(seed.rgb.r, seed.rgb.g, seed.rgb.b));

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

/**
 * The 5 raw HCT roles, each shown at the seed's own Tone — a simple
 * "5 swatches" view for comparison against the HSL row.
 */
export const generateHctPalette = (
  seed: Seed,
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

/**
 * Flattens resolved UI tokens into a `{ "--token": "#hex" }` map, ready to be
 * written onto an element's style as CSS custom properties.
 */
export const tokensToCssVariables = (
  tokens: UiTokenColor[],
  prefix = "--chromadance",
): Record<string, string> => {
  const vars: Record<string, string> = {};
  for (const token of tokens) {
    vars[`${prefix}-${token.token}`] = token.hex;
  }
  return vars;
};
