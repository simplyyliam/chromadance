import { motion } from "motion/react";
import { useExtractionStore } from "@/store/extractionStore";

export const SeedSelection = () => {
  const extractedColors = useExtractionStore((s) => s.extractedColors);

  return (
    <div className="relative flex h-[60svh] w-[55svw] flex-wrap items-center justify-center overflow-hidden bg-accent">
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
          className="aspect-square grow w-5 h-5"
        />
      ))}
    </div>
  );
};
