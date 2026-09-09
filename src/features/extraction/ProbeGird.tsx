import { extractColor } from "@/lib/extractColor";
import { Unit8ToRGB } from "@/lib/Unit8toRGB";
import { useExtractionStore } from "@/store/extractionStore";
import { motion } from "motion/react";
import { useEffect, useMemo, useState, type RefObject } from "react";
import { ExtractionProbe } from "./ExtractionProbe";

type ProbeGridProps = {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  imageVersion?: number;
  containerWidth: number;
  containerHeight: number;
};

type GridStage = "entering" | "breathing" | "leaving";

const PROBE_SIZE = 16;
const GAP = 4;
const ENTRY_STEP = 0.006;
const ENTRY_DURATION = 0.22;
const BREATH_DURATION = 1.5;
const EXIT_STEP = 0.035;
const EXIT_DURATION = 0.18;

export const ProbeGrid = ({
  canvasRef,
  containerWidth,
  containerHeight,
}: ProbeGridProps) => {
  const phase = useExtractionStore((s) => s.phase);
  const setExtractedColors = useExtractionStore((s) => s.setExtractedColors);
  const setPhase = useExtractionStore((s) => s.setPhase);

  const [stage, setStage] = useState<GridStage>("entering");
  const [colors, setColors] = useState<Record<string, string>>({});

  const gridCols = Math.max(
    1,
    Math.floor((containerWidth + GAP) / (PROBE_SIZE + GAP)),
  );

  const gridRows = Math.max(
    1,
    Math.floor((containerHeight + GAP) / (PROBE_SIZE + GAP)),
  );

  const gridWidth =
    gridCols * PROBE_SIZE + (gridCols - 1) * GAP;

  const gridHeight =
    gridRows * PROBE_SIZE + (gridRows - 1) * GAP;

  const offsetX = (containerWidth - gridWidth) / 2;
  const offsetY = (containerHeight - gridHeight) / 2;

  const probes = useMemo(() => {
    const centerX = (gridCols - 1) / 2;
    const centerY = (gridRows - 1) / 2;

    const baseProbes = Array.from(
      { length: gridCols * gridRows },
      (_, index) => {
        const col = index % gridCols;
        const row = Math.floor(index / gridCols);

        const x = offsetX + col * (PROBE_SIZE + GAP);
        const y = offsetY + row * (PROBE_SIZE + GAP);

        const centerDistance = Math.hypot(
          col - centerX,
          row - centerY,
        );

        return {
          id: `probe-${col}-${row}`,
          col,
          row,
          x,
          y,
          centerDistance,
        };
      },
    );

    return [...baseProbes]
      .sort((a, b) => {
        if (a.centerDistance !== b.centerDistance) {
          return a.centerDistance - b.centerDistance;
        }

        if (a.row !== b.row) {
          return a.row - b.row;
        }

        return a.col - b.col;
      })
      .map((probe, rippleIndex) => ({
        ...probe,
        rippleIndex,
      }));
  }, [gridCols, gridRows, offsetX, offsetY]);

  const entryLength =
    (gridCols + gridRows - 2) * ENTRY_STEP + ENTRY_DURATION;

  const exitLength =
    Math.max(0, probes.length - 1) * EXIT_STEP + EXIT_DURATION;

  useEffect(() => {
    if (
      phase !== "extracting" ||
      containerWidth === 0 ||
      containerHeight === 0
    ) {
      return;
    }

    setStage("entering");
    setColors({});
    setExtractedColors([]);

    const entryTimeout = window.setTimeout(
      () => setStage("breathing"),
      entryLength * 1000,
    );

    return () => window.clearTimeout(entryTimeout);
  }, [
    containerHeight,
    containerWidth,
    entryLength,
    phase,
    setExtractedColors,
  ]);

  useEffect(() => {
    if (stage !== "breathing" || phase !== "extracting") return;

    const extractionTimeout = window.setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const scaleX = canvas.width / containerWidth;
      const scaleY = canvas.height / containerHeight;

      const sampleSize = Math.max(
        1,
        Math.round(PROBE_SIZE * Math.min(scaleX, scaleY)),
      );

      const extracted = probes.flatMap((probe) => {
        const imageData = extractColor(
          Math.round(probe.x * scaleX),
          Math.round(probe.y * scaleY),
          sampleSize,
          canvasRef,
        );

        if (!imageData) return [];

        const rgb = Unit8ToRGB(imageData);

        return [
          {
            id: probe.id,
            x: probe.x,
            y: probe.y,
            width: PROBE_SIZE,
            height: PROBE_SIZE,
            rgb: {
              r: rgb.r,
              g: rgb.g,
              b: rgb.b,
            },
            color: rgb.color,
          },
        ];
      });

      setColors(
        Object.fromEntries(
          extracted.map(({ id, color }) => [id, color]),
        ),
      );

      setExtractedColors(
        extracted.map(({ color: _color, ...color }) => color),
      );

      setStage("leaving");
    }, BREATH_DURATION * 1000);

    return () => window.clearTimeout(extractionTimeout);
  }, [
    canvasRef,
    containerHeight,
    containerWidth,
    phase,
    probes,
    setExtractedColors,
    stage,
  ]);

  useEffect(() => {
    if (stage !== "leaving") return;

    const exitTimeout = window.setTimeout(
      () => setPhase("clustering"),
      exitLength * 1000,
    );

    return () => window.clearTimeout(exitTimeout);
  }, [exitLength, setPhase, stage]);

  return (
    <div className="absolute inset-0 pointer-events-none">
      {probes.map((probe) => {
        const entryDelay =
          (probe.col + probe.row) * ENTRY_STEP;

        const exitDelay =
          probe.rippleIndex * EXIT_STEP;

        const isBreathing = stage === "breathing";
        const isLeaving = stage === "leaving";

        const animationKey = `${probe.id}-${stage}`;

        return (
          <motion.div
            key={animationKey}
            className="absolute"
            initial={
              isLeaving
                ? { opacity: 1, scale: 1 }
                : { opacity: 0, scale: 0.35 }
            }
            animate={
              isLeaving
                ? { opacity: 0, scale: 0 }
                : isBreathing
                  ? {
                      opacity: 1,
                      scale: [1, 1.14, 1],
                    }
                  : {
                      opacity: 1,
                      scale: 1,
                    }
            }
            transition={
              isLeaving
                ? {
                    delay: exitDelay,
                    duration: EXIT_DURATION,
                    ease: [0.4, 0, 1, 1],
                  }
                : isBreathing
                  ? {
                      duration: 0.75,
                      repeat: Infinity,
                      repeatType: "mirror",
                      ease: "easeInOut",
                    }
                  : {
                      delay: entryDelay,
                      duration: ENTRY_DURATION,
                      ease: [0.22, 0.8, 0.3, 1],
                    }
            }
            style={{
              left: probe.x,
              top: probe.y,
            }}
          >
            <ExtractionProbe
              color={colors[probe.id]}
              isLeaving={isLeaving}
            />
          </motion.div>
        );
      })}
    </div>
  );
};