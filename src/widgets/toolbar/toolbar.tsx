import { IconButton } from "@/shared/components/IconButton";
import { useExtractionStore } from "@/store/extractionStore";
import { motion } from "motion/react";

export default function Toolbar() {

  const phase = useExtractionStore((s) => s.phase);
  const reset = useExtractionStore((s) => s.reset)
  const start = useExtractionStore((s) => s.startCountdown)

  return (
    <motion.div
      animate={{ opacity: phase === 'complete' ? 0 : 1 }}
      transition={{ duration: 0.5 }}
      style={{ pointerEvents: phase === 'complete' ? 'none' : 'auto' }}
      className="flex items-center justify-center absolute bottom-5 pointer-events-auto"
    >
      <IconButton variant="ghost" Label="Start" className="w-15 h-11.5 bg-muted rounded-md" onClick={() => start()} />
      <IconButton variant="destructive" Label="Reset" className="w-15 h-11.5 bg-destructive/10 rounded-md" onClick={reset} />
    </motion.div>
  )
}
