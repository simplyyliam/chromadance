import { motion } from "motion/react";
import { useMemo } from "react";
import { useExtractionStore } from "@/store/extractionStore";

export const SeedSelection = () => {
  const extractedColors = useExtractionStore((s) => s.extractedColors);

  const { columns, rows } = useMemo(() => {
    const xPositions = new Set(extractedColors.map((color) => color.x));
    const yPositions = new Set(extractedColors.map((color) => color.y));

    return {
      columns: Math.max(1, xPositions.size),
      rows: Math.max(1, yPositions.size),
    };
  }, [extractedColors]);

  return (
    <div
      className="relative grid h-[60svh] w-[55svw] overflow-hidden bg-accent"
      style={{
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
      }}
    >
      {extractedColors.map((color) => (
        <motion.div
          key={color.id}
          layoutId={color.id}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          style={{
            backgroundColor: `rgb(${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b})`,
          }}
        />
      ))}
    </div>
  );
};
