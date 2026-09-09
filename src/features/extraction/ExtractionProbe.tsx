import { extractColor } from "@/lib/extractColor";
import { Unit8ToRGB } from "@/lib/Unit8toRGB";
import { useEffect, useState, type RefObject } from "react";

type ExtractionProbeProps = {
  x: number;
  y: number;
  size: number;
  color?: string;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  imageVersion?: number
};

export const ExtractionProbe = ({
  x,
  y,
  size,
  canvasRef,
  imageVersion = 0
}: ExtractionProbeProps) => {

  const [color, setColor] = useState<string>();

  useEffect(() => {
    const imageData = extractColor(x, y, size, canvasRef);

    if (!imageData) {
      setColor(undefined);
      return;
    }

    setColor(Unit8ToRGB(imageData).color);
  }, [x, y, size, canvasRef, imageVersion]);

  if (!color) return null;
  console.log("Data:", color)
  
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: size,
        height: size,
        backgroundColor: color,
      }}
    />
  );
};
