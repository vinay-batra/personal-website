"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useReducedMotionSafe } from "@/lib/useReducedMotionSafe";

const SEG = 40; // grid resolution per side
const LO = new THREE.Color("#2b3a4a");
const MID = new THREE.Color("#5cb88a");
const HI = new THREE.Color("#E8A33D");

/** An animated, drag-to-orbit "volatility surface" — a wireframe grid that
 *  ripples like an implied-vol surface, coloured low→high by elevation. */
function Surface({ reduced }: { reduced: boolean }) {
  const group = useRef<THREE.Group>(null!);
  const { gl } = useThree();
  const drag = useRef({ on: false, px: 0, py: 0, vy: 0.0016, vx: 0 });

  const { geom, base } = useMemo(() => {
    const geom = new THREE.PlaneGeometry(2.6, 2.6, SEG, SEG);
    const count = geom.attributes.position.count;
    geom.setAttribute("color", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    const base = Float32Array.from(geom.attributes.position.array as Float32Array);
    return { geom, base };
  }, []);

  const tmp = useMemo(() => new THREE.Color(), []);

  // height field: a static "smile" bowl plus animated ripples
  const heightAt = (x: number, y: number, t: number) =>
    0.16 * (x * x * 0.9 + y * y * 0.5) +
    0.22 * Math.sin(x * 2.0 + t * 0.7) * Math.cos(y * 1.7 - t * 0.5) +
    0.1 * Math.sin((x * x + y * y) * 2.0 - t);

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
      if (group.current) {
        group.current.rotation.y += dx * 0.005;
        group.current.rotation.x = Math.max(
          -1.45,
          Math.min(-0.35, group.current.rotation.x + dy * 0.004)
        );
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
    const t = reduced ? 0.6 : state.clock.elapsedTime;
    const pos = geom.attributes.position.array as Float32Array;
    const col = geom.attributes.color.array as Float32Array;
    const count = geom.attributes.position.count;

    let zmin = Infinity;
    let zmax = -Infinity;
    for (let i = 0; i < count; i++) {
      const z = heightAt(base[i * 3], base[i * 3 + 1], t);
      pos[i * 3 + 2] = z;
      if (z < zmin) zmin = z;
      if (z > zmax) zmax = z;
    }
    const span = zmax - zmin || 1;
    for (let i = 0; i < count; i++) {
      const k = (pos[i * 3 + 2] - zmin) / span; // 0..1 by elevation
      tmp.copy(LO).lerp(MID, Math.min(1, k * 1.6));
      if (k > 0.55) tmp.lerp(HI, (k - 0.55) / 0.45);
      col[i * 3] = tmp.r;
      col[i * 3 + 1] = tmp.g;
      col[i * 3 + 2] = tmp.b;
    }
    geom.attributes.position.needsUpdate = true;
    geom.attributes.color.needsUpdate = true;

    if (group.current && !drag.current.on && !reduced) {
      drag.current.vy *= 0.96;
      group.current.rotation.y += drag.current.vy + 0.0015;
    }
    if (group.current) {
      const vp = state.viewport;
      const fit = (Math.min(vp.width, vp.height) * 0.46) / 1.7;
      group.current.scale.setScalar(fit);
    }
  });

  return (
    <group ref={group} rotation={[-0.95, 0, 0]}>
      <mesh geometry={geom}>
        <meshBasicMaterial vertexColors wireframe transparent opacity={0.92} />
      </mesh>
    </group>
  );
}

/** Corvo — a draggable 3D volatility surface. Grab to orbit. */
export default function MarketsSurface() {
  const reduced = useReducedMotionSafe();
  const wrap = useRef<HTMLDivElement>(null);
  const [onScreen, setOnScreen] = useState(true);

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
    <div ref={wrap} className="absolute inset-0" data-cursor="drag to orbit">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        dpr={[1, 1.5]}
        frameloop={onScreen ? "always" : "never"}
        gl={{ antialias: true, alpha: true }}
        style={{ cursor: "grab", touchAction: "pan-y" }}
      >
        <Surface reduced={reduced} />
      </Canvas>
      <span className="pointer-events-none absolute left-3.5 top-3 font-mono text-[9px] tracking-wide text-bone/40">
        VOLATILITY SURFACE
      </span>
    </div>
  );
}
