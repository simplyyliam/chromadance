import { extractColor } from "@/lib/extractColor";
import { Unit8ToRGB } from "@/lib/Unit8toRGB";
import { useExtractionStore } from "@/store/extractionStore";
import { motion } from "motion/react";
import { useEffect, useMemo, useState, type RefObject } from "react";
import { ExtractionProbe } from "./ExtractionProbe";

type ProbeGridProps = {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  imageVersion: number;
  containerWidth: number;
  containerHeight: number;
};

const PROBE_SIZE = 16;
const GAP = 4;

export const ProbeGrid = ({
  canvasRef,
  containerWidth,
  containerHeight,
}: ProbeGridProps) => {
  const phase = useExtractionStore((s) => s.phase);
  const setExtractedColors = useExtractionStore((s) => s.setExtractedColors);
  const setPhase = useExtractionStore((s) => s.setPhase);
  const [colors, setColors] = useState<Record<string, string>>({});
  const [hasExtracted, setHasExtracted] = useState(false);

  // Calculate grid dimensions
  const gridCols = Math.max(1, Math.floor((containerWidth + GAP) / (PROBE_SIZE + GAP)));
  const gridRows = Math.max(1, Math.floor((containerHeight + GAP) / (PROBE_SIZE + GAP)));
  const gridWidth = gridCols * PROBE_SIZE + (gridCols - 1) * GAP;
  const gridHeight = gridRows * PROBE_SIZE + (gridRows - 1) * GAP;
  const offsetX = (containerWidth - gridWidth) / 2;
  const offsetY = (containerHeight - gridHeight) / 2;

  const probes = useMemo(
    () =>
      Array.from({ length: gridCols * gridRows }, (_, index) => {
        const col = index % gridCols;
        const row = Math.floor(index / gridCols);

        return {
          id: `probe-${col}-${row}`,
          col,
          row,
          x: offsetX + col * (PROBE_SIZE + GAP),
          y: offsetY + row * (PROBE_SIZE + GAP),
        };
      }),
    [gridCols, gridRows, offsetX, offsetY],
  );

  const totalProbes = probes.length;

  // Extract colors after probes have entered
  useEffect(() => {
    if (phase !== "extracting" || hasExtracted) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Wait for probes to enter before extracting
    const extractionDelay = setTimeout(() => {
      const extracted = probes.flatMap((probe) => {
        const imageData = extractColor(
          Math.round(probe.x),
          Math.round(probe.y),
          PROBE_SIZE,
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

      const colorMap = Object.fromEntries(extracted.map(({ id, color }) => [id, color]));
      setColors(colorMap);
      setExtractedColors(extracted.map(({ color: _color, ...rest }) => rest));
      setHasExtracted(true);

      // Transition to clustering after extraction
      setTimeout(() => setPhase("clustering"), 600);
    }, 800);

    return () => clearTimeout(extractionDelay);
  }, [phase, hasExtracted, canvasRef, probes, setExtractedColors, setPhase]);

  const isLeaving = phase === "clustering";

  return (
    <div className="absolute inset-0 pointer-events-none">
      {probes.map((probe, i) => {
        const entryDelay = (probe.col + probe.row) * 0.008;
        const exitDelay = (totalProbes - i - 1) * 0.004;

        return (
          <motion.div
            key={probe.id}
            className="absolute"
            initial={{ opacity: 0, scale: 0.3 }}
            animate={isLeaving ? { opacity: 0, scale: 0.3 } : { opacity: 1, scale: 1 }}
            transition={{
              delay: isLeaving ? exitDelay : entryDelay,
              duration: isLeaving ? 0.2 : 0.35,
              ease: isLeaving ? "easeIn" : [0.34, 1.2, 0.64, 1],
            }}
            style={{ left: probe.x, top: probe.y }}
          >
            <ExtractionProbe color={colors[probe.id]} />
          </motion.div>
        );
      })}
    </div>
  );
};
