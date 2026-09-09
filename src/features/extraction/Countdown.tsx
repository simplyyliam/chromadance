import { useExtractionStore } from "@/store/extractionStore"
import { AnimatePresence, motion } from "motion/react"
import { useEffect } from "react"

export const Countdown = () => {
  const countdown = useExtractionStore((s) => s.countdown)
  const decrementCountdown = useExtractionStore((s) => s.decrementCountdown)

  useEffect(() => {
    if (countdown <= 0) return
    const timeout = setTimeout(decrementCountdown, 1000)
    return () => clearTimeout(timeout)
  }, [countdown, decrementCountdown]);

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
      <AnimatePresence mode="wait">
        <motion.span
          key={countdown}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 1.4, opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="text-8xl font-bold text-neutral-900"
        >
          {countdown}
        </motion.span>
      </AnimatePresence>
    </div>
  )
}
