import * as React from "react";
import { motion, type Variants } from "motion/react";

type WaveTextProps = {
  /** Plain text to animate letter-by-letter. Ignored if `children` is set. */
  text?: string;
  /** JSX to animate letter-by-letter. Any string found anywhere in the tree
   *  is split into per-letter motion.spans; actual elements (e.g. a nested
   *  <input>) are cloned as-is, un-split, with their own children walked
   *  the same way — so refs/handlers/hidden inputs stay fully functional. */
  children?: React.ReactNode;
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

/**
 * Recursively walks a ReactNode tree: every string becomes an array of
 * individual `motion.span` letters (so the container's staggerChildren
 * animates them one by one, same as plain text), while any real element is
 * cloned unchanged except that ITS children are walked the same way. Motion's
 * stagger/variant propagation works through plain DOM nesting (a <label> in
 * between, for example), so letters buried inside an element still animate
 * in sequence with the rest.
 */
const splitNode = (node: React.ReactNode, keyPrefix: string): React.ReactNode => {
  if (typeof node === "string") {
    return node.split("").map((char, i) => (
      <motion.span
        key={`${keyPrefix}-${i}`}
        variants={letter}
        style={{ display: "inline-block", whiteSpace: char === " " ? "pre" : "normal" }}
      >
        {char}
      </motion.span>
    ));
  }

  if (Array.isArray(node)) {
    return node.map((child, i) => splitNode(child, `${keyPrefix}-${i}`));
  }

  if (React.isValidElement(node)) {
    const children = (node.props as { children?: React.ReactNode }).children;
    // No children (e.g. a self-closing <input/>) — nothing to split, and
    // nothing to clone: return the exact original element, ref untouched.
    if (children === undefined) return node;

    return React.cloneElement(node, {
      children: splitNode(children, `${keyPrefix}-c`),
    } as React.Attributes);
  }

  // number, boolean, null, undefined — nothing to animate.
  return node;
};

export const WaveText = ({
  text,
  children,
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
      if (!show) onAnimationComplete?.();
    }}
  >
    {splitNode(children ?? text ?? "", "root")}
  </motion.span>
);
