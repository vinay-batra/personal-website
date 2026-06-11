"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import type { MotionValue } from "framer-motion";
import * as THREE from "three";
import { useReducedMotionSafe } from "@/lib/useReducedMotionSafe";

const N = 34;
const BLUE = new THREE.Color("#5d9ce4");
const GOLD = new THREE.Color("#ffb81c");
const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);

function seeded(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

interface Graph {
  base: Float32Array; // relaxed node positions (N*3)
  phases: Float32Array; // per-node wobble phase
  edges: [number, number][];
  radius: number; // max node distance from origin, for fit-to-canvas scaling
}

/** A FBLA chapter network: nodes scattered in a sphere, force-relaxed into an
 *  organic 3D mesh, with each node wired to its nearest neighbors. */
function buildGraph(): Graph {
  const rnd = seeded(1907);
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    // random point in a sphere
    const r = 1.4 + rnd() * 0.9;
    const th = rnd() * Math.PI * 2;
    const ph = Math.acos(2 * rnd() - 1);
    pos[i * 3] = Math.sin(ph) * Math.cos(th) * r;
    pos[i * 3 + 1] = Math.cos(ph) * r;
    pos[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * r;
  }

  // edges: each node to its 3 nearest neighbors, plus a few longer-range
  // links so the network reads as a richer mesh (deduped, undirected)
  const key = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);
  const seen = new Set<string>();
  const edges: [number, number][] = [];
  const add = (a: number, b: number) => {
    const kk = key(a, b);
    if (a !== b && !seen.has(kk)) {
      seen.add(kk);
      edges.push([a, b]);
    }
  };
  for (let i = 0; i < N; i++) {
    const dists: { j: number; d: number }[] = [];
    for (let j = 0; j < N; j++) {
      if (j === i) continue;
      const dx = pos[i * 3] - pos[j * 3];
      const dy = pos[i * 3 + 1] - pos[j * 3 + 1];
      const dz = pos[i * 3 + 2] - pos[j * 3 + 2];
      dists.push({ j, d: dx * dx + dy * dy + dz * dz });
    }
    dists.sort((a, b) => a.d - b.d);
    for (let k = 0; k < 3; k++) add(i, dists[k].j);
    // one medium-range tie for extra cross-linking
    if (rnd() < 0.7) add(i, dists[4 + Math.floor(rnd() * 4)].j);
  }

  // relax: edge springs to a rest length + global repulsion + centering
  const REST = 1.4;
  for (let iter = 0; iter < 140; iter++) {
    const force = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        let dx = pos[i * 3] - pos[j * 3];
        let dy = pos[i * 3 + 1] - pos[j * 3 + 1];
        let dz = pos[i * 3 + 2] - pos[j * 3 + 2];
        const d = Math.hypot(dx, dy, dz) || 0.001;
        const rep = 0.18 / (d * d);
        dx /= d;
        dy /= d;
        dz /= d;
        force[i * 3] += dx * rep;
        force[i * 3 + 1] += dy * rep;
        force[i * 3 + 2] += dz * rep;
        force[j * 3] -= dx * rep;
        force[j * 3 + 1] -= dy * rep;
        force[j * 3 + 2] -= dz * rep;
      }
    }
    for (const [a, b] of edges) {
      let dx = pos[b * 3] - pos[a * 3];
      let dy = pos[b * 3 + 1] - pos[a * 3 + 1];
      let dz = pos[b * 3 + 2] - pos[a * 3 + 2];
      const d = Math.hypot(dx, dy, dz) || 0.001;
      const f = (d - REST) * 0.08;
      dx /= d;
      dy /= d;
      dz /= d;
      force[a * 3] += dx * f;
      force[a * 3 + 1] += dy * f;
      force[a * 3 + 2] += dz * f;
      force[b * 3] -= dx * f;
      force[b * 3 + 1] -= dy * f;
      force[b * 3 + 2] -= dz * f;
    }
    for (let i = 0; i < N; i++) {
      force[i * 3] -= pos[i * 3] * 0.01;
      force[i * 3 + 1] -= pos[i * 3 + 1] * 0.01;
      force[i * 3 + 2] -= pos[i * 3 + 2] * 0.01;
      pos[i * 3] += force[i * 3];
      pos[i * 3 + 1] += force[i * 3 + 1];
      pos[i * 3 + 2] += force[i * 3 + 2];
    }
  }

  const phases = new Float32Array(N);
  for (let i = 0; i < N; i++) phases[i] = rnd() * Math.PI * 2;

  let radius = 0.001;
  for (let i = 0; i < N; i++) {
    const d = Math.hypot(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
    if (d > radius) radius = d;
  }
  return { base: pos, phases, edges, radius };
}

function Graph3D({
  graph,
  reduced,
  progress,
}: {
  graph: Graph;
  reduced: boolean;
  progress?: MotionValue<number>;
}) {
  const group = useRef<THREE.Group>(null!);
  const nodes = useRef<THREE.InstancedMesh>(null!);
  const lines = useRef<THREE.LineSegments>(null!);
  const [hover, setHover] = useState(-1);
  const { gl } = useThree();

  // drag-to-spin state (mouse only — keeps touch scroll free)
  const drag = useRef({ on: false, px: 0, py: 0, vx: 0.0015, vy: 0 });
  const live = useRef(new Float32Array(graph.base)); // wobbled positions each frame
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const colorA = useMemo(() => new THREE.Color(), []);

  const lineGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(graph.edges.length * 6), 3)
    );
    g.setAttribute(
      "color",
      new THREE.BufferAttribute(new Float32Array(graph.edges.length * 6), 3)
    );
    return g;
  }, [graph]);

  // paint a correct static first frame before useFrame runs (avoids an
  // origin blob flash, and is the final state for reduced-motion users)
  useEffect(() => {
    const { base } = graph;
    if (nodes.current) {
      for (let i = 0; i < N; i++) {
        dummy.position.set(base[i * 3], base[i * 3 + 1], base[i * 3 + 2]);
        dummy.scale.setScalar(0.1);
        dummy.updateMatrix();
        nodes.current.setMatrixAt(i, dummy.matrix);
        nodes.current.setColorAt(i, BLUE);
      }
      nodes.current.instanceMatrix.needsUpdate = true;
      if (nodes.current.instanceColor) nodes.current.instanceColor.needsUpdate = true;
    }
    const posAttr = lineGeo.getAttribute("position") as THREE.BufferAttribute;
    const colAttr = lineGeo.getAttribute("color") as THREE.BufferAttribute;
    const pa = posAttr.array as Float32Array;
    const ca = colAttr.array as Float32Array;
    graph.edges.forEach(([ai, bi], e) => {
      const o = e * 6;
      pa[o] = base[ai * 3];
      pa[o + 1] = base[ai * 3 + 1];
      pa[o + 2] = base[ai * 3 + 2];
      pa[o + 3] = base[bi * 3];
      pa[o + 4] = base[bi * 3 + 1];
      pa[o + 5] = base[bi * 3 + 2];
      for (let c = 0; c < 6; c += 3) {
        ca[o + c] = BLUE.r * 0.42;
        ca[o + c + 1] = BLUE.g * 0.42;
        ca[o + c + 2] = BLUE.b * 0.42;
      }
    });
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
  }, [graph, lineGeo, dummy]);

  useEffect(() => {
    const el = gl.domElement;
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      drag.current.on = true;
      drag.current.px = e.clientX;
      drag.current.py = e.clientY;
      el.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!drag.current.on) return;
      const dx = e.clientX - drag.current.px;
      const dy = e.clientY - drag.current.py;
      drag.current.px = e.clientX;
      drag.current.py = e.clientY;
      drag.current.vy = dx * 0.005;
      drag.current.vx = dy * 0.005;
      if (group.current) {
        group.current.rotation.y += dx * 0.005;
        group.current.rotation.x += dy * 0.005;
      }
    };
    const onUp = (e: PointerEvent) => {
      drag.current.on = false;
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {}
    };
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
    };
  }, [gl]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const { base, phases, edges } = graph;

    // assemble-in as the card scrolls through, then hold
    const sp = progress ? progress.get() : 1;
    const a = reduced ? 1 : easeOut(Math.min(1, Math.max(0, sp * 1.6)));

    // spin: drag inertia when idle, plus a slow baseline drift
    if (group.current) {
      if (!reduced && !drag.current.on) {
        drag.current.vx *= 0.94;
        drag.current.vy *= 0.94;
        group.current.rotation.y += drag.current.vy + 0.0016;
        group.current.rotation.x += drag.current.vx;
        group.current.rotation.x *= 0.999;
      }
      // fit the graph to whatever size/aspect the card is, filling the
      // smaller dimension so it's centered and never marooned in one corner
      const vp = state.viewport;
      const fit = (Math.min(vp.width, vp.height) * 0.46) / graph.radius;
      group.current.scale.setScalar(fit * (0.6 + a * 0.4));
    }

    // wobble live positions for a touch of life
    const p = live.current;
    for (let i = 0; i < N; i++) {
      const w = reduced ? 0 : 0.06;
      p[i * 3] = base[i * 3] + Math.sin(t * 0.7 + phases[i]) * w;
      p[i * 3 + 1] = base[i * 3 + 1] + Math.cos(t * 0.6 + phases[i]) * w;
      p[i * 3 + 2] = base[i * 3 + 2] + Math.sin(t * 0.5 + phases[i]) * w;
    }

    // node instances
    if (nodes.current) {
      for (let i = 0; i < N; i++) {
        const hot = i === hover;
        dummy.position.set(p[i * 3], p[i * 3 + 1], p[i * 3 + 2]);
        const pulse = reduced ? 0.5 : Math.sin(t * 1.6 + phases[i]) * 0.5 + 0.5;
        const s = (hot ? 0.2 : 0.095 + pulse * 0.025) * a;
        dummy.scale.setScalar(s);
        dummy.updateMatrix();
        nodes.current.setMatrixAt(i, dummy.matrix);
        nodes.current.setColorAt(i, hot ? GOLD : BLUE);
      }
      nodes.current.instanceMatrix.needsUpdate = true;
      if (nodes.current.instanceColor) nodes.current.instanceColor.needsUpdate = true;
    }

    // edges
    const posAttr = lineGeo.getAttribute("position") as THREE.BufferAttribute;
    const colAttr = lineGeo.getAttribute("color") as THREE.BufferAttribute;
    const pa = posAttr.array as Float32Array;
    const ca = colAttr.array as Float32Array;
    edges.forEach(([ai, bi], e) => {
      const o = e * 6;
      pa[o] = p[ai * 3];
      pa[o + 1] = p[ai * 3 + 1];
      pa[o + 2] = p[ai * 3 + 2];
      pa[o + 3] = p[bi * 3];
      pa[o + 4] = p[bi * 3 + 1];
      pa[o + 5] = p[bi * 3 + 2];
      const hot = ai === hover || bi === hover;
      colorA.copy(hot ? GOLD : BLUE).multiplyScalar((hot ? 0.9 : 0.42) * a);
      ca[o] = ca[o + 3] = colorA.r;
      ca[o + 1] = ca[o + 4] = colorA.g;
      ca[o + 2] = ca[o + 5] = colorA.b;
    });
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
  });

  return (
    <group ref={group}>
      <lineSegments ref={lines} geometry={lineGeo}>
        <lineBasicMaterial
          vertexColors
          transparent
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </lineSegments>
      <instancedMesh
        ref={nodes}
        args={[undefined, undefined, N]}
        onPointerMove={(e) => {
          e.stopPropagation();
          if (e.instanceId !== undefined) setHover(e.instanceId);
        }}
        onPointerOut={() => setHover(-1)}
      >
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

/** FBLA One — a draggable 3D chapter network. Grab to spin it. */
export default function FblaNetwork({ progress }: { progress?: MotionValue<number> }) {
  const reduced = useReducedMotionSafe();
  const graph = useMemo(buildGraph, []);
  const wrap = useRef<HTMLDivElement>(null);
  const [onScreen, setOnScreen] = useState(true);

  // only render while the card is actually visible — a parked 3D canvas
  // otherwise burns a full rAF loop for nothing
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting), {
      rootMargin: "120px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={wrap} className="absolute inset-0" data-cursor="drag to spin">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        dpr={[1, 1.5]}
        frameloop={onScreen ? "always" : "never"}
        gl={{ antialias: true, alpha: true }}
        style={{ cursor: "grab", touchAction: "pan-y" }}
      >
        <Graph3D graph={graph} reduced={reduced} progress={progress} />
      </Canvas>
      <span className="pointer-events-none absolute left-3.5 top-3 font-mono text-[9px] tracking-[0.18em] text-bone/40 uppercase">
        Chapter Network
      </span>
    </div>
  );
}
