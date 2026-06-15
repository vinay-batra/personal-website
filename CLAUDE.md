@AGENTS.md

# CLAUDE.md - Personal website (Vinay Batra)

Vinay's portfolio site. A high-end, motion-heavy single page: warm-noir aesthetic, a particle "VB"
monogram, real 3D/WebGL pieces, interactive from-scratch CS demos, and a playground of WebGL toys.
Full prose lives in `README.md`; this file is the agent-facing state + conventions.

---

## Current focus

**LIVE at [vinaybatra.org](https://vinaybatra.org)** (apex is canonical; metadataBase points there).
- Repo: `github.com/vinay-batra/personal-website`, **auto-deploys to Vercel on push to `main`**.
- Vercel: project `personal-website` (`prj_4wuXlCiSODvD4eTrA2149H2vibP7`), team `vinay-batras-projects`
  (`team_UTbeulhjkNeFOErLm67AL65w`). No env vars (the GitHub heatmap fetch is public + client-side).
- Stack: **Next.js 16** (App Router, TS, Tailwind v4), **React Three Fiber + three.js + @react-three/drei**
  (gem transmission, About constellation, hero bloom), **raw WebGL2** (Aurora, ink fluid sim, lava +
  kaleidoscope shaders), **Framer Motion**, **Lenis** (smooth scroll). gh/vercel CLIs are NOT installed
  on the machine; push via git (osxkeychain) and verify deploys via the Vercel MCP + curling the site.

**State (June 2026):** Hero VB particles + click-shatter · About 3D "map of me" constellation ·
Work (Corvo/Lark 2D visuals + FBLA One 2D dashboard) · a **"From scratch"** Work subsection
(pathfinding visualizer + ray tracer + neural net, all hand-written) · GitHub heatmap · Leadership
timeline / Community ledger / Recommendations · Contact · a **Playground** of 4 WebGL toys (ink fluid,
lava, kaleidoscope, obsidian gem), each with its own control panel · Footer. Section accents cycle **cool tones only** (blues, greens,
purples, pinks); amber is kept for the brand mark + buttons.

### Open threads (deferred, explicitly requested, NOT done)
1. **Text Adventure** - the 4th from-scratch demo (web terminal: rooms, inventory, combat, OOP).
2. **Algo-grid on mobile** - cells are ~9px (works but cramped); give it fewer COLS on phones.
3. **Raven companion** - `RavenCompanion.tsx` is built but **unmounted/inactive**; it renders null
   until a real artist-made `raven.glb` is dropped in `/public`. Do NOT hand-build a raven from
   primitives (it always looks wrong; tried 10+ times) - load a real GLB.

Done June 14 (2nd pass): **all 4 Playground toys now have control panels** and the **lava is a real
cursor-push metaball sim** (CPU blob physics → `uBlobs[]` uniform; the cursor is a force field, not a
blob). The **ray tracer** got a zoom-in + a sharp anti-aliased settle pass (medium res while
dragging, no more pixelation) + a visible sun. The **neural net** got a finer decision field, slower
watchable training, paint-your-own-data (Class A / B / Erase brushes), and 5 presets (spiral, circles,
moons, xor, blobs).

---

## Conventions (the user cares about these)
- **No em dashes in visible copy.** Use commas / colons / periods. (Code comments are fine.)
- **Section accents = cool only** (blues/greens/purples/pinks) via `AccentTracker.tsx`
  `SECTION_ACCENT` + `lib/accent.ts`. The brand amber stays on the hero VB + action buttons.
- **No bloom / EffectComposer over the page** - an opaque pass renders a visible "box" over the
  non-black Aurora. Use **additive** materials for any 3D glow over the page bg.
- **Don't hand-code organic 3D models** (raven, animals) from primitives - load an artist GLB.
- Heavy WebGL canvases are mounted only near the viewport via `LazyVisual.tsx` (don't spin up 5+ GL
  contexts on load). Adaptive quality on mobile (e.g. the gem's transmission resolution).
- Everything respects `prefers-reduced-motion`. Copy is plain/human (no AI-isms).

## Gotchas
- **The Claude preview CANNOT verify motion.** It pauses rAF/`useFrame` AND `IntersectionObserver`
  callbacks (page treated as hidden), and Lenis blocks programmatic scroll. So canvases freeze at
  t≈0, lazy-mounted things never mount, and below-fold 3D is unreachable. **Verify via:** DOM/computed
  -style evals, `npm run build`, isolated-math evals (paste the algorithm into `preview_eval` and check
  outputs), and the user's own localhost - NOT screenshots. Each canvas demo here ships a `window.__*`
  probe for exactly this (`__inkProbe`, `__toy_<name>`, etc.).
- After `preview_start` (esp. post-restart) the preview **viewport can collapse to 0 width** (body
  clientWidth 0) - call `preview_resize {width:1440,height:900}` before trusting layout evals.
- Editing `page.tsx`'s import BEFORE writing the new component file makes Turbopack log a persistent
  "Module not found" - write the component first, then wire the import (or restart the dev server).
- Long sessions with many dev-server restarts exhaust WebGL contexts → blank-white / tiny-corner
  render glitches; restart the preview to fix.
- **Domain redirects live in ONE place: Vercel** (apex is canonical, www → apex). A `next.config`
  redirect once fought Vercel's and caused an infinite loop. 308s cache hard - test in incognito.
- Vercel didn't auto-detect Next.js → `vercel.json` pins `"framework": "nextjs"`.
- Dev server: `npm run dev` (launch.json entry "portfolio" → **port 3002**).

## Don't re-add without asking (tried & rejected)
3D GitHub "skyline" + the helix "strand" for the Lately section (2 different 3D attempts, both
rejected - Lately stays the 2D heatmap) · the gem's amber backdrop bars · magnetic CTAs/nav · 3D
extruded headline · gravity-chip playground · liquid-displacement hover · the VB→BUILD→INVEST respell
· GPU-shader "living" VB (shimmer/iridescence/dust/scroll-signature) · the Philadelphia constellation
in Contact · `morph-spine` branch (parked, not adopted).

## Develop
```bash
npm run dev    # localhost:3002
npm run build  # static production build (also the TS gate)
```
`DESIGN.md` documents the earlier "Corvid Ledger" design direction (kept for reference).
