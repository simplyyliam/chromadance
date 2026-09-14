import type { RGB } from "../types";

/**
 * Samples one average colour per grid cell in a single `getImageData` call.
 *
 * Rather than calling `getImageData` once per probe (thousands of calls, each
 * averaging tens of thousands of pixels in JS, which blocks the main thread),
 * the browser does the averaging for us: the image is downscaled to exactly
 * `cols x rows`, so every destination pixel *is* the mean of its cell, and the
 * whole grid is read at once.
 *
 * Sampling covers the ENTIRE source image (uncropped), so the seed is
 * identical regardless of the container's rendered aspect ratio.
 */
export const sampleGridColors = (
  source: CanvasImageSource & { width: number; height: number },
  cols: number,
  rows: number,
): RGB[] | null => {
  if (cols < 1 || rows < 1) return null;
  if (source.width === 0 || source.height === 0) return null;

  const sw = source.width;
  const sh = source.height;

  const midCols = Math.min(Math.max(cols * 4, cols), Math.max(1, Math.round(sw)));
  const midRows = Math.min(Math.max(rows * 4, rows), Math.max(1, Math.round(sh)));

  const mid = createCanvas(midCols, midRows);
  const midCtx = mid.getContext("2d", { willReadFrequently: false });
  if (!midCtx) return null;
  midCtx.imageSmoothingEnabled = true;
  midCtx.imageSmoothingQuality = "high";
  midCtx.drawImage(source, 0, 0, sw, sh, 0, 0, midCols, midRows);

  const target = createCanvas(cols, rows);
  const targetCtx = target.getContext("2d", { willReadFrequently: true });
  if (!targetCtx) return null;
  targetCtx.imageSmoothingEnabled = true;
  targetCtx.imageSmoothingQuality = "high";
  targetCtx.drawImage(mid, 0, 0, midCols, midRows, 0, 0, cols, rows);

  let data: Uint8ClampedArray;
  try {
    data = targetCtx.getImageData(0, 0, cols, rows).data;
  } catch {
    return null;
  }

  const out: RGB[] = new Array(cols * rows);
  for (let i = 0; i < cols * rows; i += 1) {
    const o = i * 4;
    out[i] = { r: data[o], g: data[o + 1], b: data[o + 2] };
  }

  return out;
};

/**
 * Reads the raw RGBA pixel buffer for a square region of a canvas. Returns
 * `undefined` when the canvas isn't ready or has no 2D context.
 */
export const extractRegion = (
  canvas: HTMLCanvasElement | OffscreenCanvas | null,
  x: number,
  y: number,
  size: number,
): Uint8ClampedArray | undefined => {
  if (!canvas || canvas.width === 0 || canvas.height === 0) return undefined;

  const ctx = canvas.getContext("2d") as
    | CanvasRenderingContext2D
    | OffscreenCanvasRenderingContext2D
    | null;
  if (!ctx) return undefined;

  return ctx.getImageData(x, y, size, size).data;
};

/**
 * Creates a canvas of the given size, preferring `OffscreenCanvas` when
 * available (workers) and falling back to a DOM canvas.
 */
const createCanvas = (
  width: number,
  height: number,
): HTMLCanvasElement | OffscreenCanvas => {
  if (typeof OffscreenCanvas !== "undefined") {
    return new OffscreenCanvas(width, height);
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
};
