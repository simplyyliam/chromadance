# @chromadance/core

Framework-agnostic engine behind Chromadance. Zero UI, zero React — just the
color pipeline:

- **Sampling** — `sampleGridColors(canvas, cols, rows)`, `extractRegion(...)`
- **Seed selection** — `createSeedTournament(colors)` runs the "King Of The
  Colors" bracket to pick the strongest seed color deterministically.
- **HCT tokens** — `generateHctTokens(seed, mode)` maps a seed color to a set
  of UI design tokens (primary/secondary/tertiary containers, surface, outline)
  using real CAM16 hue/chroma via `@material/material-color-utilities`.
- **CSS variables** — `tokensToCssVariables(tokens)` flattens tokens into a
  `{ "--chromadance-<token>": "#hex" }` map.
- **Color utils** — `rgbToHex`, `contrastText`, `luminance`, `darkenColor`, …

```ts
import {
  sampleGridColors,
  createSeedTournament,
  generateHctTokens,
  tokensToCssVariables,
} from "@chromadance/core";

const grid = sampleGridColors(canvas, 12, 8)!;
const contenders = grid.map((rgb, i) => ({
  id: `cell-${i}`, x: i % 12, y: Math.floor(i / 12), width: 1, height: 1, rgb,
}));

const { seed } = createSeedTournament(contenders);
const tokens = generateHctTokens(seed!, "light");
const cssVars = tokensToCssVariables(tokens); // { "--chromadance-surface": "#...", ... }
```

Consumed by [`@chromadance/react`](../react), which adds the React wrapper and
CSS-variable injection.
