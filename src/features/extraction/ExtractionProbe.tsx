import { extractColor } from "@/lib/extractColor";
import { Unit8ToRGB } from "@/lib/Unit8toRGB";
import { useExtractionStore } from "@/store/extractionStore";
import { motion } from "motion/react";
import { useEffect, useState, type RefObject } from "react";

type ExtractionProbeProps = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  imageVersion?: number;
  entryDelay?: number;
};

export const ExtractionProbe = ({
  id, x, y, width, height, canvasRef, imageVersion = 0, entryDelay = 0,
}: ExtractionProbeProps) => {

  const [color, setColor] = useState<string>();
  const addExtractedColor = useExtractionStore((s) => s.addExtractedColor)

  useEffect(() => {
    // Wait for the entry animation to roughly finish before sampling —
    // this is what makes extraction feel sequential/dramatic rather than instant.
    const timeout = setTimeout(() => {
      const size = Math.round(Math.min(width, height));
      const imageData = extractColor(Math.round(x), Math.round(y), size, canvasRef);
      if (!imageData) return;

      const rgbResult = Unit8ToRGB(imageData);
      setColor(rgbResult.color);

      addExtractedColor({
        id, x, y, width, height,
        rgb: { r: rgbResult.r, g: rgbResult.g, b: rgbResult.b },
      });
    }, entryDelay * 1000 + 300); // small extra delay after entry

    return () => clearTimeout(timeout);
  }, [x, y, width, height, canvasRef, imageVersion]);


  if (!color) return null;
  console.log("Data:", color)

  return (
    <motion.div
      className="w-2 h-2"
      style={{ backgroundColor: "#fff" }}
      animate={color ? { scale: [1, 1.08, 1] } : {}}
      transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
};
