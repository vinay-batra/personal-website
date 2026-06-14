"use client";

import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { useReducedMotionSafe } from "@/lib/useReducedMotionSafe";

/**
 * The Raven — a corvid companion (Corvo = raven). Loads a real artist-made model
 * from /public/raven.glb, recolours nothing (keeps the artist's silhouette),
 * lights it with an amber rim so a dark bird reads on the dark page, tracks the
 * cursor, breathes, and scatters amber embers on click.
 *
 * Stays fully invisible until raven.glb exists, so it never breaks the page.
 * Everything you'd tune by eye is a constant right here:
 */
const MODEL_URL = "/raven.glb";
const TARGET_HEIGHT = 2.2; // model is auto-scaled so its height = this many world units
const FACING_Y = 0; // yaw offset (radians) to point the bird forward — tune per model
const BASE_TILT = -0.05; // a slight head-down perch attitude
const GAZE_YAW = 0.6; // how far it turns to follow the cursor (left/right)
const GAZE_PITCH = 0.32; // up/down follow
const AMBER = new THREE.Color("#E8A33D");

/* normalized cursor across the whole window, shared into the scene */
const pointer = { x: 0, y: 0 };
if (typeof window !== "undefined") {
  window.addEventListener("pointermove", (e) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
  });
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/* soft round sprite for the embers */
function discTexture(): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const x = c.getContext("2d")!;
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.4, "rgba(255,236,200,0.8)");
  g.addColorStop(1, "rgba(255,200,120,0)");
  x.fillStyle = g;
  x.beginPath();
  x.arc(32, 32, 32, 0, Math.PI * 2);
  x.fill();
  return new THREE.CanvasTexture(c);
}

function Embers({ triggerRef }: { triggerRef: React.RefObject<number> }) {
  const N = 28;
  const last = useRef(0);
  const age = useRef(99);
  const pts = useRef<{ p: THREE.Vector3; v: THREE.Vector3 }[]>(
    Array.from({ length: N }, () => ({ p: new THREE.Vector3(), v: new THREE.Vector3() }))
  );
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    return g;
  }, []);
  const mat = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: AMBER,
        size: 0.16,
        map: discTexture(),
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
      }),
    []
  );

  useFrame((_, dt) => {
    if (triggerRef.current !== last.current) {
      last.current = triggerRef.current;
      age.current = 0;
      for (const e of pts.current) {
        e.p.set(0, 0.1, 0);
        e.v
          .set(Math.random() - 0.5, Math.random() * 0.9 + 0.1, Math.random() - 0.5)
          .normalize()
          .multiplyScalar(1.4 + Math.random() * 1.6);
      }
    }
    age.current += dt;
    const arr = geom.attributes.position.array as Float32Array;
    for (let i = 0; i < N; i++) {
      const e = pts.current[i];
      e.v.y -= dt * 1.8; // gravity
      e.v.multiplyScalar(0.96);
      e.p.addScaledVector(e.v, dt);
      arr[i * 3] = e.p.x;
      arr[i * 3 + 1] = e.p.y;
      arr[i * 3 + 2] = e.p.z;
    }
    geom.attributes.position.needsUpdate = true;
    mat.opacity = Math.max(0, 1 - age.current / 1.1);
  });

  return <points geometry={geom} material={mat} frustumCulled={false} />;
}

function Raven({
  reduced,
  triggerRef,
}: {
  reduced: boolean;
  triggerRef: React.RefObject<number>;
}) {
  const gltf = useLoader(GLTFLoader, MODEL_URL);
  const root = useRef<THREE.Group>(null!);
  const { gl } = useThree();
  const yaw = useRef(0);
  const pitch = useRef(0);

  // clone, center, and scale the model to a known size regardless of how the
  // artist exported it — this is what makes "drop any raven in" just work.
  const model = useMemo(() => {
    const scene = gltf.scene.clone(true);
    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    const s = TARGET_HEIGHT / (size.y || 1);
    scene.position.sub(center); // center at origin
    const wrap = new THREE.Group();
    wrap.add(scene);
    wrap.scale.setScalar(s);

    // expose the raw dimensions + material list so it can be inspected live
    if (typeof window !== "undefined") {
      const mats: string[] = [];
      scene.traverse((o) => {
        const m = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
        if (m) (Array.isArray(m) ? m : [m]).forEach((mm) => mats.push(mm.type));
      });
      (window as unknown as Record<string, unknown>).__raven = {
        size: [size.x, size.y, size.z],
        scale: s,
        materials: mats,
      };
    }
    return wrap;
  }, [gltf]);

  // amber-burst on click anywhere over the bird's canvas
  useEffect(() => {
    const el = gl.domElement;
    const onDown = () => {
      triggerRef.current += 1;
    };
    el.addEventListener("pointerdown", onDown);
    return () => el.removeEventListener("pointerdown", onDown);
  }, [gl, triggerRef]);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    // ease the gaze toward the cursor
    const ty = FACING_Y + clamp(pointer.x, -1, 1) * GAZE_YAW;
    const tp = BASE_TILT - clamp(pointer.y, -1, 1) * GAZE_PITCH;
    yaw.current += (ty - yaw.current) * Math.min(1, dt * 4);
    pitch.current += (tp - pitch.current) * Math.min(1, dt * 4);
    if (root.current) {
      root.current.rotation.y = yaw.current;
      root.current.rotation.x = pitch.current;
      // gentle breathing / perch bob
      root.current.position.y = reduced ? 0 : Math.sin(t * 1.4) * 0.04;
      const ruffle = reduced ? 0 : Math.sin(t * 8) * 0.004;
      root.current.position.x = ruffle;
    }
  });

  return (
    <group ref={root}>
      <primitive object={model} />
      <Embers triggerRef={triggerRef} />
    </group>
  );
}

export default function RavenCompanion() {
  const reduced = useReducedMotionSafe();
  const [ready, setReady] = useState(false);
  const triggerRef = useRef(0);

  // only mount the loader once the file actually exists (avoids a 404 throw)
  useEffect(() => {
    let alive = true;
    fetch(MODEL_URL, { method: "HEAD" })
      .then((r) => alive && setReady(r.ok))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (!ready) return null;

  return (
    <div className="pointer-events-none fixed right-5 bottom-5 z-30 h-[340px] w-[300px] md:h-[380px] md:w-[340px]">
      <Canvas
        className="pointer-events-auto cursor-pointer"
        camera={{ position: [0, 0.2, 5], fov: 40 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      >
        <ambientLight intensity={0.55} />
        {/* key light, cool-front */}
        <directionalLight position={[2, 3, 4]} intensity={1.15} color="#cfd6dd" />
        {/* amber rim from behind — edge-lights the dark silhouette + brand colour */}
        <directionalLight position={[-3, 1.5, -4]} intensity={2.4} color="#E8A33D" />
        <Suspense fallback={null}>
          <Raven reduced={reduced} triggerRef={triggerRef} />
        </Suspense>
      </Canvas>
    </div>
  );
}
