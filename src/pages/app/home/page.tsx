import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { SeedSelection } from "@/features/KOTC";
import { useExtractionStore } from "@/store/extractionStore";
import { ImageContainer } from "@/widgets";
import Toolbar from "@/widgets/toolbar/toolbar";

export default function Home() {
  const phase = useExtractionStore((s) => s.phase);
  const isDocked = phase === "contenders";

  // The pill's thumbnail slot is the flight's landing target. It's measured
  // after the pill's own layout animation settles, so the drop aims at the
  // slot's final resting position rather than a moving one.
  const thumbSlotRef = useRef<HTMLDivElement>(null);
  const [dockRect, setDockRect] = useState<DOMRect | null>(null);
  const [hasLanded, setHasLanded] = useState(false);

  useEffect(() => {
    if (!isDocked) {
      setDockRect(null);
      setHasLanded(false);
      return;
    }

    const measure = () => {
      const rect = thumbSlotRef.current?.getBoundingClientRect();
      if (rect) setDockRect(rect);
    };

    // The pill grows open over 0.4s; measure just before the fall begins.
    const timer = window.setTimeout(measure, 360);
    window.addEventListener("resize", measure);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", measure);
    };
  }, [isDocked]);

  return (
    <div className="flex items-center justify-center w-full h-screen">
      <div className="flex flex-col gap-2 items-center justify-center">
        <ImageContainer
          isDocked={isDocked}
          dockRect={dockRect}
          onLanded={() => setHasLanded(true)}
        />
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
        <Toolbar
          isDocked={isDocked}
          thumbSlotRef={thumbSlotRef}
          showThumbnail={hasLanded}
        />
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
  );
}
