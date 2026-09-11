import { motion, type Variants } from "motion/react";

type WaveTextProps = {
  text: string;
  className?: string;
  stagger?: number;
  delay?: number;
  /** true = play the entrance wave. false = play the same wave in reverse. */
  show?: boolean;
  /** Fires when the reverse (outro) animation finishes. Never fires for the
   *  entrance — only used to chain what happens after text leaves. */
  onAnimationComplete?: () => void;
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

export const WaveText = ({
  text,
  className,
  stagger = 0.025,
  delay = 0,
  show = true,
  onAnimationComplete,
}: WaveTextProps) => (
  <motion.span
    className={className}
    style={{ display: "inline-flex", overflow: "hidden" }}
    variants={container}
    initial="hidden"
    animate={show ? "visible" : "hidden"}
    transition={{
      staggerChildren: stagger,
      delayChildren: show ? delay : 0,
      staggerDirection: show ? 1 : -1,
    }}
    onAnimationComplete={() => {
      // Only report completion of the outro, never the entrance — the parent
      // only cares about "the text has fully left."
      if (!show) onAnimationComplete?.();
    }}
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
