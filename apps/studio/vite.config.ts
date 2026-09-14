import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import path from "path"

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    babel({ presets: [reactCompilerPreset()] })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Dev: resolve the workspace packages straight from source so editing
      // them hot-reloads here with no rebuild. Consumers of the published
      // packages still use the built dist/ output.
      "@chromadance/core": path.resolve(__dirname, "../../packages/core/src/index.ts"),
      "@chromadance/react": path.resolve(__dirname, "../../packages/react/src/index.ts"),
    },
  },
})
