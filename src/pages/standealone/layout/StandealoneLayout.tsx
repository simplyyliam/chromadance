import { Outlet } from "react-router-dom";

export default function StandealoneLayout() {
  return (
    <div className="min-h-0 flex-1 overflow-hidden">
      <Outlet />
    </div>
  )
}