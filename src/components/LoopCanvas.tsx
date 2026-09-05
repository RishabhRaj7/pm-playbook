import { useEffect, useRef, useState } from "react";
import { STAGES, type StageId } from "@/data";
import { REDUCED } from "@/lib/hooks";

/* ============================================================
   THE RISING LOOP — a line unfolds into a helix; ideas travel
   up it and most die at a stage; the survivors ship.
   Hand-rolled perspective projection, one canvas, no libs.
   ============================================================ */

const LAPS = 2.6;
const R = 165;
const H = 78; // rise per lap
const DIE: Record<StageId, number> = { discover: 0.34, define: 0.28, decide: 0.42, build: 0.14, measure: 0.3, land: 0.16 };

type P = {
  u: number; v: number; alive: boolean; dying: number; dx: number; dy: number; x: number; y: number; z: number; sz: number; hueShift: number; nextStage: number;
};

export interface LoopStats { considered: number; shipped: number }

interface Props {
  onStageHover?: (s: StageId | null) => void;
  onStageClick?: (s: StageId) => void;
  activeStage?: StageId | null;
  onStats?: (s: LoopStats) => void;
  className?: string;
}

function cssVar(n: string) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
function hexA(hex: string, a: number) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export default function LoopCanvas({ onStageHover, onStageClick, activeStage, onStats, className }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const labelRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [replayKey, setReplayKey] = useState(0);
  const activeRef = useRef<StageId | null>(null);
  activeRef.current = activeStage ?? null;

  useEffect(() => {
    const cv = ref.current!; const ctx = cv.getContext("2d")!;
    const wrap = wrapRef.current!;
    let W = 0, Hh = 0, dpr = 1;
    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = wrap.clientWidth; Hh = wrap.clientHeight;
      cv.width = W * dpr; cv.height = Hh * dpr; cv.style.width = W + "px"; cv.style.height = Hh + "px";
    };
    resize();
    const ro = new ResizeObserver(resize); ro.observe(wrap);

    // camera state
    let yaw = -0.6, yawV = 0, pitch = -0.42, targetPitch = -0.42, dragging = false, lx = 0, ly = 0, lastDragT = 0;
    let mx = 0, my = 0; // parallax -1..1
    let morph = REDUCED ? 1 : 0; // 0 line -> 1 helix
    const t0 = performance.now();
    const parts: P[] = [];
    let considered = 0, shipped = 0, lastStatEmit = 0, lastSpawn = 0;
    let colors = { acc: "#C6FF3C", a: "#4FDCC9", b: "#FF5C9E", bad: "#FF7A5C", text: "#EEF0FF", line: "#262B4D", muted: "#7F88C4", ink: "#07080F" };
    const readColors = () => { colors = { acc: cssVar("--acc") || colors.acc, a: cssVar("--a"), b: cssVar("--b"), bad: cssVar("--bad"), text: cssVar("--text"), line: cssVar("--line"), muted: cssVar("--muted"), ink: cssVar("--ink") }; };
    readColors();
    const mo = new MutationObserver(readColors); mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "style"] });

    const ease = (k: number) => 1 - Math.pow(1 - k, 3);
    const scaleFor = () => Math.min(W / 470, Hh / 600, 1.25);

    // 3D point on the shape for param u (0..LAPS)
    const pt = (u: number, m: number) => {
      const th = u * Math.PI * 2;
      const hx = Math.cos(th) * R, hz = Math.sin(th) * R, hy = -(u - LAPS / 2) * H;
      const lx = (u / LAPS - 0.5) * R * 2.6, ly = 0, lz = 0;
      const e = ease(m);
      return { x: lx + (hx - lx) * e, y: ly + (hy - ly) * e, z: lz + (hz - lz) * e };
    };
    const project = (p: { x: number; y: number; z: number }) => {
      const cy = Math.cos(yaw), sy = Math.sin(yaw);
      let x = p.x * cy - p.z * sy, z = p.x * sy + p.z * cy, y = p.y;
      const cp = Math.cos(pitch), sp = Math.sin(pitch);
      const y2 = y * cp - z * sp, z2 = y * sp + z * cp;
      y = y2; z = z2;
      const f = 760 / (760 + z);
      const s = scaleFor();
      return { x: W / 2 + x * f * s, y: Hh / 2 + 10 + y * f * s, f, z };
    };

    const spawn = () => {
      parts.push({ u: 0, v: 0.045 + Math.random() * 0.03, alive: true, dying: 0, dx: 0, dy: 0, x: 0, y: 0, z: 0, sz: 1.6 + Math.random() * 1.4, hueShift: Math.random(), nextStage: 1 });
      considered++;
    };

    let raf = 0; let last = performance.now();
    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const el = (now - t0) / 1000;
      if (!REDUCED) morph = Math.min(1, Math.max(0, (el - 0.6) / 2.2));
      // camera
      if (!dragging) { yaw += (0.09 + yawV) * dt; yawV *= 0.94; }
      targetPitch = -0.42 + my * 0.12;
      pitch += (targetPitch - pitch) * 0.06;
      const yawOff = dragging ? 0 : mx * 0.08;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, Hh);

      const segs = Math.round(LAPS * 72);
      const yawSave = yaw; yaw = yawSave + yawOff;

      // ground shadow ellipse
      {
        const c = project({ x: 0, y: (LAPS / 2) * H + 14, z: 0 });
        const s = scaleFor();
        ctx.save(); ctx.globalAlpha = 0.25 * morph;
        const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, R * 1.3 * s);
        g.addColorStop(0, hexA(colors.acc, 0.35)); g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(c.x, c.y, R * 1.3 * s, R * 0.45 * s, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }

      // helix path: back half first, then front (depth sort per segment)
      const pts: { x: number; y: number; z: number; f: number }[] = [];
      for (let i = 0; i <= segs; i++) pts.push(project(pt((i / segs) * LAPS, morph)));
      const order = pts.map((_, i) => i).slice(0, -1).sort((i, j) => pts[j].z - pts[i].z);
      for (const i of order) {
        const a = pts[i], b = pts[i + 1];
        const depth = (a.f - 0.72) / 0.5; // 0 back ..1 front
        const al = 0.18 + Math.max(0, Math.min(1, depth)) * 0.6;
        ctx.strokeStyle = hexA(colors.text, al * (0.55 + 0.45 * morph));
        ctx.lineWidth = 1 + Math.max(0, depth) * 1.6;
        ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }

      // stage plates: six per lap; label the middle lap
      const plates: { s: number; p: ReturnType<typeof project>; lap: number }[] = [];
      for (let lap = 0; lap < LAPS; lap++) for (let s = 0; s < 6; s++) {
        const u = lap + s / 6; if (u > LAPS) continue;
        plates.push({ s, p: project(pt(u, morph)), lap });
      }
      plates.sort((a, b) => b.p.z - a.p.z);
      const labelLap = 1;
      for (const pl of plates) {
        const st = STAGES[pl.s];
        const isActive = activeRef.current === st.id;
        const col = `hsl(${st.hue} 80% ${isActive ? 70 : 62}%)`;
        const r = (pl.lap === labelLap ? 6.5 : 4) * pl.p.f * scaleFor() * (isActive ? 1.4 : 1);
        ctx.save();
        ctx.globalAlpha = 0.25 + pl.p.f * 0.6;
        ctx.fillStyle = col; ctx.beginPath(); ctx.arc(pl.p.x, pl.p.y, r, 0, Math.PI * 2); ctx.fill();
        if (pl.lap === labelLap || isActive) {
          ctx.globalAlpha = (isActive ? 0.55 : 0.28) * (0.4 + 0.6 * morph);
          ctx.strokeStyle = col; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.arc(pl.p.x, pl.p.y, r + 6 + Math.sin(el * 2 + pl.s) * 1.5, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.restore();
        if (pl.lap === labelLap) {
          const lb = labelRefs.current[pl.s];
          if (lb) {
            const ox = Math.cos(((pl.s / 6) * Math.PI * 2) + yaw) * 1;
            lb.style.transform = `translate(${pl.p.x + ox * 14}px, ${pl.p.y - 20 * pl.p.f}px) translate(-50%,-100%)`;
            lb.style.opacity = String(Math.min(1, (0.35 + pl.p.f * 0.7)) * morph);
            lb.style.zIndex = String(Math.round(pl.p.f * 100));
          }
        }
      }

      // particles
      if (morph > 0.95 && !REDUCED) {
        if (now - lastSpawn > 260 && parts.length < 70) { spawn(); lastSpawn = now; }
      }
      for (const p of parts) {
        if (p.alive) {
          p.u += p.v * dt * 1.0;
          // stage crossings
          const stageIdx = Math.floor((p.u % 1) * 6);
          const globalStage = Math.floor(p.u * 6);
          if (globalStage >= p.nextStage) {
            p.nextStage = globalStage + 1;
            const st = STAGES[stageIdx % 6];
            const died = Math.random() < DIE[st.id] * 0.75;
            if (died) { p.alive = false; p.dying = 1; const q = project(pt(p.u, morph)); p.x = q.x; p.y = q.y; p.z = q.z; p.dx = (Math.random() - 0.5) * 60; p.dy = 30 + Math.random() * 60; }
          }
          if (p.alive && p.u >= LAPS) { p.alive = false; p.dying = 1; shipped++; const q = project(pt(LAPS, morph)); p.x = q.x; p.y = q.y; p.dx = 0; p.dy = -80; p.sz = 3; p.hueShift = -1; }
          if (p.alive) {
            const q = project(pt(p.u, morph));
            ctx.save();
            ctx.globalAlpha = 0.5 + q.f * 0.5;
            ctx.shadowBlur = 10 * q.f; ctx.shadowColor = colors.acc;
            ctx.fillStyle = colors.acc;
            ctx.beginPath(); ctx.arc(q.x, q.y, p.sz * q.f * scaleFor(), 0, Math.PI * 2); ctx.fill();
            ctx.restore();
          }
        } else if (p.dying > 0) {
          p.dying -= dt * 1.4;
          p.x += p.dx * dt; p.y += p.dy * dt; p.dy += 120 * dt;
          const shippedP = p.hueShift === -1;
          ctx.save();
          ctx.globalAlpha = Math.max(0, p.dying) * 0.9;
          ctx.fillStyle = shippedP ? colors.acc : colors.bad;
          if (shippedP) { ctx.shadowBlur = 18; ctx.shadowColor = colors.acc; }
          ctx.beginPath(); ctx.arc(p.x, p.y, (shippedP ? 4 + (1 - p.dying) * 10 : p.sz * 0.9), 0, Math.PI * 2);
          if (shippedP) { ctx.lineWidth = 1.5; ctx.strokeStyle = colors.acc; ctx.stroke(); } else ctx.fill();
          ctx.restore();
        }
      }
      for (let i = parts.length - 1; i >= 0; i--) if (!parts[i].alive && parts[i].dying <= 0) parts.splice(i, 1);

      // "ship" cap at top and "idea" origin at bottom
      if (morph > 0.2) {
        const top = project(pt(LAPS, morph)), bot = project(pt(0, morph));
        ctx.save(); ctx.globalAlpha = morph;
        ctx.font = `600 10px ${cssVar("--f-mono")}`; ctx.textAlign = "center";
        ctx.fillStyle = colors.acc; ctx.fillText("SHIPPED ↑", top.x + 34, top.y - 30);
        ctx.fillStyle = colors.muted; ctx.fillText("IDEAS IN", bot.x, bot.y + 34);
        ctx.restore();
      }
      yaw = yawSave;

      if (onStats && now - lastStatEmit > 400) { lastStatEmit = now; onStats({ considered, shipped }); }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    // pointer interactions
    const onDown = (e: PointerEvent) => { dragging = true; lx = e.clientX; ly = e.clientY; lastDragT = performance.now(); cv.setPointerCapture(e.pointerId); wrap.style.cursor = "grabbing"; };
    const onMove = (e: PointerEvent) => {
      const r = wrap.getBoundingClientRect();
      mx = ((e.clientX - r.left) / r.width) * 2 - 1; my = ((e.clientY - r.top) / r.height) * 2 - 1;
      if (!dragging) return;
      const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY;
      yaw += dx * 0.008; targetPitch -= dy * 0.004; pitch = Math.max(-1.1, Math.min(0.3, pitch - dy * 0.004));
      const nowT = performance.now(); yawV = (dx * 0.008) / Math.max(0.016, (nowT - lastDragT) / 1000) * 0.15; lastDragT = nowT;
    };
    const onUp = () => { dragging = false; wrap.style.cursor = "grab"; };
    const onLeave = () => { mx = 0; my = 0; };
    cv.addEventListener("pointerdown", onDown); window.addEventListener("pointermove", onMove); window.addEventListener("pointerup", onUp); wrap.addEventListener("pointerleave", onLeave);
    wrap.style.cursor = "grab";
    return () => {
      cancelAnimationFrame(raf); ro.disconnect(); mo.disconnect();
      cv.removeEventListener("pointerdown", onDown); window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); wrap.removeEventListener("pointerleave", onLeave);
    };
  }, [replayKey]);

  return (
    <div ref={wrapRef} className={"relative w-full h-full select-none " + (className ?? "")}>
      <canvas ref={ref} className="absolute inset-0 touch-none" aria-label="Animated diagram: a straight line unfolds into a rising loop of six stages; ideas travel up it and most are killed at a stage, the few that survive ship." />
      {STAGES.map((s, i) => (
        <button
          key={s.id}
          ref={(el) => { labelRefs.current[i] = el; }}
          onMouseEnter={() => onStageHover?.(s.id)}
          onMouseLeave={() => onStageHover?.(null)}
          onClick={() => onStageClick?.(s.id)}
          style={{ opacity: 0, position: "absolute", left: 0, top: 0, willChange: "transform" }}
          className="pointer-events-auto group flex items-center gap-1.5 rounded-full border border-line-soft bg-ink-1/85 backdrop-blur px-2.5 py-1 font-mono text-[.62rem] font-semibold uppercase tracking-[.12em] text-dim transition-colors hover:text-text hover:border-line data-[on=true]:border-acc data-[on=true]:text-acc"
          data-on={activeStage === s.id}
          aria-label={`${s.label}: ${s.note}`}
        >
          <i className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: `hsl(${s.hue} 80% 62%)` }} />
          {s.label}
        </button>
      ))}
      <button onClick={() => setReplayKey((k) => k + 1)} className="absolute bottom-3 right-3 z-20 rounded-full border border-line-soft bg-ink-1/80 px-2.5 py-1 font-mono text-[.6rem] uppercase tracking-[.14em] text-muted backdrop-blur hover:text-text hover:border-line" title="Replay the unfolding">↻ replay</button>
    </div>
  );
}
