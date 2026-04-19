---
type: task
iteration: "1.1"
status: pending
branch: "feat/design-tokens"
pr:
completed:
tags:
  - design-system
  - phase-1
---

# Task 1: Design Token System

- **Branch**: `feat/design-tokens`
- **Scope**: Define all visual tokens as CSS custom properties and wire Tailwind config to reference them. Existing pages must not break.
- **Dependencies**: None

## Files

### Frontend

- `frontend/src/assets/tokens.css` (create) — all CSS custom property definitions
- `frontend/src/assets/main.css` (modify) — import tokens.css, remove inline variable declarations
- `frontend/tailwind.config.ts` (modify) — replace hardcoded hex values with `var()` references, add namespaced utility keys

## Acceptance Criteria

- [ ] All token dimensions from spec (color, font, spacing, radius, shadow, z-index, duration, blur) defined as CSS custom properties in `tokens.css`
- [ ] `tailwind.config.ts` references `var(--ts-*)` for all color values
- [ ] Non-color tokens available via `ts-` prefixed Tailwind utilities (e.g., `rounded-ts-md`, `shadow-ts-sm`)
- [ ] Existing Tailwind classes (`bg-ts-bg`, `text-ts-accent`, `shadow-glow`, etc.) continue to work identically
- [ ] No visual regression in existing pages
- [ ] `bun run build` succeeds
- [ ] `bun run type-check` passes

## Implementation Steps

- [ ] **Step 1: Create `tokens.css` with all design token definitions**

Create `frontend/src/assets/tokens.css`:

```css
:root {
  /* ── Colors ── */
  --ts-bg: #0b0c10;
  --ts-panel: #171923;
  --ts-panel-soft: #1f2330;
  --ts-text: #f4f5f7;
  --ts-muted: #a3a9b8;
  --ts-accent: #d4a843;
  --ts-accent-soft: #be9334;
  --ts-border: rgba(255, 255, 255, 0.1);

  /* ── Font Family ── */
  --ts-font-sans: "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  --ts-font-mono: "Cascadia Code", "Fira Code", monospace;

  /* ── Font Size ── */
  --ts-text-xs: 12px;
  --ts-text-sm: 14px;
  --ts-text-base: 16px;
  --ts-text-lg: 18px;
  --ts-text-xl: 20px;
  --ts-text-2xl: 24px;

  /* ── Font Weight ── */
  --ts-font-normal: 400;
  --ts-font-medium: 500;
  --ts-font-semibold: 600;

  /* ── Line Height ── */
  --ts-leading-tight: 1.25;
  --ts-leading-normal: 1.5;
  --ts-leading-relaxed: 1.75;

  /* ── Spacing (4px base) ── */
  --ts-space-1: 4px;
  --ts-space-2: 8px;
  --ts-space-3: 12px;
  --ts-space-4: 16px;
  --ts-space-6: 24px;
  --ts-space-8: 32px;
  --ts-space-12: 48px;
  --ts-space-16: 64px;

  /* ── Border Radius ── */
  --ts-radius-sm: 6px;
  --ts-radius-md: 12px;
  --ts-radius-lg: 16px;
  --ts-radius-xl: 24px;
  --ts-radius-full: 9999px;

  /* ── Shadow ── */
  --ts-shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.4);
  --ts-shadow-md: 0 4px 12px rgba(0, 0, 0, 0.5);
  --ts-glow-accent: 0 0 30px rgba(212, 168, 67, 0.35);
  --ts-glow-soft: 0 0 20px rgba(212, 168, 67, 0.15);

  /* ── Z-Index ── */
  --ts-z-dropdown: 100;
  --ts-z-sticky: 150;
  --ts-z-modal: 200;
  --ts-z-toast: 300;
  --ts-z-tooltip: 400;

  /* ── Transition Duration ── */
  --ts-duration-fast: 200ms;
  --ts-duration-normal: 400ms;
  --ts-duration-slow: 700ms;
  --ts-duration-drift: 1200ms;

  /* ── Blur (glassmorphism) ── */
  --ts-blur-sm: 4px;
  --ts-blur-md: 12px;
  --ts-blur-lg: 24px;
}
```

- [ ] **Step 2: Update `main.css` to import tokens and remove inline variables**

Replace the full content of `frontend/src/assets/main.css`:

```css
@import './tokens.css';

@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  min-height: 100vh;
  background: radial-gradient(circle at top right, rgba(212, 168, 67, 0.2), transparent 45%), var(--ts-bg);
  color: var(--ts-text);
  font-family: var(--ts-font-sans);
}
```

Key changes:
- Added `@import './tokens.css'` at top (before Tailwind directives)
- Removed the `:root { ... }` block (7 inline variables now live in `tokens.css`)
- Changed `font-family` to use `var(--ts-font-sans)` instead of hardcoded font stack

- [ ] **Step 3: Update `tailwind.config.ts` to reference CSS variables**

Replace the full content of `frontend/tailwind.config.ts`:

```ts
import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{vue,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ts: {
          bg: 'var(--ts-bg)',
          panel: 'var(--ts-panel)',
          panelSoft: 'var(--ts-panel-soft)',
          text: 'var(--ts-text)',
          muted: 'var(--ts-muted)',
          accent: 'var(--ts-accent)',
          accentSoft: 'var(--ts-accent-soft)',
          border: 'var(--ts-border)',
        },
      },
      fontFamily: {
        sans: ['var(--ts-font-sans)'],
        mono: ['var(--ts-font-mono)'],
      },
      borderRadius: {
        'ts-sm': 'var(--ts-radius-sm)',
        'ts-md': 'var(--ts-radius-md)',
        'ts-lg': 'var(--ts-radius-lg)',
        'ts-xl': 'var(--ts-radius-xl)',
        'ts-full': 'var(--ts-radius-full)',
      },
      boxShadow: {
        glow: 'var(--ts-glow-accent)',
        'glow-soft': 'var(--ts-glow-soft)',
        'ts-sm': 'var(--ts-shadow-sm)',
        'ts-md': 'var(--ts-shadow-md)',
      },
      zIndex: {
        dropdown: 'var(--ts-z-dropdown)',
        sticky: 'var(--ts-z-sticky)',
        modal: 'var(--ts-z-modal)',
        toast: 'var(--ts-z-toast)',
        tooltip: 'var(--ts-z-tooltip)',
      },
      transitionDuration: {
        fast: 'var(--ts-duration-fast)',
        normal: 'var(--ts-duration-normal)',
        slow: 'var(--ts-duration-slow)',
        drift: 'var(--ts-duration-drift)',
      },
      blur: {
        'ts-sm': 'var(--ts-blur-sm)',
        'ts-md': 'var(--ts-blur-md)',
        'ts-lg': 'var(--ts-blur-lg)',
      },
    },
  },
  plugins: [],
} satisfies Config
```

Key decisions:
- Color keys unchanged (`panelSoft` not `panel-soft`) to keep existing `bg-ts-panelSoft` working
- Added `border` color for `border-ts-border` class
- Non-color tokens use `ts-` prefix to avoid overriding Tailwind defaults (e.g., `rounded-ts-md` instead of `rounded-md`)
- `shadow-glow` preserved (same class name, now references variable)
- `fontFamily.sans` overrides Tailwind default so `font-sans` uses our stack

- [ ] **Step 4: Verify build and lint pass**

Run:
```bash
cd frontend && bun run build
```
Expected: Build succeeds with no errors.

Run:
```bash
cd frontend && bun run lint:fix
```
Expected: No lint errors (or auto-fixed).

- [ ] **Step 5: Verify no visual regression**

Start the dev server and check all existing pages in the browser:
```bash
cd frontend && bun run dev
```

Verify:
- Homepage (Card Draw) renders correctly with same colors/shadows
- Albums page renders correctly
- Upload page renders correctly
- Music page renders correctly
- Slideshow page renders correctly
- Settings page renders correctly
- Sidebar navigation active state glow works

All existing Tailwind classes should produce identical visual results because the CSS variable values match the previously hardcoded hex values.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/assets/tokens.css frontend/src/assets/main.css frontend/tailwind.config.ts
git commit -m "$(cat <<'EOF'
feat(tokens): add design token system with CSS custom properties

Define all visual tokens (color, font, spacing, radius, shadow, z-index,
transition, blur) as CSS variables in tokens.css. Tailwind config now
references var(--ts-*) instead of hardcoded values, enabling future
runtime theme switching.
EOF
)"
```

## Tests

### Frontend

- Visual verification only for this task. Automated visual regression testing is out of scope.
- The `bun run build` and `bun run type-check` commands validate that the Tailwind config is syntactically correct.
- Existing component tests should continue to pass unchanged — run `bun run test` to verify.
