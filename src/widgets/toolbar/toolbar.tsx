import { useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { IconButton } from "@/shared/components/IconButton";
import { useExtractionStore } from "@/store/extractionStore";
import { motion } from "motion/react";
import { WaveText } from "@/shared";

type ToolbarProps = {
  isDocked: boolean;
};

const DOCKED_RADIUS = 999;

export default function Toolbar({ isDocked }: ToolbarProps) {
  const phase = useExtractionStore((s) => s.phase);
  const image = useExtractionStore((s) => s.image);
  const start = useExtractionStore((s) => s.startCountdown);
  const setImage = useExtractionStore((s) => s.setImage);
  const isShaderEnabled = useExtractionStore((s) => s.isShaderEnabled);
  const toggleShaderEnabled = useExtractionStore((s) => s.toggleShaderEnabled);

  const [fileName, setFileName] = useState("Choose image");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_FILENAME_LENGTH = 22;
  const displayName =
    fileName.length > MAX_FILENAME_LENGTH
      ? `${fileName.slice(0, MAX_FILENAME_LENGTH - 1)}…`
      : fileName;

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => setImage(event.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) handleFile(file);
    event.target.value = "";
  };

  return (
    <motion.div
      animate={{ opacity: phase === "complete" ? 0 : 1 }}
      transition={{ duration: 0.5 }}
      style={{ pointerEvents: phase === "complete" ? "none" : "auto" }}
      className="flex items-center justify-center gap-1.5 pointer-events-auto"
    >
      <motion.div layout className="flex items-center gap-1.5">
        <IconButton
          Icon={Sparkles}
          Label="Shader"
          ariaLabel={`${isShaderEnabled ? "Disable" : "Enable"} extraction shader`}
          title={`${isShaderEnabled ? "Disable" : "Enable"} extraction shader`}
          pressed={isShaderEnabled}
          variant="ghost"
          className={`w-25 h-11.5 rounded-full transition-colors ${
            isShaderEnabled ? "bg-muted" : "bg-muted/40 text-muted-foreground"
          }`}
          onClick={toggleShaderEnabled}
        />

        <motion.div
          layout
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-center gap-2 px-4 h-11.5 rounded-full bg-muted"
        >
          {isDocked && image && (
            <motion.div
              layoutId="dock-photo"
              transition={{ type: "spring", stiffness: 260, damping: 30, mass: 0.9 }}
              style={{ borderRadius: DOCKED_RADIUS }}
              className="h-7 w-7 shrink-0 overflow-hidden"
            >
              <img src={image} alt="" className="h-full w-full object-cover" />
            </motion.div>
          )}

          <WaveText key={fileName}>
            <label className="cursor-pointer text-sm max-w-48 overflow-hidden whitespace-nowrap">
              {displayName}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />
            </label>
          </WaveText>
        </motion.div>

        <IconButton
          variant="ghost"
          Label="Start"
          className="w-20 h-11.5 bg-muted rounded-full"
          onClick={() => start()}
        />
      </motion.div>
    </motion.div>
  );
}
