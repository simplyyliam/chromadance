import type { RefObject } from "react";
import { extractRegion } from "@chromadance/core";

/** Reads a square pixel region from a canvas ref. Backed by @chromadance/core. */
export const extractColor = (
  x: number,
  y: number,
  size: number,
  canvasRef: RefObject<HTMLCanvasElement | null>,
) => extractRegion(canvasRef.current, x, y, size);
