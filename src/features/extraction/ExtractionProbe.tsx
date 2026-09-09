import { motion } from "motion/react";

type ExtractionProbeProps = {
  color?: string;
};

export const ExtractionProbe = ({ color }: ExtractionProbeProps) => (
  <motion.div
    className="h-4 w-4"
    style={{ backgroundColor: color ?? "#ffffff50" }}
  />
);

