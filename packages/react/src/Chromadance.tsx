import {
  createElement,
  useEffect,
  useMemo,
  type CSSProperties,
  type ElementType,
  type ReactNode,
} from "react";
import type { ThemeMode } from "@chromadance/core";
import { ChromadanceContext } from "./context";
import { useChromadanceExtraction, type ExtractionResult } from "./useChromadanceExtraction";
import type { ImageSource } from "./loadImage";

export type ChromadanceProps = {
  /** Image to derive the palette from: URL, Blob/File, <img>, or <canvas>. */
  image: ImageSource | null | undefined;
  /** Grid resolution for sampling. Defaults to 12 x 8. */
  gridCols?: number;
  gridRows?: number;
  /** Theme mode used to resolve HCT tone steps. Defaults to "light". */
  mode?: ThemeMode;
  /** CSS variable prefix. Defaults to "--chromadance". */
  cssPrefix?: string;
  /**
   * Where to write the CSS variables:
   * - "self" (default): onto this wrapper element only
   * - "root": onto `document.documentElement` (site-wide)
   * - an HTMLElement: onto that element
   */
  target?: "self" | "root" | HTMLElement;
  /** The element type to render for the wrapper. Defaults to "div". */
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
  /** Called whenever extraction completes (ready or error). */
  onResult?: (result: ExtractionResult) => void;
};

/**
 * Wraps any subtree, extracts a palette from `image`, and injects the
 * generated HCT tokens as CSS custom properties so descendants can style
 * themselves with `var(--chromadance-...)`.
 */
export const Chromadance = ({
  image,
  gridCols,
  gridRows,
  mode = "light",
  cssPrefix = "--chromadance",
  target = "self",
  as = "div",
  className,
  style,
  children,
  onResult,
}: ChromadanceProps) => {
  const result = useChromadanceExtraction(image, { gridCols, gridRows, mode, cssPrefix });

  useEffect(() => {
    if (result.status === "ready" || result.status === "error") {
      onResult?.(result);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result.status, result.seed?.id]);

  // Inject onto a non-self target (root document or a supplied element).
  useEffect(() => {
    if (target === "self") return;
    const el = target === "root" ? document.documentElement : target;
    if (!el) return;

    const entries = Object.entries(result.cssVariables);
    for (const [key, value] of entries) el.style.setProperty(key, value);

    return () => {
      for (const [key] of entries) el.style.removeProperty(key);
    };
  }, [target, result.cssVariables]);

  // When injecting onto self, merge the variables into the wrapper's style.
  const mergedStyle = useMemo<CSSProperties>(() => {
    if (target !== "self") return style ?? {};
    return { ...(result.cssVariables as CSSProperties), ...style };
  }, [target, result.cssVariables, style]);

  return createElement(
    ChromadanceContext.Provider,
    { value: result },
    createElement(as, { className, style: mergedStyle }, children),
  );
};
