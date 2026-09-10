import { useExtractionStore } from "@/store/extractionStore";
import { ImageContainer } from "@/widgets";
import Toolbar from "@/widgets/toolbar/toolbar";
import { motion } from "motion/react";

export default function Home() {
  const phase = useExtractionStore((s) => s.phase);
  
  return (
    <div className="flex items-center justify-center w-full h-screen">
      <div className="flex flex-col gap-2 items-center justify-center">
        <ImageContainer />
        {phase === 'extracting' && (
          <motion.div
            className="text-sm uppercase tracking-widest"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          >
            Extracting
          </motion.div>
        )}
      </div>
      <Toolbar/>
    </div>
  )
}