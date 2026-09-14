/** Any image source the wrapper accepts. */
export type ImageSource = string | Blob | HTMLImageElement | HTMLCanvasElement;

/**
 * Resolves an {@link ImageSource} into a canvas holding the decoded image at
 * its natural size, ready for pixel sampling. Runs only in the browser.
 */
export const sourceToCanvas = async (source: ImageSource): Promise<HTMLCanvasElement> => {
  const drawable = await resolveDrawable(source);

  const width = drawable instanceof HTMLImageElement ? drawable.naturalWidth : drawable.width;
  const height = drawable instanceof HTMLImageElement ? drawable.naturalHeight : drawable.height;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Chromadance: could not acquire a 2D canvas context.");
  ctx.drawImage(drawable, 0, 0, width, height);

  return canvas;
};

type Drawable = HTMLImageElement | HTMLCanvasElement;

const resolveDrawable = async (source: ImageSource): Promise<Drawable> => {
  if (typeof source !== "string" && source instanceof HTMLCanvasElement) {
    return source;
  }

  if (source instanceof HTMLImageElement) {
    if (source.complete && source.naturalWidth > 0) return source;
    await decodeImageElement(source);
    return source;
  }

  const url = source instanceof Blob ? URL.createObjectURL(source) : source;
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = url;
    await decodeImageElement(img);
    return img;
  } finally {
    if (source instanceof Blob) URL.revokeObjectURL(url);
  }
};

const decodeImageElement = (img: HTMLImageElement): Promise<void> => {
  if (typeof img.decode === "function") {
    return img.decode().catch(
      () =>
        new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error("Chromadance: failed to load image."));
        }),
    );
  }
  return new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Chromadance: failed to load image."));
  });
};
