import { motion } from "motion/react";

type ExtractionProbeProps = {
  color?: string;
  isLeaving: boolean;
};

export const ExtractionProbe = ({ color, isLeaving }: ExtractionProbeProps) => (
  <motion.div
    className="h-1.5 w-1.5 "
    style={{ backgroundColor: isLeaving ? "#ffffff" : color ?? "#ffffff" }}
  />
);
