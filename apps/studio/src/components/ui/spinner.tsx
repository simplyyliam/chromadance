import { cn } from "cn"
import { LoaderCircle } from "lucide-react"

function Spinner({ className, strokeWidth, ...props }: React.ComponentProps<"svg">) {
  return (
    <LoaderCircle
      strokeWidth={typeof strokeWidth === "number" ? strokeWidth : 2}
      data-slot="spinner"
      role="status"
      aria-label="Loading"
      className={cn("size-4 animate-spin", className)}
      {...props}
    />
  )
}

export { Spinner }
