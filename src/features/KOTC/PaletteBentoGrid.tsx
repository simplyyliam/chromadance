import { motion } from "motion/react";
import type { UiTokenColor } from "./lib/palette";

type PaletteBentoGridProps = {
  title?: string;
  description?: string;
  /** Full token list, INCLUDING "surface" — it's used for the corner label
   *  and text contrast, then excluded from the card grid automatically. */
  tokens: UiTokenColor[];
  /** Overrides the auto-derived text color. Leave unset to have it computed
   *  from the surface token's own luminance. */
  textColor?: string;
  /** Stagger delay before the grid itself starts entering, seconds. */
  delay?: number;
};

/** Picks readable text color for a swatch, same luminance trick used for the
 *  battle-phase borders — no seed-specific darkening needed here since these
 *  cards need to work against arbitrarily light AND dark tokens (e.g. a near-
 *  white "surface" swatch next to a near-black "primary-container" one). */
export const contrastText = (rgb: { r: number; g: number; b: number }) => {
  const luminance = (rgb.r * 0.2126 + rgb.g * 0.7152 + rgb.b * 0.0722) / 255;
  return luminance > 0.6 ? "#000000" : "#ffffff";
};

/** Label shown on each card. Falls back to the raw token id if a friendlier
 *  name isn't provided via `token.name`. */
const cardLabel = (token: UiTokenColor) => token.name || token.token;

type CardProps = {
  token: UiTokenColor;
  hero?: boolean;
  index: number;
  delay: number;
};

const PaletteCard = ({ token, hero = false, index, delay }: CardProps) => {
  const cardTextColor = contrastText(token.rgb);

  return (
    <motion.div
      className={`relative flex min-h-0 min-w-0 flex-col justify-between overflow-hidden rounded-[2cqmin] p-[3cqmin] ${
        hero ? "col-span-2 row-span-2" : ""
      }`}
      style={{ backgroundColor: token.hex, color: cardTextColor }}
      initial={{ opacity: 0, y: 20, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.5,
        ease: [0.22, 1, 0.36, 1],
        delay: delay + index * 0.08,
      }}
    >
      <span className="truncate text-[2.6cqmin] font-medium capitalize">
        {cardLabel(token)}
      </span>

      <div className="flex items-end justify-between gap-[3cqmin] text-[1.5cqmin] uppercase tracking-wide opacity-80">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="opacity-70">Hex:</span>
          <span className="truncate font-mono">{token.hex.toUpperCase()}</span>
        </div>
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="opacity-70">RGB:</span>
          <span className="truncate font-mono">
            {token.rgb.r}, {token.rgb.g}, {token.rgb.b}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

/**
 * Bento-style palette showcase: the first non-surface token renders as a
 * large hero card (2x2), the rest fill the remaining grid cells at normal
 * size. "surface" is reserved for the corner label instead of a card, since
 * it's typically the container's own background elsewhere in the app.
 *
 * Fully prop-driven — no store or app-specific dependency, so it can be
 * lifted into a standalone package as-is.
 */
export const PaletteBentoGrid = ({
  title = "Color palette",
  description,
  tokens,
  textColor = "#f5f5f5", // fixed light text, since the backdrop is now always dark
  delay = 0,
}: PaletteBentoGridProps) => {
  if (tokens.length === 0) return null;

  const [hero, ...rest] = tokens; // surface is just tokens[0] or wherever it sorts

  return (
    <div
      className="flex h-full w-full flex-col p-[1cqmin]"
      style={{ containerType: "size", color: textColor }}
    >
      <motion.div
        className="shrink-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay }}
      >
        <h2 className="text-[2.2cqmin] font-medium mb-2">{title}</h2>
      </motion.div>

      <div className="grid min-h-0 flex-1 grid-cols-3 gap-[1cqmin] grid-flow-dense auto-rows-[1fr]">
        <PaletteCard token={hero} hero index={0} delay={delay + 0.1} />
        {rest.map((token, i) => (
          <PaletteCard key={token.id} token={token} index={i + 1} delay={delay + 0.1} />
        ))}
      </div>

      {description && (
        <motion.p
          className="mt-[1.2cqmin] shrink-0 text-[2.2cqmin] leading-relaxed opacity-70"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: delay + 0.1 + tokens.length * 0.08 }}
        >
          {description}
        </motion.p>
      )}
    </div>
  );
};

