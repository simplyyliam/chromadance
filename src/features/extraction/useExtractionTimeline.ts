import { useEffect, useRef, useState } from "react";
import { useExtractionStore } from "@/store/extractionStore";
import { frameAt, type GridStage } from "./timeline";

/**
 * Owns the clock for one extraction run.
 *
 * Consumers (the probe layer, the shader overlay) each run their own render
 * loop but derive their frame from `startAtRef` through the pure `frameAt`
 * helper, so every layer is sampling the exact same timeline with no drift and
 * no frame-ordering dependency between loops.
 *
 * Only the coarse `stage` is React state — it changes three times per run
 * instead of sixty times a second.
 */
export const useExtractionTimeline = () => {
  const phase = useExtractionStore((s) => s.phase);
  const setPhase = useExtractionStore((s) => s.setPhase);

  /** `performance.now()` when the run started, or 0 when idle. */
  const startAtRef = useRef(0);
  const [stage, setStage] = useState<GridStage | null>(null);
  const rafRef = useRef(0);

  useEffect(() => {
    if (phase !== "extracting") {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
      startAtRef.current = 0;
      setStage(null);
      return;
    }

    const start = performance.now();
    startAtRef.current = start;

    let published: GridStage = "entering";
    setStage("entering");

    // This loop exists purely to advance the stage state machine and to end the
    // run; the visual layers do their own drawing.
    const loop = (now: number) => {
      const frame = frameAt((now - start) / 1000);

      if (frame.stage !== published) {
        published = frame.stage;
        setStage(frame.stage);
      }

      if (frame.done) {
        rafRef.current = 0;
        setPhase("clustering");
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
  }, [phase, setPhase]);

  return { stage, startAtRef };
};