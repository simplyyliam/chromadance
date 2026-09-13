import { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import { Spinner } from "@/components/ui/spinner";
import { Countdown, ExtractionShaderOverlay, ProbeGrid, useExtractionTimeline } from "@/features/extraction";
import { useExtractionStore } from "@/store/extractionStore";

type ImageContainerProps = {
  isDocked: boolean;
  /** Live rect of the toolbar pill's thumbnail slot — the landing target. */
  dockRect?: DOMRect | null;
  /** Fired the moment the flight touches down in the slot. */
  onLanded?: () => void;
};

const RESTING_RADIUS = 28;

/** idle → square (shrink in place) → falling (drop into pill) → landed */
type FlightStage = "idle" | "square" | "falling" | "landed";

export default function ImageContainer({ isDocked, dockRect, onLanded }: ImageContainerProps) {
  const image = useExtractionStore((s) => s.image);
  const isHydrated = useExtractionStore((s) => s.isHydrated);
  const phase = useExtractionStore((s) => s.phase);
  const isShaderEnabled = useExtractionStore((s) => s.isShaderEnabled);

  const { stage, startAtRef } = useExtractionTimeline();
  const [imageVersion, setImageVersion] = useState(0);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  // The engine box's viewport rect while at rest — the flight clone spawns
  // exactly here so the handoff is invisible.
  const [restRect, setRestRect] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);
  const [flight, setFlight] = useState<FlightStage>("idle");
  const [isSquareSettled, setIsSquareSettled] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Feeds canvas draws + the WebGL texture. Never unmounts as long as
  // `image` exists, so repeat extraction runs never cold-start.
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

    const update = () => {
      setContainerSize({ width: container.clientWidth, height: container.clientHeight });
      // Only track the resting geometry — once docking starts the box is
      // fading out and its rect must stay frozen at the pre-flight value.
      if (!isDocked) {
        const rect = container.getBoundingClientRect();
        setRestRect({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        });
      }
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(container);
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [isDocked]);

  // Kick the sequence off when docking begins, and fully reset on undock so a
  // repeat run replays the whole animation.
  useEffect(() => {
    if (!isDocked) {
      setFlight("idle");
      setIsSquareSettled(false);
      return;
    }
    setFlight((current) => (current === "idle" ? "square" : current));
  }, [isDocked]);

  // Only start falling once the square has settled AND the landing target has
  // been measured — otherwise the drop would aim at a stale/absent slot.
  useEffect(() => {
    if (flight === "square" && isSquareSettled && dockRect) setFlight("falling");
  }, [flight, isSquareSettled, dockRect]);

  const squareSide = restRect
    ? Math.max(160, Math.min(260, Math.min(restRect.width, restRect.height) * 0.5))
    : 0;

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
    <>
      {/* The engine. Always mounted, holds the canvas/WebGL/img/probes so
          nothing ever cold-starts on a repeat run. Its OWN visibility is a
          plain, un-shared fade — the flight below is a fully independent
          sibling, so this box's fade can never cut the flight off early. */}
      <motion.div
        ref={containerRef}
        animate={{ opacity: flight === "idle" ? 1 : 0 }}
        transition={{ duration: 0.15, ease: "easeInOut" }}
        style={{ pointerEvents: isDocked ? "none" : "auto" }}
        className="relative z-40 flex h-[60svh] w-[55svw] items-center justify-center overflow-hidden rounded-[28px] bg-klein shadow-2xl"
      >
        <canvas ref={canvasRef} className="hidden" />

        {!isHydrated ? (
          <Spinner className="text-white" />
        ) : image ? (
          <>
            <img
              ref={imageRef}
              src={image}
              alt=""
              onLoad={handleImageLoad}
              className="absolute inset-0 h-full w-full object-cover opacity-0"
            />

            {flight === "idle" && (
              <img
                src={image}
                alt="Uploaded content"
                className="absolute inset-0 z-0 h-full w-full object-cover"
              />
            )}

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

      {/* The flight layer. Mounted ONLY while the dock animation is actually
          running, so it can never sit on top of the shader during extraction.
          Phase 1 shrinks the photo into a centered square in place; phase 2
          drops that square down into the toolbar pill's thumbnail slot. */}
      {image && restRect && (flight === "square" || flight === "falling") && (
        <div className="pointer-events-none fixed inset-0 z-50">
          <motion.div
            className="absolute overflow-hidden bg-klein"
            style={{ top: restRect.top, left: restRect.left }}
            initial={{
              width: restRect.width,
              height: restRect.height,
              x: 0,
              y: 0,
              borderRadius: RESTING_RADIUS,
            }}
            animate={
              flight === "square"
                ? {
                    // Shrink to a square, staying visually centered on the
                    // container's resting centre (the x/y offsets cancel out
                    // the top-left anchored size change).
                    width: squareSide,
                    height: squareSide,
                    x: (restRect.width - squareSide) / 2,
                    y: (restRect.height - squareSide) / 2,
                    borderRadius: 24,
                  }
                : {
                    // Fall into the slot: shrink the rest of the way to the
                    // 28px circle while dropping, with a small overshoot just
                    // past the slot before settling.
                    width: dockRect?.width ?? 28,
                    height: dockRect?.height ?? 28,
                    x: (dockRect?.left ?? 0) - restRect.left,
                    y: [
                      (restRect.height - squareSide) / 2,
                      (dockRect?.top ?? 0) - restRect.top + 10,
                      (dockRect?.top ?? 0) - restRect.top,
                    ],
                    borderRadius: 999,
                  }
            }
            transition={
              flight === "square"
                ? { duration: 0.4, ease: [0.22, 1, 0.36, 1] }
                : {
                    // Size/shape finish slightly before touchdown so a small
                    // circle is what actually lands in the pill.
                    width: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
                    height: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
                    borderRadius: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
                    x: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
                    // The fall itself: accelerate down, then settle back up.
                    y: {
                      duration: 0.62,
                      times: [0, 0.82, 1],
                      ease: ["easeIn", "easeOut"],
                    },
                  }
            }
            onAnimationComplete={() => {
              if (flight === "square") setIsSquareSettled(true);
              else if (flight === "falling") {
                setFlight("landed");
                onLanded?.();
              }
            }}
          >
            <img src={image} alt="" className="h-full w-full object-cover" />
          </motion.div>
        </div>
      )}
    </>
  );
}
