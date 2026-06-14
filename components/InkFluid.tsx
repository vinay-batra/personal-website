"use client";

import { useEffect, useRef } from "react";

/**
 * Stirred ink — a real GPU fluid simulation (Stable Fluids: semi-Lagrangian
 * advection, Jacobi pressure projection, vorticity confinement) on a raw WebGL2
 * context, the same approach as Aurora.tsx. Move the cursor to inject velocity
 * + dye; ink swirls and dissipates through the dark.
 *
 * Canvas-only engine: the parent supplies the framed box + the live params.
 */

// live, user-tweakable params (driven by the Playground controls)
export interface InkParams {
  curl: number; // vorticity — swirliness
  density: number; // dye dissipation per step (→1 = lingers)
  force: number; // splat force from cursor movement
  colorA: [number, number, number];
  colorB: [number, number, number];
}
export const DEFAULT_INK: InkParams = {
  curl: 30,
  density: 0.97,
  force: 6200,
  colorA: [0.91, 0.64, 0.24], // amber
  colorB: [0.5, 0.66, 0.73], // sheen teal
};

// fixed quality/perf settings
const SIM_RESOLUTION = 128;
const DYE_RESOLUTION = 600;
const VELOCITY_DISSIPATION = 0.2;
const PRESSURE_ITERATIONS = 22;
const SPLAT_RADIUS = 0.2;

const BASE_VERT = `
  precision highp float;
  attribute vec2 aPosition;
  varying vec2 vUv; varying vec2 vL; varying vec2 vR; varying vec2 vT; varying vec2 vB;
  uniform vec2 texelSize;
  void main () {
    vUv = aPosition * 0.5 + 0.5;
    vL = vUv - vec2(texelSize.x, 0.0);
    vR = vUv + vec2(texelSize.x, 0.0);
    vT = vUv + vec2(0.0, texelSize.y);
    vB = vUv - vec2(0.0, texelSize.y);
    gl_Position = vec4(aPosition, 0.0, 1.0);
  }
`;

const SPLAT_FRAG = `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uTarget;
  uniform float aspectRatio;
  uniform vec3 color;
  uniform vec2 point;
  uniform float radius;
  void main () {
    vec2 p = vUv - point.xy;
    p.x *= aspectRatio;
    vec3 splat = exp(-dot(p, p) / radius) * color;
    vec3 base = texture2D(uTarget, vUv).xyz;
    gl_FragColor = vec4(base + splat, 1.0);
  }
`;

const ADVECTION_FRAG = `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uVelocity;
  uniform sampler2D uSource;
  uniform vec2 texelSize;
  uniform float dt;
  uniform float dissipation;
  void main () {
    vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
    gl_FragColor = dissipation * texture2D(uSource, coord);
    gl_FragColor.a = 1.0;
  }
`;

const DIVERGENCE_FRAG = `
  precision mediump float;
  varying vec2 vUv; varying vec2 vL; varying vec2 vR; varying vec2 vT; varying vec2 vB;
  uniform sampler2D uVelocity;
  void main () {
    float L = texture2D(uVelocity, vL).x;
    float R = texture2D(uVelocity, vR).x;
    float T = texture2D(uVelocity, vT).y;
    float B = texture2D(uVelocity, vB).y;
    vec2 C = texture2D(uVelocity, vUv).xy;
    if (vL.x < 0.0) { L = -C.x; }
    if (vR.x > 1.0) { R = -C.x; }
    if (vT.y > 1.0) { T = -C.y; }
    if (vB.y < 0.0) { B = -C.y; }
    float div = 0.5 * (R - L + T - B);
    gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
  }
`;

const CURL_FRAG = `
  precision mediump float;
  varying vec2 vUv; varying vec2 vL; varying vec2 vR; varying vec2 vT; varying vec2 vB;
  uniform sampler2D uVelocity;
  void main () {
    float L = texture2D(uVelocity, vL).y;
    float R = texture2D(uVelocity, vR).y;
    float T = texture2D(uVelocity, vT).x;
    float B = texture2D(uVelocity, vB).x;
    float vorticity = R - L - T + B;
    gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
  }
`;

const VORTICITY_FRAG = `
  precision highp float;
  varying vec2 vUv; varying vec2 vL; varying vec2 vR; varying vec2 vT; varying vec2 vB;
  uniform sampler2D uVelocity;
  uniform sampler2D uCurl;
  uniform float curl;
  uniform float dt;
  void main () {
    float L = texture2D(uCurl, vL).x;
    float R = texture2D(uCurl, vR).x;
    float T = texture2D(uCurl, vT).x;
    float B = texture2D(uCurl, vB).x;
    float C = texture2D(uCurl, vUv).x;
    vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
    force /= length(force) + 0.0001;
    force *= curl * C;
    force.y *= -1.0;
    vec2 vel = texture2D(uVelocity, vUv).xy;
    vel += force * dt;
    vel = min(max(vel, -1000.0), 1000.0);
    gl_FragColor = vec4(vel, 0.0, 1.0);
  }
`;

const PRESSURE_FRAG = `
  precision mediump float;
  varying vec2 vUv; varying vec2 vL; varying vec2 vR; varying vec2 vT; varying vec2 vB;
  uniform sampler2D uPressure;
  uniform sampler2D uDivergence;
  void main () {
    float L = texture2D(uPressure, vL).x;
    float R = texture2D(uPressure, vR).x;
    float T = texture2D(uPressure, vT).x;
    float B = texture2D(uPressure, vB).x;
    float divergence = texture2D(uDivergence, vUv).x;
    float pressure = (L + R + B + T - divergence) * 0.25;
    gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
  }
`;

const GRADIENT_FRAG = `
  precision mediump float;
  varying vec2 vUv; varying vec2 vL; varying vec2 vR; varying vec2 vT; varying vec2 vB;
  uniform sampler2D uPressure;
  uniform sampler2D uVelocity;
  void main () {
    float L = texture2D(uPressure, vL).x;
    float R = texture2D(uPressure, vR).x;
    float T = texture2D(uPressure, vT).x;
    float B = texture2D(uPressure, vB).x;
    vec2 velocity = texture2D(uVelocity, vUv).xy;
    velocity -= 0.5 * vec2(R - L, T - B);
    gl_FragColor = vec4(velocity, 0.0, 1.0);
  }
`;

const DISPLAY_FRAG = `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uTexture;
  void main () {
    vec3 c = texture2D(uTexture, vUv).rgb;
    c = 1.0 - exp(-c * 1.7);
    float a = clamp(max(c.r, max(c.g, c.b)) * 1.12, 0.0, 1.0);
    gl_FragColor = vec4(c, a);
  }
`;

type FBO = {
  texture: WebGLTexture;
  fbo: WebGLFramebuffer;
  width: number;
  height: number;
  texelSizeX: number;
  texelSizeY: number;
  attach: (id: number) => number;
};
type DoubleFBO = {
  width: number;
  height: number;
  texelSizeX: number;
  texelSizeY: number;
  read: FBO;
  write: FBO;
  swap: () => void;
};

export default function InkCanvas({
  paramsRef,
  clearRef,
}: {
  paramsRef: { current: InkParams };
  clearRef?: { current: (() => void) | null };
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const gl = canvas.getContext("webgl2", {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
    });
    if (!gl) return;
    if (!gl.getExtension("EXT_color_buffer_float")) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS))
        console.error("[ink] shader:", gl.getShaderInfoLog(sh));
      return sh;
    };
    const baseVert = compile(gl.VERTEX_SHADER, BASE_VERT);
    const program = (fragSrc: string) => {
      const p = gl.createProgram()!;
      gl.attachShader(p, baseVert);
      gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fragSrc));
      gl.bindAttribLocation(p, 0, "aPosition");
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS))
        console.error("[ink] link:", gl.getProgramInfoLog(p));
      const uniforms: Record<string, WebGLUniformLocation | null> = {};
      const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
      for (let i = 0; i < n; i++) {
        const name = gl.getActiveUniform(p, i)!.name;
        uniforms[name] = gl.getUniformLocation(p, name);
      }
      return { program: p, uniforms };
    };

    const splatP = program(SPLAT_FRAG);
    const advectionP = program(ADVECTION_FRAG);
    const divergenceP = program(DIVERGENCE_FRAG);
    const curlP = program(CURL_FRAG);
    const vorticityP = program(VORTICITY_FRAG);
    const pressureP = program(PRESSURE_FRAG);
    const gradientP = program(GRADIENT_FRAG);
    const displayP = program(DISPLAY_FRAG);

    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
    const idx = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idx);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);

    const blit = (target: FBO | null) => {
      if (target) {
        gl.viewport(0, 0, target.width, target.height);
        gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
      } else {
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      }
      gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    };

    const createFBO = (w: number, h: number): FBO => {
      gl.activeTexture(gl.TEXTURE0);
      const texture = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
      const fbo = gl.createFramebuffer()!;
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
      gl.viewport(0, 0, w, h);
      gl.clear(gl.COLOR_BUFFER_BIT);
      return {
        texture,
        fbo,
        width: w,
        height: h,
        texelSizeX: 1 / w,
        texelSizeY: 1 / h,
        attach(id: number) {
          gl.activeTexture(gl.TEXTURE0 + id);
          gl.bindTexture(gl.TEXTURE_2D, texture);
          return id;
        },
      };
    };
    const createDoubleFBO = (w: number, h: number): DoubleFBO => {
      let a = createFBO(w, h);
      let b = createFBO(w, h);
      return {
        width: w,
        height: h,
        texelSizeX: 1 / w,
        texelSizeY: 1 / h,
        get read() {
          return a;
        },
        set read(v) {
          a = v;
        },
        get write() {
          return b;
        },
        set write(v) {
          b = v;
        },
        swap() {
          const t = a;
          a = b;
          b = t;
        },
      };
    };

    let dye: DoubleFBO, velocity: DoubleFBO, divergence: FBO, curl: FBO, pressure: DoubleFBO;
    let simW = 0;
    let ready = false;
    let seeded = false;

    const getRes = (res: number) => {
      let aspect = gl.drawingBufferWidth / gl.drawingBufferHeight;
      if (aspect < 1) aspect = 1 / aspect;
      const min = Math.round(res);
      const max = Math.round(res * aspect);
      return gl.drawingBufferWidth > gl.drawingBufferHeight
        ? { width: max, height: min }
        : { width: min, height: max };
    };

    const initFBOs = () => {
      const sim = getRes(SIM_RESOLUTION);
      const d = getRes(DYE_RESOLUTION);
      simW = sim.width;
      dye = createDoubleFBO(d.width, d.height);
      velocity = createDoubleFBO(sim.width, sim.height);
      divergence = createFBO(sim.width, sim.height);
      curl = createFBO(sim.width, sim.height);
      pressure = createDoubleFBO(sim.width, sim.height);
      ready = true;
    };

    const resize = () => {
      const cw = wrap.clientWidth;
      const ch = wrap.clientHeight;
      if (cw === 0 || ch === 0) return;
      const w = Math.round(cw * dpr);
      const h = Math.round(ch * dpr);
      if (canvas.width === w && canvas.height === h && simW) return;
      canvas.width = w;
      canvas.height = h;
      initFBOs();
    };

    const splat = (x: number, y: number, dx: number, dy: number, color: [number, number, number]) => {
      if (!ready) return;
      gl.useProgram(splatP.program);
      gl.uniform1i(splatP.uniforms.uTarget, velocity.read.attach(0));
      gl.uniform1f(splatP.uniforms.aspectRatio, canvas.width / canvas.height);
      gl.uniform2f(splatP.uniforms.point, x, y);
      gl.uniform3f(splatP.uniforms.color, dx, dy, 0);
      gl.uniform1f(splatP.uniforms.radius, SPLAT_RADIUS / 100);
      blit(velocity.write);
      velocity.swap();

      gl.uniform1i(splatP.uniforms.uTarget, dye.read.attach(0));
      gl.uniform3f(splatP.uniforms.color, color[0], color[1], color[2]);
      blit(dye.write);
      dye.swap();
    };

    const step = (dt: number) => {
      if (!ready) return;
      const P = paramsRef.current;
      gl.disable(gl.BLEND);

      gl.useProgram(curlP.program);
      gl.uniform2f(curlP.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
      gl.uniform1i(curlP.uniforms.uVelocity, velocity.read.attach(0));
      blit(curl);

      gl.useProgram(vorticityP.program);
      gl.uniform2f(vorticityP.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
      gl.uniform1i(vorticityP.uniforms.uVelocity, velocity.read.attach(0));
      gl.uniform1i(vorticityP.uniforms.uCurl, curl.attach(1));
      gl.uniform1f(vorticityP.uniforms.curl, P.curl);
      gl.uniform1f(vorticityP.uniforms.dt, dt);
      blit(velocity.write);
      velocity.swap();

      gl.useProgram(divergenceP.program);
      gl.uniform2f(divergenceP.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
      gl.uniform1i(divergenceP.uniforms.uVelocity, velocity.read.attach(0));
      blit(divergence);

      gl.useProgram(pressureP.program);
      gl.uniform2f(pressureP.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
      gl.uniform1i(pressureP.uniforms.uDivergence, divergence.attach(0));
      gl.bindFramebuffer(gl.FRAMEBUFFER, pressure.read.fbo);
      gl.clear(gl.COLOR_BUFFER_BIT);
      for (let i = 0; i < PRESSURE_ITERATIONS; i++) {
        gl.uniform1i(pressureP.uniforms.uPressure, pressure.read.attach(1));
        blit(pressure.write);
        pressure.swap();
      }

      gl.useProgram(gradientP.program);
      gl.uniform2f(gradientP.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
      gl.uniform1i(gradientP.uniforms.uPressure, pressure.read.attach(0));
      gl.uniform1i(gradientP.uniforms.uVelocity, velocity.read.attach(1));
      blit(velocity.write);
      velocity.swap();

      gl.useProgram(advectionP.program);
      gl.uniform2f(advectionP.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
      gl.uniform1f(advectionP.uniforms.dt, dt);
      gl.uniform1i(advectionP.uniforms.uVelocity, velocity.read.attach(0));
      gl.uniform1i(advectionP.uniforms.uSource, velocity.read.attach(0));
      gl.uniform1f(advectionP.uniforms.dissipation, Math.max(0, 1 - VELOCITY_DISSIPATION * dt));
      blit(velocity.write);
      velocity.swap();

      gl.uniform1i(advectionP.uniforms.uVelocity, velocity.read.attach(0));
      gl.uniform1i(advectionP.uniforms.uSource, dye.read.attach(1));
      gl.uniform1f(advectionP.uniforms.dissipation, P.density);
      blit(dye.write);
      dye.swap();
    };

    const render = () => {
      if (!ready) return;
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(displayP.program);
      gl.uniform1i(displayP.uniforms.uTexture, dye.read.attach(0));
      blit(null);
    };

    const clearDye = () => {
      if (!ready) return;
      for (const f of [dye.read, dye.write]) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, f.fbo);
        gl.clear(gl.COLOR_BUFFER_BIT);
      }
    };
    if (clearRef) clearRef.current = clearDye;

    // amber↔teal (or whatever palette the controls set) over time
    const palette = (t: number): [number, number, number] => {
      const P = paramsRef.current;
      const m = 0.5 + 0.5 * Math.sin(t * 0.0006);
      return [
        (P.colorA[0] * (1 - m) + P.colorB[0] * m) * 0.22,
        (P.colorA[1] * (1 - m) + P.colorB[1] * m) * 0.22,
        (P.colorA[2] * (1 - m) + P.colorB[2] * m) * 0.22,
      ];
    };
    const ptr = { px: 0, py: 0, has: false };
    const queue: (() => void)[] = [];
    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = 1 - (e.clientY - r.top) / r.height;
      if (ptr.has) {
        const f = paramsRef.current.force;
        const dx = (x - ptr.px) * f;
        const dy = (y - ptr.py) * f;
        if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) {
          const col = palette(performance.now());
          queue.push(() => splat(x, y, dx, dy, col));
        }
      }
      ptr.px = x;
      ptr.py = y;
      ptr.has = true;
    };
    const onLeave = () => {
      ptr.has = false;
    };
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerleave", onLeave);

    const seed = () => {
      for (let i = 0; i < 3; i++) {
        const x = 0.25 + 0.5 * ((i * 0.37 + 0.2) % 1);
        const y = 0.4 + 0.25 * Math.sin(i * 2.1);
        const col = palette(i * 1700);
        splat(x, y, Math.sin(i) * 600, Math.cos(i) * 600, [col[0] * 3, col[1] * 3, col[2] * 3]);
      }
    };

    let active = true;
    const io = new IntersectionObserver(([e]) => (active = e.isIntersecting), { threshold: 0 });
    io.observe(wrap);
    const ro = new ResizeObserver(() => resize());
    ro.observe(wrap);
    resize();

    let raf = 0;
    let lastT = performance.now();
    const frame = () => {
      const now = performance.now();
      let dt = (now - lastT) / 1000;
      lastT = now;
      dt = Math.min(dt, 0.0166);
      resize();
      if (ready && !seeded) {
        seeded = true;
        seed();
      }
      if (active && ready) {
        let q = queue.shift();
        while (q) {
          q();
          q = queue.shift();
        }
        step(dt);
        render();
      } else {
        queue.length = 0;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const onResize = () => resize();
    window.addEventListener("resize", onResize);

    // verification hook (preview pauses rAF; this drives the sim synchronously)
    (window as unknown as Record<string, unknown>).__inkProbe = () => {
      resize();
      if (!ready) return { notReady: true, clientW: wrap.clientWidth, clientH: wrap.clientHeight };
      splat(0.5, 0.5, 1200, 900, [3, 2, 1]);
      for (let i = 0; i < 16; i++) step(0.0166);
      render();
      const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
      const px = new Uint8Array(w * h * 4);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
      let maxA = 0, lit = 0;
      for (let yy = 0; yy < h; yy += 4)
        for (let xx = 0; xx < w; xx += 4) {
          const a = px[(yy * w + xx) * 4 + 3];
          if (a > 10) lit++;
          if (a > maxA) maxA = a;
        }
      return { maxAlpha: maxA, litSamples: lit, drawingBuffer: [w, h], glError: gl.getError() };
    };

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      window.removeEventListener("resize", onResize);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
      if (clearRef) clearRef.current = null;
      delete (window as unknown as Record<string, unknown>).__inkProbe;
      const lose = gl.getExtension("WEBGL_lose_context");
      lose?.loseContext();
    };
  }, [paramsRef, clearRef]);

  return (
    <div ref={wrapRef} className="relative h-full w-full">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full touch-none" />
    </div>
  );
}
