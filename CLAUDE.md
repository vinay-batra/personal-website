@AGENTS.md

# CLAUDE.md - Personal website (Vinay Batra)

Vinay's portfolio site. A high-end, motion-heavy single page: monochrome noir aesthetic, a particle
"VB" monogram, a 3D "map of me" constellation, and scroll-built canvas visuals for each product.
Full prose lives in `README.md`; this file is the agent-facing state + conventions.

---

## Current focus

**LIVE at [vinaybatra.org](https://vinaybatra.org)** (apex is canonical; metadataBase points there).
- Repo: `github.com/vinay-batra/personal-website`, **auto-deploys to Vercel on push to `main`**.
- Vercel: project `personal-website` (`prj_4wuXlCiSODvD4eTrA2149H2vibP7`), team `vinay-batras-projects`
  (`team_UTbeulhjkNeFOErLm67AL65w`). No env vars (the GitHub heatmap fetch is public + client-side).
- Stack: **Next.js 16** (App Router, TS, Tailwind v4), **React Three Fiber + three.js + @react-three/drei**
  (About constellation, hero bloom), **raw WebGL2** (the Aurora background shader), **Framer
  Motion**, **Lenis** (smooth scroll), 2D canvas for the four product visuals. gh/vercel CLIs are NOT installed
  on the machine; push via git (osxkeychain) and verify deploys via the Vercel MCP + curling the site.

**State (Aug 2026):** Hero VB particles + click-shatter · About 3D "map of me" constellation ·
Work (Corvo → FBLA One → Moreco Properties → Lark) · GitHub heatmap · Leadership timeline ·
Community ledger · Recommendations · Contact · Footer. **7 numbered chapters** (01 About, 02 Work,
03 Lately, 04 Lead, 05 Serve, 06 Recommendations, 07 Contact).

**The page is MONOCHROME (Aug 2026).** There is no colour spectrum any more:
- Every section accent is `#dfe7ee` (the hero's cool near-white). `AccentTracker.tsx` still varies
  the accent per section, but only by **shade** (`#b8c4d1` → `#dfe7ee`), never hue.
- `Aurora.tsx` flattens `uAccent` to its **luminance** in the shader, so the background smoke can
  only ever be grey. Sections change how light/dark it is, nothing else.
- The highlight token is `--color-hi: #e6edf3` (a cool silver), used by `text-hi` for the nav
  numerals, `::selection`, `.inklink:hover`, and the drop cap. **The old amber `#e8a33d` is gone
  entirely** — the user explicitly rejected the yellow highlight.
- Do NOT reintroduce blue / purple / pink / amber anywhere on the live page.

### Archived, not deleted
`components/archive/` holds the **"From scratch"** section (`Experiments.tsx` + the pathfinding
visualizer, ray tracer, and neural net). Removed from the site Aug 2026 but kept intact so it can be
dropped back in. See `components/archive/README.md` for the restore steps. The **Playground** (ink
fluid sim + obsidian gem) was deleted outright in an earlier pass — recover it from git history.

### Open threads (deferred, explicitly requested, NOT done)
1. **Raven companion** - `RavenCompanion.tsx` is built but **unmounted/inactive**; it renders null
   until a real artist-made `raven.glb` is dropped in `/public`. Do NOT hand-build a raven from
   primitives (it always looks wrong; tried 10+ times) - load a real GLB.
2. **Light mode** - asked for (system preference + manual toggle, natively designed light palette),
   deferred. Nothing exists yet: the palette is hardcoded dark in `globals.css`.

---

## Conventions (the user cares about these)
- **Push to `main` automatically** once a change is made and verified (build/preview clean) - don't
  ask for confirmation first. Standing instruction from Vinay (2026-07-21).
- **No em dashes in visible copy.** Use commas / colons / periods. (Code comments are fine.)
- **Monochrome only.** Section accents are shades of one cool grey via `AccentTracker.tsx`
  `SECTION_ACCENT` + `lib/accent.ts`. Chapters are numbered 01-07 (About, Work, Lately, Lead, Serve,
  Recommendations, Contact) consistently across the top nav, the scroll-spine labels, the
  section-heading eyebrows, and the page dividers. Note the Recommendations section still uses the
  legacy `id="words"` / `data-section="WORDS"` key internally — the visible label is
  "Recommendations" everywhere.
- **No bloom / EffectComposer over the page** - an opaque pass renders a visible "box" over the
  non-black Aurora. Use **additive** materials for any 3D glow over the page bg.
- **Don't hand-code organic 3D models** (raven, animals) from primitives - load an artist GLB.
- Heavy WebGL canvases are mounted only near the viewport via `LazyVisual.tsx` (don't spin up 5+ GL
  contexts on load). Adaptive quality on mobile (e.g. the gem's transmission resolution).
- Everything respects `prefers-reduced-motion`. Copy is plain/human (no AI-isms).
- The **Leadership timeline groups roles under one organization** (LinkedIn-style: Member then
  President under Environmental Action Club), newest first both within and across groups.

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

**Verifying below-the-fold work in the Claude preview:** the pane only composites at `scrollY === 0`
and Lenis blocks programmatic scroll, so a screenshot after scrolling comes back black. The trick
that works: inject a style hiding every `[data-section]` except the one under test (plus the sibling
dividers/footer), force `opacity:1 !important; transform:none !important` on it so the
`whileInView` reveals don't hold it invisible, then `window.scrollTo(0,0)` and screenshot. For a
canvas visual, extract the draw callback out of the component into a throwaway
`public/__x-test.html` harness (strip the TS annotations) so it renders standalone at scroll 0.
`DESIGN.md` documents the earlier "Corvid Ledger" design direction (kept for reference).
