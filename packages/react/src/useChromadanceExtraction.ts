import { useCallback, useEffect, useRef, useState } from "react";
import {
  createSeedTournament,
  generateHctTokens,
  sampleGridColors,
  tokensToCssVariables,
  type ExtractedColor,
  type ThemeMode,
  type UiTokenColor,
} from "@chromadance/core";
import { sourceToCanvas, type ImageSource } from "./loadImage";

export type ExtractionStatus = "idle" | "loading" | "ready" | "error";

export type ExtractionResult = {
  status: ExtractionStatus;
  /** The winning seed color, or null before a successful run. */
  seed: ExtractedColor | null;
  /** Resolved UI tokens for the active mode. */
  tokens: UiTokenColor[];
  /** `{ "--chromadance-<token>": "#hex" }` map for the active mode. */
  cssVariables: Record<string, string>;
  error: Error | null;
};

export type ExtractionOptions = {
  /** Grid resolution used when sampling the image. Defaults to 12 x 8. */
  gridCols?: number;
  gridRows?: number;
  /** Theme mode used to resolve HCT tone steps. Defaults to "light". */
  mode?: ThemeMode;
  /** CSS variable prefix. Defaults to "--chromadance". */
  cssPrefix?: string;
};

const EMPTY: ExtractionResult = {
  status: "idle",
  seed: null,
  tokens: [],
  cssVariables: {},
  error: null,
};

/**
 * Runs the Chromadance pipeline for a given image source: samples a color
 * grid, runs the seed tournament, then generates HCT UI tokens and their CSS
 * variables. Re-runs whenever the source or options change.
 */
export const useChromadanceExtraction = (
  source: ImageSource | null | undefined,
  options: ExtractionOptions = {},
): ExtractionResult => {
  const { gridCols = 12, gridRows = 8, mode = "light", cssPrefix = "--chromadance" } = options;

  const [result, setResult] = useState<ExtractionResult>(EMPTY);
  const runId = useRef(0);

  const run = useCallback(async () => {
    if (!source) {
      setResult(EMPTY);
      return;
    }

    const id = ++runId.current;
    setResult((prev) => ({ ...prev, status: "loading", error: null }));

    try {
      const canvas = await sourceToCanvas(source);
      const grid = sampleGridColors(canvas, gridCols, gridRows);
      if (!grid || grid.length === 0) {
        throw new Error("Chromadance: no colors could be sampled from the image.");
      }

      const contenders: ExtractedColor[] = grid.map((rgb, i) => ({
        id: `cell-${i}`,
        x: i % gridCols,
        y: Math.floor(i / gridCols),
        width: 1,
        height: 1,
        rgb,
      }));

      const { seed } = createSeedTournament(contenders);
      if (!seed) throw new Error("Chromadance: seed tournament produced no winner.");

      const tokens = generateHctTokens(seed, mode);
      const cssVariables = tokensToCssVariables(tokens, cssPrefix);

      if (id !== runId.current) return; // superseded by a newer run
      setResult({ status: "ready", seed, tokens, cssVariables, error: null });
    } catch (err) {
      if (id !== runId.current) return;
      setResult({
        ...EMPTY,
        status: "error",
        error: err instanceof Error ? err : new Error(String(err)),
      });
    }
  }, [source, gridCols, gridRows, mode, cssPrefix]);

  useEffect(() => {
    void run();
  }, [run]);

  return result;
};
