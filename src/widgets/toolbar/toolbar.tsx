import { IconButton } from "@/shared/components/IconButton";
import { useExtractionStore } from "@/store/extractionStore";
import { cn } from "cn";
import { Eye, Sparkles } from "lucide-react";
import { motion } from "motion/react";

export default function Toolbar() {
  const phase = useExtractionStore((s) => s.phase);
  const reset = useExtractionStore((s) => s.reset);
  const start = useExtractionStore((s) => s.startCountdown);

  const showShader = useExtractionStore((s) => s.showShader);
  const showProbes = useExtractionStore((s) => s.showProbes);
  const toggleShader = useExtractionStore((s) => s.toggleShader);
  const toggleProbes = useExtractionStore((s) => s.toggleProbes);

  const isBusy = phase !== "idle" && phase !== "complete";

  return (
    <motion.div
      animate={{ opacity: phase === "complete" ? 0 : 1 }}
      transition={{ duration: 0.5 }}
      style={{ pointerEvents: phase === "complete" ? "none" : "auto" }}
      className="flex items-center justify-center gap-1 absolute bottom-5 pointer-events-auto"
    >
      <IconButton
        variant="ghost"
        Icon={Sparkles}
        Label="Shader"
        size={14}
        disabled={isBusy}
        ariaLabel={showShader ? "Disable shader overlay" : "Enable shader overlay"}
        title="Toggle the WebGL light overlay"
        className={cn(
          "h-11.5 rounded-md transition-opacity",
          showShader ? "bg-muted opacity-100" : "bg-transparent opacity-45",
        )}
        onClick={toggleShader}
      />
      <IconButton
        variant="ghost"
        Icon={Eye}
        Label="Probes"
        size={14}
        disabled={isBusy}
        ariaLabel={showProbes ? "Disable probe grid" : "Enable probe grid"}
        title="Toggle the animated probe grid"
        className={cn(
          "h-11.5 rounded-md transition-opacity",
          showProbes ? "bg-muted opacity-100" : "bg-transparent opacity-45",
        )}
        onClick={toggleProbes}
      />

      <IconButton
        variant="ghost"
        Label="Start"
        className="w-15 h-11.5 bg-muted rounded-md"
        onClick={() => start()}
      />
      <IconButton
        variant="destructive"
        Label="Reset"
        className="w-15 h-11.5 bg-destructive/10 rounded-md"
        onClick={reset}
      />
    </motion.div>
  );
}
