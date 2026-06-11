# Personal website — Vinay Batra

Live: **https://personal-website-mu-nine-34.vercel.app**
Repo: github.com/vinay-batra/personal-website (auto-deploys to Vercel on push to `main`)

A high-end personal site: warm-noir aesthetic (ink `#0F0D0A`, bone `#EDE4D3`, amber `#E8A33D`),
Fraunces + IBM Plex, and lots of scroll-driven / generative / cursor-reactive motion.

## Stack
- **Next.js 16** (App Router, TypeScript, Tailwind v4), static route, push-to-deploy on Vercel
- **React Three Fiber + three.js** — the "VB" particle monogram (assembles on load, dissolves on
  scroll) and the page-load intro
- **Framer Motion** — scroll-scrubbed visuals, reveals, scroll-velocity skew, scroll spine, count-ups
- **Lenis** — smooth scroll (lerp 0.14)
- 2D `<canvas>` for the interactive section visuals (no extra WebGL contexts)

## The pieces
- **Hero** (`Hero.tsx` + `VBParticles.tsx`) — particle "VB" that assembles on load, tilts to the
  cursor, and dissolves/streams downward as you scroll (fixed full-viewport layer behind content).
- **Loader** (`Loader.tsx`) — black intro; the VB assembles, holds ~1.5s, then the site lifts away.
- **About** (`visuals/AboutGraphic.tsx`) — interactive "map of me": facts + interests as a drifting,
  cursor-linking constellation (organically scattered, no label collisions — seed 164).
- **Work** (`Projects.tsx` + `visuals/`) — Corvo / Lark / FBLA One, each with a brand-colored visual
  that **builds on scroll**: Corvo equity chart draws + Monte Carlo fan, Lark strings draw in then
  pluck, FBLA network assembles from a point. Brand-glow hover.
- **GitHub** (`GithubActivity.tsx`) — real contribution heatmap fetched live from
  `github-contributions-api.jogruber.de` (with a seeded fallback), animated reveal + count-up.
- **Leadership** — scroll-scrubbed glowing timeline with a playhead + igniting nodes; live year readout.
- **Community / Recommendations / Contact** — service ledger, pull-quotes, links to all sites + email.
- Site-wide: `Aurora.tsx` (WebGL flowing-gradient backdrop), `ScrollSpine.tsx` (left-edge progress
  spine), `Cursor.tsx` (crosshair that blooms a ring over links/nav), per-section accent colors.

## Brand mark
`components/VBMark.tsx` (nav) and `app/icon.svg` (favicon / bookmark / Vercel icon) are the same
particle "VB," 210 dots sampled from the Fraunces glyph. Regenerate via browser canvas sampling
(Node has no canvas) — see project memory.

## Develop
```bash
npm run dev    # http://localhost:3000
npm run build  # static production build
```
Everything respects `prefers-reduced-motion`. No env vars (the GitHub fetch is public, client-side).

## Notes / gotchas
- Vercel didn't auto-detect Next.js → `vercel.json` pins `"framework": "nextjs"` (otherwise 404).
- Vercel team Deployment Protection (SAML) is on by default — disable it for the project to make
  production public.
- `DESIGN.md` documents an earlier design direction ("The Corvid Ledger") and is kept for reference.
