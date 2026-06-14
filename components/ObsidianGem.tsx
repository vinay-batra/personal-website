"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, MeshTransmissionMaterial } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { ConvexGeometry } from "three/examples/jsm/geometries/ConvexGeometry.js";
import { useReducedMotionSafe } from "@/lib/useReducedMotionSafe";
import { useIsDesktop } from "@/lib/useIsDesktop";

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function seeded(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

/** Faceted obsidian crystal — a seeded convex hull, elongated, with sharp
 *  top/bottom points and flat (faceted) normals so each face refracts cleanly. */
function useCrystalGeometry() {
  return useMemo(() => {
    const r = seeded(2026);
    const N = 16; // more points → more facets
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
  }, []);
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

function Backdrop() {
  // just a soft amber glow behind the crystal — the bars were removed; the
  // environment Lightformers still give the gem its reflections/fire.
  const glow = useMemo(() => radialTexture("rgba(139,92,246,0.8)", "rgba(124,58,237,0)"), []);
  return (
    <group position={[0, 0, -2.4]}>
      <mesh position={[0, 0, -0.6]}>
        <planeGeometry args={[9, 9]} />
        <meshBasicMaterial map={glow} transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
}

function Crystal({ reduced, hi }: { reduced: boolean; hi: boolean }) {
  const geom = useCrystalGeometry();
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
    <mesh ref={mesh} geometry={geom} scale={0.92}>
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
        color="#c4b3e0"
        attenuationColor="#7c3aed"
        attenuationDistance={0.5}
        background={new THREE.Color("#060409")}
        resolution={hi ? 1024 : 640}
        samples={hi ? 8 : 5}
        clearcoat={1}
        clearcoatRoughness={0.04}
      />
    </mesh>
  );
}

function Scene({ reduced, hi }: { reduced: boolean; hi: boolean }) {
  return (
    <>
      <ambientLight intensity={0.3} />
      <Backdrop />
      <Crystal reduced={reduced} hi={hi} />
      <Environment resolution={256}>
        {/* near-black world so the crystal reads as obsidian where unlit */}
        <color attach="background" args={["#050308"]} />
        {/* violet fire */}
        <Lightformer intensity={2.6} color="#7c3aed" position={[-3, 1.5, -1]} scale={[3, 4, 1]} />
        <Lightformer intensity={1.6} color="#a78bfa" position={[3, 2, 1]} scale={[2, 5, 1]} />
        <Lightformer intensity={1.8} color="#8b5cf6" position={[0, -3, 2]} scale={[5, 2, 1]} form="ring" />
        {/* small, bright white sources = sharp specular glints → reads "real" */}
        <Lightformer intensity={3} color="#ffffff" position={[1.6, 3, -2]} scale={[0.9, 0.9, 1]} />
        <Lightformer intensity={2} color="#ffffff" position={[-2, -1.5, 3]} scale={[0.6, 0.6, 1]} />
      </Environment>
    </>
  );
}

/** The obsidian gem as a canvas-only engine — the parent supplies the framed box. */
export default function ObsidianGem() {
  const reduced = useReducedMotionSafe();
  const isDesktop = useIsDesktop();
  const wrap = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(true);

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
        <Scene reduced={reduced} hi={isDesktop} />
      </Canvas>
    </div>
  );
}
