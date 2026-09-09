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
  const gridCols = useExtractionStore((s) => s.gridCols)
  const gridRows = useExtractionStore((s) => s.gridRows)
  const extractedColors = useExtractionStore((s) => s.extractedColors)
  const setPhaseAction = useExtractionStore((s) => s.setPhase)

  const probeWidth = containerWidth / gridCols
  const probeHeight = containerHeight / gridRows

  const probes = useMemo(() => {
    return Array.from({ length: gridCols * gridRows }, (_, i) => {
      const col = i % gridCols;
      const row = Math.floor(i / gridCols);
      return {
        id: `probe-${col}-${row}`,
        x: col * probeWidth,
        y: row * probeHeight,
      };
    });
  }, [gridCols, gridRows, probeWidth, probeHeight]);

  useEffect(() => {
    if (extractedColors.length === probes.length && probes.length > 0) {
      const timeout = setTimeout(() => setPhaseAction('clustering'), 600)
      return () => clearTimeout(timeout)
    }
  }, [extractedColors.length, probes.length, setPhaseAction]);

  return (
    <>
      {probes.map((probe, i) => (
        <motion.div
          key={probe.id}
          initial={{ opacity: 0, scale: 0.3 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            delay: i * 0.02,       // domino stagger
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
    </>
  )
}
