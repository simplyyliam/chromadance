import { useEffect, useMemo, useRef, type RefObject } from "react";
import { sampleGridColors, type RGB } from "@/lib/sampleGridColors";
import { useExtractionStore, type ExtractedColor } from "@/store/extractionStore";
import {
  clamp01,
  easeInCubic,
  easeInOutSine,
  easeOutBack,
  easeOutCubic,
  frameAt,
  TAU,
  type GridStage,
  type TimelineFrame,
} from "./timeline";

type ProbeGridProps = {
  /** Hidden canvas holding the source image at natural resolution. */
  canvasRef: RefObject<HTMLCanvasElement | null>;
  /** Shared run start timestamp from `useExtractionTimeline`. */
  startAtRef: RefObject<number>;
  stage: GridStage | null;
  imageVersion?: number;
  containerWidth: number;
  containerHeight: number;
};

/* geometry */

// Fixed sample resolution — this is the single source of truth for how many
// probes exist. It no longer depends on screen size, so the same image
// produces the same seed on any display.
const GRID_COLS = 48;
const GRID_ROWS = 32;
const TARGET_GAP = 4;

const DOT_RADIUS = 3;

/* motion */

/** Fraction of the stage spent staggering by distance from centre. The rest is
 *  each probe's own ramp, so the wave reads as a ripple rather than a cascade. */
const ENTER_SPREAD = 0.6;
const LEAVE_SPREAD = 0.55;

/** Travelling breathing wave: frequency in Hz and how many ripples span the radius. */
const BREATH_FREQ = 0.55;
const BREATH_WAVES = 1.6;
const BREATH_AMP = 0.17;
/** Slow global swell layered under the travelling wave. */
const BREATH_PULSE = 0.32;
/** Portion of the breathing stage used to ease the amplitude in and out. */
const BREATH_EASE = 0.18;

/** Colour reveal after sampling: per-probe ramp and centre-out stagger, seconds. */
const COLOR_FADE = 0.45;
const COLOR_SPREAD = 0.35;

/**
 * Canvas-rendered probe layer.
 *
 * Previously this mounted one `motion.div` per probe (1000-1700 of them) plus a
 * CSS keyframe animation each, and staggered the exit by *index* so the leaving
 * stage lasted 35-60 seconds. Everything now draws into a single canvas from one
 * rAF loop, and all stagger is based on normalised distance from centre, so the
 * run length is fixed no matter how many probes there are.
 */
export const ProbeGrid = ({
  canvasRef,
  startAtRef,
  stage,
  imageVersion,
  containerWidth,
  containerHeight,
}: ProbeGridProps) => {
  const setExtractedColors = useExtractionStore((s) => s.setExtractedColors);

  const layerRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const rafRef = useRef(0);

  const sampledRef = useRef<RGB[] | null>(null);
  const sampledStringsRef = useRef<string[] | null>(null);
  const sampledAtRef = useRef(0);

  /* probe layout */

  const { probes, gridCols, gridRows, probeSizeX, probeSizeY } = useMemo(() => {
    const cols = GRID_COLS;
    const rows = GRID_ROWS;
  
    // Derive probe size FROM the container (instead of deriving column/row
    // count from a fixed probe size), so the number of samples stays constant
    // across any screen — only each probe's rendered size changes.
    const probeSizeX = Math.max(1, (containerWidth - (cols - 1) * TARGET_GAP) / cols);
    const probeSizeY = Math.max(1, (containerHeight - (rows - 1) * TARGET_GAP) / rows);
  
    // Distribute the leftover space into the gaps so the grid runs edge to edge.
    const gapX = cols > 1 ? (containerWidth - cols * probeSizeX) / (cols - 1) : 0;
    const gapY = rows > 1 ? (containerHeight - rows * probeSizeY) / (rows - 1) : 0;
  
    const centerCol = (cols - 1) / 2;
    const centerRow = (rows - 1) / 2;
    const maxDistance = Math.max(1e-6, Math.hypot(centerCol, centerRow));
  
    const list = Array.from({ length: cols * rows }, (_, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = col * (probeSizeX + gapX);
      const y = row * (probeSizeY + gapY);
  
      return {
        index,
        col,
        row,
        x,
        y,
        cx: x + probeSizeX / 2,
        cy: y + probeSizeY / 2,
        nd: Math.hypot(col - centerCol, row - centerRow) / maxDistance,
      };
    });
  
    return { probes: list, gridCols: cols, gridRows: rows, probeSizeX, probeSizeY };
  }, [containerWidth, containerHeight]);



  /* canvas size */

  useEffect(() => {
    const canvas = layerRef.current;
    if (!canvas || containerWidth <= 0 || containerHeight <= 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(containerWidth * dpr));
    canvas.height = Math.max(1, Math.round(containerHeight * dpr));

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctxRef.current = ctx;
  }, [containerWidth, containerHeight]);

  /* colour sample */

  // One downscale + one getImageData for the whole grid, at the moment the
  // breathing stage begins. Fast enough that it no longer stalls a frame.
  useEffect(() => {
    if (stage !== "breathing") return;

    const source = canvasRef.current;
    if (!source) return;

    const sampled = sampleGridColors(
      source,
      gridCols,
      gridRows
    );
    if (!sampled) return;

    sampledRef.current = sampled;
    sampledStringsRef.current = sampled.map((c) => `rgb(${c.r} ${c.g} ${c.b})`);
    sampledAtRef.current = performance.now();

    const extracted: ExtractedColor[] = probes.map((probe) => {
      const c = sampled[probe.index] ?? { r: 255, g: 255, b: 255 };
      return {
        id: `probe-${probe.col}-${probe.row}`,
        x: probe.x,
        y: probe.y,
        width: probeSizeX,
        height: probeSizeY,
        rgb: { r: c.r, g: c.g, b: c.b },
      };
    });

    setExtractedColors(extracted, {
      width: containerWidth,
      height: containerHeight,
    });
  }, [
    stage,
    canvasRef,
    gridCols,
    gridRows,
    containerWidth,
    containerHeight,
    probes,
    setExtractedColors,
    imageVersion,
  ]);

  // Clear sampled colours when a new run begins.
  useEffect(() => {
    if (stage !== "entering") return;
    sampledRef.current = null;
    sampledStringsRef.current = null;
    sampledAtRef.current = 0;
  }, [stage]);

  /* render loop */

  useEffect(() => {
    if (!stage || containerWidth <= 0 || containerHeight <= 0) return;

    const drawFrame = (frame: TimelineFrame, now: number) => {
      const ctx = ctxRef.current;
      if (!ctx) return;

      const { stage: current, stageProgress: progress, elapsed } = frame;
      ctx.clearRect(0, 0, containerWidth, containerHeight);

      const strings = sampledStringsRef.current;
      const sampleElapsed =
        sampledAtRef.current > 0 ? (now - sampledAtRef.current) / 1000 : -1;

      for (let i = 0; i < probes.length; i += 1) {
        const probe = probes[i];
        let alpha: number;
        let scale: number;

        if (current === "entering") {
          const local = clamp01(
            (progress - probe.nd * ENTER_SPREAD) / (1 - ENTER_SPREAD),
          );
          alpha = easeOutCubic(local);
          scale = 0.25 + 0.75 * easeOutBack(local);
        } else if (current === "breathing") {
          // Wave travels outward from the centre; a slow swell sits underneath.
          const wave = Math.sin(TAU * (elapsed * BREATH_FREQ - probe.nd * BREATH_WAVES));
          const pulse = Math.sin(TAU * elapsed * BREATH_PULSE);
          // Ease the amplitude in and out so the stage boundaries are seamless:
          // entering finishes at scale 1 / alpha 1 and leaving starts there too,
          // so without this envelope the breath would visibly pop at both ends.
          const env =
            easeInOutSine(clamp01(progress / BREATH_EASE)) *
            easeInOutSine(clamp01((1 - progress) / BREATH_EASE));
          scale = 1 + (BREATH_AMP * wave + 0.05 * pulse) * env;
          alpha = clamp01(1 + (-0.26 + 0.18 * wave + 0.08 * pulse) * env);
        } else {
          const local = clamp01(
            (progress - probe.nd * LEAVE_SPREAD) / (1 - LEAVE_SPREAD),
          );
          const fade = 1 - easeInCubic(local);
          // Brief swell as each probe leaves, so the exit reads as a ripple.
          scale = fade * (1 + 0.55 * Math.sin(Math.PI * local));
          alpha = fade;
        }

        if (alpha <= 0.004 || scale <= 0.004) continue;

        const radius = DOT_RADIUS * scale;
        ctx.globalAlpha = alpha;

        if (!strings || sampleElapsed < 0) {
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(probe.cx, probe.cy, radius, 0, TAU);
          ctx.fill();
          continue;
        }

        const mix = clamp01((sampleElapsed - probe.nd * COLOR_SPREAD) / COLOR_FADE);

        if (mix >= 1) {
          // Cached string, no per-frame allocation once the reveal has settled.
          ctx.fillStyle = strings[probe.index] ?? "#ffffff";
          ctx.beginPath();
          ctx.arc(probe.cx, probe.cy, radius, 0, TAU);
          ctx.fill();
          continue;
        }

        // During the reveal, lay the sampled colour over white at partial alpha
        // instead of building a new rgb() string for every probe every frame.
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(probe.cx, probe.cy, radius, 0, TAU);
        ctx.fill();

        if (mix > 0) {
          ctx.globalAlpha = alpha * easeOutCubic(mix);
          ctx.fillStyle = strings[probe.index] ?? "#ffffff";
          ctx.beginPath();
          ctx.arc(probe.cx, probe.cy, radius, 0, TAU);
          ctx.fill();
        }
      }

      ctx.globalAlpha = 1;
    };

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      // A single representative frame, no animation.
      drawFrame(
        { elapsed: 0, stage: "breathing", stageProgress: 0.5, done: false },
        performance.now(),
      );
      return;
    }

    const loop = (now: number) => {
      const startAt = startAtRef.current;
      if (!startAt) {
        rafRef.current = 0;
        return;
      }

      const frame = frameAt((now - startAt) / 1000);
      drawFrame(frame, now);

      if (frame.done) {
        rafRef.current = 0;
        return;
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
    };
  }, [stage, probes, containerWidth, containerHeight, startAtRef]);

  // The canvas is always mounted, only hidden. Unmounting it would mean the 2D
  // context is never created while idle, and the sizing effect above would not
  // re-run when a stage finally arrives.
  return (
    <canvas
      ref={layerRef}
      className="absolute inset-0 z-10 pointer-events-none"
      style={{
        width: containerWidth,
        height: containerHeight,
        visibility: stage ? "visible" : "hidden",
      }}
      aria-hidden="true"
    />
  );
};
