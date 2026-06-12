"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { useEffect, useMemo, useRef, useState } from "react";
import type { MotionValue } from "framer-motion";
import * as THREE from "three";

/* deterministic PRNG so the scatter + per-particle randoms are identical every load */
function seeded(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

interface Cloud {
  n: number;
  targets: Float32Array; // glyph position (also the geometry's `position`)
  starts: Float32Array; // scattered sphere the glyph condenses out of
  disperse: Float32Array; // downward-stream target (reduced-motion fallback)
  phases: Float32Array;
  rand: Float32Array; // 3 per particle: drift amp / shimmer speed / hue seed
}

/** Rasterize "VB" and sample its filled pixels into a 3D point cloud. */
function sampleVB(maxCount: number): Cloud | null {
  const S = 500;
  const cv = document.createElement("canvas");
  cv.width = S;
  cv.height = S;
  const ctx = cv.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#fff";
  ctx.font = '700 280px "Fraunces", Georgia, serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("VB", S / 2, S / 2 + 8);

  const data = ctx.getImageData(0, 0, S, S).data;
  const filled: [number, number][] = [];
  const set = new Set<number>();
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      if (data[(y * S + x) * 4 + 3] > 120) {
        filled.push([x, y]);
        set.add(y * S + x);
      }
    }
  }
  if (filled.length === 0) return null;

  // Density-weighted sampling: a serif "V" has one thick and one thin diagonal,
  // so uniform sampling leaves the thin right stroke faint. Weight each pixel
  // inversely to how many neighbors it has so thin strokes and edges get boosted
  // to roughly the same particle density as thick strokes.
  const rnd = seeded(1907);
  const R = 4;
  const keyed = filled.map(([x, y], i) => {
    let cnt = 0;
    for (let dy = -R; dy <= R; dy++) {
      for (let dx = -R; dx <= R; dx++) {
        if (set.has((y + dy) * S + (x + dx))) cnt++;
      }
    }
    const weight = 1 / Math.pow(cnt, 0.7);
    // Efraimidis–Spirakis weighted sampling without replacement
    return { i, k: Math.pow(rnd() || 1e-9, 1 / weight) };
  });
  keyed.sort((a, b) => b.k - a.k);
  const n = Math.min(maxCount, keyed.length);
  const pick = keyed.slice(0, n).map((o) => filled[o.i]);
  const targets = new Float32Array(n * 3);
  const starts = new Float32Array(n * 3);
  const disperse = new Float32Array(n * 3);
  const phases = new Float32Array(n);
  const rand = new Float32Array(n * 3);
  const scale = 8.5 / S;

  for (let i = 0; i < n; i++) {
    const [px, py] = pick[i];
    const tx = (px - S / 2) * scale;
    const ty = -(py - S / 2) * scale;
    // genuine Z-volume so the cloud reads as a 3D object under cursor tilt;
    // most of the mass stays near the face (squared term) so the glyph stays crisp
    const zr = rnd() * 2 - 1;
    targets[i * 3] = tx;
    targets[i * 3 + 1] = ty;
    targets[i * 3 + 2] = Math.sign(zr) * zr * zr * 0.55;

    // scattered start — a loose sphere the glyph condenses out of
    const r = 9 + rnd() * 9;
    const th = rnd() * Math.PI * 2;
    const ph = Math.acos(2 * rnd() - 1);
    starts[i * 3] = Math.sin(ph) * Math.cos(th) * r;
    starts[i * 3 + 1] = Math.cos(ph) * r;
    starts[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * r - 3;

    // dissolve target — letters break apart and stream below the fold
    disperse[i * 3] = tx + (rnd() - 0.5) * 6;
    disperse[i * 3 + 1] = ty - (12 + rnd() * 30);
    disperse[i * 3 + 2] = (rnd() - 0.5) * 4;

    rand[i * 3] = rnd();
    rand[i * 3 + 1] = rnd();
    rand[i * 3 + 2] = rnd();
    phases[i] = rnd() * Math.PI * 2;
  }
  return { n, targets, starts, disperse, phases, rand };
}

interface Motes {
  n: number;
  positions: Float32Array;
  phases: Float32Array;
  rand: Float32Array;
}

/** Drifting dust behind the VB — gives the monogram a real 3D space to float in. */
function makeMotes(n: number): Motes {
  const rnd = seeded(5701);
  const positions = new Float32Array(n * 3);
  const phases = new Float32Array(n);
  const rand = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    positions[i * 3] = (rnd() - 0.5) * 42;
    positions[i * 3 + 1] = (rnd() - 0.5) * 26;
    positions[i * 3 + 2] = -12 + rnd() * 16; // mostly behind the glyph
    phases[i] = rnd() * Math.PI * 2;
    rand[i * 3] = rnd();
    rand[i * 3 + 1] = rnd();
    rand[i * 3 + 2] = rnd();
  }
  return { n, positions, phases, rand };
}

/* ── shared GLSL: Ashima simplex noise + curl (public domain) ─────────────── */
const NOISE = /* glsl */ `
vec3 mod289(vec3 x){return x - floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x - floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
float snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute( permute( permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
          + i.y + vec4(0.0, i1.y, i2.y, 1.0))
          + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
vec3 snoiseVec3(vec3 x){
  return vec3(
    snoise(x),
    snoise(vec3(x.y - 19.1, x.z + 33.4, x.x + 47.2)),
    snoise(vec3(x.z + 74.2, x.x - 124.5, x.y + 99.4))
  );
}
// raw curl (no normalize → never NaN, magnitude varies naturally)
vec3 curlNoise(vec3 p){
  const float e = 0.1;
  vec3 dx = vec3(e,0.0,0.0), dy = vec3(0.0,e,0.0), dz = vec3(0.0,0.0,e);
  vec3 px0 = snoiseVec3(p - dx), px1 = snoiseVec3(p + dx);
  vec3 py0 = snoiseVec3(p - dy), py1 = snoiseVec3(p + dy);
  vec3 pz0 = snoiseVec3(p - dz), pz1 = snoiseVec3(p + dz);
  float x = py1.z - py0.z - pz1.y + pz0.y;
  float y = pz1.x - pz0.x - px1.z + px0.z;
  float z = px1.y - px0.y - py1.x + py0.x;
  return vec3(x, y, z) / (2.0 * e);
}
`;

const VB_VERT = /* glsl */ `
uniform float uTime, uProg, uDissolve, uSignature, uBurst, uSize, uPixelRatio, uFocus, uReduced;
uniform vec3 uNav;
attribute vec3 aStart;
attribute vec3 aDisperse;
attribute float aPhase;
attribute vec3 aRand;
varying float vBright;
varying float vCoc;
varying vec3 vTint;
varying float vAlpha;
${NOISE}
void main(){
  vec3 target = position;
  vec3 p = mix(aStart, target, uProg);

  // organic idle drift once assembled (off under reduced motion)
  float life = uProg * (1.0 - uReduced);
  vec3 flow = curlNoise(target * 0.17 + vec3(0.0, 0.0, uTime * 0.05));
  p += flow * 0.085 * life * (0.55 + aRand.x * 0.9);

  // click shatter — fling out to the scatter sphere and back (sin envelope from JS)
  p = mix(p, aStart, uBurst);

  // scroll: collapse up into the nav wordmark (signature), else legacy dissolve
  p = mix(p, uNav, smoothstep(0.0, 1.0, uSignature));
  p = mix(p, aDisperse, uDissolve);

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float dist = -mv.z;

  // depth-of-field: distance from the focal plane swells + softens points
  float coc = abs(dist - uFocus);
  vCoc = coc;

  float size = uSize * (1.0 + uBurst * 1.4) * (1.0 + coc * 0.14) * (1.0 - uSignature * 0.55);
  gl_PointSize = clamp(size * uPixelRatio * (10.0 / dist), 0.0, 96.0);

  // volume shading: particles nearer than the focal plane read brighter
  float shimmer = 0.82 + 0.18 * sin(uTime * (1.1 + aRand.y) + aPhase * 6.2831);
  float depthB = clamp(0.55 + (uFocus - dist) * 0.5, 0.35, 1.25);
  vBright = depthB * shimmer + uBurst * 0.6;

  // subtle iridescence: cool→warm across the glyph + per-particle hue seed
  float hue = 0.5 + 0.5 * sin(aRand.z * 6.2831 + target.x * 0.22);
  vTint = mix(vec3(0.74, 0.84, 1.0), vec3(1.0, 0.91, 0.76), hue);
  vTint = mix(vTint, vec3(1.0, 0.83, 0.55), uBurst * 0.75); // ember flash on shatter

  vAlpha = (1.0 - uDissolve) * (1.0 - smoothstep(0.55, 1.0, uSignature));

  gl_Position = projectionMatrix * mv;
}
`;

const VB_FRAG = /* glsl */ `
varying float vBright;
varying float vCoc;
varying vec3 vTint;
varying float vAlpha;
void main(){
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  // soft round sprite; edge softens further out of focus (bokeh)
  float soft = mix(0.16, 0.42, clamp(vCoc * 0.08, 0.0, 1.0));
  float a = smoothstep(0.5, soft, d);
  vec3 col = mix(vec3(1.0), vTint, 0.42) * vBright;
  gl_FragColor = vec4(col, a * vAlpha);
}
`;

const MOTE_VERT = /* glsl */ `
uniform float uTime, uSize, uPixelRatio, uFocus;
uniform vec2 uPointer;
attribute float aPhase;
attribute vec3 aRand;
varying float vBright;
varying float vCoc;
${NOISE}
void main(){
  vec3 p = position;
  p += curlNoise(position * 0.05 + vec3(0.0, 0.0, uTime * 0.02)) * 0.6;
  // gentle parallax with the cursor — nearer motes shift more
  float par = 0.3 + aRand.x * 0.9;
  p.x += uPointer.x * par;
  p.y += uPointer.y * par;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float dist = -mv.z;
  float coc = abs(dist - uFocus);
  vCoc = coc;
  float size = uSize * (1.0 + coc * 0.22);
  gl_PointSize = clamp(size * uPixelRatio * (10.0 / dist), 0.0, 80.0);
  float shimmer = 0.5 + 0.5 * sin(uTime * (0.4 + aRand.y) + aPhase * 6.2831);
  vBright = (0.12 + 0.26 * aRand.z) * shimmer / (1.0 + coc * 0.16);
  gl_Position = projectionMatrix * mv;
}
`;

const MOTE_FRAG = /* glsl */ `
varying float vBright;
varying float vCoc;
void main(){
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  float a = smoothstep(0.5, 0.0, d);
  vec3 col = vec3(0.82, 0.88, 1.0) * vBright; // cool dust
  gl_FragColor = vec4(col, a);
}
`;

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

type Pointer = { x: number; y: number; sx: number; sy: number; inside: boolean };

function Monogram({
  cloud,
  reduced,
  scroll,
  groupX,
  groupY,
  camZ,
  pointer,
}: {
  cloud: Cloud;
  reduced: boolean;
  scroll?: MotionValue<number>;
  groupX: number;
  groupY: number;
  camZ: number;
  pointer: React.MutableRefObject<Pointer>;
}) {
  const group = useRef<THREE.Group>(null!);
  const prog = useRef(reduced ? 1 : 0);
  const burstStart = useRef(-100);
  const burstQueued = useRef(false);
  const navRect = useRef<{ x: number; y: number } | null>(null);

  const { geom, material } = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.BufferAttribute(cloud.targets, 3));
    geom.setAttribute("aStart", new THREE.BufferAttribute(cloud.starts, 3));
    geom.setAttribute("aDisperse", new THREE.BufferAttribute(cloud.disperse, 3));
    geom.setAttribute("aPhase", new THREE.BufferAttribute(cloud.phases, 1));
    geom.setAttribute("aRand", new THREE.BufferAttribute(cloud.rand, 3));
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uProg: { value: reduced ? 1 : 0 },
        uDissolve: { value: 0 },
        uSignature: { value: 0 },
        uBurst: { value: 0 },
        uSize: { value: 9.5 },
        uPixelRatio: { value: 1.5 },
        uFocus: { value: camZ },
        uReduced: { value: reduced ? 1 : 0 },
        uNav: { value: new THREE.Vector3(0, 0, 0) },
      },
      vertexShader: VB_VERT,
      fragmentShader: VB_FRAG,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.NormalBlending,
    });
    return { geom, material };
  }, [cloud, reduced, camZ]);

  useEffect(() => {
    return () => {
      geom.dispose();
      material.dispose();
    };
  }, [geom, material]);

  useEffect(() => {
    // click near the monogram shatters it; the frame loop validates the region
    const onDown = () => {
      burstQueued.current = true;
    };
    window.addEventListener("pointerdown", onDown, { passive: true });
    return () => window.removeEventListener("pointerdown", onDown);
  }, []);

  useEffect(() => {
    const read = () => {
      const el = document.querySelector("[data-navmark]") as HTMLElement | null;
      if (!el) {
        navRect.current = null;
        return;
      }
      const r = el.getBoundingClientRect();
      navRect.current = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    };
    read();
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);

  useFrame((state, dt) => {
    if (!reduced) prog.current = Math.min(1, prog.current + dt / 1.7);
    const e = easeOut(prog.current);
    const t = state.clock.elapsedTime;
    const u = material.uniforms;
    const vp = state.viewport;

    u.uTime.value = t;
    u.uProg.value = e;
    u.uPixelRatio.value = state.gl.getPixelRatio();

    // cursor position in the group's local XY (approx — ignores the gentle tilt)
    const clx = pointer.current.sx * (vp.width / 2) - groupX;
    const cly = pointer.current.sy * (vp.height / 2) - groupY;

    // scroll → signature collapse (or a simple fade under reduced motion)
    const sp = scroll ? scroll.get() : 0;
    if (reduced) {
      u.uDissolve.value = Math.min(1, Math.max(0, (sp - 0.1) / 0.5));
      u.uSignature.value = 0;
    } else {
      u.uSignature.value = Math.min(1, Math.max(0, (sp - 0.05) / 0.6));
      u.uDissolve.value = 0;
    }
    const sig = u.uSignature.value as number;

    // click-to-shatter: validate the click landed over the monogram, then fling.
    // ~3s silent cooldown keeps it from being spam-clicked.
    if (burstQueued.current) {
      burstQueued.current = false;
      if (
        Math.abs(clx) < 5.5 &&
        Math.abs(cly) < 4.5 &&
        sig < 0.25 &&
        t - burstStart.current >= 3
      )
        burstStart.current = t;
    }
    const tau = (t - burstStart.current) / 2.2;
    u.uBurst.value = tau >= 0 && tau <= 1 ? Math.sin(Math.PI * tau) : 0;

    // nav-wordmark convergence target, in the group's local space
    let nx: number, ny: number;
    if (navRect.current) {
      const ndcx = (navRect.current.x / window.innerWidth) * 2 - 1;
      const ndcy = -((navRect.current.y / window.innerHeight) * 2 - 1);
      nx = (ndcx * vp.width) / 2 - groupX;
      ny = (ndcy * vp.height) / 2 - groupY;
    } else {
      nx = -vp.width * 0.45 - groupX;
      ny = vp.height * 0.42 - groupY;
    }
    (u.uNav.value as THREE.Vector3).set(nx, ny, 2.0);

    if (group.current && !reduced) {
      // tilt centered on the monogram itself; damps to rest as it collapses away
      const relX = pointer.current.sx - groupX / (vp.width / 2);
      const relY = pointer.current.sy - groupY / (vp.height / 2);
      const damp = 1 - sig;
      group.current.rotation.y +=
        (relX * 0.32 * damp - group.current.rotation.y) * 0.05;
      group.current.rotation.x +=
        (-relY * 0.24 * damp - group.current.rotation.x) * 0.05;
      const s = 1 + Math.sin(t * 0.5) * 0.012;
      group.current.scale.set(s, s, s);
    }
  });

  return (
    <group ref={group} position={[groupX, groupY, 0]}>
      <points geometry={geom} material={material} frustumCulled={false} />
    </group>
  );
}

function Dust({
  motes,
  camZ,
  pointer,
}: {
  motes: Motes;
  camZ: number;
  pointer: React.MutableRefObject<Pointer>;
}) {
  const { geom, material } = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.BufferAttribute(motes.positions, 3));
    geom.setAttribute("aPhase", new THREE.BufferAttribute(motes.phases, 1));
    geom.setAttribute("aRand", new THREE.BufferAttribute(motes.rand, 3));
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uSize: { value: 5.5 },
        uPixelRatio: { value: 1.5 },
        uFocus: { value: camZ },
        uPointer: { value: new THREE.Vector2(0, 0) },
      },
      vertexShader: MOTE_VERT,
      fragmentShader: MOTE_FRAG,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    });
    return { geom, material };
  }, [motes, camZ]);

  useEffect(() => {
    return () => {
      geom.dispose();
      material.dispose();
    };
  }, [geom, material]);

  useFrame((state) => {
    const u = material.uniforms;
    u.uTime.value = state.clock.elapsedTime;
    u.uPixelRatio.value = state.gl.getPixelRatio();
    (u.uPointer.value as THREE.Vector2).set(
      pointer.current.sx,
      pointer.current.sy
    );
  });

  return <points geometry={geom} material={material} frustumCulled={false} />;
}

function Scene({
  cloud,
  motes,
  reduced,
  scroll,
  groupX,
  groupY,
  camZ,
  dust,
}: {
  cloud: Cloud;
  motes: Motes | null;
  reduced: boolean;
  scroll?: MotionValue<number>;
  groupX: number;
  groupY: number;
  camZ: number;
  dust: boolean;
}) {
  const pointer = useRef<Pointer>({ x: 0, y: 0, sx: 0, sy: 0, inside: false });

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    if (!fine) return;
    const onMove = (ev: PointerEvent) => {
      const p = pointer.current;
      p.x = (ev.clientX / window.innerWidth) * 2 - 1;
      p.y = -((ev.clientY / window.innerHeight) * 2 - 1);
      p.inside = true;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  // smooth the pointer once per frame; both layers read the eased value
  useFrame(() => {
    const p = pointer.current;
    p.sx += (p.x - p.sx) * 0.07;
    p.sy += (p.y - p.sy) * 0.07;
  });

  return (
    <>
      {dust && motes && <Dust motes={motes} camZ={camZ} pointer={pointer} />}
      <Monogram
        cloud={cloud}
        reduced={reduced}
        scroll={scroll}
        groupX={groupX}
        groupY={groupY}
        camZ={camZ}
        pointer={pointer}
      />
      {/* glow: let the bright particle cores bleed light against the dark bg */}
      <EffectComposer enableNormalPass={false} multisampling={0}>
        <Bloom
          intensity={0.85}
          luminanceThreshold={0.2}
          luminanceSmoothing={0.5}
          mipmapBlur
          radius={0.72}
        />
      </EffectComposer>
    </>
  );
}

export default function VBParticles({
  reduced,
  scroll,
  active = true,
  groupX = 4.1,
  groupY = 0.5,
  camZ = 14,
  dust = true,
}: {
  reduced: boolean;
  scroll?: MotionValue<number>;
  active?: boolean;
  groupX?: number;
  groupY?: number;
  camZ?: number;
  dust?: boolean;
}) {
  const [cloud, setCloud] = useState<Cloud | null>(null);
  const motes = useMemo(() => (dust ? makeMotes(700) : null), [dust]);

  useEffect(() => {
    let alive = true;
    const build = () => {
      if (!alive) return;
      const c = sampleVB(10000);
      if (c) setCloud(c);
    };
    // sample once Fraunces is ready so the glyph shape is correct
    if (document.fonts?.ready) document.fonts.ready.then(build);
    else build();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="h-full w-full">
      {cloud && (
        <Canvas
          camera={{ position: [0, 0, camZ], fov: 45 }}
          dpr={[1, 1.5]}
          frameloop={active ? "always" : "never"}
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        >
          <Scene
            cloud={cloud}
            motes={motes}
            reduced={reduced}
            scroll={scroll}
            groupX={groupX}
            groupY={groupY}
            camZ={camZ}
            dust={dust}
          />
        </Canvas>
      )}
    </div>
  );
}
