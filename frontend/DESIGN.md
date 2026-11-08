# Testverse design system

Every page stylesheet (`src/pages/<Page>/<Page>.css`) uses the same tokens,
type scale and components below. Each file is scoped to its page root at build
time (see `vite.config.js`), so each one repeats the `:root` token block. Keep
those blocks identical. Pages may still keep their own extra token names (for
example `--footer`); give those values from this palette.

## Principles

- Calm, editorial and trustworthy. The page is built from typography, spacing
  and colour, **not icons**: no decorative SVG icons, no emoji, and no ✓ or →
  glyphs used as icons. The exceptions are the Testverse logo, data charts, and
  the NTA question-palette shapes in the CBT screen (exam semantics students
  must recognise).
- One accent per surface. Gold appears only on navy surfaces (the primary call
  to action and small highlights). Blue is the primary action on light surfaces.
  Green, amber and red mean status only.
- Generous white space, hairline borders and soft shadows. Nothing shouts.

## Type

- Display: `"Plus Jakarta Sans", "Segoe UI", system-ui, sans-serif` (`--display`)
- Body: `"Inter", "Segoe UI", system-ui, sans-serif` (`--body`)
- Hindi text keeps Noto Sans Devanagari wherever a page already uses it.

| Role | Size / line height | Weight | Tracking |
|---|---|---|---|
| Hero h1 | clamp(36px, 5vw, 56px) / 1.05 | 700 | -0.03em |
| Page h1 | 28–32px / 1.15 | 700 | -0.02em |
| Section h2 | clamp(28px, 3.2vw, 38px) / 1.15 | 700 | -0.02em |
| Card title | 17–19px / 1.3 | 600 | -0.01em |
| Body | 16px / 1.6 (15px in dense app UI) | 400 | 0 |
| Small / meta | 13–14px / 1.5 | 400–500 | 0 |
| Field label | 13px | 600 | 0.01em, colour `--muted` |
| Eyebrow / table head | 12px, uppercase | 600 | 0.08em, colour `--muted` |
| Big stat number | 26–32px, `--display` | 700 | -0.02em, tabular |

Use `font-variant-numeric: tabular-nums` for scores, ranks, timers, prices and
the question palette.

## Colour tokens (keep these names; add the page's legacy aliases if it needs them)

```css
:root {
  color-scheme: light;
  --bg: #F7F8FA; --soft: #F1F3F7; --card: #FFFFFF;
  --ink: #0E1A2B; --ink-2: #26324A; --muted: #5B6577; --line: #E4E8EE; --field: #CDD3DE;
  --navy: #0B1B33; --navy-2: #13294A; --navy-line: #2A4166; --on-navy: #FFFFFF; --on-navy-muted: #B9C3D6;
  --gold: #E9B949; --gold-2: #D9A632; --gold-soft: #FBF4E2; --gold-line: #EEDDB0; --gold-ink: #7A5600;
  --blue: #2450D6; --blue-ink: #1B3DAA; --blue-soft: #EEF2FD;
  --green: #15803D; --green-soft: #E8F5EC; --green-ink: #11602F;
  --amber: #B45309; --amber-soft: #FDF3E7;
  --red: #C2261B; --red-soft: #FCEDEC;
  --purple: #6D3FC0; --purple-soft: #F2EDFB;
  --shadow-sm: 0 1px 2px rgba(14, 26, 43, 0.05), 0 1px 1px rgba(14, 26, 43, 0.03);
  --shadow-md: 0 12px 32px -12px rgba(14, 26, 43, 0.18);
  --shadow-lg: 0 30px 60px -20px rgba(5, 12, 28, 0.45);
  --display: "Plus Jakarta Sans", "Segoe UI", system-ui, sans-serif;
  --body: "Inter", "Segoe UI", system-ui, sans-serif;
}
@media (prefers-color-scheme: dark) {
  :root {
    color-scheme: dark;
    --bg: #0A1120; --soft: #111A2C; --card: #0F1828;
    --ink: #E9EDF5; --ink-2: #C9D1E0; --muted: #98A3B8; --line: #1F2B40; --field: #334159;
    --navy: #07111F; --navy-2: #0F1F38; --navy-line: #24395A; --on-navy-muted: #A9B5CB;
    --gold-soft: #2A2312; --gold-line: #4A3D1C; --gold-ink: #F0D79A;
    --blue: #7F9BFF; --blue-ink: #A9BCFF; --blue-soft: #16224A;
    --green: #4CC27E; --green-soft: #10291B; --green-ink: #94E0B3;
    --amber: #F0A456; --amber-soft: #2D1E0E;
    --red: #FF8A80; --red-soft: #33130F;
    --purple: #B49CFF; --purple-soft: #221A3D;
    --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.4);
    --shadow-md: 0 12px 32px -12px rgba(0, 0, 0, 0.6);
  }
}
```

The NTA palette in the CBT screen stays semantically the same (answered =
green, not answered = amber/red outline, marked = purple, not visited = soft
grey); only the exact values above apply.

## Components

- **Body**: `background: var(--bg); color: var(--ink); font: 400 16px/1.6 var(--body);`
  `-webkit-font-smoothing: antialiased;` `text-rendering: optimizeLegibility`.
- **Card**: `background: var(--card); border: 1px solid var(--line); border-radius: 14px;`
  `box-shadow: var(--shadow-sm); padding: 24px` (20px when dense).
- **Button**: min-height 44px (lg 52px, sm 36px), padding 0 18px, radius 10px,
  `font: 600 15px/1 var(--body)`, `letter-spacing: -0.005em`, transition of
  background, border-colour, colour and box-shadow over 150ms.
  - primary: `--blue` bg, white text; hover `--blue-ink`. In dark mode the blue is
    light, so primary text is `--navy` (white on #7F9BFF fails contrast).
  - gold (navy surfaces only): `--gold` bg, `--navy` text; hover `--gold-2`.
  - dark: `--navy` bg, white text; hover `--navy-2`.
  - outline: `--card` bg, `--ink` text, 1px `--field` border; hover `--soft` bg and `--ink-2` border.
  - ghost on navy: transparent, white text, 1px `rgba(255,255,255,.22)` border; hover `rgba(255,255,255,.08)` bg.
  - disabled: opacity .5, `cursor: not-allowed`.
- **Input / select / textarea**: 1px `--field` border, radius 10px, padding 11px 14px,
  16px text, `--card` bg; focus: `border-color: var(--blue); box-shadow: 0 0 0 3px var(--blue-soft); outline: none`.
- **Focus ring** (everything else): `:focus-visible { outline: 2px solid var(--blue); outline-offset: 2px; }`.
  On navy surfaces use `--gold`.
- **Chip / badge**: radius 999px, 12px/600 text, padding 3px 10px, soft status
  background with matching ink (green-soft/green-ink and so on). No icons inside.
- **Tabs / segmented control**: `--soft` track, radius 10px, 4px padding; the active
  item is `--card` with `--shadow-sm` and `--ink` text.
- **Tables**: 12px uppercase head row in `--muted`, 1px `--line` row dividers,
  14px vertical cell padding, numbers right-aligned or tabular.
- **Progress bars**: 6–8px tall, radius 999px, `--soft` track.
- **Links**: `--blue`, no underline by default, underline on hover
  (`text-underline-offset: 3px`). Inline links in body copy keep their underline.
- **Navy header**: `--navy` bg, 1px bottom border `--navy-line`, nav links
  `--on-navy-muted` and white on hover/active; the active item has a 2px gold
  underline or a subtle `rgba(255,255,255,.08)` pill, never both.
- **Lists that used tick icons**: use a 6px gold or blue dot, or a counter, drawn
  with `::before`.
- **Spacing**: 4px base; section padding 96px desktop / 64px mobile on
  marketing pages; 24px gaps in app grids.
- **Motion**: 150ms ease for hovers; respect `prefers-reduced-motion`.
- **Responsive**: layouts must work at 390px wide with a 16px gutter and no
  horizontal scroll.
