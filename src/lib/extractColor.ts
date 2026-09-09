import type { RefObject } from "react";

export const extractColor = (x: number, y: number, size: number, canvasRef: RefObject<HTMLCanvasElement | null>) => {
  const canvas = canvasRef.current;

  if (!canvas || canvas.width === 0 || canvas.height === 0) return;

  const ctx = canvas.getContext("2d");

  if (!ctx) return;

  return ctx.getImageData(x, y, size, size).data;
};