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
  Motion**, **Lenis** (smooth scroll), 2D canvas for the four product visuals. gh/vercel CLIs are NOT
  installed on the machine; push via git (osxkeychain) and verify deploys via the Vercel MCP (list/get
  deployment tools) — NOT `curl`, which Vercel's bot-challenge protection can 403 after a few rapid
  requests (a real browser check passes fine).

**State (Aug 2026):** Hero VB particles + click-shatter · About 3D "map of me" constellation ·
Work (Corvo → FBLA One → Moreco Properties → Lark, 4 products) · GitHub heatmap · Leadership timeline
(grouped by org, LinkedIn-style) · Community ledger (185-hour tally grid) · Recommendations · Contact
(email/phone/LinkedIn only) · Footer. **7 numbered chapters** (01 About, 02 Work, 03 Lately, 04 Lead,
05 Serve, 06 Recommendations, 07 Contact).

**The page is MONOCHROME (Aug 2026).** There is no colour spectrum any more:
- Every section accent is a shade of `#dfe7ee` (the hero's cool near-white). `AccentTracker.tsx`
  still varies the accent per section (`#b8c4d1` → `#dfe7ee`), but only by **shade**, never hue.
- `Aurora.tsx` flattens `uAccent` to its **luminance** in the shader, so the background smoke can
  only ever be grey. Sections change how light/dark it is, nothing else.
- The highlight token is `--color-hi: #e6edf3` (a cool silver), used by `text-hi` for the nav
  numerals, `::selection`, `.inklink:hover`, and the About drop cap. **The old amber `#e8a33d` is
  gone entirely** — the user explicitly rejected the yellow highlight.
- Do NOT reintroduce blue / purple / pink / amber anywhere on the live page without being asked.

### Archived, not deleted
`components/archive/` holds the **"From scratch"** section (`Experiments.tsx` + the pathfinding
visualizer, ray tracer, and neural net). Removed from the site Aug 2026 but kept intact so it can be
dropped back in. See `components/archive/README.md` for restore steps — it still uses the old
cyan/blue/pink accent hexes, so recolor to `#dfe7ee` before reinstating. The **Playground** (ink
fluid sim + obsidian gem, plus a lava/kaleidoscope pair tried and cut earlier) was deleted outright
in an earlier pass, not archived — recover it from git history if it's ever wanted back.

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
- **Monochrome only** — see "The page is MONOCHROME" above. Chapters are numbered 01-07 (About, Work,
  Lately, Lead, Serve, Recommendations, Contact) consistently across the top nav, the scroll-spine
  labels, the section-heading eyebrows, and the page dividers. Note the Recommendations section still
  uses the legacy `id="words"` / `data-section="WORDS"` key internally — the visible label is
  "Recommendations" everywhere.
- **No bloom / EffectComposer over the page** - an opaque pass renders a visible "box" over the
  non-black Aurora. Use **additive** materials for any 3D glow over the page bg.
- **Don't hand-code organic 3D models** (raven, animals) from primitives - load an artist GLB.
- Heavy WebGL canvases are mounted only near the viewport via `LazyVisual.tsx` (don't spin up 5+ GL
  contexts on load). Adaptive quality on mobile (e.g. the About constellation).
- Everything respects `prefers-reduced-motion`. Copy is plain/human (no AI-isms).
- **Leadership timeline groups roles under one organization** (LinkedIn-style: Member then President
  under Environmental Action Club, State Competitor then Competition Chair under FBLA), newest first
  both within a group and across groups. Match real LinkedIn date ranges when adding/editing entries.
- Every product in Work lists its **actual** stack, not a shared boilerplate one — only Corvo has a
  separate FastAPI/Python service; check before copy-pasting a tag list to a new entry.

## Gotchas
- **The Claude preview CANNOT verify motion or scroll.** It pauses rAF/`useFrame` AND
  `IntersectionObserver` callbacks (page treated as hidden), and Lenis blocks programmatic scroll. So
  canvases freeze at t≈0, lazy-mounted things never mount, and a screenshot after scrolling comes back
  black (the pane only composites at `scrollY === 0`). **Working pattern:** inject a `<style>` that
  hides every `[data-section]` except the one under test (and any sibling dividers/footer not inside
  it), force `opacity:1 !important; transform:none !important` on its children so the `whileInView`
  reveals don't hold it invisible, then `window.scrollTo(0,0)` and screenshot — that section now
  renders at the top of the pane. For a canvas visual specifically, extract its draw callback into a
  standalone `public/__x-test.html` harness (strip the TS type annotations) so it can be inspected
  pixel-for-pixel outside Lenis/IntersectionObserver entirely; delete the harness file when done.
  Otherwise verify via DOM-state evals (element existence, sizes, computed styles), `npm run build`,
  and the user's own localhost.
- After `preview_start` (esp. post-restart) the preview **viewport can collapse to 0 width** (body
  clientWidth 0) - call `preview_resize {width:1440,height:900}` before trusting layout evals.
- Editing `page.tsx`'s import BEFORE writing the new component file makes Turbopack log a persistent
  "Module not found" - write the component first, then wire the import (or restart the dev server).
- Long sessions with many dev-server restarts exhaust WebGL contexts → blank-white / tiny-corner
  render glitches; restart the preview to fix.
- **A canvas draw fn can throw on a zero-size first layout pass** — `createRadialGradient`/etc. reject
  a negative radius. Guard early: `if (w < 120 || h < 120) return;` before any geometry math
  (`MorecoUnits.tsx` learned the hard way — caught via a fresh-tab console check, not the build).
- **Domain redirects live in ONE place: Vercel** (apex is canonical, www → apex). A `next.config`
  redirect once fought Vercel's and caused an infinite loop. 308s cache hard - test in incognito.
- Vercel didn't auto-detect Next.js → `vercel.json` pins `"framework": "nextjs"`.
- **A GitHub → Vercel push can silently stop deploying with zero error anywhere.** Cause here:
  connecting a second, unrelated Vercel project (`moreco-properties`) to the same GitHub account
  flipped the Vercel GitHub App from "all repositories" to "only selected," dropping
  `personal-website` off the list. Symptom: commits land on GitHub fine, `git log origin/main` shows
  them, but the Vercel deployment list shows nothing new and the live site doesn't move. Diagnose with
  `get_deployment` on the `-git-main-` alias and compare its `githubCommitSha` to `git log -1`. Fix:
  GitHub → Settings → Installed GitHub Apps → Vercel → Configure → check every repo that should
  auto-deploy. A push after fixing access picks up on its own; no manual redeploy needed. Watch for a
  Vercel `"action": "redeploy"` entry with a stale `githubCommitSha` — that's evidence something
  rebuilt the OLD commit rather than picking up the new push, a sign the webhook still isn't firing.
- Dev server: `npm run dev` (launch.json entry "portfolio" → **port 3002**).

## Don't re-add without asking (tried & rejected)
The full Playground WebGL-toy section (ink fluid sim + obsidian gem; lava + kaleidoscope were cut
even earlier) · the "From scratch" CS-demo section as a *live* part of Work (archived, see above,
don't just re-mount it without asking) · the cyan→pink per-section color spectrum · the amber
`#e8a33d` highlight · the ACT/SSAT test-score stat block · 3D GitHub "skyline" + a helix "strand" for
the Lately section (2 different 3D attempts, both rejected — Lately stays the 2D heatmap) · magnetic
CTAs/nav · 3D extruded headline · gravity-chip playground · liquid-displacement hover · the
VB→BUILD→INVEST respell · GPU-shader "living" VB (shimmer/iridescence/dust/scroll-signature) · the
Philadelphia constellation in Contact · `morph-spine` branch (parked, not adopted).

## Develop
```bash
npm run dev    # localhost:3002
npm run build  # static production build (also the TS gate)
```
`DESIGN.md` documents the earlier "Corvid Ledger" design direction (kept for reference).
