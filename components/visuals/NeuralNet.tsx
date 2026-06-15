"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A neural network written from scratch, no TensorFlow, no autograd. A small MLP
 * (2 to 12 to 12 to 1, tanh hidden + sigmoid output) trained with hand-written
 * backprop + gradient descent to separate a non-linear 2D dataset. The background
 * is the net's live prediction (its decision surface), the glowing line is the
 * boundary it has learned, and the dots are the real data. Pick a preset, or
 * paint your own points and watch the boundary chase them in real time.
 */

type Dataset = "spiral" | "circles" | "moons" | "xor" | "blobs";
const PRESETS: Dataset[] = ["spiral", "circles", "moons", "xor", "blobs"];
const H1 = 16;
const H2 = 16;
const LR = 0.09;
const STEPS_PER_FRAME = 2; // a couple of steps/frame: still watchable, but climbs to high accuracy
const GW = 96; // grid for the soft colour fill (the boundary itself is a crisp vector overlay)
const DOM = 1.35;
const MAX_PTS = 1400;

// class 0 = teal, class 1 = pink (both cool palette, high contrast)
const C0: [number, number, number] = [0.1, 0.34, 0.4];
const C1: [number, number, number] = [0.42, 0.13, 0.4];
const PT0 = "#48d0c2";
const PT1 = "#e86cc0";

const tanh = Math.tanh;
const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));
const randn = () => {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

type Pt = { x: number; y: number; t: number };

function makeData(kind: Dataset): Pt[] {
  const pts: Pt[] = [];
  if (kind === "spiral") {
    const n = 110;
    for (let c = 0; c < 2; c++) {
      for (let i = 0; i < n; i++) {
        const r = (i / n) * 0.98;
        const theta = (i / n) * 3.2 + c * Math.PI + randn() * 0.16;
        pts.push({ x: r * Math.cos(theta), y: r * Math.sin(theta), t: c });
      }
    }
  } else if (kind === "circles") {
    const n = 220;
    for (let i = 0; i < n; i++) {
      const inner = i < n / 2;
      const rad = inner ? 0.15 + Math.random() * 0.25 : 0.66 + Math.random() * 0.28;
      const th = Math.random() * Math.PI * 2;
      pts.push({ x: rad * Math.cos(th), y: rad * Math.sin(th), t: inner ? 1 : 0 });
    }
  } else if (kind === "moons") {
    const n = 120;
    for (let i = 0; i < n; i++) {
      const th = (Math.PI * i) / (n - 1);
      // upper moon, class 0
      pts.push({
        x: (Math.cos(th) - 0.5) * 0.82 + randn() * 0.05,
        y: (Math.sin(th) - 0.25) * 0.82 + randn() * 0.05,
        t: 0,
      });
      // lower moon, class 1
      pts.push({
        x: (1 - Math.cos(th) - 0.5) * 0.82 + randn() * 0.05,
        y: (0.5 - Math.sin(th) - 0.25) * 0.82 + randn() * 0.05,
        t: 1,
      });
    }
  } else if (kind === "xor") {
    const n = 260;
    for (let i = 0; i < n; i++) {
      const x = (Math.random() * 2 - 1) * 0.95;
      const y = (Math.random() * 2 - 1) * 0.95;
      pts.push({ x, y, t: x > 0 !== y > 0 ? 1 : 0 });
    }
  } else {
    // blobs — two gaussian clusters on a diagonal
    const n = 120;
    const centers: [number, number, number][] = [
      [-0.5, -0.4, 0],
      [0.5, 0.4, 1],
    ];
    for (const [cx, cy, t] of centers) {
      for (let i = 0; i < n; i++) {
        pts.push({ x: cx + randn() * 0.22, y: cy + randn() * 0.22, t });
      }
    }
  }
  return pts;
}

interface Net {
  W1: number[][];
  b1: number[];
  W2: number[][];
  b2: number[];
  W3: number[];
  b3: number;
}

function makeNet(): Net {
  const mat = (r: number, c: number, s: number) =>
    Array.from({ length: r }, () => Array.from({ length: c }, () => randn() * s));
  return {
    W1: mat(H1, 2, 0.9),
    b1: Array(H1).fill(0),
    W2: mat(H2, H1, 0.9),
    b2: Array(H2).fill(0),
    W3: Array.from({ length: H2 }, () => randn() * 0.9),
    b3: 0,
  };
}

function forward(net: Net, x: number, y: number) {
  const a1 = new Array(H1);
  for (let j = 0; j < H1; j++) a1[j] = tanh(net.W1[j][0] * x + net.W1[j][1] * y + net.b1[j]);
  const a2 = new Array(H2);
  for (let j = 0; j < H2; j++) {
    let s = net.b2[j];
    for (let k = 0; k < H1; k++) s += net.W2[j][k] * a1[k];
    a2[j] = tanh(s);
  }
  let z = net.b3;
  for (let k = 0; k < H2; k++) z += net.W3[k] * a2[k];
  return { a1, a2, out: sigmoid(z) };
}

function trainStep(net: Net, data: Pt[]): number {
  if (data.length === 0) return 0;
  const gW1 = net.W1.map((r) => r.map(() => 0));
  const gb1 = new Array(H1).fill(0);
  const gW2 = net.W2.map((r) => r.map(() => 0));
  const gb2 = new Array(H2).fill(0);
  const gW3 = new Array(H2).fill(0);
  let gb3 = 0;
  let loss = 0;
  for (const p of data) {
    const { a1, a2, out } = forward(net, p.x, p.y);
    loss += -(p.t * Math.log(out + 1e-7) + (1 - p.t) * Math.log(1 - out + 1e-7));
    const dz3 = out - p.t;
    const da2 = new Array(H2);
    for (let k = 0; k < H2; k++) {
      gW3[k] += dz3 * a2[k];
      da2[k] = net.W3[k] * dz3;
    }
    gb3 += dz3;
    const da1 = new Array(H1).fill(0);
    for (let j = 0; j < H2; j++) {
      const dz2 = da2[j] * (1 - a2[j] * a2[j]);
      gb2[j] += dz2;
      for (let k = 0; k < H1; k++) {
        gW2[j][k] += dz2 * a1[k];
        da1[k] += net.W2[j][k] * dz2;
      }
    }
    for (let j = 0; j < H1; j++) {
      const dz1 = da1[j] * (1 - a1[j] * a1[j]);
      gb1[j] += dz1;
      gW1[j][0] += dz1 * p.x;
      gW1[j][1] += dz1 * p.y;
    }
  }
  const n = data.length;
  for (let j = 0; j < H1; j++) {
    net.W1[j][0] -= (LR * gW1[j][0]) / n;
    net.W1[j][1] -= (LR * gW1[j][1]) / n;
    net.b1[j] -= (LR * gb1[j]) / n;
  }
  for (let j = 0; j < H2; j++) {
    for (let k = 0; k < H1; k++) net.W2[j][k] -= (LR * gW2[j][k]) / n;
    net.b2[j] -= (LR * gb2[j]) / n;
  }
  for (let k = 0; k < H2; k++) net.W3[k] -= (LR * gW3[k]) / n;
  net.b3 -= (LR * gb3) / n;
  return loss / n;
}

/** Crisp learned boundary: marching squares extracts the p=0.5 contour from the
 *  field grid (with linear interpolation, so it's smooth), then we stroke it as a
 *  glowing vector line at full canvas resolution, no more pixelated band. */
function drawContour(
  ctx: CanvasRenderingContext2D,
  field: Float32Array,
  GW: number,
  GH: number,
  w: number,
  h: number
) {
  const L = 0.5;
  const at = (gx: number, gy: number) => field[gy * GW + gx];
  const px = (gx: number) => ((gx + 0.5) / GW) * w;
  const py = (gy: number) => ((gy + 0.5) / GH) * h;
  const t = (a: number, b: number) => (L - a) / (b - a || 1e-6); // edge crossing fraction
  const seg: number[] = []; // flat list of x1,y1,x2,y2
  const push = (a: number[], b: number[]) => seg.push(a[0], a[1], b[0], b[1]);
  for (let gy = 0; gy < GH - 1; gy++) {
    for (let gx = 0; gx < GW - 1; gx++) {
      const tl = at(gx, gy), tr = at(gx + 1, gy), br = at(gx + 1, gy + 1), bl = at(gx, gy + 1);
      let c = 0;
      if (tl > L) c |= 8;
      if (tr > L) c |= 4;
      if (br > L) c |= 2;
      if (bl > L) c |= 1;
      if (c === 0 || c === 15) continue;
      const top = (): number[] => [px(gx + t(tl, tr)), py(gy)];
      const bot = (): number[] => [px(gx + t(bl, br)), py(gy + 1)];
      const lft = (): number[] => [px(gx), py(gy + t(tl, bl))];
      const rgt = (): number[] => [px(gx + 1), py(gy + t(tr, br))];
      switch (c) {
        case 1: case 14: push(lft(), bot()); break;
        case 2: case 13: push(bot(), rgt()); break;
        case 3: case 12: push(lft(), rgt()); break;
        case 4: case 11: push(top(), rgt()); break;
        case 6: case 9: push(top(), bot()); break;
        case 7: case 8: push(lft(), top()); break;
        case 5: push(lft(), top()); push(bot(), rgt()); break;
        case 10: push(lft(), bot()); push(top(), rgt()); break;
      }
    }
  }
  if (!seg.length) return;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  for (let i = 0; i < seg.length; i += 4) {
    ctx.moveTo(seg[i], seg[i + 1]);
    ctx.lineTo(seg[i + 2], seg[i + 3]);
  }
  ctx.strokeStyle = "rgba(208,230,255,0.85)"; // soft outer glow
  ctx.shadowColor = "rgba(150,200,255,0.9)";
  ctx.shadowBlur = 12;
  ctx.lineWidth = 2.4;
  ctx.stroke();
  ctx.shadowBlur = 0; // crisp white core
  ctx.strokeStyle = "rgba(255,255,255,0.95)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

type Brush = "a" | "b" | "erase";

export default function NeuralNet() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const netRef = useRef<Net>(makeNet());
  const dataRef = useRef<Pt[]>(makeData("spiral"));
  const epochRef = useRef(0);
  const brushRef = useRef<Brush>("a");
  const [dataset, setDataset] = useState<Dataset>("spiral");
  const [brush, setBrush] = useState<Brush>("a");

  const restart = (kind: Dataset) => {
    netRef.current = makeNet();
    dataRef.current = makeData(kind);
    epochRef.current = 0;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const fbuf = document.createElement("canvas");
    const fctx = fbuf.getContext("2d")!;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      if (!w || !h) return;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = true;
    };
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    resize();

    // ---- paint / erase your own data ----
    const toData = (clientX: number, clientY: number): [number, number] => {
      const r = canvas.getBoundingClientRect();
      const px = (clientX - r.left) / r.width;
      const py = (clientY - r.top) / r.height;
      return [px * 2 * DOM - DOM, (1 - py) * 2 * DOM - DOM];
    };
    let painting = false;
    let last: [number, number] | null = null;
    const paint = (clientX: number, clientY: number) => {
      const [dx, dy] = toData(clientX, clientY);
      const data = dataRef.current;
      if (brushRef.current === "erase") {
        dataRef.current = data.filter((p) => (p.x - dx) ** 2 + (p.y - dy) ** 2 > 0.09 * 0.09);
        return;
      }
      if (last && (last[0] - dx) ** 2 + (last[1] - dy) ** 2 < 0.045 * 0.045) return;
      if (data.length >= MAX_PTS) return;
      last = [dx, dy];
      const t = brushRef.current === "a" ? 0 : 1;
      // a small soft cluster so a stroke paints a believable blob, not a thin line
      for (let i = 0; i < 3; i++) {
        data.push({ x: dx + randn() * 0.03, y: dy + randn() * 0.03, t });
      }
    };
    const onDown = (e: PointerEvent) => {
      painting = true;
      last = null;
      canvas.setPointerCapture?.(e.pointerId);
      paint(e.clientX, e.clientY);
    };
    const onMove = (e: PointerEvent) => {
      if (painting) paint(e.clientX, e.clientY);
    };
    const onUp = () => {
      painting = false;
      last = null;
    };
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointerleave", onUp);

    let onScreen = true;
    const io = new IntersectionObserver(([e]) => (onScreen = e.isIntersecting), { threshold: 0 });
    io.observe(wrap);

    let raf = 0;
    let loss = 1;

    const draw = () => {
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      const net = netRef.current;
      const data = dataRef.current;
      const GH = Math.max(20, Math.round(GW * (h / w)));
      fbuf.width = GW;
      fbuf.height = GH;
      const fimg = fctx.createImageData(GW, GH);
      const fd = fimg.data;
      const field = new Float32Array(GW * GH);
      for (let gy = 0; gy < GH; gy++) {
        const dy = (1 - (gy + 0.5) / GH) * 2 * DOM - DOM;
        for (let gx = 0; gx < GW; gx++) {
          const dx = ((gx + 0.5) / GW) * 2 * DOM - DOM;
          const o = forward(net, dx, dy).out;
          field[gy * GW + gx] = o;
          const i = (gy * GW + gx) * 4;
          fd[i] = Math.min(255, (C0[0] * (1 - o) + C1[0] * o) * 255);
          fd[i + 1] = Math.min(255, (C0[1] * (1 - o) + C1[1] * o) * 255);
          fd[i + 2] = Math.min(255, (C0[2] * (1 - o) + C1[2] * o) * 255);
          fd[i + 3] = 255;
        }
      }
      fctx.putImageData(fimg, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(fbuf, 0, 0, w, h);
      // the sharp glowing boundary, drawn as a vector contour at full resolution
      drawContour(ctx, field, GW, GH, w, h);

      const toPx = (dx: number, dy: number): [number, number] => [
        ((dx + DOM) / (2 * DOM)) * w,
        (1 - (dy + DOM) / (2 * DOM)) * h,
      ];
      let correct = 0;
      for (const p of data) {
        if ((forward(net, p.x, p.y).out > 0.5 ? 1 : 0) === p.t) correct++;
        const [px, py] = toPx(p.x, p.y);
        ctx.beginPath();
        ctx.arc(px, py, 3.1, 0, Math.PI * 2);
        ctx.fillStyle = p.t === 0 ? PT0 : PT1;
        ctx.fill();
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = "rgba(7,6,9,0.85)";
        ctx.stroke();
      }
      const acc = data.length ? Math.round((100 * correct) / data.length) : 0;

      ctx.fillStyle = "rgba(237,228,211,0.85)";
      ctx.font = '600 11px "IBM Plex Mono", monospace';
      ctx.fillText(
        `EPOCH ${epochRef.current}    LOSS ${loss.toFixed(3)}    ACCURACY ${data.length ? acc + "%" : "--"}`,
        12,
        21
      );
      ctx.fillStyle = "rgba(237,228,211,0.45)";
      ctx.font = '9px "IBM Plex Mono", monospace';
      ctx.fillText("BACKGROUND = THE NET'S GUESS   ·   DRAG ON THE CANVAS TO PAINT POINTS", 12, h - 12);
    };

    const loop = () => {
      if (onScreen && !document.hidden) {
        for (let s = 0; s < STEPS_PER_FRAME; s++) {
          loss = trainStep(netRef.current, dataRef.current);
          if (dataRef.current.length) epochRef.current++;
        }
        draw();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointerleave", onUp);
    };
  }, []);

  const btn = (active: boolean) =>
    `font-mono text-[10px] tracking-[0.14em] uppercase px-2.5 py-1.5 border transition ${
      active
        ? "border-amber text-amber"
        : "border-bone/15 text-dim hover:border-bone/35 hover:text-bone"
    }`;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="mr-1 font-mono text-[10px] tracking-[0.14em] text-dim uppercase">Data</span>
        {PRESETS.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => {
              setDataset(d);
              restart(d);
            }}
            className={btn(dataset === d)}
          >
            {d}
          </button>
        ))}
        <button
          type="button"
          onClick={() => restart(dataset)}
          className="ml-1 bg-amber px-3 py-1.5 font-mono text-[10px] font-semibold tracking-[0.16em] text-ink uppercase transition hover:bg-amber/85"
        >
          ↻ Restart
        </button>
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="mr-1 font-mono text-[10px] tracking-[0.14em] text-dim uppercase">Brush</span>
        <button
          type="button"
          onClick={() => {
            setBrush("a");
            brushRef.current = "a";
          }}
          className={`${btn(brush === "a")} flex items-center gap-1.5`}
        >
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: PT0 }} /> Class A
        </button>
        <button
          type="button"
          onClick={() => {
            setBrush("b");
            brushRef.current = "b";
          }}
          className={`${btn(brush === "b")} flex items-center gap-1.5`}
        >
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: PT1 }} /> Class B
        </button>
        <button
          type="button"
          onClick={() => {
            setBrush("erase");
            brushRef.current = "erase";
          }}
          className={btn(brush === "erase")}
        >
          Erase
        </button>
        <button
          type="button"
          onClick={() => {
            dataRef.current = [];
          }}
          className="ml-auto font-mono text-[10px] tracking-[0.14em] text-dim uppercase transition-colors hover:text-amber"
        >
          Clear ✕
        </button>
      </div>
      <p className="mb-3 max-w-2xl font-sans text-[12.5px] leading-[1.55] text-bone/55">
        <span className="font-mono text-[10px] tracking-[0.14em] text-amber uppercase">How it works</span>
        {": "}
        Pick a built-in dataset, or grab a brush and draw your own points right on the canvas, the
        network retrains on them live. Class A is teal, Class B is pink, Erase removes nearby points.
        The white line is the boundary it has learned, the background is its guess everywhere else.
      </p>
      <div
        ref={wrapRef}
        className="relative aspect-[16/10] w-full cursor-crosshair touch-none overflow-hidden rounded-lg bg-[#0a0908]"
      >
        <canvas ref={canvasRef} className="h-full w-full" />
      </div>
    </div>
  );
}
