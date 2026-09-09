import { useExtractionStore } from "@/store/extractionStore";
import { motion } from "motion/react";
import { useEffect, useMemo, type RefObject } from "react";
import { ExtractionProbe } from "./ExtractionProbe";

type ProbeGridProps = {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  imageVersion: number;
  containerWidth: number;
  containerHeight: number;
};

export const ProbeGrid = ({ canvasRef, imageVersion, containerWidth, containerHeight }: ProbeGridProps) => {
  const targetProbeSize = useExtractionStore((s) => s.probeSize)
  const extractedColors = useExtractionStore((s) => s.extractedColors)
  const setPhaseAction = useExtractionStore((s) => s.setPhase)

  const gap = 4; // 4px gap between probes

  // Figure out how many probes fit edge-to-edge at roughly the target size,
  // then stretch each probe slightly so the grid fills the container exactly
  // with no leftover margin on the right/bottom edges.
  const gridCols = Math.max(1, Math.round((containerWidth + gap) / (targetProbeSize + gap)));
  const gridRows = Math.max(1, Math.round((containerHeight + gap) / (targetProbeSize + gap)));

  const totalGapWidth = (gridCols - 1) * gap;
  const totalGapHeight = (gridRows - 1) * gap;
  const probeWidth = (containerWidth - totalGapWidth) / gridCols;
  const probeHeight = (containerHeight - totalGapHeight) / gridRows;

  const probes = useMemo(() => {
    return Array.from({ length: gridCols * gridRows }, (_, i) => {
      const col = i % gridCols;
      const row = Math.floor(i / gridCols);
      return {
        id: `probe-${col}-${row}`,
        x: col * (probeWidth + gap),
        y: row * (probeHeight + gap),
      };
    });
  }, [gridCols, gridRows, probeWidth, probeHeight, gap]);

  useEffect(() => {
    if (extractedColors.length === probes.length && probes.length > 0) {
      const timeout = setTimeout(() => setPhaseAction('clustering'), 600)
      return () => clearTimeout(timeout)
    }
  }, [extractedColors.length, probes.length, setPhaseAction]);

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {probes.map((probe, i) => (
        <motion.div
          key={probe.id}
          initial={{ opacity: 0, scale: 0.3 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            delay: i * 0.02,
            duration: 0.3,
            type: 'spring',
            stiffness: 300,
            damping: 20,
          }}
          style={{
            position: 'absolute',
            left: probe.x,
            top: probe.y,
            width: probeWidth,
            height: probeHeight,
          }}
        >
          <ExtractionProbe
            id={probe.id}
            x={probe.x}
            y={probe.y}
            width={probeWidth}
            height={probeHeight}
            canvasRef={canvasRef}
            imageVersion={imageVersion}
            entryDelay={i * 0.02}
          />
        </motion.div>
      ))}
    </div>
  )
}
