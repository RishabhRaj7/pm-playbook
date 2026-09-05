import { useEffect, useRef, useState } from "react";
import { REDUCED } from "@/lib/hooks";

/* ============================================================
   THE QUARTER ENGINE — one planning quarter on a loop.
   Ideas land on a value × effort field; a capacity line decides
   what fits; reality bumps a couple back; the rest ship.
   ============================================================ */

const PHASES = [
  { id: "intake", label: "Intake", say: "Eight new ideas arrive. Nobody asked whether there was room." },
  { id: "runcost", label: "Run cost", say: "Support, on-call and the migration eat 40% before anyone plans anything." },
  { id: "score", label: "Scoring", say: "Value over effort, roughly. The number's job is to locate the argument, not end it." },
  { id: "line", label: "The line", say: "Capacity is the line. What sits above it is the quarter. Everything else is a published no." },
  { id: "reality", label: "Reality", say: "An estimate doubles, a customer escalates. Two items get bumped back below the line." },
  { id: "deliver", label: "Delivery", say: "What survived ships. Notice how little it is compared to what arrived." },
  { id: "review", label: "Review", say: "Count it honestly. Then the next eight ideas arrive." },
];
const PHASE_LEN = [2.2, 2.0, 2.2, 2.6, 2.4, 2.4, 2.2];
const NAMES = ["Bulk export", "SSO sync", "Dark mode", "Audit log", "New onboarding", "Pricing page", "Mobile fix", "Search v2", "Webhooks", "Templates", "Import wizard", "Notif. digest", "API keys", "Team roles", "Usage alerts"];

type Idea = { name: string; value: number; effort: number; x: number; y: number; tx: number; ty: number; state: "new" | "in" | "out" | "bumped" | "shipped"; born: number; score: number };

function cssVar(n: string) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }

export default function QuarterEngine() {
  const cv = useRef<HTMLCanvasElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState(0);
  const [quarter, setQuarter] = useState(1);
  const [read, setRead] = useState({ board: 0, committed: 0, cap: 0, shipped: 0, lost: 0 });
  const [paused, setPaused] = useState(REDUCED);
  const pausedRef = useRef(paused); pausedRef.current = paused;

  useEffect(() => {
    const c = cv.current!, ctx = c.getContext("2d")!, w = wrap.current!;
    let W = 0, H = 0, dpr = 1;
    const resize = () => { dpr = Math.min(2, devicePixelRatio || 1); W = w.clientWidth; H = w.clientHeight; c.width = W * dpr; c.height = H * dpr; };
    resize(); const ro = new ResizeObserver(resize); ro.observe(w);

    let ideas: Idea[] = []; let ph = 0, pt = 0, q = 1; let totalShipped = 0, totalLost = 0; let capUsed = 0;
    const PAD = { l: 46, r: 120, t: 26, b: 40 };
    const fx = (e: number) => PAD.l + e * (W - PAD.l - PAD.r);
    const fy = (v: number) => H - PAD.b - v * (H - PAD.t - PAD.b);

    const newQuarter = () => {
      ideas = ideas.filter((i) => i.state === "shipped");
      ideas.forEach((i) => { i.tx = W - PAD.r + 30 + (Math.random() * 60); i.ty = PAD.t + 30 + Math.random() * (H - PAD.t - PAD.b - 60); });
      if (ideas.length > 14) ideas = ideas.slice(-14);
      const pool = [...NAMES].sort(() => Math.random() - 0.5).slice(0, 8);
      pool.forEach((name, k) => {
        const value = 0.15 + Math.random() * 0.8, effort = 0.1 + Math.random() * 0.85;
        ideas.push({ name, value, effort, x: fx(effort), y: -20 - k * 12, tx: fx(effort), ty: fy(value), state: "new", born: k * 0.18, score: value / effort });
      });
      capUsed = 0;
    };
    newQuarter();

    let ln = 0.0; // capacity line intercept sweep
    let raf = 0, last = performance.now();
    const colors = () => ({ acc: cssVar("--acc"), bad: cssVar("--bad"), text: cssVar("--text"), muted: cssVar("--muted"), line: cssVar("--line"), a: cssVar("--a"), ink1: cssVar("--ink-1"), signal: cssVar("--signal") });

    const step = () => {
      // called on entering each phase
      const active = ideas.filter((i) => i.state !== "shipped");
      if (ph === 2) active.sort((a, b) => b.score - a.score);
      if (ph === 3) {
        // pick by score until capacity (effort budget 0.6 of ~2.4 total effort units after run cost)
        const budget = 1.35; let used = 0;
        const sorted = [...active].sort((a, b) => b.score - a.score);
        for (const i of sorted) { if (used + i.effort <= budget) { i.state = "in"; used += i.effort; } else i.state = "out"; }
        capUsed = 0.4 + (used / budget) * 0.6;
      }
      if (ph === 4) {
        const ins = active.filter((i) => i.state === "in");
        const bump = ins.sort(() => Math.random() - 0.5).slice(0, Math.min(2, Math.max(1, ins.length - 1)));
        bump.forEach((i) => { i.state = "bumped"; totalLost++; });
        // an urgent arrival
        const v = 0.7 + Math.random() * 0.25, e = 0.25 + Math.random() * 0.3;
        ideas.push({ name: "Escalation", value: v, effort: e, x: W + 20, y: fy(v), tx: fx(e), ty: fy(v), state: "in", born: 0, score: v / e });
      }
      if (ph === 5) {
        active.filter((i) => i.state === "in").forEach((i, k) => { i.state = "shipped"; totalShipped++; i.tx = W - PAD.r + 30 + (k % 3) * 28; i.ty = PAD.t + 30 + Math.floor(k / 3) * 26 + Math.random() * 6; });
        ideas.filter((i) => i.state === "out" || i.state === "bumped").forEach((i) => { totalLost += i.state === "out" ? 0 : 0; });
      }
      if (ph === 6) { /* review */ }
      if (ph === 0) { q++; setQuarter(q); newQuarter(); ln = 0; }
    };

    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (!pausedRef.current) {
        pt += dt;
        if (pt >= PHASE_LEN[ph]) { pt = 0; ph = (ph + 1) % PHASES.length; step(); setPhase(ph); }
      }
      const C = colors();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      // axes
      ctx.strokeStyle = C.line; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(PAD.l, PAD.t); ctx.lineTo(PAD.l, H - PAD.b); ctx.lineTo(W - PAD.r, H - PAD.b); ctx.stroke();
      ctx.fillStyle = C.muted; ctx.font = `600 9px ${cssVar("--f-mono")}`; ctx.textAlign = "left";
      ctx.fillText("EFFORT →", PAD.l + 4, H - PAD.b + 16);
      ctx.save(); ctx.translate(PAD.l - 12, H - PAD.b - 4); ctx.rotate(-Math.PI / 2); ctx.fillText("VALUE →", 0, 0); ctx.restore();
      // shipped column
      ctx.strokeStyle = C.line; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(W - PAD.r + 16, PAD.t); ctx.lineTo(W - PAD.r + 16, H - PAD.b); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = C.acc; ctx.textAlign = "center"; ctx.fillText("SHIPPED", W - PAD.r + 60, PAD.t + 4);
      // run-cost band
      if (ph >= 1) {
        const k = ph === 1 ? Math.min(1, pt / 1.2) : 1;
        ctx.fillStyle = C.bad; ctx.globalAlpha = 0.08 * k;
        ctx.fillRect(PAD.l, PAD.t, (W - PAD.l - PAD.r) * 0.4 * k, H - PAD.t - PAD.b);
        ctx.globalAlpha = 0.9 * k; ctx.fillStyle = C.bad; ctx.textAlign = "left"; ctx.fillText("KEEP THE LIGHTS ON · 40%", PAD.l + 6, PAD.t + 12); ctx.globalAlpha = 1;
      }
      // capacity line
      if (ph >= 3 && ph <= 5) {
        ln = Math.min(1, ln + dt * 0.7);
        const x0 = fx(0.4), y0 = fy(0.18), x1 = fx(1), y1 = fy(0.95);
        ctx.save(); ctx.strokeStyle = C.signal; ctx.lineWidth = 1.5; ctx.setLineDash([6, 5]);
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + (x1 - x0) * ln, y0 + (y1 - y0) * ln); ctx.stroke();
        ctx.setLineDash([]); ctx.fillStyle = C.signal; ctx.textAlign = "right"; ctx.font = `600 9px ${cssVar("--f-mono")}`;
        if (ln > 0.9) ctx.fillText("THE LINE · capacity", x1 - 4, y1 - 8);
        ctx.restore();
      }
      // ideas
      for (const i of ideas) {
        if (i.state === "new" && pt < i.born && ph === 0) continue;
        const sp = 1 - Math.pow(0.001, dt);
        i.x += (i.tx - i.x) * sp * 1.4; i.y += (i.ty - i.y) * sp * 1.4;
        if (i.state === "shipped") { /* drift toward column */ }
        let col = C.text, al = 0.9, r = 5;
        if (i.state === "in") { col = C.acc; r = 6; }
        if (i.state === "out") { col = C.muted; al = 0.4; r = 4; }
        if (i.state === "bumped") { col = C.bad; al = 0.8; r = 5; }
        if (i.state === "shipped") { col = C.acc; al = 0.85; r = 4; }
        ctx.save(); ctx.globalAlpha = al; ctx.fillStyle = col;
        if (i.state === "in") { ctx.shadowBlur = 12; ctx.shadowColor = C.acc; }
        ctx.beginPath(); ctx.arc(i.x, i.y, r, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        if (i.state !== "shipped") {
          ctx.font = `500 10px ${cssVar("--f-mono")}`; ctx.textAlign = "left"; ctx.fillStyle = col;
          ctx.fillText(ph >= 2 && ph <= 4 ? `${i.name} · ${i.score.toFixed(1)}` : i.name, i.x + 9, i.y + 3);
        }
        ctx.restore();
      }
      const active = ideas.filter((i) => i.state !== "shipped");
      const committed = active.filter((i) => i.state === "in").length;
      if (Math.round(now / 250) % 2 === 0) setRead({ board: active.length, committed, cap: ph >= 1 ? Math.round((ph >= 3 ? capUsed : 0.4) * 100) : 0, shipped: totalShipped, lost: totalLost });
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  return (
    <div className="panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line-soft px-4 py-3">
        <span className="font-mono text-[.62rem] uppercase tracking-[.2em] text-muted">Prioritisation engine</span>
        <b className="font-mono text-[.72rem] font-semibold text-acc">quarter {String(quarter).padStart(2, "0")} · {PHASES[phase].label.toLowerCase()}</b>
      </div>
      <div className="flex gap-1 px-4 pt-3">
        {PHASES.map((p, i) => (
          <i key={p.id} className="h-1 flex-1 rounded-full transition-all duration-500" style={{ background: i === phase ? "var(--acc)" : i < phase ? "color-mix(in srgb, var(--acc) 40%, transparent)" : "var(--line-soft)" }} title={p.label} />
        ))}
      </div>
      <p key={phase} className="rise px-4 pt-3 text-[.92rem] text-dim min-h-[2.8em]">
        <b className="font-mono text-[.66rem] uppercase tracking-[.16em] text-text mr-2">{PHASES[phase].label}</b>{PHASES[phase].say}
      </p>
      <div ref={wrap} className="relative h-[300px] sm:h-[340px]"><canvas ref={cv} className="absolute inset-0 h-full w-full" aria-label="Animated simulation of one planning quarter" /></div>
      <div className="grid grid-cols-2 gap-px border-t border-line-soft bg-line-soft sm:grid-cols-5">
        {[
          ["On the board", read.board], ["Committed", read.committed, true], ["Capacity used", read.cap + "%"], ["Shipped, all time", read.shipped, true], ["Bumped or slipped", read.lost],
        ].map(([l, v, win]) => (
          <div key={String(l)} className="bg-ink-1 px-4 py-3">
            <span className="block font-mono text-[.58rem] uppercase tracking-[.14em] text-muted">{l}</span>
            <b className={"font-mono text-xl font-bold " + (win ? "text-acc" : "text-text")}>{v}</b>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between border-t border-line-soft px-4 py-2">
        <span className="font-mono text-[.6rem] text-muted">~16s per quarter · loops forever</span>
        <button onClick={() => setPaused((p) => !p)} className="pill">{paused ? "▶ Play" : "❚❚ Pause"}</button>
      </div>
    </div>
  );
}
