# @chromadance/react

Feed in an image, get a set of HCT-derived design tokens injected as CSS
variables into any subtree. No shaders, no animation — it resolves instantly.

```bash
pnpm add @chromadance/react @chromadance/core
```

## Wrap any site

```tsx
import { Chromadance } from "@chromadance/react";

export function App() {
  return (
    <Chromadance image="/hero.jpg" mode="light">
      {/* Anything in here can use the generated tokens: */}
      <button
        style={{
          background: "var(--chromadance-primary-container)",
          color: "var(--chromadance-on-primary-container)",
        }}
      >
        Themed button
      </button>
    </Chromadance>
  );
}
```

By default the variables are written onto the wrapper element itself. To theme
the whole document, pass `target="root"` (writes to `document.documentElement`)
or `target={someElement}`.

## Read the result directly

```tsx
import { useChromadance } from "@chromadance/react";

function Palette() {
  const { status, tokens, seed } = useChromadance();
  if (status !== "ready") return null;
  return (
    <ul>
      {tokens.map((t) => (
        <li key={t.id} style={{ background: t.hex }}>{t.token}</li>
      ))}
    </ul>
  );
}
```

## Or run the pipeline without the wrapper

```tsx
import { useChromadanceExtraction } from "@chromadance/react";

const { cssVariables } = useChromadanceExtraction(file, { mode: "dark" });
```

## Props

| Prop        | Type                                   | Default            | Notes                                             |
| ----------- | -------------------------------------- | ------------------ | ------------------------------------------------- |
| `image`     | `string \| Blob \| HTMLImageElement \| HTMLCanvasElement \| null` | —        | Source to derive the palette from.                |
| `mode`      | `"light" \| "dark"`                    | `"light"`          | Which tone steps to resolve.                      |
| `gridCols`  | `number`                               | `12`               | Sampling grid columns.                            |
| `gridRows`  | `number`                               | `8`                | Sampling grid rows.                               |
| `cssPrefix` | `string`                               | `"--chromadance"`  | Prefix for the emitted CSS variables.             |
| `target`    | `"self" \| "root" \| HTMLElement`      | `"self"`           | Where the CSS variables are written.              |
| `as`        | `ElementType`                          | `"div"`            | Wrapper element type.                             |
| `onResult`  | `(result) => void`                     | —                  | Fires when extraction settles.                    |

The heavy lifting (grid sampling, the seed tournament, and HCT token
generation) lives in the framework-agnostic [`@chromadance/core`](../core)
package.
