import type { ExtractedColor } from "@/store/extractionStore";

export const rgbString = (color: ExtractedColor) =>
  `rgb(${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b})`;

/** Same color, but darker — used for borders/text against a color's own swatch. */
export const darkenColor = (color: ExtractedColor, amount = 0.35) => {
  const { r, g, b } = color.rgb;

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

  const darkerL = Math.max(0, l * (1 - amount));

  return `hsl(${h * 360}, ${s * 100}%, ${darkerL * 100}%)`;
};
