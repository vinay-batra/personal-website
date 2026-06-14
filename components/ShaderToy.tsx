"use client";

import { useEffect, useRef } from "react";

/**
 * A tiny raw-WebGL2 fullscreen-fragment-shader player — the engine behind the
 * playground's metaballs + kaleidoscope toys. Uniforms: uTime, uRes, uMouse
 * (0..1, y up), uDown (0/1), uDrag (accumulated drag). Pauses when off-screen.
 */
const VERT = `
  precision highp float;
  attribute vec2 aPos;
  void main () { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

export const METABALLS_FRAG = `
  precision highp float;
  uniform vec2 uRes;
  uniform float uTime;
  uniform vec2 uMouse;
  uniform float uDown;
  void main () {
    vec2 uv = gl_FragCoord.xy / uRes.xy;
    float aspect = uRes.x / uRes.y;
    vec2 p = vec2(uv.x * aspect, uv.y);
    float field = 0.0;
    for (int i = 0; i < 7; i++) {
      float fi = float(i);
      vec2 c = vec2(
        (0.5 + 0.33 * cos(uTime * 0.4 + fi * 1.7)) * aspect,
         0.5 + 0.33 * sin(uTime * 0.33 + fi * 2.1)
      );
      float rad = 0.085 + 0.03 * sin(uTime * 0.8 + fi * 1.3);
      vec2 d = p - c;
      field += (rad * rad) / dot(d, d);
    }
    vec2 m = vec2(uMouse.x * aspect, uMouse.y);
    vec2 dm = p - m;
    float mr = 0.12 + uDown * 0.10;
    field += (mr * mr) / dot(dm, dm);

    float edge = smoothstep(0.92, 1.08, field);
    float core = smoothstep(1.0, 2.6, field);
    vec3 purple = vec3(0.50, 0.18, 0.85);
    vec3 amber = vec3(0.97, 0.58, 0.20);
    vec3 col = mix(purple, amber, core);
    float rim = exp(-pow((field - 1.0) * 3.2, 2.0));
    col += rim * vec3(0.8, 0.5, 1.0) * 0.6;
    col *= 0.35 + edge * 1.0;
    float a = smoothstep(0.9, 1.02, field);
    gl_FragColor = vec4(col, a);
  }
`;

export const KALEIDO_FRAG = `
  precision highp float;
  uniform vec2 uRes;
  uniform float uTime;
  uniform vec2 uMouse;
  uniform vec2 uDrag;
  #define PI 3.14159265
  void main () {
    vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / min(uRes.x, uRes.y);
    float ang = atan(uv.y, uv.x);
    float rad = length(uv);
    float seg = 8.0;
    ang = mod(ang + uDrag.x * 3.0 + uTime * 0.08, 2.0 * PI / seg);
    ang = abs(ang - PI / seg);
    vec2 p = vec2(cos(ang), sin(ang)) * rad;
    p += 0.15 * (uMouse - 0.5);
    float v = 0.0;
    for (int i = 0; i < 3; i++) {
      float fi = float(i) + 1.0;
      v += sin(p.x * 7.0 * fi + uTime * 0.6) * cos(p.y * 7.0 * fi - uTime * 0.45) / fi;
    }
    v += 0.6 * sin(rad * 16.0 - uTime * 1.1);
    vec3 purple = vec3(0.45, 0.20, 0.80);
    vec3 teal = vec3(0.18, 0.62, 0.74);
    vec3 amber = vec3(0.96, 0.60, 0.24);
    vec3 col = mix(purple, teal, 0.5 + 0.5 * sin(v * 3.0));
    col = mix(col, amber, 0.5 + 0.5 * cos(v * 2.0 + rad * 5.0));
    col *= 0.55 + 0.6 * smoothstep(-0.3, 0.9, v);
    col *= smoothstep(1.15, 0.15, rad);
    gl_FragColor = vec4(col, 1.0);
  }
`;

export default function ShaderToy({ frag, name }: { frag: string; name?: string }) {
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

    const st = { mx: 0.5, my: 0.5, down: 0, dragX: 0, dragY: 0, dragging: false, lx: 0, ly: 0 };

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
    const draw = () => {
      resize();
      gl.uniform1f(uTime, (performance.now() - t0) / 1000);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform2f(uMouse, st.mx, st.my);
      gl.uniform1f(uDown, st.down);
      gl.uniform2f(uDrag, st.dragX, st.dragY);
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
  }, [frag, name]);

  return (
    <div ref={wrapRef} className="relative h-full w-full">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full touch-none" />
    </div>
  );
}
