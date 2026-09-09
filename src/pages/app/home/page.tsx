import { ImageContainer } from "@/widgets";
import Toolbar from "@/widgets/toolbar/toolbar";

export default function Home() {
  return (
    <div className="flex items-center justify-center w-full h-screen">
      <ImageContainer />
      <Toolbar/>
    </div>
  )
}