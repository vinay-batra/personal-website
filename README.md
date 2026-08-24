# Personal website — Vinay Batra

Live: **https://vinaybatra.org**
Repo: github.com/vinay-batra/personal-website (auto-deploys to Vercel on push to `main`)

A high-end personal site: warm-noir base (ink `#0F0D0A`, bone `#EDE4D3`), Fraunces + IBM Plex, and
scroll-driven / generative / cursor-reactive motion. **The whole page is monochrome** — the hero's
cool near-white (`#dfe7ee`) is the only hue on the site. Section accents (cursor ring, scroll spine,
Aurora backdrop) shift **shade only** per section, never color; the old cyan→pink spectrum and the
amber highlight are both retired.

## Stack
- **Next.js 16** (App Router, TypeScript, Tailwind v4), static route, push-to-deploy on Vercel
- **React Three Fiber + three.js** — the "VB" particle monogram (hero + intro) with **bloom**
  post-processing, and the About constellation
- **Raw WebGL2** — the Aurora backdrop (flattened to greyscale via luminance in the shader)
- **Framer Motion** — scroll-scrubbed visuals, reveals, scroll-velocity skew, scroll spine, count-ups
- **Lenis** — smooth scroll (lerp 0.14)
- 2D `<canvas>` for the four product visuals and the GitHub heatmap (pause off-screen)

## The pieces
- **Hero** (`Hero.tsx` + `VBParticles.tsx`) — a **static "VB"** particle monogram on the right that
  assembles on load, tilts to the cursor, **glows (bloom)**, and dissolves/streams downward on
  scroll (fixed full-viewport layer behind content). **Click it to shatter** — particles fling out
  to a scatter sphere and reform over ~2.2s, with a silent ~3s cooldown (no spam); the canvas stays
  live whenever the hero is on screen (IntersectionObserver) so the shatter still works after you
  scroll away and back. Warm off-white (`#F6EEDD`) with a wide soft **bloom** halo. Kicker line reads
  "Builder & investor · 4 products shipped." **On mobile the VB isn't mounted at all** (gated by
  `lib/useIsDesktop.ts`, < 768px): the hero is content-height instead of `100svh`, the loader shows a
  quick serif "VB" mark instead of the canvas, and a one-time `MobileNotice.tsx` popup nudges users to
  view on a desktop.
- **Loader** (`Loader.tsx`) — black intro; the VB assembles from particles scattered **across the
  whole viewport** (full-screen canvas, camera pulled back via `camZ`), holds, then the curtain lifts.
- **Nav** (`TopBar.tsx`) — wordmark "VINAY BATRA" only (no glyph), left-aligned to the hero headline;
  active-section highlight. **7 chapters**: About, Work, Lately, Lead, Serve, Recommendations, Contact.
- **About** (`visuals/AboutConstellation.tsx`) — a true **3D R3F "map of me"**: ~38 nodes (facts,
  products, skills, community, languages, hobbies) as uniform white glowing points wired into a
  constellation. **Drag to orbit**; **hover** lights a node + its edges in the section's grey;
  **tap a node** opens an anchored popup with a one-line blurb; **long-press** pauses/resumes. No
  bloom pass (an opaque `EffectComposer` box would show over the Aurora) — glow is additive soft-disc
  points instead. Below the bio: a **Languages** list (English, Hindi, Spanish + Spanish Honor
  Society, Urdu) and a **Coursework** block (9th–11th grade AP/Honors, with GPA). No test scores are
  shown. (`AboutGraphic.tsx`, the old 2D version, is kept in the repo but unused.)
- **Work** (`Projects.tsx` + `visuals/`) — four products, in order: **Corvo**, **FBLA One**,
  **Moreco Properties**, **Lark**, each with its own brand-grey 2D-canvas visual that builds on
  scroll. **Corvo** — equity chart + Monte Carlo fan (`CorvoChart.tsx`). **FBLA One** — a chapter
  dashboard, bars growing in + a trend line (`FblaDashboard.tsx`). **Moreco Properties** — a front
  elevation of an apartment building: facade, roof cornice, mullioned windows, an entrance; floors
  light up from the ground on scroll, the two vacant units glow/pulse, hovering a window names the
  unit and rent (`MorecoUnits.tsx`). **Lark** — plucked strings (`LarkStrings.tsx`). Each block lists
  its **actual** stack (only Corvo has a separate FastAPI/Python service; Lark's is tagged Web Audio
  API instead). Every project shows a clickable **live-website preview image**
  (`next/image`, sources in `public/`) that opens the site.
- **GitHub** (`GithubActivity.tsx`) — real contribution heatmap fetched live (seeded fallback), reveal + count-up.
- **Leadership** (`Leadership.tsx`) — a scroll-scrubbed glowing timeline **grouped by organization,
  LinkedIn-style**: multiple roles under one employer nest together (e.g. Member → President under
  Environmental Action Club, State Competitor → Competition Chair under FBLA), newest role first both
  within a group and across groups. The big mono year readout counts down 2026 → 2021 as you scroll.
- **Community** (`Community.tsx`) — a **185-square tally**, one square per volunteer hour, shaded by
  cause (library / school / soup kitchen); hovering a ledger row isolates that cause's squares and
  shows its share of the total.
- **Recommendations** (`Recommendations.tsx`) — pull-quotes from Anushka Goyal (BetterMind Labs) and
  Susan Elko (Free Library of Northampton Twp), each name linking to the recommender's LinkedIn.
  Internally still keyed `id="words"` / `data-section="WORDS"` (legacy), though every visible label
  reads "Recommendations."
- **Contact** (`Contact.tsx`) — trimmed to three channels only: email, phone, LinkedIn.
- Site-wide: `Aurora.tsx` (WebGL flowing-gradient backdrop, monochrome — see Colour system below),
  `ScrollSpine.tsx` (left-edge progress spine), `Cursor.tsx` (crosshair that blooms a ring over
  links), `AccentTracker.tsx` (per-section **shade**, not hue). Section labels **decode/scramble** in
  on enter (`SectionHeading.tsx`).

## Colour system (monochrome)
- `AccentTracker.tsx`'s `SECTION_ACCENT` map assigns each section a shade in the `#dfe7ee` family
  (`#b8c4d1` → `#dfe7ee`) — lighter or darker, never a different hue.
- `Aurora.tsx` takes whatever accent it's given and flattens it to **luminance** in the fragment
  shader before using it as the smoke color, so the background can only ever render grey regardless
  of what's fed in. This is a hard guarantee against hue creep, not just a palette choice.
- The highlight token is `--color-hi: #e6edf3` (cool silver) — nav numerals, `::selection`,
  `.inklink:hover`, the About drop cap. This replaced the old `--color-amber: #e8a33d`, which the
  site no longer uses anywhere.
- **Do not reintroduce blue / purple / pink / amber.** If a future ask wants a real accent color back,
  it's a small change (stop flattening to luminance in `Aurora.tsx`, restore hue variance in
  `SECTION_ACCENT`), but it hasn't been asked for.

## Brand mark / meta
- **Favicon**: `app/icon.png` (+ `apple-icon.png`) — a white, **glowing "VB" in Fraunces** on the dark
  rounded square (rendered to PNG via browser canvas using the real loaded `--font-fraunces`).
- **OG share image**: `app/opengraph-image` (dynamic, from the monogram); `metadataBase` +
  `twitter:card` set in `app/layout.tsx`; `viewport` exports `themeColor #0f0d0a` + `viewportFit cover`.
- The standalone `components/VBMark.tsx` static SVG is **no longer used in the nav** (kept in repo).
- Regenerate the icon by rendering "VB" in Fraunces to a canvas in the browser, then exporting PNG
  (Node has no canvas/Fraunces).

## Develop
```bash
npm run dev    # localhost:3002 (launch.json entry "portfolio")
npm run build  # static production build (also the TS gate)
```
Everything respects `prefers-reduced-motion`. No env vars (the GitHub fetch is public, client-side).

## Archived, not deleted
`components/archive/` holds the **"From scratch"** section (`Experiments.tsx` + a pathfinding
visualizer, a ray tracer, and a hand-written-backprop neural net) — removed from the live site Aug
2026 to simplify Work, but kept intact so it can be dropped back in later. See
`components/archive/README.md` for restore steps. It still uses the old cyan/blue/pink accent hexes,
so recolor to `#dfe7ee` before reinstating.

The **Playground** section (an ink fluid sim + a refracting obsidian gem, plus lava/kaleidoscope
toys tried and cut earlier) was deleted outright, not archived — recover it from git history
(`git log --all --oneline -- components/Playground.tsx`) if it's ever wanted back.

## Branches
- `main` — current production.
- `morph-spine` — **parked experiment** (not adopted): a single persistent `ParticleSpine.tsx` cloud
  that forms VB then morphs through chart → strings → network → constellation on scroll, with the
  in-card project visuals hidden. Rejected in favor of the static hero; kept for reference.

## Tried & deliberately removed (don't re-add without asking)
magnetic CTAs / nav links · 3D/extruded headline (+ cursor perspective tilt on the headline) ·
gravity "playground" of product chips · liquid-displacement hover on cards · the VB→BUILD→INVEST
particle re-spell · cursor force-field that repelled the particles · the Corvo "volatility surface"
(reverted to the Monte Carlo chart) · a GPU-shader "living" VB (shimmer / iridescence / curl-noise
drift / depth shading) · a parallax dust-mote atmosphere + bokeh · a scroll-into-nav signature
collapse · a 3D GitHub "skyline" in the Lately section (the data's too sparse to read as a city;
Lately stays the 2D heatmap) · the full Playground WebGL-toy section (ink/gem/lava/kaleidoscope) ·
the "From scratch" CS-demo section as a live part of Work (archived, see above) · the cyan→pink
per-section color spectrum · the amber `#e8a33d` highlight · the ACT/SSAT test-score stat block.

## Notes / gotchas
- **Preview/harness can't verify motion or scroll**: the Claude preview pauses rAF/`useFrame` (page
  treated as hidden) and Lenis blocks programmatic scroll, so canvases freeze at t≈0 and below-fold
  content never gets a real screenshot. Working pattern: inject a style that hides every
  `[data-section]` except the one under test and forces `opacity:1 !important;
  transform:none !important` on its children (defeating the `whileInView` reveals), then
  `window.scrollTo(0,0)` before screenshotting — that section renders at the top of the pane. For a
  canvas visual specifically, extract its draw callback into a standalone
  `public/__x-test.html` harness (strip TS annotations) so it can be inspected pixel-for-pixel outside
  Lenis/IntersectionObserver entirely. Otherwise verify via DOM-state evals (element existence, sizes,
  computed styles), `npm run build`, and the user's own localhost.
- Long dev-server sessions with many restarts exhaust WebGL contexts → blank-white / tiny-corner
  render glitches (restart fixes it).
- Vercel didn't auto-detect Next.js → `vercel.json` pins `"framework": "nextjs"` (else 404).
- Vercel team Deployment Protection (SAML) is on by default — disable per-project for a public prod.
- **Domain**: live on `vinaybatra.org` (apex is canonical; `metadataBase` points there). Keep the
  `www → apex` redirect in **one place only** — the Vercel domain settings, NOT `next.config`. A code
  redirect once fought Vercel's domain redirect and caused an infinite loop (`ERR_TOO_MANY_REDIRECTS`).
  308 redirects cache hard in browsers, so test any redirect change in an incognito window.
- **A GitHub → Vercel push once silently stopped deploying** (connecting a new, separate Vercel
  project — `moreco-properties` — to the same GitHub App flipped its repo access from "all
  repositories" to "only selected," dropping `personal-website` off the list with no error anywhere).
  Symptom: commits land on GitHub fine, but `vercel list-deployments` / the dashboard shows nothing
  new and the live site doesn't move. Fix: GitHub → Settings → Installed GitHub Apps → Vercel →
  Configure → make sure every repo that should auto-deploy is checked. A push after fixing access
  picks up automatically; no redeploy needed.
- `DESIGN.md` documents the earlier "Corvid Ledger" direction; kept for reference.
