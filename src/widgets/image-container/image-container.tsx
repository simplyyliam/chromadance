import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Spinner } from "@/components/ui/spinner";
import { Countdown, ExtractionShaderOverlay, ProbeGrid, useExtractionTimeline } from "@/features/extraction";
import { useExtractionStore } from "@/store/extractionStore";

type ImageContainerProps = {
  isDocked: boolean;
};

/** Explicit pixel radius so Motion can interpolate border-radius smoothly as
 *  the flight-clone morphs into the pill's fully-rounded shape. */
const RESTING_RADIUS = 28;

export default function ImageContainer({ isDocked }: ImageContainerProps) {
  const image = useExtractionStore((s) => s.image);
  const isHydrated = useExtractionStore((s) => s.isHydrated);
  const phase = useExtractionStore((s) => s.phase);
  const isShaderEnabled = useExtractionStore((s) => s.isShaderEnabled);

  const { stage, startAtRef } = useExtractionTimeline();
  const [imageVersion, setImageVersion] = useState(0);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // The one <img> that feeds canvas draws + the WebGL texture. Never
  // unmounts as long as `image` exists, so every run after the first starts
  // just as warm as the first one did.
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!image) return;
    const img = imageRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas || !img.complete || img.naturalWidth === 0) return;

    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, 0, 0);
    setImageVersion((v) => v + 1);
  }, [image]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const update = () =>
      setContainerSize({ width: container.clientWidth, height: container.clientHeight });

    update();
    const observer = new ResizeObserver(update);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const handleImageLoad = () => {
    const img = imageRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;

    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, 0, 0);
    setImageVersion((v) => v + 1);
  };

  return (
    <motion.div
      ref={containerRef}
      animate={
        isDocked
          ? { opacity: 0, scale: 0.9 }
          : { opacity: 1, scale: 1 }
      }
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      style={{ pointerEvents: isDocked ? "none" : "auto" }}
      className="relative z-40 flex h-[60svh] w-[55svw] items-center justify-center overflow-hidden rounded-[28px] bg-klein shadow-2xl"
    >
      <canvas ref={canvasRef} className="hidden" />

      {!isHydrated ? (
        <Spinner className="text-white" />
      ) : image ? (
        <>
          {/* Hidden data source — feeds canvas.drawImage + the WebGL
              texture. Never unmounts, so it never re-loads on run 2+. */}
          <img
            ref={imageRef}
            src={image}
            alt=""
            onLoad={handleImageLoad}
            className="absolute inset-0 h-full w-full object-cover opacity-0"
          />

          {/* The visible photo. Lightweight and stateless, so it's safe to
              unmount/remount every run purely to drive the shared-layout
              flight into the toolbar's pill. */}
          <AnimatePresence>
            {!isDocked && (
              <motion.div
                key="dock-photo"
                layoutId="dock-photo"
                transition={{ type: "spring", stiffness: 260, damping: 30, mass: 0.9 }}
                style={{ borderRadius: RESTING_RADIUS }}
                className="absolute inset-0 z-0 overflow-hidden"
              >
                <img src={image} alt="Uploaded content" className="h-full w-full object-cover" />
              </motion.div>
            )}
          </AnimatePresence>

          {isShaderEnabled && (
            <ExtractionShaderOverlay
              imageRef={imageRef}
              imageVersion={imageVersion}
              startAtRef={startAtRef}
              stage={stage}
              width={containerSize.width}
              height={containerSize.height}
            />
          )}
          <ProbeGrid
            canvasRef={canvasRef}
            startAtRef={startAtRef}
            stage={stage}
            imageVersion={imageVersion}
            containerWidth={containerSize.width}
            containerHeight={containerSize.height}
          />
          {phase === "countdown" && <Countdown />}
        </>
      ) : (
        <p className="text-sm text-white/70">
          Choose an image from the toolbar below to begin.
        </p>
      )}
    </motion.div>
  );
}
