import { Eye, Sparkles } from "lucide-react";
import { IconButton } from "@/shared/components/IconButton";
import { useExtractionStore } from "@/store/extractionStore";
import { motion } from "motion/react";

export default function Toolbar() {
  const phase = useExtractionStore((s) => s.phase);
  const reset = useExtractionStore((s) => s.reset);
  const start = useExtractionStore((s) => s.startCountdown);
  const areProbesVisible = useExtractionStore((s) => s.areProbesVisible);
  const isShaderEnabled = useExtractionStore((s) => s.isShaderEnabled);
  const toggleProbesVisible = useExtractionStore((s) => s.toggleProbesVisible);
  const toggleShaderEnabled = useExtractionStore((s) => s.toggleShaderEnabled);

  return (
    <motion.div
      animate={{ opacity: phase === "complete" ? 0 : 1 }}
      transition={{ duration: 0.5 }}
      style={{ pointerEvents: phase === "complete" ? "none" : "auto" }}
      className="absolute bottom-5 flex items-center justify-center gap-1.5 pointer-events-auto"
    >
      <IconButton
        Icon={Sparkles}
        Label="Shader"
        ariaLabel={`${isShaderEnabled ? "Disable" : "Enable"} extraction shader`}
        title={`${isShaderEnabled ? "Disable" : "Enable"} extraction shader`}
        pressed={isShaderEnabled}
        variant="ghost"
        className={`w-20 h-11.5 rounded-md transition-colors ${isShaderEnabled ? "bg-muted" : "bg-muted/40 text-muted-foreground"}`}
        onClick={toggleShaderEnabled}
      />
      <IconButton
        Icon={Eye}
        Label="Probes"
        ariaLabel={`${areProbesVisible ? "Hide" : "Show"} extraction probes`}
        title={`${areProbesVisible ? "Hide" : "Show"} extraction probes`}
        pressed={areProbesVisible}
        variant="ghost"
        className={`w-20 h-11.5 rounded-md transition-colors ${areProbesVisible ? "bg-muted" : "bg-muted/40 text-muted-foreground"}`}
        onClick={toggleProbesVisible}
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
