import { extractColor } from "@/lib/extractColor";
import { Unit8ToRGB } from "@/lib/Unit8toRGB";
import { useExtractionStore } from "@/store/extractionStore";
import { motion, type Variants } from "motion/react";
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
const TARGET_GAP = 4; // used only to decide how many cells fit; actual gap is computed to fill the container exactly

const ENTRY_STEP = 0.006;
const ENTRY_DURATION = 0.22;
const ENTRY_EASE: [number, number, number, number] = [0.22, 0.8, 0.3, 1];

const BREATH_DURATION = 1.5; // full CSS loop, seconds
const BREATH_SCALE = 1.14;

const EXIT_STEP = 0.035;
const EXIT_DURATION = 0.18;
const EXIT_EASE: [number, number, number, number] = [0.4, 0, 1, 1];

const itemVariants: Variants = {
  hidden: { opacity: 0, scale: 0.35 },
  visible: ({ entryDelay }: { entryDelay: number }) => ({
    opacity: 1,
    scale: 1,
    transition: { delay: entryDelay, duration: ENTRY_DURATION, ease: ENTRY_EASE },
  }),
  exit: ({ exitDelay }: { exitDelay: number }) => ({
    opacity: 0,
    scale: 0,
    transition: { delay: exitDelay, duration: EXIT_DURATION, ease: EXIT_EASE },
  }),
};

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

  // Decide how many cells fit using the target gap, same as before...
  const gridCols = Math.max(
    1,
    Math.floor((containerWidth + TARGET_GAP) / (PROBE_SIZE + TARGET_GAP)),
  );
  const gridRows = Math.max(
    1,
    Math.floor((containerHeight + TARGET_GAP) / (PROBE_SIZE + TARGET_GAP)),
  );

  // ...but instead of leaving the leftover as an outer margin, distribute it
  // into the gap between cells so the grid runs edge-to-edge.
  const gapX =
    gridCols > 1
      ? (containerWidth - gridCols * PROBE_SIZE) / (gridCols - 1)
      : 0;
  const gapY =
    gridRows > 1
      ? (containerHeight - gridRows * PROBE_SIZE) / (gridRows - 1)
      : 0;

  const probes = useMemo(() => {
    const centerX = (gridCols - 1) / 2;
    const centerY = (gridRows - 1) / 2;

    const baseProbes = Array.from({ length: gridCols * gridRows }, (_, index) => {
      const col = index % gridCols;
      const row = Math.floor(index / gridCols);
      const x = col * (PROBE_SIZE + gapX);
      const y = row * (PROBE_SIZE + gapY);
      const centerDistance = Math.hypot(col - centerX, row - centerY);

      return { id: `probe-${col}-${row}`, col, row, x, y, centerDistance };
    });

    return [...baseProbes]
      .sort((a, b) => {
        if (a.centerDistance !== b.centerDistance) return a.centerDistance - b.centerDistance;
        if (a.row !== b.row) return a.row - b.row;
        return a.col - b.col;
      })
      .map((probe, rippleIndex) => ({ ...probe, rippleIndex }));
  }, [gridCols, gridRows, gapX, gapY]);

  const entryLength = (gridCols + gridRows - 2) * ENTRY_STEP + ENTRY_DURATION;
  const exitLength = Math.max(0, probes.length - 1) * EXIT_STEP + EXIT_DURATION;

  useEffect(() => {
    if (phase !== "extracting" || containerWidth === 0 || containerHeight === 0) return;

    setStage("entering");
    setColors({});
    setExtractedColors([]);

    const entryTimeout = window.setTimeout(() => setStage("breathing"), entryLength * 1000);
    return () => window.clearTimeout(entryTimeout);
  }, [containerHeight, containerWidth, entryLength, phase, setExtractedColors]);

  useEffect(() => {
    if (stage !== "breathing" || phase !== "extracting") return;

    const extractionTimeout = window.setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const scaleX = canvas.width / containerWidth;
      const scaleY = canvas.height / containerHeight;
      const sampleSize = Math.max(1, Math.round(PROBE_SIZE * Math.min(scaleX, scaleY)));

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
            rgb: { r: rgb.r, g: rgb.g, b: rgb.b },
            color: rgb.color,
          },
        ];
      });

      setColors(Object.fromEntries(extracted.map(({ id, color }) => [id, color])));
      setExtractedColors(extracted.map(({ color: _color, ...color }) => color));
      setStage("leaving");
    }, BREATH_DURATION * 1000);

    return () => window.clearTimeout(extractionTimeout);
  }, [canvasRef, containerHeight, containerWidth, phase, probes, setExtractedColors, stage]);

  useEffect(() => {
    if (stage !== "leaving") return;
    const exitTimeout = window.setTimeout(() => setPhase("clustering"), exitLength * 1000);
    return () => window.clearTimeout(exitTimeout);
  }, [exitLength, setPhase, stage]);

  return (
    <div className="absolute inset-0 pointer-events-none">
      <style>{`
        @keyframes probe-breathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(${BREATH_SCALE}); }
        }
        .probe-breathing {
          animation: probe-breathe ${BREATH_DURATION}s ease-in-out infinite;
        }
      `}</style>

      {probes.map((probe) => {
        const entryDelay = (probe.col + probe.row) * ENTRY_STEP;
        const exitDelay = probe.rippleIndex * EXIT_STEP;
      
        return (
          <motion.div
            key={probe.id}
            className="absolute flex items-center justify-center"
            style={{
              left: probe.x,
              top: probe.y,
              width: PROBE_SIZE,
              height: PROBE_SIZE,
              willChange: "transform, opacity",
            }}
            variants={itemVariants}
            custom={{ entryDelay, exitDelay }}
            initial="hidden"
            animate={stage === "leaving" ? "exit" : "visible"}
          >
            <div className={stage === "breathing" ? "probe-breathing" : undefined}>
              <ExtractionProbe color={colors[probe.id]} isLeaving={stage === "leaving"} />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};