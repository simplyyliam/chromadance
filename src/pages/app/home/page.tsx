import { LayoutGroup, motion } from "motion/react";
import { SeedSelection } from "@/features/KOTC";
import { useExtractionStore } from "@/store/extractionStore";
import { ImageContainer } from "@/widgets";
import Toolbar from "@/widgets/toolbar/toolbar";

export default function Home() {
  const phase = useExtractionStore((s) => s.phase);
  const isDocked = phase === "contenders";

  return (
    <LayoutGroup>
      <div className="flex items-center justify-center w-full h-screen">
        <div className="flex flex-col gap-2 items-center justify-center">
          <ImageContainer isDocked={isDocked} />
          {phase === "extracting" && (
            <motion.div
              className="absolute bottom-30 text-sm uppercase tracking-widest"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            >
              Extracting
            </motion.div>
          )}
        </div>

        <motion.div
          animate={{ opacity: 1, filter: "blur(0px)" }}
          transition={{ duration: 0.45, ease: "easeInOut" }}
          className="absolute bottom-5"
        >
          <Toolbar isDocked={isDocked} />
        </motion.div>

        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <motion.div
            animate={
              !isDocked
                ? { scale: 0.95, opacity: 0, filter: "blur(8px)" }
                : { scale: 1, opacity: 1, filter: "blur(0px)" }
            }
            transition={{ duration: 0.45, ease: "easeInOut" }}
            style={{ pointerEvents: !isDocked ? "none" : "auto" }}
          >
            {phase === "contenders" && <SeedSelection />}
          </motion.div>
        </div>
      </div>
    </LayoutGroup>
  );
}
