# THE CORVID LEDGER — design system (v2)

The site is a financial broadsheet printed by a Bloomberg terminal. Serif headlines on warm
ink-black paper, dense mono ledger chrome, one persistent 3D raven-flock that morphs into market
structures as you scroll. Corvo = raven. Every metaphor is literal to Vinay: the flock is his
market, the ledger is his discipline.

## Palette (CSS vars + Tailwind utilities, defined in app/globals.css)

| token     | hex       | tailwind        | use |
|-----------|-----------|-----------------|-----|
| ink       | `#0F0D0A` | `bg-ink`        | page background. Espresso ink — brown-shifted, never blue. |
| surface   | `#1A1712` | `bg-surface`    | panels |
| bone      | `#EDE4D3` | `text-bone`     | primary text — aged newsprint, not white |
| dim       | `#9C9080` | `text-dim`      | secondary text |
| amber     | `#E8A33D` | `text-amber`    | THE accent. Carries ALL numbers, rules-captions, HUD chrome. Amber MEANS data. |
| sheen     | `#87A5B4` | `text-sheen`    | raven-feather iridescence. ONLY for: benchmark/S&P references, link hovers, 3D rim light. |
| up        | `#5DA271` | `text-up`       | market-up semantics only |
| down      | `#D14D41` | `text-down`     | market-down semantics only |

**NO gradients anywhere. No glassmorphism. No glow/blur blobs.** Flat ink, hairlines, one amber.

Hairline = `border-bone/12`. Section surface borders = `border-bone/15`.

## Typography

- Display serif: **Fraunces** (`font-serif`), variable opsz — headlines auto-get display cuts at size.
  Sentence case. Exactly ONE italic word per headline (`<i>` — styled italic 400).
- Body: **IBM Plex Sans** (`font-sans`) 400/500, 17px/1.7 for prose.
- Data/chrome: **IBM Plex Mono** (`font-mono`). EVERY number on the site is Plex Mono
  `tabular-nums` in amber — dates, stats, indices — no exceptions.

Headline lockup (use `components/SectionHeading.tsx`): mono eyebrow (11px, uppercase,
tracking 0.18em, amber, types on char-by-char with a block cursor ▮ that blinks twice then dies)
above a Fraunces headline `clamp(2.75rem, 8vw, 6.5rem)`, leading 0.95, revealed per-line
(overflow-hidden, translateY 110%→0, 0.9s, cubic-bezier(0.16,1,0.3,1), 90ms stagger).

## Ledger grammar

- Dotted leaders: `.dotlead` (flex row; the leader is a flexible dotted rule between label and value).
- Tables close accounting-style: single hairline above the total row, **double rule** (`.rule-double`) below it.
- Section dividers: full-width hairline broken by a centered mono caption `◆ 04 · LEADERSHIP ◆` (`components/Divider.tsx`).
- Spreadsheet cell refs: tiny dim mono (`text-[9px] text-dim/60`) etched in cell corners (A1, B2…) where noted.
- `::selection` is amber with ink text (already global).
- External links: dotted underline; hover animates to solid amber and prints `↗` after.
  Use class `.inklink`.

## Motion rules

- Ease of record: `cubic-bezier(0.16, 1, 0.3, 1)` — exported as `EASE` from `lib/motion.ts`.
- Scroll reveals via framer-motion `whileInView` `{ once: true, margin: "-80px" }`.
- Count-ups: 1.2s easeOut, Plex Mono tabular-nums, amber (reuse `components/Counter.tsx`).
- Respect `prefers-reduced-motion` (framer `useReducedMotion`): reveals become fades,
  count-ups render final values, marquees become static rows.
- Mobile (<768px): word-by-word staggers collapse to line fades; sticky scenes flow naturally.

## Voice / copy

Quant-dry wit. Mono labels are terse and uppercase. Serif lines are editorial and warm.
Numbers must be REAL (his stats) or obviously systematic — never fake decorative deltas.

## Components already available (import these, don't reinvent)

- `components/SectionHeading.tsx` — `{index, eyebrow, lines}` two-deck lockup
- `components/Divider.tsx` — `{index, label}` ruled divider caption
- `components/Counter.tsx` — `{to, suffix}` count-up
- `components/Scramble.tsx` — `{value}` 3-frame char-scramble swap
- `components/RavenMark.tsx` — geometric corvid head SVG `{size}`
- `lib/seeded.ts` — deterministic PRNG (hydration-safe)
- `lib/motion.ts` — `EASE`, shared variants
- Lenis is mounted globally; native window scroll works; `useLenis()` from `lenis/react` for scrollTo.
