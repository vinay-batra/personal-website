"use client";

import { useEffect, useRef } from "react";
import { getAccent, hexToRgb } from "@/lib/accent";

/**
 * A fixed, full-page flowing-gradient aurora rendered with a single WebGL
 * fragment shader. Deliberately dark and slow — a hint of colored light over
 * the ink, not a light show. Renders at quarter resolution (soft + cheap) and
 * pauses when the tab is hidden, so it never fights scrolling.
 */
const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec3 uAccent;

float hash(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  float a = hash(i), b = hash(i+vec2(1.,0.)), c = hash(i+vec2(0.,1.)), d = hash(i+vec2(1.,1.));
  vec2 u = f*f*(3.-2.*f);
  return mix(a,b,u.x) + (c-a)*u.y*(1.-u.x) + (d-b)*u.x*u.y;
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  for(int i=0;i<5;i++){ v += a*noise(p); p *= 2.0; a *= 0.5; }
  return v;
}

void main(){
  vec2 uv = gl_FragCoord.xy/uRes;
  // On a narrow (portrait) screen the old aspect scaling zoomed the smoke in
  // until one blob filled everything. Clamp the horizontal scale and add detail
  // in portrait so it stays a field of small wisps, like the desktop version.
  float aspect = uRes.x/uRes.y;
  float ax = max(aspect, 1.0);
  float detail = aspect < 1.0 ? 1.5 : 1.0;
  vec2 p = uv*vec2(ax,1.0)*1.6*detail;
  float t = uTime*0.025;

  // domain-warped flow
  vec2 q = vec2(fbm(p + t), fbm(p + vec2(5.2,1.3) - t*0.8));
  float n = fbm(p + 2.2*q + t*0.6);

  // The aurora is driven entirely by the section accent now (no fixed amber /
  // teal / green washes — those tinted every section the same muddy grey-gold).
  vec3 ink = vec3(0.05,0.05,0.06);
  vec3 col = ink;
  // a faint neutral structure so the smoke still reads where the accent is white
  col += vec3(0.09,0.10,0.12) * smoothstep(0.45,1.0,n) * 0.7;
  // section accent wash — the dominant hue, clearly visible, follows the section
  col += uAccent * smoothstep(0.36,1.0, n)        * 0.5;
  col += uAccent * smoothstep(0.52,1.0, q.x)      * 0.30;
  col += uAccent * smoothstep(0.6, 1.05, q.y*1.2) * 0.22;

  // keep edges dark
  float vig = smoothstep(1.25,0.25,length(uv-0.5));
  col = mix(ink, col, vig);

  gl_FragColor = vec4(col,1.0);
}
`;

const VERT = `attribute vec2 a; void main(){ gl_Position = vec4(a,0.0,1.0); }`;

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  return s;
}

export default function Aurora() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const gl = cv.getContext("webgl", { alpha: false, antialias: false });
    if (!gl) return;

    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW
    );
    const loc = gl.getAttribLocation(prog, "a");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, "uRes");
    const uTime = gl.getUniformLocation(prog, "uTime");
    const uAccent = gl.getUniformLocation(prog, "uAccent");
    const accent = hexToRgb(getAccent()); // current shown color, eased each frame

    const SCALE = 0.4; // quarter-ish resolution — soft and cheap
    const resize = () => {
      const w = Math.max(1, Math.floor(window.innerWidth * SCALE));
      const h = Math.max(1, Math.floor(window.innerHeight * SCALE));
      cv.width = w;
      cv.height = h;
      gl.viewport(0, 0, w, h);
      gl.uniform2f(uRes, w, h);
    };
    resize();
    window.addEventListener("resize", resize);

    let raf = 0;
    let hidden = false;
    const onVis = () => (hidden = document.hidden);
    document.addEventListener("visibilitychange", onVis);

    const loop = (ts: number) => {
      raf = requestAnimationFrame(loop);
      if (hidden) return;
      const target = hexToRgb(getAccent());
      accent[0] += (target[0] - accent[0]) * 0.04;
      accent[1] += (target[1] - accent[1]) * 0.04;
      accent[2] += (target[2] - accent[2]) * 0.04;
      gl.uniform3f(uAccent, accent[0], accent[1], accent[2]);
      gl.uniform1f(uTime, ts / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVis);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 h-full w-full opacity-45 md:opacity-100"
      style={{ filter: "blur(1px)" }}
    />
  );
}
