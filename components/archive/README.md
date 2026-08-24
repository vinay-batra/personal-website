# Archived components

These are **not rendered on the site**. They are kept here, working and intact,
so they can be dropped back in later without rebuilding them.

## "From scratch" section (removed Aug 2026)

`Experiments.tsx` was a subsection of Work holding three hand-written CS demos:

- `visuals/AlgoVisualizer.tsx` — BFS / DFS / Dijkstra / A* pathfinding on a grid
- `visuals/RayTracer.tsx` — a CPU ray tracer with reflections + shadows
- `visuals/NeuralNet.tsx` — a neural net with hand-written backprop

### To restore

1. Move the four files back (`components/Experiments.tsx`, and the three under
   `components/visuals/`).
2. In `app/page.tsx`, re-add `import Experiments from "@/components/Experiments";`
   and render `<Experiments />` directly after `<Projects />`.

Note: these still use the old cyan/blue accent hexes (`#38bdf8`, `#22d3ee`,
`#ec4899`). The live site is monochrome now, so recolour them to `#dfe7ee`
before putting them back.
