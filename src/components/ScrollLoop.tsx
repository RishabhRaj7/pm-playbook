import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { STAGES, TOPICS, type StageId } from "@/data";
import { REDUCED } from "@/lib/hooks";
import { cn } from "@/utils/cn";

/* ============================================================
   THE CLIMB — a scroll-driven 3D loop.
   The whole hero is a 380vh track with a sticky viewport. Your
   scroll position is the camera: the line unfolds into a helix,
   the camera orbits the loop stopping at each of the six stages,
   then rises to the summit where survivors ship. Ideas keep
   climbing on their own clock; the camera is on yours.
   ============================================================ */

const LAPS = 2.6;
const R = 165;
const H = 78;
const DIE: Record<StageId, number> = { discover: 0.34, define: 0.28, decide: 0.42, build: 0.14, measure: 0.3, land: 0.16 };
const HERO_END = 0.14;      // line -> helix while the hero copy is up
const TOUR_START = 0.17;    // six stage stops
const TOUR_END = 0.86;      // then the summit
const BAND = (TOUR_END - TOUR_START) / 6;

type P = { u: number; v: number; alive: boolean; dying: number; dx: number; dy: number; x: number; y: number; sz: number; shipped: boolean; nextStage: number };
export interface LoopStats { considered: number; shipped: number }

function cssVar(n: string) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
function hexA(hex: string, a: number) {
  const h = hex.replace("#", "");
  if (h.length !== 3 && h.length !== 6) return hex;
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const ease = (k: number) => 1 - Math.pow(1 - k, 3);
const smooth = (k: number) => k * k * (3 - 2 * k);

/** which chapter the scroll is in: -1 hero, 0..5 stage, 6 summit */
function chapterOf(p: number) {
  if (p < TOUR_START - 0.02) return -1;
  if (p >= TOUR_END) return 6;
  return Math.min(5, Math.max(0, Math.floor((p - TOUR_START) / BAND)));
}

interface Props {
  hero: ReactNode;                       // copy shown during the first chapter
  summit: ReactNode;                     // copy shown at the top
  onStageClick?: (s: StageId) => void;
  onStats?: (s: LoopStats) => void;
  go: (t: string | null, a?: string | null) => void;
}

export default function ScrollLoop({ hero, summit, onStageClick, onStats, go }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const cvRef = useRef<HTMLCanvasElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const summitRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const labelRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const railRef = useRef<HTMLDivElement>(null);
  const [chapter, setChapter] = useState(-1);
  const [hoverStage, setHoverStage] = useState<StageId | null>(null);
  const hoverRef = useRef<StageId | null>(null); hoverRef.current = hoverStage;

  const jumpTo = (p: number) => {
    const tr = trackRef.current; if (!tr) return;
    const top = tr.getBoundingClientRect().top + window.scrollY;
    const len = tr.offsetHeight - window.innerHeight;
    window.scrollTo({ top: top + p * len, behavior: "smooth" });
  };

  useEffect(() => {
    const cv = cvRef.current!, ctx = cv.getContext("2d")!, sticky = stickyRef.current!, track = trackRef.current!;
    let W = 0, Hh = 0, dpr = 1;
    const resize = () => { dpr = Math.min(2, window.devicePixelRatio || 1); W = sticky.clientWidth; Hh = sticky.clientHeight; cv.width = W * dpr; cv.height = Hh * dpr; cv.style.width = W + "px"; cv.style.height = Hh + "px"; };
    resize();
    const ro = new ResizeObserver(resize); ro.observe(sticky);

    let colors = { acc: "#C6FF3C", bad: "#FF7A5C", text: "#EEF0FF", muted: "#7F88C4", ink: "#07080F" };
    const readColors = () => { colors = { acc: cssVar("--acc") || colors.acc, bad: cssVar("--bad") || colors.bad, text: cssVar("--text") || colors.text, muted: cssVar("--muted") || colors.muted, ink: cssVar("--ink") || colors.ink }; };
    readColors();
    const mo = new MutationObserver(readColors); mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "style"] });

    // scroll -> progress (smoothed)
    let pRaw = 0, p = 0, lastChapter = -2;
    const readScroll = () => { const r = track.getBoundingClientRect(); const len = track.offsetHeight - window.innerHeight; pRaw = len > 0 ? clamp01(-r.top / len) : 0; };
    readScroll();
    p = pRaw;
    window.addEventListener("scroll", readScroll, { passive: true });
    window.addEventListener("resize", readScroll);

    // camera + pointer
    let yaw = 0, pitch = -0.42, userYaw = 0, dragging = false, lx = 0, mx = 0, my = 0;
    let camY = 0, zoom = 1, morph = REDUCED ? 1 : 0;
    const t0 = performance.now();
    const parts: P[] = []; let considered = 0, shipped = 0, lastEmit = 0, lastSpawn = 0;
    const wide = () => W > 900;
    const scaleFor = () => Math.min(W / (wide() ? 760 : 470), Hh / 640, 1.35) * zoom;
    const cx = () => (wide() ? W * 0.68 : W * 0.5);

    const pt = (u: number, m: number) => {
      const th = u * Math.PI * 2;
      const hx = Math.cos(th) * R, hz = Math.sin(th) * R, hy = -(u - LAPS / 2) * H;
      const lx = (u / LAPS - 0.5) * R * 2.6;
      const e = ease(m);
      return { x: lx + (hx - lx) * e, y: (hy) * e, z: hz * e };
    };
    const project = (q: { x: number; y: number; z: number }) => {
      const cy = Math.cos(yaw), sy = Math.sin(yaw);
      const x = q.x * cy - q.z * sy, z0 = q.x * sy + q.z * cy, y0 = q.y - camY;
      const cp = Math.cos(pitch), sp = Math.sin(pitch);
      const y = y0 * cp - z0 * sp, z = y0 * sp + z0 * cp;
      const f = 760 / (760 + z), s = scaleFor();
      return { x: cx() + x * f * s, y: Hh / 2 + 10 + y * f * s, f, z };
    };
    const spawn = () => { parts.push({ u: 0, v: 0.045 + Math.random() * 0.03, alive: true, dying: 0, dx: 0, dy: 0, x: 0, y: 0, sz: 1.6 + Math.random() * 1.4, shipped: false, nextStage: 1 }); considered++; };

    let raf = 0, last = performance.now();
    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const el = (now - t0) / 1000;
      p += (pRaw - p) * (REDUCED ? 1 : 0.11);

      // ---- scene state from progress ----
      const intro = REDUCED ? 1 : clamp01((el - 0.4) / 1.8);                  // self-unfold on load
      morph = Math.max(intro, clamp01(p / HERO_END));
      const tour = clamp01((p - TOUR_START) / (TOUR_END - TOUR_START));         // 0..1 across six stages
      const summitK = clamp01((p - TOUR_END) / (1 - TOUR_END));
      // focus travels one full lap (the labelled one) then to the top
      const focusU = p < TOUR_START ? 1 : p < TOUR_END ? 1 + tour : 2 + summitK * (LAPS - 2);
      const activeIdx = p < TOUR_START ? -1 : p >= TOUR_END ? -1 : Math.min(5, Math.floor(tour * 6 - 1e-6 + 1e-9));
      const heroFade = 1 - clamp01((p - 0.04) / 0.09);
      const idle = (0.08 * el) * heroFade;                                     // slow drift only while hero is up
      const targetYaw = -Math.PI / 2 - focusU * Math.PI * 2 * smooth(clamp01((p - HERO_END) / 0.06)) + idle * (1 - smooth(clamp01((p - HERO_END) / 0.06)));
      yaw = targetYaw + userYaw + (dragging ? 0 : mx * 0.06);
      pitch += ((-0.42 + my * 0.1 - summitK * 0.25) - pitch) * 0.08;
      const fy = -(focusU - LAPS / 2) * H;                                     // y of focused point
      camY += (fy * (p < TOUR_START ? 0 : 0.55) - camY) * 0.08;
      zoom += ((1 + 0.2 * smooth(clamp01((p - HERO_END) / 0.12)) - 0.15 * summitK) - zoom) * 0.08;

      // chapter -> React (only on change)
      const ch = chapterOf(p);
      if (ch !== lastChapter) { lastChapter = ch; setChapter(ch); }
      // overlays driven directly
      if (heroRef.current) { heroRef.current.style.opacity = String(heroFade); heroRef.current.style.transform = `translateY(${(1 - heroFade) * -40}px)`; heroRef.current.style.pointerEvents = heroFade > 0.4 ? "auto" : "none"; }
      if (hintRef.current) hintRef.current.style.opacity = String(heroFade * (1 - clamp01((el - 8) / 4) * 0.6));
      if (summitRef.current) { const k = smooth(clamp01((p - 0.88) / 0.1)); summitRef.current.style.opacity = String(k); summitRef.current.style.transform = `translateY(${(1 - k) * 30}px)`; summitRef.current.style.pointerEvents = k > 0.5 ? "auto" : "none"; }
      if (railRef.current) railRef.current.style.opacity = String(clamp01((p - 0.1) / 0.06) * (1 - clamp01((p - 0.9) / 0.08)));

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, Hh);

      // ground shadow
      {
        const c = project({ x: 0, y: (LAPS / 2) * H + 14, z: 0 }); const s = scaleFor();
        ctx.save(); ctx.globalAlpha = 0.22 * morph;
        const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, R * 1.3 * s);
        g.addColorStop(0, hexA(colors.acc, 0.35)); g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(c.x, c.y, R * 1.3 * s, R * 0.45 * s, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }

      // helix, depth sorted
      const segs = Math.round(LAPS * 72);
      const pts: { x: number; y: number; z: number; f: number }[] = [];
      for (let i = 0; i <= segs; i++) pts.push(project(pt((i / segs) * LAPS, morph)));
      const order = pts.map((_, i) => i).slice(0, -1).sort((i, j) => pts[j].z - pts[i].z);
      const focusSeg = (focusU / LAPS) * segs;
      for (const i of order) {
        const a = pts[i], b = pts[i + 1];
        const depth = (a.f - 0.72) / 0.5;
        const near = 1 - clamp01(Math.abs(i - focusSeg) / 26);                 // glow around the camera's focus
        const al = 0.16 + clamp01(depth) * 0.55;
        ctx.strokeStyle = near > 0 && p > HERO_END ? hexA(colors.acc, al + near * 0.5) : hexA(colors.text, al * (0.55 + 0.45 * morph));
        ctx.lineWidth = 1 + Math.max(0, depth) * 1.6 + near * 1.4;
        ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }

      // stage plates
      const plates: { s: number; q: ReturnType<typeof project>; lap: number }[] = [];
      for (let lap = 0; lap < LAPS; lap++) for (let s = 0; s < 6; s++) { const u = lap + s / 6; if (u > LAPS) continue; plates.push({ s, q: project(pt(u, morph)), lap }); }
      plates.sort((a, b) => b.q.z - a.q.z);
      const labelLap = 1;
      for (const pl of plates) {
        const st = STAGES[pl.s];
        const on = (pl.lap === labelLap && activeIdx === pl.s) || hoverRef.current === st.id;
        const col = `hsl(${st.hue} 80% ${on ? 72 : 62}%)`;
        const r = (pl.lap === labelLap ? 6.5 : 4) * pl.q.f * scaleFor() * (on ? 1.5 : 1);
        ctx.save(); ctx.globalAlpha = 0.25 + pl.q.f * 0.6;
        if (on) { ctx.shadowBlur = 24; ctx.shadowColor = col; }
        ctx.fillStyle = col; ctx.beginPath(); ctx.arc(pl.q.x, pl.q.y, r, 0, Math.PI * 2); ctx.fill();
        if (pl.lap === labelLap || on) {
          ctx.globalAlpha = (on ? 0.6 : 0.26) * (0.4 + 0.6 * morph); ctx.shadowBlur = 0;
          ctx.strokeStyle = col; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.arc(pl.q.x, pl.q.y, r + 6 + Math.sin(el * 2 + pl.s) * 1.5, 0, Math.PI * 2); ctx.stroke();
          if (on) { ctx.globalAlpha = 0.35 * (1 - ((el * 0.8 + pl.s * 0.3) % 1)); ctx.beginPath(); ctx.arc(pl.q.x, pl.q.y, r + 8 + ((el * 0.8 + pl.s * 0.3) % 1) * 34, 0, Math.PI * 2); ctx.stroke(); }
        }
        ctx.restore();
        if (pl.lap === labelLap) {
          const lb = labelRefs.current[pl.s];
          if (lb) {
            lb.style.transform = `translate(${pl.q.x}px, ${pl.q.y - 20 * pl.q.f}px) translate(-50%,-100%)`;
            lb.style.opacity = String(Math.min(1, 0.35 + pl.q.f * 0.7) * morph * (1 - summitK));
            lb.style.zIndex = String(Math.round(pl.q.f * 100));
            lb.dataset.on = String(on);
          }
        }
      }

      // ideas climbing on their own clock
      if (morph > 0.95 && !REDUCED && now - lastSpawn > 260 && parts.length < 70) { spawn(); lastSpawn = now; }
      for (const pr of parts) {
        if (pr.alive) {
          pr.u += pr.v * dt;
          const gs = Math.floor(pr.u * 6);
          if (gs >= pr.nextStage) {
            pr.nextStage = gs + 1;
            const st = STAGES[gs % 6];
            if (Math.random() < DIE[st.id] * 0.75) { pr.alive = false; pr.dying = 1; const q = project(pt(pr.u, morph)); pr.x = q.x; pr.y = q.y; pr.dx = (Math.random() - 0.5) * 60; pr.dy = 30 + Math.random() * 60; }
          }
          if (pr.alive && pr.u >= LAPS) { pr.alive = false; pr.dying = 1; shipped++; const q = project(pt(LAPS, morph)); pr.x = q.x; pr.y = q.y; pr.dx = 0; pr.dy = -80; pr.sz = 3; pr.shipped = true; }
          if (pr.alive) {
            const q = project(pt(pr.u, morph));
            ctx.save(); ctx.globalAlpha = 0.5 + q.f * 0.5; ctx.shadowBlur = 10 * q.f; ctx.shadowColor = colors.acc; ctx.fillStyle = colors.acc;
            ctx.beginPath(); ctx.arc(q.x, q.y, pr.sz * q.f * scaleFor(), 0, Math.PI * 2); ctx.fill(); ctx.restore();
          }
        } else if (pr.dying > 0) {
          pr.dying -= dt * 1.4; pr.x += pr.dx * dt; pr.y += pr.dy * dt; pr.dy += 120 * dt;
          ctx.save(); ctx.globalAlpha = Math.max(0, pr.dying) * 0.9; ctx.fillStyle = pr.shipped ? colors.acc : colors.bad;
          if (pr.shipped) { ctx.shadowBlur = 18; ctx.shadowColor = colors.acc; }
          ctx.beginPath(); ctx.arc(pr.x, pr.y, pr.shipped ? 4 + (1 - pr.dying) * 10 : pr.sz * 0.9, 0, Math.PI * 2);
          if (pr.shipped) { ctx.lineWidth = 1.5; ctx.strokeStyle = colors.acc; ctx.stroke(); } else ctx.fill();
          ctx.restore();
        }
      }
      for (let i = parts.length - 1; i >= 0; i--) if (!parts[i].alive && parts[i].dying <= 0) parts.splice(i, 1);

      // summit beacon + captions
      if (morph > 0.2) {
        const top = project(pt(LAPS, morph)), bot = project(pt(0, morph));
        ctx.save(); ctx.globalAlpha = morph;
        ctx.font = `600 10px ${cssVar("--f-mono")}`; ctx.textAlign = "center";
        ctx.fillStyle = colors.acc; ctx.fillText("SHIPPED ↑", top.x + 34, top.y - 30);
        ctx.fillStyle = colors.muted; ctx.fillText("IDEAS IN", bot.x, bot.y + 34);
        if (summitK > 0) {
          for (let k = 0; k < 3; k++) { const ph = (el * 0.5 + k / 3) % 1; ctx.globalAlpha = summitK * (1 - ph) * 0.6; ctx.strokeStyle = colors.acc; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(top.x, top.y, 6 + ph * 90 * scaleFor(), 0, Math.PI * 2); ctx.stroke(); }
        }
        ctx.restore();
      }

      if (onStats && now - lastEmit > 400) { lastEmit = now; onStats({ considered, shipped }); }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    // pointer: parallax + drag to orbit
    const onDown = (e: PointerEvent) => { if ((e.target as HTMLElement).closest("button,a")) return; dragging = true; lx = e.clientX; cv.setPointerCapture(e.pointerId); sticky.style.cursor = "grabbing"; };
    const onMove = (e: PointerEvent) => {
      const r = sticky.getBoundingClientRect();
      mx = ((e.clientX - r.left) / r.width) * 2 - 1; my = ((e.clientY - r.top) / r.height) * 2 - 1;
      if (!dragging) return;
      userYaw += (e.clientX - lx) * 0.008; lx = e.clientX;
    };
    const onUp = () => { dragging = false; sticky.style.cursor = ""; };
    const onLeave = () => { mx = 0; my = 0; };
    cv.addEventListener("pointerdown", onDown); window.addEventListener("pointermove", onMove); window.addEventListener("pointerup", onUp); sticky.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf); ro.disconnect(); mo.disconnect();
      window.removeEventListener("scroll", readScroll); window.removeEventListener("resize", readScroll);
      cv.removeEventListener("pointerdown", onDown); window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); sticky.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  const stage = chapter >= 0 && chapter < 6 ? STAGES[chapter] : null;
  const stageTopics = stage ? TOPICS.filter((t) => t.stage === stage.id) : [];

  return (
    <div ref={trackRef} className="relative h-[380vh]" aria-label="Scroll to climb the loop">
      <div ref={stickyRef} className="sticky top-0 h-screen w-full overflow-hidden select-none">
        <canvas ref={cvRef} className="absolute inset-0 touch-pan-y cursor-grab" aria-label="Animated diagram: a straight line unfolds into a rising loop of six stages; scrolling orbits the loop stage by stage while ideas climb it and most are killed; the few that survive ship at the top." />

        {/* stage labels riding on the helix */}
        {STAGES.map((s, i) => (
          <button key={s.id} ref={(el) => { labelRefs.current[i] = el; }}
            onMouseEnter={() => setHoverStage(s.id)} onMouseLeave={() => setHoverStage(null)}
            onClick={() => jumpTo(TOUR_START + (i + 0.5) * BAND)}
            style={{ opacity: 0, position: "absolute", left: 0, top: 0, willChange: "transform" }}
            className="flex items-center gap-1.5 rounded-full border border-line-soft bg-ink-1/85 px-2.5 py-1 font-mono text-[.62rem] font-semibold uppercase tracking-[.12em] text-dim backdrop-blur transition-colors hover:border-line hover:text-text data-[on=true]:border-acc data-[on=true]:text-acc"
            aria-label={`${s.label}: ${s.note}`}>
            <i className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: `hsl(${s.hue} 80% 62%)` }} />{s.label}
          </button>
        ))}

        {/* hero copy — chapter 0 */}
        <div ref={heroRef} className="absolute inset-x-0 top-0 z-10 px-5 pt-16 sm:px-8 lg:pt-24" style={{ willChange: "opacity, transform" }}>
          <div className="mx-auto max-w-[1280px]"><div className="max-w-xl">{hero}</div></div>
        </div>

        {/* chapter rail — right edge */}
        <div ref={railRef} className="pointer-events-auto absolute right-4 top-1/2 z-20 hidden -translate-y-1/2 flex-col items-end gap-2 sm:flex lg:right-8" style={{ opacity: 0 }}>
          {STAGES.map((s, i) => (
            <button key={s.id} onClick={() => jumpTo(TOUR_START + (i + 0.5) * BAND)} className={cn("group flex items-center gap-2 font-mono text-[.58rem] uppercase tracking-[.16em] transition-colors", chapter === i ? "text-text" : "text-muted hover:text-dim")}>
              <span className={cn("transition-opacity", chapter === i ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>{s.label}</span>
              <i className="block h-[2px] rounded-full transition-all" style={{ width: chapter === i ? 28 : 12, background: chapter === i ? `hsl(${s.hue} 80% 62%)` : "var(--line)" }} />
            </button>
          ))}
          <button onClick={() => jumpTo(0.95)} className={cn("group flex items-center gap-2 font-mono text-[.58rem] uppercase tracking-[.16em]", chapter === 6 ? "text-acc" : "text-muted hover:text-dim")}>
            <span className={cn("transition-opacity", chapter === 6 ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>Shipped</span>
            <i className="block h-[2px] rounded-full transition-all" style={{ width: chapter === 6 ? 28 : 12, background: chapter === 6 ? "var(--acc)" : "var(--line)" }} />
          </button>
        </div>

        {/* stage caption — chapters 1..6 */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 px-5 pb-10 sm:px-8 lg:inset-y-0 lg:flex lg:items-center lg:pb-0">
          <div className="mx-auto w-full max-w-[1280px]">
            <AnimatePresence mode="wait">
              {stage && (
                <motion.div key={stage.id} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -18 }} transition={{ duration: .45, ease: [.16, 1, .3, 1] }} className="pointer-events-auto max-w-md rounded-2xl border border-line-soft bg-ink/70 p-5 backdrop-blur-xl sm:p-6">
                  <span className="flex items-center gap-2 font-mono text-[.62rem] uppercase tracking-[.22em] text-muted"><i className="h-1.5 w-1.5 rounded-full" style={{ background: `hsl(${stage.hue} 80% 62%)` }} />Stage {chapter + 1} of 6 · {stage.note}</span>
                  <h2 className="mt-3 text-[clamp(2rem,4.5vw,3.4rem)]">{stage.label}<span className="text-muted">.</span></h2>
                  <p className="mt-3 text-[.9rem] text-dim">{STAGE_COPY[stage.id]}</p>
                  <ul className="m-0 mt-4 list-none space-y-1 p-0">
                    {stageTopics.map((t) => (
                      <li key={t.id}><button onClick={() => go(t.id)} className="group flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left text-[.86rem] text-dim transition-colors hover:bg-ink-3 hover:text-text"><span className="mono text-[.62rem] text-acc">{t.n}</span><span className="truncate">{t.title}</span><span className="ml-auto text-acc opacity-0 transition-opacity group-hover:opacity-100">→</span></button></li>
                    ))}
                  </ul>
                  <button onClick={() => onStageClick?.(stage.id)} className="mt-3 font-mono text-[.62rem] uppercase tracking-[.16em] text-muted hover:text-acc">Filter the curriculum by {stage.label} ↓</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* summit — last chapter */}
        <div ref={summitRef} className="absolute inset-x-0 bottom-0 z-10 px-5 pb-12 sm:px-8 lg:inset-y-0 lg:flex lg:items-center lg:pb-0" style={{ opacity: 0, willChange: "opacity, transform" }}>
          <div className="mx-auto w-full max-w-[1280px]"><div className="max-w-xl">{summit}</div></div>
        </div>

        {/* scroll hint */}
        <div ref={hintRef} className="pointer-events-none absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2 font-mono text-[.58rem] uppercase tracking-[.22em] text-muted">
          <span>scroll to climb the loop</span>
          <span className="block h-8 w-px overflow-hidden bg-line-soft"><span className="block h-3 w-px bg-acc scroll-drip" /></span>
        </div>
      </div>
    </div>
  );
}

const STAGE_COPY: Record<StageId, string> = {
  discover: "Most ideas should die here, cheaply, in a conversation. The craft is asking about the last time rather than the next time.",
  define: "Turn what you learned into a bet worth making: a strategy that says no, and a metric that would notice if you were wrong.",
  decide: "Capacity is fixed and intake is not, so the quarter is decided by where the line is drawn — and by what you are willing to say no to.",
  build: "A spec is a decision record, not a wish list. Write the smallest thing that would change your mind, then ship that.",
  measure: "The experiment is the only tool that tells you what would have happened anyway. Everything else is a story about a chart.",
  land: "Shipping is not the finish. Adoption, pricing and the review that feeds the next lap are how the loop rises instead of repeating.",
};
