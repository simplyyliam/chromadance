/** An 8-bit-per-channel RGB color. */
export type RGB = { r: number; g: number; b: number };

/**
 * A single color sampled from an image, with its position/footprint in the
 * source grid. Framework-agnostic — the React layer and app store both align
 * their own color shapes to this.
 */
export type ExtractedColor = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rgb: RGB;
  clusterId?: string;
  /** Won its cluster (King Of The Colors). */
  isKing?: boolean;
};

/** A resolved palette color with hex + rgb. */
export type PaletteColor = {
  id: string;
  name: string;
  rgb: RGB;
  hex: string;
};

/** Theme mode used when resolving HCT tone steps. */
export type ThemeMode = "light" | "dark";
