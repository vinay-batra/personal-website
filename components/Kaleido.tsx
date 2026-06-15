"use client";

import { useEffect, useRef, type MutableRefObject } from "react";
import ShaderToy, { KALEIDO_FRAG, type ToyParams, type ToySim } from "./ShaderToy";

/**
 * Kaleidoscope with an intuitive spin: grab anywhere and turn it like a wheel
 * (the rotation follows the angle of your drag around the center), with inertia
 * so a flick keeps spinning and eases to a stop. The Speed control is a steady
 * idle spin layered on top.
 *
 * Canvas-only engine: the parent supplies the framed box + live params.
 */

type RGB = [number, number, number];
export interface KaleidoParams {
  seg: number; // mirror segments
  zoom: number;
  autoSpin: number; // steady idle spin, rad/sec
  colA: RGB;
  colB: RGB;
  colC: RGB;
}
export const DEFAULT_KALEIDO: KaleidoParams = {
  seg: 8,
  zoom: 1,
  autoSpin: 0.15,
  colA: [0.45, 0.2, 0.8],
  colB: [0.18, 0.62, 0.74],
  colC: [0.96, 0.6, 0.24],
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export default function Kaleido({ paramsRef }: { paramsRef: MutableRefObject<KaleidoParams> }) {
  const shaderParams = useRef<ToyParams>({
    uSeg: DEFAULT_KALEIDO.seg,
    uZoom: DEFAULT_KALEIDO.zoom,
    uRot: 0,
    uColA: DEFAULT_KALEIDO.colA,
    uColB: DEFAULT_KALEIDO.colB,
    uColC: DEFAULT_KALEIDO.colC,
  });
  const simRef = useRef<ToySim | null>(null);

  useEffect(() => {
    let rot = 0;
    let vel = 0; // angular velocity (rad/sec) for inertia
    let prevAng = 0;
    let prevDown = 0;
    const angOf = (mx: number, my: number) => Math.atan2(my - 0.5, mx - 0.5);

    simRef.current = (s) => {
      const ctrl = paramsRef.current;
      const a = angOf(s.mx, s.my);
      if (s.down) {
        if (!prevDown) {
          prevAng = a; // grab: anchor without jumping
        } else {
          let d = a - prevAng;
          if (d > Math.PI) d -= 2 * Math.PI;
          if (d < -Math.PI) d += 2 * Math.PI;
          rot += d;
          vel = clamp(d / Math.max(s.dt, 1e-3), -8, 8);
          prevAng = a;
        }
      } else {
        rot += vel * s.dt; // inertia
        vel *= Math.pow(0.92, s.dt * 60);
        rot += ctrl.autoSpin * s.dt; // steady idle spin
      }
      prevDown = s.down;
      shaderParams.current.uRot = rot;
      shaderParams.current.uSeg = ctrl.seg;
      shaderParams.current.uZoom = ctrl.zoom;
      shaderParams.current.uColA = ctrl.colA;
      shaderParams.current.uColB = ctrl.colB;
      shaderParams.current.uColC = ctrl.colC;
    };
  }, [paramsRef]);

  return <ShaderToy frag={KALEIDO_FRAG} name="kaleido" paramsRef={shaderParams} simRef={simRef} />;
}
