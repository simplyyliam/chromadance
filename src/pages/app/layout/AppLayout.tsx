import { Outlet } from "react-router-dom";

export default function AppLayout() {
  return (
    <div className="min-h-0 flex-1 overflow-hidden">
      <Outlet />
    </div>
  )
}