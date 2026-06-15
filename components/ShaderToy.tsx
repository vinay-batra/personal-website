"use client";

import { useEffect, useRef, type MutableRefObject } from "react";

/**
 * A tiny raw-WebGL2 fullscreen-fragment-shader player — the engine behind the
 * playground's lava + kaleidoscope toys.
 *
 * Built-in uniforms: uTime, uRes, uMouse (0..1, y up), uDown (0/1),
 * uDrag (accumulated drag).
 *
 * Optional live wiring (no remount, read every frame):
 *  - paramsRef:  Record<name, number | number[2..4]>  → scalar / vec uniforms
 *  - arraysRef:  Record<name, {data, size}>           → vecN array uniforms
 *  - simRef:     (state) => void                       → a CPU sim step run each
 *      frame before draw, given the live pointer state, so a toy can push real
 *      geometry around (the lava metaballs use this).
 */

export type ToyParams = Record<string, number | number[]>;
export type ToyArrays = Record<string, { data: Float32Array; size: number }>;
export interface ToySimState {
  mx: number; // 0..1, y up
  my: number;
  down: number;
  vx: number; // pointer delta this frame, in uv
  vy: number;
  dt: number; // seconds
  aspect: number; // canvas w/h
}
export type ToySim = (s: ToySimState) => void;

interface Props {
  frag: string;
  name?: string;
  paramsRef?: MutableRefObject<ToyParams>;
  arraysRef?: MutableRefObject<ToyArrays>;
  simRef?: MutableRefObject<ToySim | null>;
}

const VERT = `
  precision highp float;
  attribute vec2 aPos;
  void main () { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

// ---- lava: CPU-driven metaballs, the blobs come in as a uniform array ----
export const LAVA_FRAG = `
  precision highp float;
  #define N 12
  uniform vec2 uRes;
  uniform vec3 uBlobs[N];   // x, y (aspect-space), radius
  uniform vec3 uColA;       // deep
  uniform vec3 uColB;       // mid
  uniform vec3 uColC;       // hot
  uniform float uHeat;
  vec3 ramp(float t) {
    vec3 c = mix(uColA * 0.12, uColA, smoothstep(0.0, 0.42, t));
    c = mix(c, uColB, smoothstep(0.40, 0.72, t));
    c = mix(c, uColC, smoothstep(0.72, 1.0, t));
    return c;
  }
  void main () {
    vec2 uv = gl_FragCoord.xy / uRes.xy;
    float aspect = uRes.x / uRes.y;
    vec2 p = vec2(uv.x * aspect, uv.y);
    float field = 0.0;
    for (int i = 0; i < N; i++) {
      vec2 d = p - uBlobs[i].xy;
      float r = uBlobs[i].z;
      field += (r * r) / max(dot(d, d), 1e-4);
    }
    field *= uHeat;
    float t = smoothstep(0.35, 3.0, field);
    vec3 col = ramp(t);
    col += smoothstep(2.6, 4.8, field) * 0.45; // white-hot cores
    gl_FragColor = vec4(col, 1.0);
  }
`;

export const KALEIDO_FRAG = `
  precision highp float;
  uniform vec2 uRes;
  uniform float uTime;
  uniform vec2 uMouse;
  uniform vec2 uDrag;
  uniform float uSeg;
  uniform float uSpin;
  uniform float uZoom;
  uniform vec3 uColA;
  uniform vec3 uColB;
  uniform vec3 uColC;
  #define PI 3.14159265
  void main () {
    vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / min(uRes.x, uRes.y);
    float ang = atan(uv.y, uv.x);
    float rad = length(uv);
    float seg = max(2.0, uSeg);
    ang = mod(ang + uDrag.x * 3.0 + uTime * uSpin, 2.0 * PI / seg);
    ang = abs(ang - PI / seg);
    vec2 p = vec2(cos(ang), sin(ang)) * rad * uZoom;
    p += 0.15 * (uMouse - 0.5);
    float v = 0.0;
    for (int i = 0; i < 3; i++) {
      float fi = float(i) + 1.0;
      v += sin(p.x * 7.0 * fi + uTime * 0.6) * cos(p.y * 7.0 * fi - uTime * 0.45) / fi;
    }
    v += 0.6 * sin(rad * 16.0 - uTime * 1.1);
    vec3 col = mix(uColA, uColB, 0.5 + 0.5 * sin(v * 3.0));
    col = mix(col, uColC, 0.5 + 0.5 * cos(v * 2.0 + rad * 5.0));
    col *= 0.55 + 0.6 * smoothstep(-0.3, 0.9, v);
    col *= smoothstep(1.15, 0.15, rad);
    gl_FragColor = vec4(col, 1.0);
  }
`;

export default function ShaderToy({ frag, name, paramsRef, arraysRef, simRef }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const gl = canvas.getContext("webgl2", { alpha: true, antialias: true, premultipliedAlpha: false });
    if (!gl) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
        console.error("[toy] shader:", gl.getShaderInfoLog(s));
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, frag));
    gl.bindAttribLocation(prog, 0, "aPos");
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS))
      console.error("[toy] link:", gl.getProgramInfoLog(prog));
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(prog, "uTime");
    const uRes = gl.getUniformLocation(prog, "uRes");
    const uMouse = gl.getUniformLocation(prog, "uMouse");
    const uDown = gl.getUniformLocation(prog, "uDown");
    const uDrag = gl.getUniformLocation(prog, "uDrag");

    // cached lookups for the optional params/arrays
    const locs = new Map<string, WebGLUniformLocation | null>();
    const getLoc = (key: string) => {
      if (!locs.has(key)) locs.set(key, gl.getUniformLocation(prog, key));
      return locs.get(key)!;
    };
    const setParams = () => {
      const p = paramsRef?.current;
      if (!p) return;
      for (const k in p) {
        const loc = getLoc(k);
        if (!loc) continue;
        const v = p[k];
        if (typeof v === "number") gl.uniform1f(loc, v);
        else if (v.length === 2) gl.uniform2f(loc, v[0], v[1]);
        else if (v.length === 3) gl.uniform3f(loc, v[0], v[1], v[2]);
        else if (v.length === 4) gl.uniform4f(loc, v[0], v[1], v[2], v[3]);
      }
    };
    const uploadArrays = () => {
      const a = arraysRef?.current;
      if (!a) return;
      for (const k in a) {
        const loc = getLoc(`${k}[0]`);
        if (!loc) continue;
        const { data, size } = a[k];
        if (size === 1) gl.uniform1fv(loc, data);
        else if (size === 2) gl.uniform2fv(loc, data);
        else if (size === 3) gl.uniform3fv(loc, data);
        else if (size === 4) gl.uniform4fv(loc, data);
      }
    };

    const st = { mx: 0.5, my: 0.5, down: 0, dragX: 0, dragY: 0, dragging: false, lx: 0, ly: 0, pmx: 0.5, pmy: 0.5 };

    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      st.mx = (e.clientX - r.left) / r.width;
      st.my = 1 - (e.clientY - r.top) / r.height;
      if (st.dragging) {
        st.dragX += (e.clientX - st.lx) / r.width;
        st.dragY += (e.clientY - st.ly) / r.height;
        st.lx = e.clientX;
        st.ly = e.clientY;
      }
    };
    const onDown = (e: PointerEvent) => {
      st.down = 1;
      st.dragging = true;
      st.lx = e.clientX;
      st.ly = e.clientY;
      canvas.setPointerCapture?.(e.pointerId);
    };
    const onUp = () => {
      st.down = 0;
      st.dragging = false;
    };
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointerleave", onUp);

    const resize = () => {
      const w = Math.round(wrap.clientWidth * dpr);
      const h = Math.round(wrap.clientHeight * dpr);
      if (w === 0 || h === 0 || (canvas.width === w && canvas.height === h)) return;
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    resize();

    let onScreen = true;
    const io = new IntersectionObserver(([e]) => (onScreen = e.isIntersecting), { threshold: 0 });
    io.observe(wrap);

    const t0 = performance.now();
    let prev = t0;
    const draw = () => {
      resize();
      const now = performance.now();
      const dt = Math.min(0.05, (now - prev) / 1000);
      prev = now;
      const aspect = canvas.width / canvas.height || 1;
      const vx = st.mx - st.pmx;
      const vy = st.my - st.pmy;
      st.pmx = st.mx;
      st.pmy = st.my;
      simRef?.current?.({ mx: st.mx, my: st.my, down: st.down, vx, vy, dt, aspect });
      gl.uniform1f(uTime, (now - t0) / 1000);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform2f(uMouse, st.mx, st.my);
      gl.uniform1f(uDown, st.down);
      gl.uniform2f(uDrag, st.dragX, st.dragY);
      setParams();
      uploadArrays();
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    let raf = 0;
    const loop = () => {
      if (onScreen && !document.hidden) draw();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const key = name ? `__toy_${name}` : null;
    if (key) {
      (window as unknown as Record<string, unknown>)[key] = () => {
        draw();
        const w = canvas.width, h = canvas.height;
        const px = new Uint8Array(4);
        gl.readPixels((w / 2) | 0, (h / 2) | 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
        return { center: [px[0], px[1], px[2], px[3]], size: [w, h], glError: gl.getError() };
      };
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointerleave", onUp);
      if (key) delete (window as unknown as Record<string, unknown>)[key];
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [frag, name, paramsRef, arraysRef, simRef]);

  return (
    <div ref={wrapRef} className="relative h-full w-full">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full touch-none" />
    </div>
  );
}
