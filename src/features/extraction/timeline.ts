/**
 * Shared timeline for the extraction visuals.
 *
 * Both the probe layer and the shader overlay derive their animation from this
 * single pure function, so they stay perfectly in sync without either of them
 * owning the clock or drifting apart.
 */

export type GridStage = "entering" | "breathing" | "leaving";

/** Stage lengths in seconds. Total run is intentionally short and snappy. */
export const STAGE_SECONDS: Record<GridStage, number> = {
  entering: 0.9,
  breathing: 2.0,
  leaving: 1.1,
};

export const TOTAL_SECONDS =
  STAGE_SECONDS.entering + STAGE_SECONDS.breathing + STAGE_SECONDS.leaving;

/** The moment (in seconds) colours are sampled: right as breathing begins. */
export const SAMPLE_AT_SECONDS = STAGE_SECONDS.entering;

export type TimelineFrame = {
  /** Seconds since the run started. Keeps counting across stage boundaries. */
  elapsed: number;
  stage: GridStage;
  /** 0..1 within the current stage. */
  stageProgress: number;
  /** True once the whole run has finished. */
  done: boolean;
};

export const EMPTY_FRAME: TimelineFrame = {
  elapsed: 0,
  stage: "entering",
  stageProgress: 0,
  done: false,
};

/** Map elapsed seconds to a stage + normalised progress. Pure, so it is safe
 *  to call from any render loop at any frequency. */
export const frameAt = (elapsed: number): TimelineFrame => {
  const t = Math.max(0, elapsed);
  const { entering, breathing, leaving } = STAGE_SECONDS;

  if (t < entering) {
    return { elapsed: t, stage: "entering", stageProgress: t / entering, done: false };
  }

  if (t < entering + breathing) {
    return {
      elapsed: t,
      stage: "breathing",
      stageProgress: (t - entering) / breathing,
      done: false,
    };
  }

  const leaveProgress = (t - entering - breathing) / leaving;
  return {
    elapsed: t,
    stage: "leaving",
    stageProgress: Math.min(1, leaveProgress),
    done: leaveProgress >= 1,
  };
};

/* ------------------------------------------------------------------ easing */

export const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

export const easeInCubic = (t: number): number => t * t * t;

export const easeInOutSine = (t: number): number => -(Math.cos(Math.PI * t) - 1) / 2;

/** Slight overshoot, used so probes "pop" into place instead of easing flatly. */
export const easeOutBack = (t: number): number => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

export const TAU = Math.PI * 2;