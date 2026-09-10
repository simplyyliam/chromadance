import { useExtractionStore } from "@/store/extractionStore";
import { ImageContainer } from "@/widgets";
import Toolbar from "@/widgets/toolbar/toolbar";
import { motion } from "motion/react";

export default function Home() {
  const phase = useExtractionStore((s) => s.phase);
  const isImageExpanded = useExtractionStore((s) => s.isImageExpanded);
  const shouldCollapse = phase === 'clustering' && !isImageExpanded;

  return (
    <div className="flex items-center justify-center w-full h-screen">
      <div className=" flex flex-col gap-2 items-center justify-center">
        <ImageContainer shouldCollapse={shouldCollapse} />
        {phase === 'extracting' && (
          <motion.div
            className="absolute bottom-30 text-sm uppercase tracking-widest"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          >
            Extracting
          </motion.div>
        )}
      </div>
      <motion.div
        animate={
          shouldCollapse
            ? {
                scale: 0.95,
                opacity: 0,
                filter: 'blur(8px)',
              }
            : {
                scale: 1,
                opacity: 1,
                filter: 'blur(0px)',
              }
        }
        transition={{ duration: 0.45, ease: 'easeInOut' }}
        style={{
          pointerEvents: shouldCollapse ? 'none' : 'auto',
        }}
        className="absolute bottom-5"
      >
        <Toolbar />
      </motion.div>
    </div>
  )
}
