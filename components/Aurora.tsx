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
  vec2 p = uv*vec2(uRes.x/uRes.y,1.0)*1.6;
  float t = uTime*0.025;

  // domain-warped flow
  vec2 q = vec2(fbm(p + t), fbm(p + vec2(5.2,1.3) - t*0.8));
  float n = fbm(p + 2.2*q + t*0.6);

  vec3 ink   = vec3(0.059,0.051,0.039);
  vec3 amber = vec3(0.91,0.64,0.24);
  vec3 teal  = vec3(0.53,0.65,0.71);
  vec3 emer  = vec3(0.36,0.72,0.54);
  vec3 viol  = vec3(0.55,0.36,0.96);

  vec3 col = ink;
  col += amber * smoothstep(0.45,0.95,n)        * 0.16;
  col += teal  * smoothstep(0.55,1.0, q.x)       * 0.12;
  col += emer  * smoothstep(0.6, 1.0, q.y)       * 0.10;
  col += viol  * smoothstep(0.65,1.05,n*q.x*1.5) * 0.10;

  // section accent wash — tints the brightest part of the flow toward the
  // hue of whatever section the reader is on, lerped smoothly on the JS side
  col += uAccent * smoothstep(0.5,1.05,n) * 0.18;

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
      className="pointer-events-none fixed inset-0 z-0 h-full w-full"
      style={{ filter: "blur(1px)" }}
    />
  );
}
