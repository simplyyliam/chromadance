export type RGB = { r: number; g: number; b: number };

/**
 * Samples one average colour per grid cell in a single `getImageData` call.
 *
 * The previous approach called `getImageData` once per probe (~1000+ calls,
 * each averaging tens of thousands of pixels in JS) which blocked the main
 * thread for hundreds of milliseconds. Here the browser does the averaging for
 * us: the image is downscaled to exactly `cols x rows`, so every destination
 * pixel *is* the mean of its cell, and we read the whole grid at once.
 *
 * The crop matches CSS `object-cover` so sampled colours line up with what the
 * user actually sees.
 */
export const sampleGridColors = (
  source: HTMLCanvasElement,
  cols: number,
  rows: number,
  containerWidth: number,
  containerHeight: number,
): RGB[] | null => {
  if (cols < 1 || rows < 1) return null;
  if (source.width === 0 || source.height === 0) return null;
  if (containerWidth <= 0 || containerHeight <= 0) return null;

  // --- replicate object-cover: centred crop of the source ---
  const containerAspect = containerWidth / containerHeight;
  const imageAspect = source.width / source.height;

  let sx = 0;
  let sy = 0;
  let sw = source.width;
  let sh = source.height;

  if (imageAspect > containerAspect) {
    // Source is wider than the box: trim the sides.
    sw = source.height * containerAspect;
    sx = (source.width - sw) / 2;
  } else {
    // Source is taller than the box: trim top and bottom.
    sh = source.width / containerAspect;
    sy = (source.height - sh) / 2;
  }

  // --- two-step downscale for clean box averaging ---
  const midCols = Math.min(Math.max(cols * 4, cols), Math.max(1, Math.round(sw)));
  const midRows = Math.min(Math.max(rows * 4, rows), Math.max(1, Math.round(sh)));

  const mid = document.createElement("canvas");
  mid.width = midCols;
  mid.height = midRows;
  const midCtx = mid.getContext("2d", { willReadFrequently: false });
  if (!midCtx) return null;
  midCtx.imageSmoothingEnabled = true;
  midCtx.imageSmoothingQuality = "high";
  midCtx.drawImage(source, sx, sy, sw, sh, 0, 0, midCols, midRows);

  const target = document.createElement("canvas");
  target.width = cols;
  target.height = rows;
  const targetCtx = target.getContext("2d", { willReadFrequently: true });
  if (!targetCtx) return null;
  targetCtx.imageSmoothingEnabled = true;
  targetCtx.imageSmoothingQuality = "high";
  targetCtx.drawImage(mid, 0, 0, midCols, midRows, 0, 0, cols, rows);

  let data: Uint8ClampedArray;
  try {
    data = targetCtx.getImageData(0, 0, cols, rows).data;
  } catch {
    // Tainted canvas (cross-origin source without CORS).
    return null;
  }

  const out: RGB[] = new Array(cols * rows);
  for (let i = 0; i < cols * rows; i += 1) {
    const o = i * 4;
    out[i] = { r: data[o], g: data[o + 1], b: data[o + 2] };
  }

  return out;
};