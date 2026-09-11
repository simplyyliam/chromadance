import { motion, type Variants } from "motion/react";

type WaveTextProps = {
  text: string;
  className?: string;
  /** Seconds between each letter starting its animation — the wave speed. */
  stagger?: number;
  /** Seconds before the first letter starts. */
  delay?: number;
};

const container: Variants = {
  hidden: {},
  visible: {},
};

const letter: Variants = {
  hidden: { y: "60%", opacity: 0 },
  visible: {
    y: "0%",
    opacity: 1,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

export const WaveText = ({ text, className, stagger = 0.025, delay = 0 }: WaveTextProps) => (
  <motion.span
    className={className}
    style={{ display: "inline-flex", overflow: "hidden" }}
    variants={container}
    initial="hidden"
    animate="visible"
    transition={{ staggerChildren: stagger, delayChildren: delay }}
  >
    {text.split("").map((char, i) => (
      <motion.span
        key={i}
        variants={letter}
        style={{ display: "inline-block", whiteSpace: char === " " ? "pre" : "normal" }}
      >
        {char}
      </motion.span>
    ))}
  </motion.span>
);
