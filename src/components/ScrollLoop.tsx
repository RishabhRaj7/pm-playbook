import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { STAGES, TOPICS, type StageId } from "@/data";
import { REDUCED } from "@/lib/hooks";
import { cssVar, onInkChange } from "@/lib/particles";
import { cn } from "@/utils/cn";

/* ============================================================
   FIG. 1 — THE LOOP, RISING. A scroll-driven 3D plate.
   The lead story is a tall track with a sticky viewport. Your
   scroll position is the camera: a straight line unfolds into a
   helix, the camera orbits it stopping at each of the six stages,
   then rises to the summit where the survivors ship. Ideas climb
   on their own clock; most are struck out on the way.
   Drawn like an engineering plate: ink lines, square points, no glow.
   ============================================================ */

const LAPS = 2.6;
const R = 165;
const H = 78;
const DIE: Record<StageId, number> = { discover: 0.34, define: 0.28, decide: 0.42, build: 0.14, measure: 0.3, land: 0.16 };
const HERO_END = 0.14;      // line -> helix while the lead copy is up
const TOUR_START = 0.17;    // six stage stops
const TOUR_END = 0.86;      // then the summit
const BAND = (TOUR_END - TOUR_START) / 6;
const BAR = 52;             // the sticky masthead bar the plate sits under

type P = { u: number; v: number; alive: boolean; dying: number; dx: number; dy: number; x: number; y: number; sz: number; shipped: boolean; nextStage: number };

function rgba(color: string, a: number) {
  const h = color.replace("#", "");
  if (!/^[0-9a-f]{3}([0-9a-f]{3})?$/i.test(h)) return color;
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const ease = (k: number) => 1 - Math.pow(1 - k, 3);
const smooth = (k: number) => k * k * (3 - 2 * k);

/** which chapter the scroll is in: -1 lead, 0..5 stage, 6 summit */
function chapterOf(p: number) {
  if (p < TOUR_START - 0.02) return -1;
  if (p >= TOUR_END) return 6;
  return Math.min(5, Math.max(0, Math.floor((p - TOUR_START) / BAND)));
}

interface Props {
  hero: ReactNode;                       // copy shown during the lead
  summit: ReactNode;                     // copy shown at the top
  onStageClick?: (s: StageId) => void;
  go: (t: string | null, a?: string | null) => void;
}

/** Live counters, written straight into the DOM so the page never re-renders for them. */
export const Stat = ({ k }: { k: "considered" | "shipped" | "rate" }) => <span data-stat={k}>—</span>;

export default function ScrollLoop({ hero, summit, onStageClick, go }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const cvRef = useRef<HTMLCanvasElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const summitRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const figRef = useRef<HTMLDivElement>(null);
  const labelRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const railRef = useRef<HTMLDivElement>(null);
  const [chapter, setChapter] = useState(-1);
  const [hoverStage, setHoverStage] = useState<StageId | null>(null);
  const hoverRef = useRef<StageId | null>(null); hoverRef.current = hoverStage;

  const jumpTo = (p: number) => {
    const tr = trackRef.current; if (!tr) return;
    const top = tr.getBoundingClientRect().top + window.scrollY;
    const len = tr.offsetHeight - (stickyRef.current?.offsetHeight ?? window.innerHeight);
    window.scrollTo({ top: top - BAR + p * len, behavior: REDUCED ? "auto" : "smooth" });
  };

  useEffect(() => {
    const cv = cvRef.current!, ctx = cv.getContext("2d")!, sticky = stickyRef.current!, track = trackRef.current!;
    let W = 0, Hh = 0, dpr = 1;
    const resize = () => { dpr = Math.min(2, window.devicePixelRatio || 1); W = sticky.clientWidth; Hh = sticky.clientHeight; cv.width = W * dpr; cv.height = Hh * dpr; cv.style.width = W + "px"; cv.style.height = Hh + "px"; };
    resize();
    const ro = new ResizeObserver(resize); ro.observe(sticky);

    // colours and fonts are read once and again only when the edition or spot colour changes —
    // never per frame (getComputedStyle forces a style recalc)
    let C = { acc: "", bad: "", text: "", muted: "", line: "" }, mono = "monospace";
    const readInk = () => { C = { acc: cssVar("--acc"), bad: cssVar("--bad"), text: cssVar("--text"), muted: cssVar("--muted"), line: cssVar("--line") }; mono = cssVar("--f-mono") || mono; };
    readInk();
    const stopInk = onInkChange(readInk);

    // scroll -> progress (smoothed)
    let pRaw = 0, p = 0, lastChapter = -2;
    const readScroll = () => { const r = track.getBoundingClientRect(); const len = track.offsetHeight - sticky.offsetHeight; pRaw = len > 0 ? clamp01((BAR - r.top) / len) : 0; };
    readScroll();
    p = pRaw;
    window.addEventListener("scroll", readScroll, { passive: true });
    window.addEventListener("resize", readScroll);

    // live counters in the copy
    const statEls = () => sticky.querySelectorAll<HTMLElement>("[data-stat]");

    // camera + pointer
    let yaw = 0, pitch = -0.42, userYaw = 0, dragging = false, lx = 0, mx = 0, my = 0;
    let camY = 0, zoom = 1, morph = REDUCED ? 1 : 0;
    const t0 = performance.now();
    const parts: P[] = []; let considered = 0, shipped = 0, lastEmit = 0, lastSpawn = 0;
    const wide = () => W > 900;
    let shrink = 1; // narrow screens: the plate sits smaller and lower until the lead copy has gone
    const scaleFor = () => Math.min(W / (wide() ? 760 : 520), Hh / 640, 1.3) * zoom * shrink;
    const cx = () => (wide() ? W * 0.66 : W * 0.5);
    let cyK = 0.5;

    const pt = (u: number, m: number) => {
      const th = u * Math.PI * 2;
      const hx = Math.cos(th) * R, hz = Math.sin(th) * R, hy = -(u - LAPS / 2) * H;
      const lx0 = (u / LAPS - 0.5) * R * 2.6;
      const e = ease(m);
      return { x: lx0 + (hx - lx0) * e, y: hy * e, z: hz * e };
    };
    const project = (q: { x: number; y: number; z: number }) => {
      const cyw = Math.cos(yaw), syw = Math.sin(yaw);
      const x = q.x * cyw - q.z * syw, z0 = q.x * syw + q.z * cyw, y0 = q.y - camY;
      const cp = Math.cos(pitch), sp = Math.sin(pitch);
      const y = y0 * cp - z0 * sp, z = y0 * sp + z0 * cp;
      const f = 760 / (760 + z), s = scaleFor();
      return { x: cx() + x * f * s, y: Hh * cyK + 10 + y * f * s, f, z };
    };
    const spawn = () => { parts.push({ u: 0, v: 0.09 + Math.random() * 0.05, alive: true, dying: 0, dx: 0, dy: 0, x: 0, y: 0, sz: 2.2 + Math.random() * 1.4, shipped: false, nextStage: 1 }); considered++; };
    const square = (x: number, y: number, r: number) => ctx.rect(x - r, y - r, r * 2, r * 2);

    let raf = 0, last = performance.now(), running = false;
    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const el = (now - t0) / 1000;
      p += (pRaw - p) * (REDUCED ? 1 : 0.11);

      // ---- scene state from progress ----
      const intro = REDUCED ? 1 : clamp01((el - 0.3) / 1.8);                  // self-unfold on load
      morph = Math.max(intro, clamp01(p / HERO_END));
      const tour = clamp01((p - TOUR_START) / (TOUR_END - TOUR_START));
      const summitK = clamp01((p - TOUR_END) / (1 - TOUR_END));
      const focusU = p < TOUR_START ? 1 : p < TOUR_END ? 1 + tour : 2 + summitK * (LAPS - 2);
      const activeIdx = p < TOUR_START || p >= TOUR_END ? -1 : Math.min(5, Math.floor(tour * 6));
      const heroFade = 1 - clamp01((p - 0.04) / 0.09);
      const turn = smooth(clamp01((p - HERO_END) / 0.06));
      const idle = 0.08 * el * heroFade;                                      // slow drift only while the lead is up
      yaw = -Math.PI / 2 - focusU * Math.PI * 2 * turn + idle * (1 - turn) + userYaw + (dragging ? 0 : mx * 0.06);
      pitch += ((-0.42 + my * 0.1 - summitK * 0.25) - pitch) * 0.08;
      camY += (-(focusU - LAPS / 2) * H * (p < TOUR_START ? 0 : 0.55) - camY) * 0.08;
      zoom += ((1 + 0.2 * smooth(clamp01((p - HERO_END) / 0.12)) - 0.15 * summitK) - zoom) * 0.08;
      // on narrow screens the lead copy sits on top, so the plate starts low and rises into view
      const narrowLead = wide() ? 0 : heroFade;
      cyK += ((0.5 + 0.34 * narrowLead) - cyK) * 0.1;
      shrink += ((1 - 0.28 * narrowLead) - shrink) * 0.1;

      const ch = chapterOf(p);
      if (ch !== lastChapter) { lastChapter = ch; setChapter(ch); }
      if (heroRef.current) { heroRef.current.style.opacity = String(heroFade); heroRef.current.style.transform = `translateY(${(1 - heroFade) * -40}px)`; heroRef.current.style.visibility = heroFade < 0.02 ? "hidden" : "visible"; }
      if (hintRef.current) hintRef.current.style.opacity = String(heroFade * (1 - clamp01((el - 8) / 4) * 0.6));
      if (figRef.current) figRef.current.style.opacity = String(morph * (1 - summitK));
      if (summitRef.current) { const k = smooth(clamp01((p - 0.88) / 0.1)); summitRef.current.style.opacity = String(k); summitRef.current.style.transform = `translateY(${(1 - k) * 30}px)`; summitRef.current.style.visibility = k < 0.02 ? "hidden" : "visible"; }
      if (railRef.current) railRef.current.style.opacity = String(clamp01((p - 0.1) / 0.06) * (1 - clamp01((p - 0.9) / 0.08)));

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, Hh);
      const s = scaleFor();

      // floor plate and the axis the loop climbs
      {
        const base = project({ x: 0, y: (LAPS / 2) * H + 14, z: 0 }), top = project({ x: 0, y: -(LAPS / 2) * H - 30, z: 0 });
        ctx.save(); ctx.globalAlpha = 0.5 * morph; ctx.strokeStyle = C.line; ctx.lineWidth = 1;
        ctx.setLineDash([2, 5]);
        ctx.beginPath(); ctx.ellipse(base.x, base.y, R * 1.25 * s, R * 0.4 * s, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(base.x, base.y); ctx.lineTo(top.x, top.y); ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath(); ctx.moveTo(base.x - 5, base.y); ctx.lineTo(base.x + 5, base.y); ctx.moveTo(base.x, base.y - 5); ctx.lineTo(base.x, base.y + 5); ctx.stroke();
        ctx.restore();
      }

      // helix, depth sorted
      const segs = Math.round(LAPS * 72);
      const pts: { x: number; y: number; z: number; f: number }[] = [];
      for (let i = 0; i <= segs; i++) pts.push(project(pt((i / segs) * LAPS, morph)));
      const order = pts.map((_, i) => i).slice(0, -1).sort((i, j) => pts[j].z - pts[i].z);
      const focusSeg = (focusU / LAPS) * segs;
      ctx.lineCap = "round";
      for (const i of order) {
        const a = pts[i], b = pts[i + 1];
        const depth = clamp01((a.f - 0.72) / 0.5);
        const near = p > HERO_END ? 1 - clamp01(Math.abs(i - focusSeg) / 22) : 0;
        const al = 0.18 + depth * 0.62;
        ctx.strokeStyle = near > 0 ? rgba(C.acc, Math.min(1, al + near * 0.5)) : rgba(C.text, al * (0.5 + 0.5 * morph));
        ctx.lineWidth = 0.8 + depth * 1.3 + near * 1.2;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }

      // stage plates: square stations, the labelled lap in solid ink
      const plates: { s: number; q: ReturnType<typeof project>; lap: number }[] = [];
      for (let lap = 0; lap < LAPS; lap++) for (let k = 0; k < 6; k++) { const u = lap + k / 6; if (u > LAPS) continue; plates.push({ s: k, q: project(pt(u, morph)), lap }); }
      plates.sort((a, b) => b.q.z - a.q.z);
      for (const pl of plates) {
        const st = STAGES[pl.s];
        const main = pl.lap === 1;
        const on = (main && activeIdx === pl.s) || (main && hoverRef.current === st.id);
        const r = (main ? 4.2 : 2.6) * pl.q.f * s * (on ? 1.35 : 1);
        ctx.save(); ctx.globalAlpha = 0.3 + pl.q.f * 0.6;
        ctx.fillStyle = on ? C.acc : C.text;
        if (main || on) { ctx.beginPath(); square(pl.q.x, pl.q.y, r); ctx.fill(); }
        else { ctx.strokeStyle = C.text; ctx.lineWidth = 1; ctx.beginPath(); square(pl.q.x, pl.q.y, r); ctx.stroke(); }
        if (on) {
          const ph = (el * 0.8) % 1;
          ctx.strokeStyle = C.acc; ctx.lineWidth = 1;
          ctx.globalAlpha = 0.6; ctx.beginPath(); square(pl.q.x, pl.q.y, r + 6); ctx.stroke();
          ctx.globalAlpha = 0.45 * (1 - ph); ctx.beginPath(); square(pl.q.x, pl.q.y, r + 8 + ph * 26); ctx.stroke();
        }
        ctx.restore();
        if (main) {
          const lb = labelRefs.current[pl.s];
          if (lb) {
            lb.style.transform = `translate(${pl.q.x}px, ${pl.q.y - 14 * pl.q.f}px) translate(-50%,-100%)`;
            lb.style.opacity = String(Math.min(1, 0.35 + pl.q.f * 0.7) * morph * (1 - summitK) * (1 - narrowLead));
            lb.style.pointerEvents = narrowLead > 0.3 || summitK > 0.5 ? "none" : "auto";
            lb.style.zIndex = String(Math.round(pl.q.f * 100));
            lb.dataset.on = String(on);
          }
        }
      }

      // ideas climbing on their own clock
      if (morph > 0.95 && !REDUCED && now - lastSpawn > 260 && parts.length < 70) { spawn(); lastSpawn = now; }
      ctx.fillStyle = C.text;
      ctx.beginPath();
      for (const pr of parts) {
        if (!pr.alive) continue;
        pr.u += pr.v * dt;
        const gs = Math.floor(pr.u * 6);
        if (gs >= pr.nextStage) {
          pr.nextStage = gs + 1;
          if (Math.random() < DIE[STAGES[gs % 6].id] * 0.6) { pr.alive = false; pr.dying = 1; const q = project(pt(pr.u, morph)); pr.x = q.x; pr.y = q.y; pr.dx = (Math.random() - 0.5) * 60; pr.dy = 30 + Math.random() * 60; continue; }
        }
        if (pr.u >= LAPS) { pr.alive = false; pr.dying = 1; shipped++; const q = project(pt(LAPS, morph)); pr.x = q.x; pr.y = q.y; pr.dx = 0; pr.dy = -60; pr.shipped = true; continue; }
        const q = project(pt(pr.u, morph));
        square(q.x, q.y, (pr.sz * q.f * s) / 2);
      }
      ctx.fill();
      for (const pr of parts) {
        if (pr.alive || pr.dying <= 0) continue;
        pr.dying -= dt * 1.2; pr.x += pr.dx * dt; pr.y += pr.dy * dt; if (!pr.shipped) pr.dy += 120 * dt;
        ctx.save(); ctx.globalAlpha = Math.max(0, pr.dying);
        if (pr.shipped) {
          const r = 3 + (1 - pr.dying) * 12;
          ctx.strokeStyle = C.acc; ctx.lineWidth = 1.2; ctx.beginPath(); square(pr.x, pr.y, r); ctx.stroke();
          ctx.fillStyle = C.acc; ctx.beginPath(); square(pr.x, pr.y, 2); ctx.fill();
        } else {
          // struck out: an editor's ×
          const r = 2.6; ctx.strokeStyle = C.bad; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(pr.x - r, pr.y - r); ctx.lineTo(pr.x + r, pr.y + r); ctx.moveTo(pr.x + r, pr.y - r); ctx.lineTo(pr.x - r, pr.y + r); ctx.stroke();
        }
        ctx.restore();
      }
      for (let i = parts.length - 1; i >= 0; i--) if (!parts[i].alive && parts[i].dying <= 0) parts.splice(i, 1);

      // summit + base captions
      if (morph > 0.2) {
        const top = project(pt(LAPS, morph)), bot = project(pt(0, morph));
        ctx.save(); ctx.globalAlpha = morph;
        ctx.font = `500 10px ${mono}`; ctx.textAlign = "left";
        ctx.fillStyle = C.acc; ctx.fillText("SHIPPED ↑", top.x + 14, top.y - 16);
        ctx.fillStyle = C.muted; ctx.textAlign = "center"; ctx.fillText("IDEAS IN", bot.x, bot.y + 28);
        if (summitK > 0) {
          ctx.strokeStyle = C.acc; ctx.lineWidth = 1;
          for (let k = 0; k < 3; k++) { const ph = (el * 0.5 + k / 3) % 1; ctx.globalAlpha = summitK * (1 - ph) * 0.6; ctx.beginPath(); ctx.arc(top.x, top.y, 6 + ph * 90 * s, 0, Math.PI * 2); ctx.stroke(); }
        }
        ctx.restore();
      }

      if (now - lastEmit > 400) {
        lastEmit = now;
        const rate = considered ? Math.round((shipped / considered) * 100) + "%" : "—";
        statEls().forEach((e) => { const v = e.dataset.stat === "considered" ? String(considered) : e.dataset.stat === "shipped" ? String(shipped) : rate; if (e.textContent !== v) e.textContent = v; });
      }
      raf = running ? requestAnimationFrame(draw) : 0;
    };

    // only animate while the plate is on screen
    const start = () => { if (running) return; running = true; last = performance.now(); raf = requestAnimationFrame(draw); };
    const stop = () => { running = false; cancelAnimationFrame(raf); };
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop()));
    io.observe(sticky);

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
      stop(); io.disconnect(); ro.disconnect(); stopInk();
      window.removeEventListener("scroll", readScroll); window.removeEventListener("resize", readScroll);
      cv.removeEventListener("pointerdown", onDown); window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); sticky.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  const stage = chapter >= 0 && chapter < 6 ? STAGES[chapter] : null;
  const stageTopics = stage ? TOPICS.filter((t) => t.stage === stage.id) : [];

  return (
    <div ref={trackRef} className="relative h-[330vh] lg:h-[380vh]">
      <div ref={stickyRef} className="sticky top-[52px] h-[calc(100svh-52px)] w-full select-none overflow-hidden">
        <canvas ref={cvRef} className="absolute inset-0 cursor-grab touch-pan-y" role="img" aria-label="Figure 1: a straight line unfolds into a rising loop of six stages. Scrolling orbits the loop stage by stage while ideas climb it; most are struck out along the way, and the few that survive ship at the top." />

        {/* stage labels riding on the helix */}
        {STAGES.map((s, i) => (
          <button key={s.id} ref={(el) => { labelRefs.current[i] = el; }}
            onMouseEnter={() => setHoverStage(s.id)} onMouseLeave={() => setHoverStage(null)} onFocus={() => setHoverStage(s.id)} onBlur={() => setHoverStage(null)}
            onClick={() => jumpTo(TOUR_START + (i + 0.5) * BAND)}
            style={{ opacity: 0, position: "absolute", left: 0, top: 0, willChange: "transform" }}
            className="flex items-baseline gap-1.5 border border-rule bg-ink px-2 py-[3px] font-mono text-[.6rem] font-medium uppercase tracking-[.1em] text-text transition-colors hover:bg-text hover:text-ink data-[on=true]:border-acc data-[on=true]:bg-acc data-[on=true]:text-acc-ink"
            aria-label={`Stage ${s.roman}, ${s.label}: ${s.note}`}>
            <span className="serif text-[.72rem] normal-case italic tracking-normal">{s.roman}</span>{s.label}
          </button>
        ))}

        {/* figure caption */}
        <div ref={figRef} className="pointer-events-none absolute bottom-4 right-5 z-10 hidden max-w-[16rem] text-right font-mono text-[.58rem] uppercase leading-relaxed tracking-[.1em] text-muted md:block lg:right-8" style={{ opacity: 0 }}>
          Fig. 1 — The loop, rising.<br />Squares are ideas; × marks the ones killed. Drag to turn it.
        </div>

        {/* lead copy */}
        <div ref={heroRef} className="absolute inset-x-0 top-0 z-10 px-5 pt-6 sm:px-8 lg:pt-14" style={{ willChange: "opacity, transform" }}>
          <div className="mx-auto max-w-[1320px]"><div className="max-w-[40rem]">{hero}</div></div>
        </div>

        {/* chapter rail — right edge */}
        <div ref={railRef} className="absolute right-4 top-1/2 z-20 hidden -translate-y-1/2 flex-col items-end gap-2.5 sm:flex lg:right-8" style={{ opacity: 0 }}>
          {STAGES.map((s, i) => (
            <button key={s.id} onClick={() => jumpTo(TOUR_START + (i + 0.5) * BAND)} className={cn("group flex items-center gap-2 font-mono text-[.58rem] uppercase tracking-[.12em] transition-colors", chapter === i ? "text-text" : "text-muted hover:text-dim")} aria-label={`Go to stage ${s.roman}, ${s.label}`}>
              <span className={cn("transition-opacity", chapter === i ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>{s.label}</span>
              <span className={cn("serif w-5 text-right text-[.8rem] normal-case italic", chapter === i && "text-acc")}>{s.roman}</span>
            </button>
          ))}
          <button onClick={() => jumpTo(0.95)} className={cn("group flex items-center gap-2 font-mono text-[.58rem] uppercase tracking-[.12em]", chapter === 6 ? "text-acc" : "text-muted hover:text-dim")} aria-label="Go to the summit">
            <span className={cn("transition-opacity", chapter === 6 ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>Shipped</span><span className="w-5 text-right">↑</span>
          </button>
        </div>

        {/* stage column — chapters I..VI */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 px-5 pb-6 sm:px-8 lg:inset-y-0 lg:flex lg:items-center lg:pb-0">
          <div className="mx-auto w-full max-w-[1320px]">
            <AnimatePresence mode="wait">
              {stage && (
                <motion.article key={stage.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }} transition={{ duration: .4, ease: [.16, 1, .3, 1] }} className="pointer-events-auto max-w-[27rem] border-t border-rule bg-ink pt-4 pb-2 lg:bg-transparent">
                  <div className="flex items-baseline gap-4">
                    <span className="serif text-[clamp(3rem,6vw,5rem)] font-light italic leading-[.8] text-acc">{stage.roman}</span>
                    <span className="kicker">Stage {chapter + 1} of 6 · {stage.note}</span>
                  </div>
                  <h2 className="mt-3 text-[clamp(2rem,4vw,3.1rem)]">{stage.label}.</h2>
                  <p className="serif mt-3 text-[1.02rem] leading-snug text-dim">{STAGE_COPY[stage.id]}</p>
                  <ul className="m-0 mt-3 list-none border-t border-line-soft p-0">
                    {stageTopics.map((t) => (
                      <li key={t.id} className="border-b border-line-soft"><button onClick={() => go(t.id)} className="group grid w-full grid-cols-[2rem_1fr_auto] items-baseline gap-2 py-2 text-left text-[.9rem] text-dim hover:text-text"><span className="mono text-[.64rem] text-muted">{t.n}</span><span className="truncate">{t.title}</span><span className="text-acc transition-transform group-hover:translate-x-1">→</span></button></li>
                    ))}
                  </ul>
                  <button onClick={() => onStageClick?.(stage.id)} className="mt-3 font-mono text-[.6rem] uppercase tracking-[.12em] text-muted hover:text-acc">Show only {stage.label} in the curriculum ↓</button>
                </motion.article>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* summit — last chapter */}
        <div ref={summitRef} className="absolute inset-x-0 bottom-0 z-10 px-5 pb-10 sm:px-8 lg:inset-y-0 lg:flex lg:items-center lg:pb-0" style={{ opacity: 0, visibility: "hidden", willChange: "opacity, transform" }}>
          <div className="mx-auto w-full max-w-[1320px]"><div className="max-w-[36rem] bg-ink lg:bg-transparent">{summit}</div></div>
        </div>

        {/* scroll hint */}
        <div ref={hintRef} className="pointer-events-none absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2 font-mono text-[.58rem] uppercase tracking-[.16em] text-muted">
          <span>Scroll to climb the loop</span>
          <span className="block h-8 w-px overflow-hidden bg-line-soft"><span className="block h-3 w-px bg-acc scroll-drip" /></span>
        </div>
      </div>
    </div>
  );
}

const STAGE_COPY: Record<StageId, string> = {
  discover: "Most ideas should die here, cheaply, in a conversation. The craft is asking about the last time rather than the next time.",
  define: "Turn what you learned into a bet worth making: a strategy that says no, and a price that says what the thing is worth.",
  decide: "Capacity is fixed and intake is not, so the quarter is decided by where the line is drawn — and by what you are willing to say no to.",
  build: "A spec is a decision record, not a wish list. Instrument it before it ships, or you will never know what it did.",
  measure: "The experiment is the only tool that tells you what would have happened anyway. Everything else is a story about a chart.",
  land: "Shipping is not the finish. Adoption and the review that feeds the next lap are how the loop rises instead of repeating.",
};
