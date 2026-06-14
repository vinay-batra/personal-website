"use client";

import { useCallback, useMemo, useRef, useState } from "react";

/**
 * Pathfinding visualizer — BFS, DFS, Dijkstra and A* implemented from scratch on
 * a grid. Draw walls, drag the start/end nodes, and watch the search expand then
 * trace the shortest path. The reveal is sequenced purely with CSS
 * animation-delay (see .algo-visited / .algo-path in globals.css) so it stays
 * smooth without re-rendering 400 cells every frame.
 */
const COLS = 29;
const ROWS = 15;
const N = COLS * ROWS;
const idx = (r: number, c: number) => r * COLS + c;
const rc = (i: number) => [Math.floor(i / COLS), i % COLS] as const;
const inBounds = (r: number, c: number) => r >= 0 && r < ROWS && c >= 0 && c < COLS;

const START0 = idx(7, 5);
const END0 = idx(7, 23);
const SPEED = 8; // ms per visited cell
const PATH_SPEED = 36; // ms per path cell

type Algo = "bfs" | "dfs" | "dijkstra" | "astar";
const ALGOS: { id: Algo; name: string; full: string; desc: string }[] = [
  {
    id: "bfs",
    name: "BFS",
    full: "Breadth-First Search",
    desc: "Explores evenly in every direction, one ring of cells at a time — always finds the shortest path.",
  },
  {
    id: "dfs",
    name: "DFS",
    full: "Depth-First Search",
    desc: "Dives down one route as far as it can before backtracking — finds a path, but usually not the shortest.",
  },
  {
    id: "dijkstra",
    name: "Dijkstra",
    full: "Dijkstra's Algorithm",
    desc: "Expands outward by lowest cost — guarantees the shortest path (and works on weighted maps).",
  },
  {
    id: "astar",
    name: "A*",
    full: "A* Search",
    desc: "Dijkstra plus a heuristic that aims toward the goal — shortest path, but explores far fewer cells.",
  },
];

function neighbors(i: number, walls: Set<number>) {
  const [r, c] = rc(i);
  const out: number[] = [];
  for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
    const nr = r + dr;
    const nc = c + dc;
    if (inBounds(nr, nc) && !walls.has(idx(nr, nc))) out.push(idx(nr, nc));
  }
  return out;
}

function rebuild(came: Map<number, number>, start: number, end: number): number[] {
  if (end !== start && !came.has(end)) return [];
  const path = [end];
  let cur = end;
  while (cur !== start) {
    const p = came.get(cur);
    if (p === undefined) return [];
    cur = p;
    path.push(cur);
  }
  return path.reverse();
}

/** Returns the order cells were visited + the resulting path. */
function search(algo: Algo, walls: Set<number>, start: number, end: number) {
  const visited: number[] = [];
  const came = new Map<number, number>();

  if (algo === "bfs" || algo === "dfs") {
    const seen = new Set<number>([start]);
    const frontier = [start];
    while (frontier.length) {
      const cur = algo === "bfs" ? frontier.shift()! : frontier.pop()!;
      visited.push(cur);
      if (cur === end) break;
      for (const nb of neighbors(cur, walls)) {
        if (!seen.has(nb)) {
          seen.add(nb);
          came.set(nb, cur);
          frontier.push(nb);
        }
      }
    }
  } else {
    // Dijkstra / A* on a uniform grid; A* adds a Manhattan heuristic.
    const g = new Map<number, number>([[start, 0]]);
    const closed = new Set<number>();
    const open = new Set<number>([start]);
    const h = (i: number) => {
      const [r, c] = rc(i);
      const [er, ec] = rc(end);
      return Math.abs(r - er) + Math.abs(c - ec);
    };
    const f = (i: number) => (g.get(i) ?? Infinity) + (algo === "astar" ? h(i) : 0);
    while (open.size) {
      let cur = -1;
      let best = Infinity;
      for (const i of open) {
        const fi = f(i);
        if (fi < best) {
          best = fi;
          cur = i;
        }
      }
      open.delete(cur);
      if (closed.has(cur)) continue;
      closed.add(cur);
      visited.push(cur);
      if (cur === end) break;
      for (const nb of neighbors(cur, walls)) {
        if (closed.has(nb)) continue;
        const ng = (g.get(cur) ?? Infinity) + 1;
        if (ng < (g.get(nb) ?? Infinity)) {
          g.set(nb, ng);
          came.set(nb, cur);
          open.add(nb);
        }
      }
    }
  }
  return { visited, path: rebuild(came, start, end) };
}

export default function AlgoVisualizer() {
  const [algo, setAlgo] = useState<Algo>("astar");
  const [walls, setWalls] = useState<Set<number>>(() => new Set());
  const [start, setStart] = useState(START0);
  const [end, setEnd] = useState(END0);
  const [result, setResult] = useState<{ visited: number[]; path: number[]; algo: Algo } | null>(
    null
  );
  const drag = useRef<{ down: boolean; mode: "wall" | "start" | "end" | null; add: boolean }>({
    down: false,
    mode: null,
    add: true,
  });

  const run = useCallback(() => {
    const r = { ...search(algo, walls, start, end), algo };
    setResult(null); // clear, then re-apply on the next frames so the CSS animation restarts
    requestAnimationFrame(() => requestAnimationFrame(() => setResult(r)));
  }, [algo, walls, start, end]);

  const reset = () => {
    setWalls(new Set());
    setStart(START0);
    setEnd(END0);
    setResult(null);
  };
  const maze = () => {
    let s = 20260614;
    const rnd = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
    const w = new Set<number>();
    for (let i = 0; i < N; i++) if (i !== start && i !== end && rnd() < 0.27) w.add(i);
    setWalls(w);
    setResult(null);
  };

  const paint = (i: number) => {
    const d = drag.current;
    if (d.mode === "wall") {
      if (i === start || i === end) return;
      setWalls((prev) => {
        const n = new Set(prev);
        if (d.add) n.add(i);
        else n.delete(i);
        return n;
      });
      setResult(null);
    } else if (d.mode === "start" && i !== end && !walls.has(i)) {
      setStart(i);
      setResult(null);
    } else if (d.mode === "end" && i !== start && !walls.has(i)) {
      setEnd(i);
      setResult(null);
    }
  };

  const cellAt = (e: React.PointerEvent) => {
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    const d = el?.getAttribute?.("data-i");
    return d != null ? parseInt(d, 10) : -1;
  };
  const onDown = (e: React.PointerEvent) => {
    const i = cellAt(e);
    if (i < 0) return;
    drag.current.down = true;
    if (i === start) drag.current.mode = "start";
    else if (i === end) drag.current.mode = "end";
    else {
      drag.current.mode = "wall";
      drag.current.add = !walls.has(i);
    }
    paint(i);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current.down) return;
    const i = cellAt(e);
    if (i >= 0) paint(i);
  };
  const onUp = () => {
    drag.current.down = false;
    drag.current.mode = null;
  };

  const { visitMap, pathMap, total } = useMemo(() => {
    const vm = new Map<number, number>();
    const pm = new Map<number, number>();
    if (result) {
      result.visited.forEach((i, o) => {
        if (i !== start && i !== end) vm.set(i, o);
      });
      result.path.forEach((i, o) => {
        if (i !== start && i !== end) pm.set(i, o);
      });
    }
    return { visitMap: vm, pathMap: pm, total: result ? result.visited.length : 0 };
  }, [result, start, end]);

  const btn = (active: boolean) =>
    `font-mono text-[10px] tracking-[0.14em] uppercase px-2.5 py-1.5 border transition ${
      active
        ? "border-amber text-amber"
        : "border-bone/15 text-dim hover:border-bone/35 hover:text-bone"
    }`;
  const cur = ALGOS.find((a) => a.id === algo)!;

  return (
    <div className="select-none">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {ALGOS.map((a) => (
          <button
            key={a.id}
            type="button"
            title={`${a.full} — ${a.desc}`}
            onClick={() => {
              setAlgo(a.id);
              setResult(null);
            }}
            className={btn(algo === a.id)}
          >
            {a.name}
          </button>
        ))}
        <button
          type="button"
          onClick={run}
          className="ml-1 bg-amber px-3 py-1.5 font-mono text-[10px] font-semibold tracking-[0.16em] text-ink uppercase transition hover:bg-amber/85"
        >
          ▶ Run
        </button>
        <button type="button" onClick={maze} className={btn(false)}>
          Maze
        </button>
        <button type="button" onClick={reset} className={btn(false)}>
          Reset
        </button>
        <span className="ml-auto hidden font-mono text-[9px] tracking-[0.14em] text-dim uppercase sm:inline">
          Drag to draw walls · move the dots
        </span>
      </div>

      <p className="mb-3 max-w-2xl font-sans text-[12.5px] leading-[1.55] text-bone/55">
        <span className="font-mono text-[10px] tracking-[0.14em] text-amber uppercase">
          {cur.full}
        </span>{" "}
        — {cur.desc}
      </p>

      {result && (
        <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-1 font-mono text-[10px] tracking-[0.14em] uppercase">
          <span className="text-bone/50">
            Path <span className="tabular-nums text-amber">{result.path.length || "—"}</span>
          </span>
          <span className="text-bone/50">
            Explored <span className="tabular-nums text-bone/80">{result.visited.length}</span>
          </span>
          <span className="text-dim">
            {result.algo === "dfs"
              ? "DFS finds a path — not the shortest"
              : result.algo === "astar"
                ? "A* · shortest, heuristic-guided"
                : "Shortest path"}
          </span>
        </div>
      )}

      <div
        className="grid touch-none gap-px overflow-hidden rounded-lg bg-bone/[0.06]"
        style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
      >
        {Array.from({ length: N }, (_, i) => {
          const vo = visitMap.get(i);
          const po = pathMap.get(i);
          let cls = "aspect-square bg-[#0b0907]";
          const style: React.CSSProperties = {};
          if (walls.has(i)) cls = "aspect-square bg-bone/80";
          else if (i === start) cls = "aspect-square bg-up";
          else if (i === end) cls = "aspect-square bg-amber";
          else if (po !== undefined) {
            cls = "aspect-square algo-path";
            style.animationDelay = `${total * SPEED + po * PATH_SPEED}ms`;
          } else if (vo !== undefined) {
            cls = "aspect-square algo-visited";
            style.animationDelay = `${vo * SPEED}ms`;
          }
          return <div key={i} data-i={i} className={cls} style={style} />;
        })}
      </div>
    </div>
  );
}
