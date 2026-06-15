"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import * as THREE from "three";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { useReducedMotionSafe } from "@/lib/useReducedMotionSafe";

const AMBER = new THREE.Color("#22d3ee"); // the About (cyan) accent — interaction highlight
const BONE = new THREE.Color("#EDE4D3");
const RADIUS = 4.2;
// the sphere sits at the scene origin (canvas center); the canvas itself is
// bled rightward past its column, which is what shifts it right of the text.
const GROUP_X = 0;
const GROUP_Y = 0.7; // nudge up so the caption sits clearly below the map

/* deterministic PRNG so the scatter is identical every load */
function seeded(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

/* soft round sprite so background stars are dots, not squares */
function discTexture(): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const x = c.getContext("2d")!;
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.45, "rgba(255,255,255,0.85)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = g;
  x.beginPath();
  x.arc(32, 32, 32, 0, Math.PI * 2);
  x.fill();
  return new THREE.CanvasTexture(c);
}

type Kind = "fact" | "skill";
interface Item {
  label: string;
  kind: Kind;
  blurb: string;
}

// a map of me — headline facts (amber, always labelled) woven through
// skills, roles, languages & hobbies (bone, lit on hover). each carries a
// one-line blurb shown in the click popup.
const ITEMS: Item[] = [
  // headline facts + products
  { label: "Corvo", kind: "fact", blurb: "Corvo — a free portfolio-intelligence platform I founded that gives retail investors institutional-grade risk analytics." },
  { label: "Lark", kind: "fact", blurb: "Lark — an AI guitar tutor I built and shipped, live at lark.coach." },
  { label: "FBLA One", kind: "fact", blurb: "FBLA One — an all-in-one platform I built for running FBLA chapters." },
  { label: "Investing since 2021", kind: "fact", blurb: "I've independently managed a long-term investment portfolio since 2021, benchmarking my returns against the S&P 500." },
  { label: "185+ volunteer hrs", kind: "fact", blurb: "Logged 185+ volunteer hours across literacy, food security, and environmental causes." },
  { label: "ACT 35 · SSAT 2398", kind: "fact", blurb: "Scored a 35 on the ACT and 2398 on the SSAT — both 99th percentile." },
  { label: "Wharton Youth '26", kind: "fact", blurb: "Accepted to UPenn's Wharton Global Youth Essentials of Entrepreneurship program this summer." },
  { label: "Chief Science Officer", kind: "fact", blurb: "Chief Science Officer at Council Rock South, leading a student-led STEM innovation competition." },

  // craft / stack
  { label: "Quant finance", kind: "skill", blurb: "Risk modeling, capital allocation, and quantitative research are how I think about markets." },
  { label: "Python", kind: "skill", blurb: "My main language for financial modeling, data work, and machine learning." },
  { label: "Next.js", kind: "skill", blurb: "My go-to React framework for shipping fast, polished web apps — including this one." },
  { label: "TypeScript", kind: "skill", blurb: "I write typed, maintainable front-end code across all of my projects." },
  { label: "Three.js", kind: "skill", blurb: "WebGL and Three.js power the 3D visuals on this very site." },
  { label: "Machine learning", kind: "skill", blurb: "Built a stock-forecasting model with TensorFlow and Prophet on six years of market data." },
  { label: "Monte Carlo sim", kind: "skill", blurb: "Corvo runs 300-path Monte Carlo simulations to model how portfolios behave under uncertainty." },
  { label: "Claude API", kind: "skill", blurb: "I build AI features — chat, analysis, coaching — on Anthropic's Claude API." },
  { label: "FastAPI", kind: "skill", blurb: "Python/FastAPI backends serve Corvo's custom financial modeling." },
  { label: "Supabase", kind: "skill", blurb: "Auth and Postgres for my apps run on Supabase." },
  { label: "Vercel", kind: "skill", blurb: "I deploy and host my web apps on Vercel." },
  { label: "GitHub", kind: "skill", blurb: "All of my projects live on GitHub with proper version control." },

  // leadership / community
  { label: "Leadership", kind: "skill", blurb: "President of the Environmental Action Club and on the board of several student organizations." },
  { label: "Entrepreneurship", kind: "skill", blurb: "I love turning ideas into shipped products and figuring out how to grow them." },
  { label: "Environmental Action", kind: "skill", blurb: "As EAC President I organized an e-waste recycling drive with 200+ participants." },
  { label: "FJLP", kind: "skill", blurb: "Director of Technology for the Future Jain Leadership Program, a national youth nonprofit." },
  { label: "TASK", kind: "skill", blurb: "Volunteered 60+ hours at the Trenton Area Soup Kitchen supporting food-insecure neighbors." },
  { label: "Young Readers", kind: "skill", blurb: "Volunteer reviewer in the Free Library's Young Readers literacy program (75+ hrs)." },

  // languages
  { label: "Spanish", kind: "skill", blurb: "Professional working proficiency — Duolingo score of 115." },
  { label: "Hindi", kind: "skill", blurb: "Native fluency." },
  { label: "Urdu", kind: "skill", blurb: "Professional working proficiency." },

  // off the screen
  { label: "Reading", kind: "skill", blurb: "I read widely: mystery, speculative fiction, and increasingly poetry." },
  { label: "Soccer", kind: "skill", blurb: "I play soccer." },
  { label: "Lacrosse", kind: "skill", blurb: "I play lacrosse." },
  { label: "Skiing", kind: "skill", blurb: "I ski whenever I get the chance." },
  { label: "Working out", kind: "skill", blurb: "I lift and train regularly." },
  { label: "Nala", kind: "skill", blurb: "My dog, Nala — the best part of any day." },
  { label: "Playa Bowls", kind: "skill", blurb: "I go every Friday." },
];

interface NodeData extends Item {
  target: THREE.Vector3;
}

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Node positions (fibonacci sphere) + the edge web (k-nearest). */
function buildGraph() {
  const r = seeded(2010);
  const golden = Math.PI * (3 - Math.sqrt(5));
  const n = ITEMS.length;

  // even fibonacci-sphere slots
  const slots: THREE.Vector3[] = [];
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const rad = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = i * golden;
    const jitter = 0.92 + r() * 0.14;
    slots.push(
      new THREE.Vector3(Math.cos(theta) * rad, y, Math.sin(theta) * rad).multiplyScalar(
        RADIUS * jitter
      )
    );
  }
  // deterministic shuffle so item order doesn't correlate with latitude
  // (otherwise the long-named "fact" items all bunch up near the top pole)
  const perm = slots.map((_, i) => i);
  for (let i = perm.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  const nodes: NodeData[] = ITEMS.map((it, i) => ({ ...it, target: slots[perm[i]] }));

  const edges: [number, number][] = [];
  const seen = new Set<string>();
  const adj: Set<number>[] = nodes.map(() => new Set<number>());
  nodes.forEach((node, i) => {
    const order = nodes
      .map((o, j) => ({ j, d: node.target.distanceTo(o.target) }))
      .filter((o) => o.j !== i)
      .sort((a, b) => a.d - b.d)
      .slice(0, 2);
    for (const { j } of order) {
      const key = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push([i, j]);
      adj[i].add(j);
      adj[j].add(i);
    }
  });
  return { nodes, edges, adj };
}

function Scene({
  overlay,
  reduced,
  pausedRef,
  selectedRef,
  onPick,
  onTogglePause,
}: {
  overlay: React.RefObject<HTMLCanvasElement | null>;
  reduced: boolean;
  pausedRef: React.RefObject<boolean>;
  selectedRef: React.RefObject<number>;
  onPick: (index: number, left: number, top: number) => void;
  onTogglePause: () => void;
}) {
  const { camera, size, gl } = useThree();
  const group = useRef<THREE.Group>(null!);

  const { nodes, edges, adj } = useMemo(() => buildGraph(), []);

  const ptr = useRef({ x: 0, y: 0, inside: false });
  const drag = useRef({ active: false, lastX: 0, lastY: 0 });
  const press = useRef({ down: false, sx: 0, sy: 0, moved: false, longFired: false });
  const longTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rot = useRef({ x: -0.18, y: 0, vx: 0, vy: 0 });
  const prog = useRef(reduced ? 1 : 0);
  const clockT = useRef(0);
  const hotCur = useRef(new Float32Array(nodes.length));
  const hovered = useRef(-1);
  const screen = useMemo(
    () => nodes.map(() => ({ x: 0, y: 0, z: 1, wz: 0, vis: false })),
    [nodes]
  );

  // --- node points + glow shader ---
  const { geom: pointsGeom, material: pointsMat } = useMemo(() => {
    const n = nodes.length;
    const geom = new THREE.BufferGeometry();
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const aSize = new Float32Array(n);
    const aHot = new Float32Array(n);
    nodes.forEach((node, i) => {
      // nodes start already in place — no fly-in
      pos[i * 3] = node.target.x;
      pos[i * 3 + 1] = node.target.y;
      pos[i * 3 + 2] = node.target.z;
      // every node identical: white, same size; amber is reserved for hover/selection
      col[i * 3] = BONE.r;
      col[i * 3 + 1] = BONE.g;
      col[i * 3 + 2] = BONE.b;
      aSize[i] = 1.32;
    });
    geom.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geom.setAttribute("aColor", new THREE.BufferAttribute(col, 3));
    geom.setAttribute("aSize", new THREE.BufferAttribute(aSize, 1));
    geom.setAttribute("aHot", new THREE.BufferAttribute(aHot, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPix: { value: Math.min(typeof window !== "undefined" ? window.devicePixelRatio : 1, 2) },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        attribute float aSize;
        attribute float aHot;
        attribute vec3 aColor;
        varying vec3 vColor;
        varying float vHot;
        varying float vDepth;
        uniform float uTime;
        uniform float uPix;
        void main() {
          vColor = aColor;
          vHot = aHot;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vDepth = -mv.z;
          float pulse = 1.0 + 0.12 * sin(uTime * 1.8 + position.x * 2.3 + position.y);
          // only a tiny size bump on hover — no big bubble
          float size = aSize * (1.0 + aHot * 0.18) * pulse;
          gl_PointSize = size * uPix * (210.0 / vDepth);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vColor;
        varying float vHot;
        varying float vDepth;
        void main() {
          vec2 uv = gl_PointCoord - 0.5;
          float d = length(uv);
          if (d > 0.5) discard;
          // bright tight core + soft surrounding halo (self-contained glow, no bloom)
          float core = smoothstep(0.22, 0.0, d);
          float halo = smoothstep(0.5, 0.22, d);
          float fade = clamp((16.0 - vDepth) / 11.0, 0.5, 1.0);
          vec3 amber = vec3(0.133, 0.827, 0.933); // cyan hover highlight
          vec3 col = mix(vColor, amber, clamp(vHot, 0.0, 1.0));
          float a = (core * 1.0 + halo * 0.42) * fade;
          gl_FragColor = vec4(col, a);
        }
      `,
    });
    return { geom, material };
  }, [nodes]);

  // --- edges ---
  // fat lines (LineSegments2) — real pixel thickness, which plain WebGL lines
  // can't do; additive-blended so they read as a soft glow between the nodes
  const lines = useMemo(() => {
    const geom = new LineSegmentsGeometry();
    const pos = new Float32Array(edges.length * 6);
    edges.forEach(([i, j], e) => {
      const a = nodes[i].target;
      const b = nodes[j].target;
      pos.set([a.x, a.y, a.z, b.x, b.y, b.z], e * 6);
    });
    geom.setPositions(pos);
    const colors = new Float32Array(edges.length * 6);
    geom.setColors(colors);
    const material = new LineMaterial({
      linewidth: 2.6, // pixels
      worldUnits: false,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    material.resolution.set(gl.domElement.width, gl.domElement.height);
    const seg = new LineSegments2(geom, material);
    seg.frustumCulled = false;
    const colorBuf = (geom.getAttribute("instanceColorStart") as THREE.InterleavedBufferAttribute)
      .data as THREE.InstancedInterleavedBuffer;
    return { seg, material, colors, colorBuf };
  }, [nodes, edges, gl]);

  // --- far background starfield (sits well behind the sphere, never in front) ---
  const dust = useMemo(() => {
    const r = seeded(77);
    const N = 130;
    const geom = new THREE.BufferGeometry();
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      // spread across a wide plane parked behind the constellation
      pos[i * 3] = (r() - 0.5) * 44;
      pos[i * 3 + 1] = (r() - 0.5) * 34;
      pos[i * 3 + 2] = -10 - r() * 18; // z in [-28, -10] → always behind the nodes
    }
    geom.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const material = new THREE.PointsMaterial({
      color: new THREE.Color("#EDE4D3"),
      size: 0.16,
      map: discTexture(),
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    return { geom, material };
  }, []);

  // pointer: drag to orbit / tap a node / hold to pause
  useEffect(() => {
    const el = gl.domElement;
    const rect = () => el.getBoundingClientRect();
    const clearLong = () => {
      if (longTimer.current) {
        clearTimeout(longTimer.current);
        longTimer.current = null;
      }
    };
    const onMove = (ev: PointerEvent) => {
      const r = rect();
      ptr.current.x = ev.clientX - r.left;
      ptr.current.y = ev.clientY - r.top;
      ptr.current.inside = true;
      if (press.current.down) {
        const dx = ev.clientX - press.current.sx;
        const dy = ev.clientY - press.current.sy;
        if (!press.current.moved && Math.hypot(dx, dy) > 6) {
          press.current.moved = true;
          drag.current.active = true;
          drag.current.lastX = press.current.sx;
          drag.current.lastY = press.current.sy;
          clearLong();
        }
        if (drag.current.active) {
          const mdx = ev.clientX - drag.current.lastX;
          const mdy = ev.clientY - drag.current.lastY;
          drag.current.lastX = ev.clientX;
          drag.current.lastY = ev.clientY;
          rot.current.y += mdx * 0.006;
          rot.current.x += mdy * 0.006;
          rot.current.vy = mdx * 0.006;
          rot.current.vx = mdy * 0.006;
        }
      }
    };
    const onDown = (ev: PointerEvent) => {
      const r = rect();
      ptr.current.x = ev.clientX - r.left;
      ptr.current.y = ev.clientY - r.top;
      ptr.current.inside = true;
      press.current.down = true;
      press.current.sx = ev.clientX;
      press.current.sy = ev.clientY;
      press.current.moved = false;
      press.current.longFired = false;
      drag.current.active = false;
      rot.current.vx = 0;
      rot.current.vy = 0;
      el.setPointerCapture?.(ev.pointerId);
      clearLong();
      longTimer.current = setTimeout(() => {
        if (press.current.down && !press.current.moved) {
          press.current.longFired = true;
          onTogglePause();
        }
      }, 450);
    };
    const onUp = (ev: PointerEvent) => {
      clearLong();
      el.releasePointerCapture?.(ev.pointerId);
      const tap = press.current.down && !press.current.moved && !press.current.longFired;
      press.current.down = false;
      drag.current.active = false;
      if (!tap) return;
      const idx = hovered.current;
      if (idx >= 0) {
        const r = rect();
        const s = screen[idx];
        const left = clamp(s.x - 118, 8, r.width - 244);
        const top =
          s.y > r.height - 150 ? clamp(s.y - 138, 8, r.height - 16) : clamp(s.y + 16, 8, r.height - 130);
        onPick(idx, left, top);
      } else {
        onPick(-1, 0, 0); // tap on empty space closes the popup
      }
    };
    const onLeave = () => {
      ptr.current.inside = false;
      press.current.down = false;
      drag.current.active = false;
      clearLong();
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointerleave", onLeave);
      clearLong();
    };
  }, [gl, onPick, onTogglePause, screen]);

  const scratch = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, dt) => {
    const paused = !!pausedRef.current;
    const adv = paused ? 0 : dt;
    clockT.current += adv;
    const t = clockT.current;
    if (prog.current < 1) prog.current = Math.min(1, prog.current + adv / 1.7);
    const e = easeOut(prog.current);

    // rotation: drag any time; auto-spin + inertia only when not frozen
    // (keeps orbiting even while a popup is open)
    const autoSpin = !reduced && !paused;
    if (!drag.current.active && autoSpin) {
      rot.current.x += rot.current.vx;
      rot.current.y += rot.current.vy;
      rot.current.vx *= 0.93;
      rot.current.vy *= 0.93;
      rot.current.y += dt * 0.085; // continuous clockwise orbit; tilt stays where dragged
    }
    rot.current.x = clamp(rot.current.x, -0.95, 0.95);
    group.current.rotation.set(rot.current.x, rot.current.y, 0);
    group.current.updateMatrixWorld();

    pointsMat.uniforms.uTime.value = t;

    const posAttr = pointsGeom.attributes.position as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;

    // project nodes → screen (labels + hover)
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let near = -1;
    let best = 32 * 32;
    nodes.forEach((node, i) => {
      scratch
        .set(arr[i * 3], arr[i * 3 + 1], arr[i * 3 + 2])
        .applyMatrix4(group.current.matrixWorld);
      const worldZ = scratch.z; // >0 faces the camera, <0 is the far side
      scratch.project(camera);
      const sx = (scratch.x * 0.5 + 0.5) * size.width;
      const sy = (-scratch.y * 0.5 + 0.5) * size.height;
      screen[i].x = sx;
      screen[i].y = sy;
      screen[i].z = scratch.z;
      screen[i].wz = worldZ;
      screen[i].vis = scratch.z < 1;
      if (ptr.current.inside && !drag.current.active && screen[i].vis) {
        const d = (sx - ptr.current.x) ** 2 + (sy - ptr.current.y) ** 2;
        if (d < best) {
          best = d;
          near = i;
        }
      }
    });
    hovered.current = near;

    const hot = hotCur.current;
    const sel = selectedRef.current;
    const hotAttr = pointsGeom.attributes.aHot as THREE.BufferAttribute;
    for (let i = 0; i < nodes.length; i++) {
      let target = 0;
      if (near === i || sel === i) target = 1;
      else if ((near >= 0 && adj[near].has(i)) || (sel >= 0 && adj[sel].has(i)))
        target = 0.5;
      hot[i] += (target - hot[i]) * 0.18;
      (hotAttr.array as Float32Array)[i] = hot[i];
    }
    hotAttr.needsUpdate = true;

    const lc = lines.colors;
    const lineIntro = clamp((prog.current - 0.45) / 0.5, 0, 1);
    edges.forEach(([i, j], idx) => {
      const heat = Math.max(hot[i], hot[j]);
      [i, j].forEach((ni, k) => {
        const depth = clamp((1 - screen[ni].z) * 0.6 + 0.36, 0.36, 1);
        const base = (0.55 + heat * 0.75) * depth * lineIntro; // much brighter than before (was 0.24)
        const col = heat > 0.02 ? AMBER : BONE;
        const o = (idx * 2 + k) * 3;
        lc[o] = col.r * base;
        lc[o + 1] = col.g * base;
        lc[o + 2] = col.b * base;
      });
    });
    lines.colorBuf.needsUpdate = true;
    lines.material.resolution.set(gl.domElement.width, gl.domElement.height);

    // labels overlay
    const cv = overlay.current;
    if (cv) {
      const ctx = cv.getContext("2d");
      if (ctx) {
        const W = Math.floor(size.width * dpr);
        const H = Math.floor(size.height * dpr);
        if (cv.width !== W || cv.height !== H) {
          cv.width = W;
          cv.height = H;
        }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, size.width, size.height);
        ctx.textAlign = "center";

        const order = nodes.map((_, i) => i).sort((a, b) => screen[b].z - screen[a].z);
        for (const i of order) {
          const s = screen[i];
          if (!s.vis) continue;
          const node = nodes[i];
          // front (worldZ ≈ +R) = full; far side (worldZ ≈ -R) = dimmer but
          // still readable. every label is always visible & uniform-white.
          const front = clamp(s.wz / RADIUS, -1, 1) * 0.5 + 0.5; // 0..1
          const heat = hot[i];
          let alpha = (0.52 + front * 0.43) + heat * 0.3;
          alpha = Math.min(1, alpha) * e;
          if (alpha < 0.05) continue;

          const text = node.label.toUpperCase();
          const big = heat > 0.55;
          ctx.font = `600 ${big ? 12 : 10.5}px 'IBM Plex Mono', ui-monospace, monospace`;
          // clamp by the label's full width/height so it never clips at an edge
          const half = ctx.measureText(text).width / 2;
          const px = clamp(s.x, half + 8, size.width - half - 8);
          const py = clamp(s.y - 13 - heat * 3, 14, size.height - 8);
          ctx.shadowColor = "rgba(0,0,0,0.85)";
          ctx.shadowBlur = 8;
          const c = heat > 0.04 ? AMBER : BONE;
          ctx.fillStyle = `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},${alpha})`;
          ctx.fillText(text, px, py);
          ctx.shadowBlur = 0;
        }
      }
    }
  });

  return (
    <>
      {/* far starfield — static, parked behind, never rotates into the front */}
      <points geometry={dust.geom} material={dust.material} frustumCulled={false} />
      <group ref={group} position={[GROUP_X, GROUP_Y, 0]}>
        <primitive object={lines.seg} />
        <points geometry={pointsGeom} material={pointsMat} frustumCulled={false} />
      </group>
    </>
  );
}

interface Popup {
  index: number;
  left: number;
  top: number;
}

/** About — "a map of me" as an orbitable 3D constellation: facts (amber) and
 *  skills/interests (bone) glow in depth, connect into a web, light up on
 *  hover, open a blurb on tap, and freeze on a long-press. */
export default function AboutConstellation() {
  const reduced = useReducedMotionSafe();
  const overlay = useRef<HTMLCanvasElement | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);
  const selectedRef = useRef(-1);
  const [popup, setPopup] = useState<Popup | null>(null);
  const [paused, setPaused] = useState(false);

  const [active, setActive] = useState(true);
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting), {
      threshold: 0,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const onPick = useCallback((index: number, left: number, top: number) => {
    if (index < 0) {
      selectedRef.current = -1;
      setPopup(null);
    } else {
      selectedRef.current = index;
      setPopup({ index, left, top });
    }
  }, []);

  const onTogglePause = useCallback(() => {
    setPaused((p) => {
      const next = !p;
      pausedRef.current = next;
      return next;
    });
  }, []);

  const closePopup = useCallback(() => {
    selectedRef.current = -1;
    setPopup(null);
  }, []);

  const item = popup ? ITEMS[popup.index] : null;

  return (
    <div
      ref={wrap}
      // bleed beyond the column (right + top/bottom) so node glows and labels
      // never hit the canvas edge — this is what removes the "invisible box".
      // overflow-x-clip on <main> keeps the right bleed from causing scroll.
      className="absolute -top-14 -bottom-8 left-0 -right-28 cursor-grab touch-none select-none active:cursor-grabbing"
    >
      {/* soft grey blob behind the map — a little contrast so the dots read,
          contained well within the canvas so it never shows a hard edge */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(42% 38% at 50% 41%, rgba(214,212,220,0.07), rgba(232,163,61,0.035) 45%, transparent 70%)",
        }}
      />
      <Canvas
        camera={{ position: [0, 0, 12.2], fov: 45 }}
        dpr={[1, 1.5]}
        frameloop={active ? "always" : "never"}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      >
        <Scene
          overlay={overlay}
          reduced={reduced}
          pausedRef={pausedRef}
          selectedRef={selectedRef}
          onPick={onPick}
          onTogglePause={onTogglePause}
        />
      </Canvas>

      <canvas ref={overlay} className="pointer-events-none absolute inset-0 h-full w-full" />

      {/* instructions — centered below the map (sphere is at canvas center) */}
      <div
        className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 translate-y-7 flex-col items-center gap-1.5 text-center"
        style={{ textShadow: "0 1px 10px rgba(0,0,0,0.9)" }}
      >
        <p className="font-mono text-[11px] tracking-[0.32em] text-[#22d3ee]/80 uppercase">
          A map of me
        </p>
        <p
          className={`font-mono text-[11px] tracking-[0.18em] uppercase transition-colors ${
            paused ? "text-[#22d3ee]" : "text-bone/55"
          }`}
        >
          {paused
            ? "Paused · hold to resume"
            : "Drag to orbit · tap a node · hold to pause"}
        </p>
      </div>

      <AnimatePresence>
        {item && popup && (
          <motion.div
            key={popup.index}
            initial={{ opacity: 0, scale: 0.82, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 4 }}
            transition={{ type: "spring", stiffness: 460, damping: 26, mass: 0.7 }}
            className="absolute z-10 w-[240px] origin-top overflow-hidden rounded-xl border border-[#22d3ee]/30 bg-gradient-to-b from-[#0c1a1d]/95 to-[#07100f]/96 shadow-[0_18px_48px_-12px_rgba(0,0,0,0.85)] backdrop-blur-md"
            style={{ left: popup.left, top: popup.top }}
          >
            {/* animated top accent sweep */}
            <motion.div
              className="h-px w-full bg-gradient-to-r from-transparent via-[#22d3ee] to-transparent"
              initial={{ opacity: 0.3, scaleX: 0.4 }}
              animate={{ opacity: [0.4, 0.9, 0.4], scaleX: 1 }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            />
            <div className="flex items-start gap-2.5 px-3.5 pt-3">
              <motion.span
                className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#22d3ee]"
                animate={{
                  scale: [1, 1.35, 1],
                  boxShadow: [
                    "0 0 6px 1px rgba(232,163,61,0.55)",
                    "0 0 12px 3px rgba(232,163,61,0.85)",
                    "0 0 6px 1px rgba(232,163,61,0.55)",
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
              <p className="flex-1 font-mono text-[10px] leading-[1.45] tracking-[0.16em] text-[#22d3ee] uppercase">
                {item.label}
              </p>
              <button
                onClick={closePopup}
                aria-label="Close"
                data-cursor="close"
                className="-mt-1 -mr-1 grid h-6 w-6 shrink-0 place-items-center rounded-full text-[15px] leading-none text-dim transition-colors hover:bg-[#22d3ee]/10 hover:text-[#22d3ee]"
              >
                ×
              </button>
            </div>
            <div className="mx-3.5 mt-2.5 h-px bg-gradient-to-r from-[#22d3ee]/25 via-[#22d3ee]/10 to-transparent" />
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08, duration: 0.25 }}
              className="px-3.5 pt-2.5 pb-3.5 font-sans text-[12.5px] leading-[1.55] text-bone/85"
            >
              {item.blurb}
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
