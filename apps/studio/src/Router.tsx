import { createBrowserRouter, type RouteObject } from "react-router-dom";
import type { ComponentType } from "react";
import { AppLayout, StandealoneLayout } from "./pages";

type PageModule = {
  default: ComponentType;
};

const pages = import.meta.glob("./pages/**/page.tsx", {
  eager: true,
});

console.log("Pages", Object.keys(pages));

const appRoutes: RouteObject[] = [];
const standaloneRoutes: RouteObject[] = [];

for (const [path, module] of Object.entries(pages)) {
  const page = module as PageModule;
  const Component = page.default;

  // 1. Convert file path to route
  let routePath = path
    .replace("./pages", "")
    .replace("/page.tsx", "");

  const isStandalone = routePath.includes("/standalone/");

  routePath = routePath
    .replace("/standalone", "")
    .replace("/app", "")
    .replace(/\[([^\]]+)\]/g, ":$1");

  const normalizePath = routePath.length === 0 ? "/" : routePath;

  // 2. Standalone main is the default route, while remaining available at /main.
  const isDefaultRoute = !isStandalone && normalizePath === "/home";

  if (isDefaultRoute) {
    appRoutes.push({ index: true, element: <Component /> });
  }

  const route: RouteObject = { path: normalizePath, element: <Component /> };

  // 3. Classification
  if (isStandalone) {
    standaloneRoutes.push(route);
  } else {
    appRoutes.push(route);
  }
}

export const Router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: appRoutes,

  },
  {
    element: <StandealoneLayout />,
    children: standaloneRoutes,
  }
]);
