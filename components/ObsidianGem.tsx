"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, MeshTransmissionMaterial } from "@react-three/drei";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { ConvexGeometry } from "three/examples/jsm/geometries/ConvexGeometry.js";
import { useReducedMotionSafe } from "@/lib/useReducedMotionSafe";
import { useIsDesktop } from "@/lib/useIsDesktop";

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const mixN = (a: number, b: number, t: number) => a + (b - a) * t;

export interface GemPalette {
  name: string;
  surf: string; // refracted body tint
  fire: string; // inner attenuation "fire"
  l1: string; // main lightformer
  l2: string; // fill lightformer
  glow: string; // rgb for the backdrop glow
}
export const GEM_PALETTES: GemPalette[] = [
  { name: "Violet", surf: "#c4b3e0", fire: "#7c3aed", l1: "#7c3aed", l2: "#a78bfa", glow: "124,58,237" },
  { name: "Indigo", surf: "#b8c2ea", fire: "#4f46e5", l1: "#4f46e5", l2: "#818cf8", glow: "79,70,229" },
  { name: "Teal", surf: "#a8e0d8", fire: "#0d9488", l1: "#0d9488", l2: "#5eead4", glow: "13,148,136" },
  { name: "Magenta", surf: "#e8b3d8", fire: "#be185d", l1: "#be185d", l2: "#f472b6", glow: "190,24,93" },
];

export interface GemParams {
  facets: number; // convex-hull points → number of faces
  size: number; // 0.7..1.15 scale
  fire: number; // 0..1 inner glow
  reflect: number; // 0..1 reflection intensity
  colorIdx: number;
}
export const DEFAULT_GEM: GemParams = { facets: 28, size: 0.92, fire: 0.74, reflect: 0.94, colorIdx: 0 };

function seeded(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

/** Faceted obsidian crystal — a seeded convex hull, elongated, with sharp
 *  top/bottom points and flat (faceted) normals so each face refracts cleanly. */
function useCrystalGeometry(facets: number) {
  return useMemo(() => {
    const r = seeded(2026);
    const N = clamp(Math.round(facets), 6, 30);
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2;
      const rad = Math.sqrt(Math.max(0, 1 - y * y));
      const th = i * Math.PI * (3 - Math.sqrt(5));
      const jit = 0.82 + r() * 0.3;
      pts.push(new THREE.Vector3(Math.cos(th) * rad * jit, y * 1.35, Math.sin(th) * rad * jit));
    }
    pts.push(new THREE.Vector3(0, 2.15, 0));
    pts.push(new THREE.Vector3(0, -1.95, 0));
    const geo = new ConvexGeometry(pts);
    geo.computeVertexNormals();
    geo.center();
    return geo;
  }, [facets]);
}

function radialTexture(inner: string, outer: string): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const x = c.getContext("2d")!;
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  x.fillStyle = g;
  x.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

function Backdrop({ glow }: { glow: string }) {
  const tex = useMemo(() => radialTexture(`rgba(${glow},0.8)`, `rgba(${glow},0)`), [glow]);
  return (
    <group position={[0, 0, -2.4]}>
      <mesh position={[0, 0, -0.6]}>
        <planeGeometry args={[9, 9]} />
        <meshBasicMaterial map={tex} transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
}

function Crystal({ reduced, hi, p, pal }: { reduced: boolean; hi: boolean; p: GemParams; pal: GemPalette }) {
  const geom = useCrystalGeometry(p.facets);
  const mesh = useRef<THREE.Mesh>(null!);
  const { gl } = useThree();
  const rot = useRef({ x: -0.12, y: 0.3, vx: 0, vy: 0 });
  const drag = useRef({ active: false, lx: 0, ly: 0 });

  useEffect(() => {
    const el = gl.domElement;
    const onDown = (e: PointerEvent) => {
      drag.current.active = true;
      drag.current.lx = e.clientX;
      drag.current.ly = e.clientY;
      rot.current.vx = 0;
      rot.current.vy = 0;
      el.setPointerCapture?.(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!drag.current.active) return;
      const dx = e.clientX - drag.current.lx;
      const dy = e.clientY - drag.current.ly;
      drag.current.lx = e.clientX;
      drag.current.ly = e.clientY;
      rot.current.y += dx * 0.008;
      rot.current.x += dy * 0.008;
      rot.current.vy = dx * 0.008;
      rot.current.vx = dy * 0.008;
    };
    const onUp = (e: PointerEvent) => {
      drag.current.active = false;
      el.releasePointerCapture?.(e.pointerId);
    };
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointerleave", onUp);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointerleave", onUp);
    };
  }, [gl]);

  useFrame((state, dt) => {
    const m = mesh.current;
    if (!m) return;
    const t = state.clock.elapsedTime;
    if (!drag.current.active) {
      rot.current.x += rot.current.vx;
      rot.current.y += rot.current.vy;
      rot.current.vx *= 0.94;
      rot.current.vy *= 0.94;
      if (!reduced) rot.current.y += dt * 0.12;
    }
    rot.current.x = clamp(rot.current.x, -0.7, 0.7);
    m.rotation.set(rot.current.x, rot.current.y, 0);
    m.position.y = reduced ? 0 : Math.sin(t * 0.9) * 0.08;
  });

  return (
    <mesh ref={mesh} geometry={geom} scale={p.size}>
      <MeshTransmissionMaterial
        transmission={1}
        thickness={1.85}
        roughness={0.015}
        ior={2.42}
        chromaticAberration={0.42}
        anisotropicBlur={0.2}
        distortion={0.28}
        distortionScale={0.4}
        temporalDistortion={0.06}
        color={pal.surf}
        attenuationColor={pal.fire}
        attenuationDistance={mixN(1.1, 0.32, clamp(p.fire, 0, 1))}
        background={new THREE.Color("#060409")}
        resolution={hi ? 1024 : 640}
        samples={hi ? 8 : 5}
        clearcoat={1}
        clearcoatRoughness={0.04}
      />
    </mesh>
  );
}

function Scene({ reduced, hi, p }: { reduced: boolean; hi: boolean; p: GemParams }) {
  const pal = GEM_PALETTES[clamp(p.colorIdx, 0, GEM_PALETTES.length - 1)] ?? GEM_PALETTES[0];
  const rm = 0.5 + clamp(p.reflect, 0, 1) * 1.2; // reflection intensity multiplier
  return (
    <>
      <ambientLight intensity={0.3} />
      <Backdrop glow={pal.glow} />
      <Crystal reduced={reduced} hi={hi} p={p} pal={pal} />
      <Environment resolution={256}>
        <color attach="background" args={["#050308"]} />
        {/* coloured "fire" */}
        <Lightformer intensity={2.6 * rm} color={pal.l1} position={[-3, 1.5, -1]} scale={[3, 4, 1]} />
        <Lightformer intensity={1.6 * rm} color={pal.l2} position={[3, 2, 1]} scale={[2, 5, 1]} />
        <Lightformer intensity={1.8 * rm} color={pal.l1} position={[0, -3, 2]} scale={[5, 2, 1]} form="ring" />
        {/* small, bright white sources = sharp specular glints → reads "real" */}
        <Lightformer intensity={3 * rm} color="#ffffff" position={[1.6, 3, -2]} scale={[0.9, 0.9, 1]} />
        <Lightformer intensity={2 * rm} color="#ffffff" position={[-2, -1.5, 3]} scale={[0.6, 0.6, 1]} />
      </Environment>
    </>
  );
}

/** The obsidian gem as a canvas-only engine. Memoized on its primitive params
 *  so unrelated Playground state (other toys' sliders) never re-renders it. */
function ObsidianGem({ facets, size, fire, reflect, colorIdx }: Partial<GemParams> = {}) {
  const reduced = useReducedMotionSafe();
  const isDesktop = useIsDesktop();
  const wrap = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(true);
  const p: GemParams = {
    facets: facets ?? DEFAULT_GEM.facets,
    size: size ?? DEFAULT_GEM.size,
    fire: fire ?? DEFAULT_GEM.fire,
    reflect: reflect ?? DEFAULT_GEM.reflect,
    colorIdx: colorIdx ?? DEFAULT_GEM.colorIdx,
  };

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={wrap} className="absolute inset-0 cursor-grab touch-none select-none active:cursor-grabbing">
      <Canvas
        camera={{ position: [0, 0, 7], fov: 35 }}
        dpr={[1, 1.5]}
        frameloop={active ? "always" : "never"}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      >
        <Scene reduced={reduced} hi={isDesktop} p={p} />
      </Canvas>
    </div>
  );
}

export default memo(ObsidianGem);
