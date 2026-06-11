# vinay-portfolio — The Corvid Ledger

Personal site for Vinay Batra, designed as a financial broadsheet printed by a Bloomberg
terminal. Corvo = raven: one persistent flock of 2,500 GPU-instanced shards morphs through
seven market formations as you scroll — murmuration → ticker tape → equity curve vs S&P →
candlestick field → timeline spine → bell curve → a single amber point.

## Stack

- **Next.js 16** (App Router, TypeScript, Tailwind v4), single static route
- **React Three Fiber + three.js**
  - [components/FlockScene.tsx](components/FlockScene.tsx) — fixed full-page canvas; custom
    ShaderMaterial mixes 7 per-instance formation targets ([lib/flock.ts](lib/flock.ts)) by one
    scroll uniform, with settle-jitter, cursor repulsion, and a raven-sheen fresnel rim
  - [components/MonteCarlo3D.tsx](components/MonteCarlo3D.tsx) — 60 seeded random walks drawn
    by scroll inside the Corvo panel, with a VaR-95 cutoff plane
- **Framer Motion** — masked line reveals, scroll scrubs (Leadership spine, Corvo boot),
  word staggers, count-ups
- **Lenis** — smooth scroll
- **Fraunces + IBM Plex Sans/Mono** — serif broadsheet display over terminal mono chrome

## Design system

See [DESIGN.md](DESIGN.md). Warm espresso ink `#0F0D0A`, newsprint bone `#EDE4D3`, terminal
amber `#E8A33D` (every number on the site), raven-sheen `#87A5B4` (benchmark only), market
up/down greens and reds. No gradients, no rounded corners, no glow.

All randomness is seeded ([lib/seeded.ts](lib/seeded.ts)) — the build is deterministic, as the
footer colophon attests.

## Develop

```bash
npm run dev    # http://localhost:3000
npm run build  # static production build
```

Debug affordance: set `window.__flockOverride = 0..1` in the console to pin the flock to any
scroll progress (formation stations sit at 0, .13, .30, .52, .70, .86, 1).
