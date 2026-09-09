import { IconButton } from "@/shared/components/IconButton";
import { useExtractionStore } from "@/store/extractionStore";

export default function Toolbar() {

  const reset = useExtractionStore((s) => s.resetImage)
  const start = useExtractionStore((s) => s.start)

  return (
    <div className="flex items-center justify-center absolute bottom-5">
      <IconButton variant="ghost" Label="Start" className="w-15 h-11.5 bg-muted rounded-md" onClick={start} />
      <IconButton variant="destructive" Label="Reset" className="w-15 h-11.5 bg-destructive/10 rounded-md" onClick={reset} />
    </div>
  )
}
