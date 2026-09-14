import { createContext, useContext } from "react";
import type { ExtractionResult } from "./useChromadanceExtraction";

/** The value exposed through context to descendants of a Chromadance wrapper. */
export type ChromadanceContextValue = ExtractionResult;

export const ChromadanceContext = createContext<ChromadanceContextValue | null>(null);

/**
 * Reads the nearest Chromadance extraction result. Must be called inside a
 * `<Chromadance>` / `<ChromadanceProvider>` subtree.
 */
export const useChromadance = (): ChromadanceContextValue => {
  const ctx = useContext(ChromadanceContext);
  if (!ctx) {
    throw new Error("useChromadance must be used within a <Chromadance> provider.");
  }
  return ctx;
};
