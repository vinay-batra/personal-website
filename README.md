# Personal website — Vinay Batra

Live: **https://vinaybatra.org**
Repo: github.com/vinay-batra/personal-website (auto-deploys to Vercel on push to `main`)

A high-end personal site: warm-noir aesthetic (ink `#0F0D0A`, bone `#EDE4D3`, amber `#E8A33D`),
Fraunces + IBM Plex, and lots of scroll-driven / generative / cursor-reactive motion.

## Stack
- **Next.js 16** (App Router, TypeScript, Tailwind v4), static route, push-to-deploy on Vercel
- **React Three Fiber + three.js** — the "VB" particle monogram (hero + intro) with **bloom**
  post-processing (`@react-three/postprocessing`), and the FBLA 3D force-graph
- **Framer Motion** — scroll-scrubbed visuals, reveals, scroll-velocity skew, scroll spine, count-ups
- **Lenis** — smooth scroll (lerp 0.14)
- 2D `<canvas>` for most section visuals (cheap; pause when off-screen)

## The pieces
- **Hero** (`Hero.tsx` + `VBParticles.tsx`) — a **static "VB"** particle monogram on the right that
  assembles on load, tilts to the cursor, **glows (bloom)**, and dissolves/streams downward on
  scroll (fixed full-viewport layer behind content). **Click it to shatter** — particles fling out
  to a scatter sphere and reform over ~2.2s, with a silent ~3s cooldown (no spam); the canvas stays
  live whenever the hero is on screen (IntersectionObserver) so the shatter still works after you
  scroll away and back. The "V"'s thin
  right serif is density-weighted so it reads as bright as the thick stroke. Pure white.
- **Loader** (`Loader.tsx`) — black intro; the VB assembles from particles scattered **across the
  whole viewport** (full-screen canvas, camera pulled back via `camZ`), holds, then the curtain lifts.
- **Nav** (`TopBar.tsx`) — wordmark "VINAY BATRA" only (no glyph), left-aligned to the hero headline;
  active-section highlight. Collapses to wordmark + "06 CONTACT" below `lg`.
- **About** (`visuals/AboutGraphic.tsx`) — interactive "map of me": facts + interests as a drifting,
  cursor-linking constellation; fills its card, labels clamped so wide ones don't clip on mobile.
  Below the bio: a **Test Scores** block (ACT 35/36, SSAT 2398/2400) and a **Languages** block.
- **Work** (`Projects.tsx` + `visuals/`) — Corvo / Lark / FBLA One, each with a brand-colored visual
  that builds on scroll: **Corvo** equity chart + Monte Carlo fan (2D canvas), **Lark** plucked
  strings (2D), **FBLA One** a **draggable 3D force-graph network** (R3F — grab to spin). Brand-glow hover.
  Each block lists an identical **Built with** stack (Next.js · TypeScript · FastAPI · Python · Supabase
  · Claude API). **Corvo** and **FBLA One** also show a clickable **live-website preview image**
  (`next/image`, sources in `public/`) under the graphic that opens the site in a new tab.
- **GitHub** (`GithubActivity.tsx`) — real contribution heatmap fetched live (seeded fallback), reveal + count-up.
- **Leadership / Community / Recommendations** — a scroll-scrubbed glowing **experience timeline** (full
  history: investor, BetterMind, JITO/FJLP, Environmental Action Club, FBLA, CSO/SSAC, Corvo, Wharton);
  a **volunteering ledger** (Northampton Area Public Library, CRHSS/EAC, Trenton Area Soup Kitchen — 185
  hrs); pull-quotes.
- **Contact** (`Contact.tsx`) — links + email, a **"Greater Philadelphia" constellation**, footer reads
  just "© 2026". LinkedIn and GitHub rows carry stat lines (2.3K followers · 2.3K connections; 2.2K commits).
- Site-wide: `Aurora.tsx` (WebGL flowing-gradient backdrop; subtler on mobile), `ScrollSpine.tsx`
  (left-edge progress spine), `Cursor.tsx` (crosshair that blooms a ring over links),
  `AccentTracker.tsx` — **section-accent theming**: cursor ring, scroll spine, and aurora tint all
  shift hue per section (amber→green→blue→teal→violet→amber). Section labels **decode/scramble** in
  on enter (`SectionHeading.tsx`).

## Brand mark / meta
- **Favicon**: `app/icon.png` (+ `apple-icon.png`) — a white, **glowing "VB" in Fraunces** on the dark
  rounded square (rendered to PNG via browser canvas using the real loaded `--font-fraunces`). Replaced
  the old particle-dot `icon.svg`.
- **OG share image**: `app/opengraph-image` (dynamic, from the monogram); `metadataBase` +
  `twitter:card` set in `app/layout.tsx`; `viewport` exports `themeColor #0f0d0a` + `viewportFit cover`.
- The standalone `components/VBMark.tsx` static SVG is **no longer used in the nav** (kept in repo).
- Regenerate the icon by rendering "VB" in Fraunces to a canvas in the browser, then exporting PNG
  (Node has no canvas/Fraunces).

## Develop
```bash
npm run dev    # http://localhost:3000 (launch.json entry "portfolio" → port 3002)
npm run build  # static production build
```
Everything respects `prefers-reduced-motion`. No env vars (the GitHub fetch is public, client-side).

## Branches
- `main` — current production.
- `morph-spine` — **parked experiment** (not adopted): a single persistent `ParticleSpine.tsx` cloud
  that forms VB then morphs through chart → strings → network → constellation on scroll, with the
  in-card project visuals hidden. Rejected in favor of the static hero; kept for reference.

## Tried & deliberately removed (don't re-add without asking)
magnetic CTAs / nav links · 3D/extruded headline (+ cursor perspective tilt on the headline) ·
gravity "playground" of product chips · liquid-displacement hover on cards · the VB→BUILD→INVEST
particle re-spell · cursor force-field that repelled the particles · the Corvo "volatility surface"
(reverted to the Monte Carlo chart).
Also tried & reverted (Jun 12): a GPU-shader "living" VB (per-particle shimmer / cool→warm iridescence /
curl-noise drift / depth shading / 10k particles), a parallax **dust-mote** atmosphere + bokeh, and a
**scroll-into-nav** signature collapse — all rolled back to the clean static monogram.

## Notes / gotchas
- **Preview/harness can't verify motion**: the Claude preview pauses rAF/`useFrame` (page treated as
  hidden) and Lenis blocks programmatic scroll, so canvases freeze at t≈0 and below-the-fold scroll
  views are unreachable. Verify via DOM-state evals (element existence, sizes, computed styles), the
  production build, and the user's own localhost — not screenshots. Long sessions with many dev-server
  restarts also exhaust WebGL contexts → blank-white / tiny-corner render glitches (restart fixes it).
- Vercel didn't auto-detect Next.js → `vercel.json` pins `"framework": "nextjs"` (else 404).
- Vercel team Deployment Protection (SAML) is on by default — disable per-project for a public prod.
- `DESIGN.md` documents the earlier "Corvid Ledger" direction; kept for reference.
