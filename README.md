# Personal website — Vinay Batra

Live: **https://vinaybatra.org**
Repo: github.com/vinay-batra/personal-website (auto-deploys to Vercel on push to `main`)

A high-end personal site: warm-noir aesthetic (ink `#0F0D0A`, bone `#EDE4D3`; the old amber `#E8A33D`
brand is now fully retired from the page), Fraunces + IBM Plex, and lots of scroll-driven / generative /
cursor-reactive motion. The **hero is black & white** (white "VB" particles); the per-section
**accent** that tints the cursor/spine/aurora then runs a **cyan → pink spectrum** down the 8 chapters.

## Stack
- **Next.js 16** (App Router, TypeScript, Tailwind v4), static route, push-to-deploy on Vercel
- **React Three Fiber + three.js** — the "VB" particle monogram (hero + intro) with **bloom**
  post-processing, the About constellation, and (`@react-three/drei` `MeshTransmissionMaterial`) the
  Playground obsidian gem
- **Raw WebGL2** — the Aurora backdrop, the Playground ink fluid sim (Navier–Stokes), the lava +
  kaleidoscope shader toys
- **Framer Motion** — scroll-scrubbed visuals, reveals, scroll-velocity skew, scroll spine, count-ups
- **Lenis** — smooth scroll (lerp 0.14)
- 2D `<canvas>` for the project visuals, the From-scratch demos, and the GitHub heatmap (pause off-screen)

## The pieces
- **Hero** (`Hero.tsx` + `VBParticles.tsx`) — a **static "VB"** particle monogram on the right that
  assembles on load, tilts to the cursor, **glows (bloom)**, and dissolves/streams downward on
  scroll (fixed full-viewport layer behind content). **Click it to shatter** — particles fling out
  to a scatter sphere and reform over ~2.2s, with a silent ~3s cooldown (no spam); the canvas stays
  live whenever the hero is on screen (IntersectionObserver) so the shatter still works after you
  scroll away and back. The "V"'s thin
  right serif is density-weighted so it reads as bright as the thick stroke. Warm off-white
  (`#F6EEDD`) with a wide soft **bloom** halo (radius ~0.65) that fills the space between the letters.
  **On mobile the VB isn't mounted at all** (gated by `lib/useIsDesktop.ts`, < 768px): the hero is
  content-height instead of `100svh` so there's no empty gap, the loader shows a quick serif "VB"
  mark instead of the canvas, and a one-time `MobileNotice.tsx` popup nudges users to view on a desktop.
- **Loader** (`Loader.tsx`) — black intro; the VB assembles from particles scattered **across the
  whole viewport** (full-screen canvas, camera pulled back via `camZ`), holds, then the curtain lifts.
- **Nav** (`TopBar.tsx`) — wordmark "VINAY BATRA" only (no glyph), left-aligned to the hero headline;
  active-section highlight. Collapses to wordmark + "06 CONTACT" below `lg`.
- **About** (`visuals/AboutConstellation.tsx`) — a true **3D R3F "map of me"**: ~37 nodes (facts,
  products, skills, community, languages, hobbies) as uniform white glowing points wired into a
  constellation. **Drag to orbit** (it holds wherever you drag it and keeps a slow clockwise spin);
  **hover** lights a node + its label + its (thick, glowing) edges in the section's cyan; **tap a node** opens an anchored popup card with a
  one-line blurb (the map keeps spinning behind it); **long-press** pauses/resumes. Labels are always
  on, white, depth-weighted, and clamped so none clip. **No bloom** — the glow is additive soft-disc
  points (a `Bloom`/EffectComposer pass renders an opaque rectangle over the aurora, i.e. a visible
  "box", so it's avoided); the canvas **bleeds past its column** so glows/labels never hit an edge, with
  a soft grey contrast blob and a far static starfield behind. Below the bio: a stacked **Test Scores**
  block (ACT 35/36, SSAT 2398/2400) and a **Languages** list. (`AboutGraphic.tsx`, the old 2D version,
  is kept in the repo but unused.)
- **Work** (`Projects.tsx` + `visuals/`) — Corvo / Lark / FBLA One, each with a brand-colored 2D-canvas
  visual that builds on scroll: **Corvo** equity chart + Monte Carlo fan, **Lark** plucked strings,
  **FBLA One** a **chapter dashboard** (`FblaDashboard.tsx` — bars that grow in + a gold trend line +
  hover values). Brand-glow hover. Each block lists an identical **Built with** stack (Next.js ·
  TypeScript · FastAPI · Python · Supabase · Claude API). **Corvo** and **FBLA One** also show a
  clickable **live-website preview image** (`next/image`, sources in `public/`) that opens the site.
- **From scratch** (`Experiments.tsx`) — a **subsection of Work** (not its own chapter on the spine):
  classic CS rebuilt from nothing, running live in the browser. (1) **Pathfinding visualizer**
  (`visuals/AlgoVisualizer.tsx`) — BFS / DFS / Dijkstra / A* from scratch on a grid; draw walls, drag
  the endpoints, animated search + path (sequenced with CSS `animation-delay`), with per-algorithm
  explanations + a path/explored readout. (2) **Ray tracer** (`visuals/RayTracer.tsx`) — ray–sphere +
  checkered floor, diffuse/specular, hard shadows, recursive reflections; renders on demand (low-res
  while dragging, sharp when settled), drag to orbit. (3) **Neural network** (`visuals/NeuralNet.tsx`)
  — a small MLP with hand-written backprop that trains live; the smooth background is its decision
  surface, the glowing line its learned boundary, with live accuracy.
- **GitHub** (`GithubActivity.tsx`) — real contribution heatmap fetched live (seeded fallback), reveal + count-up.
- **Leadership / Community / Recommendations** — a scroll-scrubbed glowing **experience timeline** (full
  history: investor, BetterMind, JITO/FJLP, Environmental Action Club, FBLA, CSO/SSAC, Corvo, Wharton);
  a **volunteering ledger** (Northampton Area Public Library, CRHSS/EAC, Trenton Area Soup Kitchen — 185
  hrs); pull-quotes.
- **Contact** (`Contact.tsx`) — links + email. LinkedIn and GitHub rows carry stat lines (2.3K
  followers · 2.3K connections; 3.2K commits). (The old "Greater Philadelphia" constellation was
  removed; the site footer lives in `Footer.tsx` after the Playground.)
- **Playground** (`Playground.tsx`) — a bottom "for fun" section: four interactive WebGL toys in a 2×2
  grid. **Ink** (`InkFluid.tsx` — a real raw-WebGL2 Navier–Stokes fluid sim; stir it, with
  colour/swirl/linger/size/glow controls), **Lava** + **Kaleidoscope** (`ShaderToy.tsx` fragment
  shaders), and **Obsidian** (`ObsidianGem.tsx` — a faceted crystal with drei `MeshTransmissionMaterial`
  refraction, drag to spin). Heavy WebGL canvases are mounted only near the viewport via `LazyVisual.tsx`.
- Site-wide: `Aurora.tsx` (WebGL flowing-gradient backdrop; subtler on mobile), `ScrollSpine.tsx`
  (left-edge progress spine), `Cursor.tsx` (crosshair that blooms a ring over links),
  `AccentTracker.tsx` — **section-accent theming**: cursor ring, scroll spine, and aurora tint all
  shift hue per section through a **cyan → pink spectrum** across the 8 numbered chapters (hero is
  near-white). Section labels
  **decode/scramble** in on enter (`SectionHeading.tsx`).

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
Tried & scrapped (Jun 14): a **3D GitHub "skyline"** in the Lately section (`GithubLandscape.tsx`,
deleted) — the contribution year as extruded glowing towers. The data is too sparse/recent to read as a
city; the user rejected it. The Lately section stays the **2D heatmap only** — don't add a 3D piece there.

## Notes / gotchas
- **Preview/harness can't verify motion**: the Claude preview pauses rAF/`useFrame` (page treated as
  hidden) and Lenis blocks programmatic scroll, so canvases freeze at t≈0 and below-the-fold scroll
  views are unreachable. Verify via DOM-state evals (element existence, sizes, computed styles), the
  production build, and the user's own localhost — not screenshots. Long sessions with many dev-server
  restarts also exhaust WebGL contexts → blank-white / tiny-corner render glitches (restart fixes it).
- Vercel didn't auto-detect Next.js → `vercel.json` pins `"framework": "nextjs"` (else 404).
- Vercel team Deployment Protection (SAML) is on by default — disable per-project for a public prod.
- **Domain**: live on `vinaybatra.org` (apex is canonical; `metadataBase` points there). Keep the
  `www → apex` redirect in **one place only** — the Vercel domain settings, NOT `next.config`. A code
  redirect once fought Vercel's domain redirect and caused an infinite loop (`ERR_TOO_MANY_REDIRECTS`).
  308 redirects cache hard in browsers, so test any redirect change in an incognito window.
- `DESIGN.md` documents the earlier "Corvid Ledger" direction; kept for reference.
