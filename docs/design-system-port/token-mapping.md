# Token Mapping For Vite + Tailwind

This file explains how to translate the K-1 student design-system tokens into the Vite + Tailwind app.

## Strategy

Do not try to port CSS Modules from the Next.js repo into this repo one-to-one.

Instead:

- keep Tailwind for layout and utility composition
- use `src/index.css` as the single token source
- express design-system values as Tailwind `@theme` variables and regular CSS variables
- use small component classes only when utility strings become repetitive

## Current Starting Point

The current `src/index.css` is very thin:

```css
@theme {
  --font-sans: "Quicksand", ui-sans-serif, system-ui, sans-serif;
  --color-primary: #0069E4;
  --color-primary-dark: #0055b8;
  --color-surface: #E9E9E9;
  --color-gray-btn: #A0A0A0;
  --color-cool-gray: #B0BED3;
}
```

That is not enough for the new shell. Expand it so the app has the same core student token vocabulary as the design-system repo.

## Token Priorities

Add these first.

### Student colors

Use these values from the design-system repo:

- `--color-student-primary: #0069e4`
- `--color-student-primary-dark-1: #0058bf`
- `--color-student-primary-dark-2: #004597`
- `--color-student-primary-dark-3: #002c64`
- `--color-student-primary-light-1: #80b4f1`
- `--color-student-primary-light-2: #b3d2f7`
- `--color-student-primary-light-3: #e6f1fe`
- `--color-student-cool-gray: #b0bed3`
- `--color-student-cool-gray-dark-1: #909eb5`
- `--color-student-cool-gray-dark-2: #77879d`
- `--color-student-cool-gray-light-1: #dae3f0`
- `--color-student-cool-gray-light-2: #e8eef8`
- `--color-student-cool-gray-light-3: #f1f5fb`
- `--color-student-magenta: #c231a0`

### Text colors

- `--text-primary: #20242f`
- `--text-secondary: #444c63`
- `--text-white: #ffffff`

### Semantic colors

- `--color-success: #00866b`
- `--color-error: #db2e00`
- `--color-alert: #d8a202`

### Font families

Use K-1 defaults:

- `--font-student-lower: "Quicksand", ui-sans-serif, system-ui, sans-serif`

If Spanish or later grade bands need it, add:

- `--font-student-upper: "Open Sans", ui-sans-serif, system-ui, sans-serif`

### Spacing

Use a 12px rhythm-inspired scale, even if Tailwind utilities are used for most spacing.

- `--space-1: 4px`
- `--space-2: 8px`
- `--space-3: 12px`
- `--space-4: 16px`
- `--space-6: 24px`
- `--space-8: 32px`
- `--space-10: 40px`
- `--space-12: 48px`

### Radius

- `--radius-small: 6px`
- `--radius-medium: 8px`
- `--radius-large: 16px`
- `--radius-pill: 999px`

### Shadows

Add design-system-like elevations:

- `--shadow-raised: 0 0 1px 1px rgba(0,0,0,0.05), 0 3px 6px rgba(0,0,0,0.08), 0 3px 6px rgba(0,0,0,0.115)`
- `--shadow-transit: 0 0 1px 1px rgba(0,0,0,0.05), 0 10px 20px rgba(0,0,0,0.076), 0 6px 6px rgba(0,0,0,0.092)`

## Recommended `src/index.css` Direction

Use `@theme` for Tailwind-consumable tokens, then define matching CSS variables in `:root` for arbitrary values and component classes.

Recommended structure:

```css
@import url('https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&family=Open+Sans:wght@400;600&display=swap');
@import "tailwindcss";

@theme {
  --font-sans: "Quicksand", ui-sans-serif, system-ui, sans-serif;

  --color-student-primary: #0069e4;
  --color-student-primary-dark-1: #0058bf;
  --color-student-primary-dark-2: #004597;
  --color-student-primary-light-2: #b3d2f7;
  --color-student-primary-light-3: #e6f1fe;

  --color-student-cool-gray: #b0bed3;
  --color-student-cool-gray-dark-1: #909eb5;
  --color-student-cool-gray-light-1: #dae3f0;
  --color-student-cool-gray-light-2: #e8eef8;
  --color-student-cool-gray-light-3: #f1f5fb;

  --color-student-magenta: #c231a0;
  --color-text-primary: #20242f;
  --color-text-secondary: #444c63;
  --color-success: #00866b;
  --color-error: #db2e00;
}

:root {
  --font-student-lower: "Quicksand", ui-sans-serif, system-ui, sans-serif;
  --font-student-upper: "Open Sans", ui-sans-serif, system-ui, sans-serif;
  --radius-large: 16px;
  --radius-pill: 999px;
  --shadow-raised: 0 0 1px 1px rgba(0,0,0,0.05), 0 3px 6px rgba(0,0,0,0.08), 0 3px 6px rgba(0,0,0,0.115);
}
```

## Tailwind Usage Rules

### Prefer semantic utilities

Use semantic classes that mirror the design-system vocabulary:

- `bg-student-primary`
- `text-text-primary`
- `border-student-cool-gray-light-1`

Avoid raw color classes like:

- `bg-blue-600`
- `text-gray-700`
- `border-slate-200`

### Prefer token-like arbitrary values over random values

Good:

```tsx
className="rounded-[var(--radius-large)] shadow-[var(--shadow-raised)]"
```

Bad:

```tsx
className="rounded-[17px] shadow-[0_8px_23px_rgba(0,0,0,0.14)]"
```

### Keep transitions subtle

Use short, purposeful interactions:

- `transition-colors duration-150`
- `transition-transform duration-100`
- minimal active press states

Avoid:

- springy animation
- large translation effects
- long durations

## K-1 Component Token Rules

### Top shell

- background: `--color-student-cool-gray-light-3`
- bottom border: `--color-student-cool-gray-light-1`
- name text: `--text-primary`
- secondary subtitle: `--text-secondary`

### Raised circular or pill controls

Use the K-1 “raised shell + face + offset” pattern:

- shell base in cool gray
- face in white or primary blue
- small bottom offset to simulate depth
- active state collapses offset

### Primary CTA

- shell/background: `--color-student-primary-dark-2`
- face: `--color-student-primary`
- hover: `--color-student-primary-dark-1`
- text: white

### Secondary CTA

- shell/background: `--color-student-cool-gray`
- face: white
- text: primary blue
- border or inner emphasis in cool gray

### Focus states

All keyboard-focusable controls should use:

- outline color: `--color-student-magenta`
- outline width: 3px
- outline offset: 2px

## Suggested Reusable Class Layer

If the Tailwind strings become too long, add a small `@layer components` section to `src/index.css` with classes like:

- `.k1-shell`
- `.k1-raised-pill`
- `.k1-raised-circle`
- `.k1-card`
- `.k1-focus-ring`

Do not create a huge custom CSS system. Keep it thin and only extract patterns that are repeated 3 or more times.

## Font Guidance

Use Quicksand as the default student voice for K-1:

- large headings
- nav labels
- button labels
- helper copy

If a denser block appears in Spanish or in future upper-grade variants, Open Sans can be introduced selectively, but the K-1 companion should remain visually Quicksand-first.

## Asset And Icon Guidance

For fastest delivery:

- reuse the existing `lucide-react` icons where the visual mismatch is acceptable
- replace only the shell-critical icons with custom SVGs if necessary
- prioritize:
  - home
  - globe
  - arrows
  - listen
  - camera

Do not delay the prototype waiting for a fully custom icon set unless the icon is central to the experience.
