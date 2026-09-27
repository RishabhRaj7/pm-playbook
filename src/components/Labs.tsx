import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { REDUCED } from "@/lib/hooks";
import { cn } from "@/utils/cn";

/* ============================================================
   LABS — one hands-on simulation per topic. Each is built around
   the single idea the topic most needs you to feel, not just read:
   you play it, it pushes back, and the lesson arrives as a result
   you caused rather than a sentence you skimmed.
   ============================================================ */

function Lab({ title, status, children, lesson }: { title: string; status?: ReactNode; children: ReactNode; lesson?: ReactNode }) {
  return (
    <figure className="panel m-0 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line-soft px-5 py-3">
        <span className="kicker"><span className="mr-2 inline-block h-1.5 w-1.5 translate-y-[-1px] bg-acc blip" />Lab · {title}</span>
        {status && <span className="font-mono text-[.64rem] uppercase tracking-[.08em] text-dim">{status}</span>}
      </div>
      <div className="p-5">{children}</div>
      {lesson && <figcaption className="border-t border-line-soft px-5 py-3 text-[.86rem] text-dim"><b className="mr-2 font-mono text-[.6rem] font-medium uppercase tracking-[.12em] text-text">The lesson</b>{lesson}</figcaption>}
    </figure>
  );
}
const Meter = ({ label, v, max, tone }: { label: string; v: number; max: number; tone: "a" | "bad" | "acc" }) => (
  <div>
    <div className="flex justify-between font-mono text-[.6rem] uppercase tracking-[.1em] text-muted"><span>{label}</span><b className="font-medium text-text">{v}</b></div>
    <div className="mt-1 h-[3px] bg-line-soft"><motion.div className="h-full" style={{ background: `var(--${tone})` }} animate={{ width: `${Math.min(1, v / max) * 100}%` }} transition={{ type: "spring", stiffness: 120, damping: 18 }} /></div>
  </div>
);
/** Types a line out, character by character — an answer "being said". */
function Typed({ text, onDone }: { text: string; onDone?: () => void }) {
  const [n, setN] = useState(REDUCED ? text.length : 0);
  useEffect(() => {
    if (n >= text.length) { onDone?.(); return; }
    const id = setTimeout(() => setN((x) => x + 2), 14);
    return () => clearTimeout(id);
  }, [n, text, onDone]);
  return <>{text.slice(0, n)}{n < text.length && <span className="blip">▍</span>}</>;
}

/* ============ 01 Discovery — the interview simulator ============ */
const INTERVIEW = [
  { q: "Would you use a bulk export feature?", a: "Oh, definitely. That would be really useful.", fact: false, why: "A hypothetical about the future. People are generous with futures they will never have to live in." },
  { q: "How much would you pay for it?", a: "Hmm… maybe twenty a month? Hard to say.", fact: false, why: "Price in the abstract is fiction. Nothing is at stake, so the number means nothing." },
  { q: "Isn't exporting really painful today?", a: "Yes! It's such a pain.", fact: false, why: "A leading question. You told her the answer and she was polite enough to agree." },
  { q: "When did you last export data? Walk me through it.", a: "Monday. I exported everything, pivoted it by team, and pasted the chart into a slide for my manager.", fact: true, why: "A specific past event. Now you know the real job: a weekly slide, not a file." },
  { q: "What happened after you sent the slide?", a: "My manager asked why it didn't match finance's number. Took an hour to reconcile.", fact: true, why: "The consequence reveals the pain: trust in the number, not the export itself." },
  { q: "How often does that happen?", a: "Every single week. Honestly, that's why I asked for export.", fact: true, why: "Frequency, from behaviour. This is what makes a problem worth a quarter." },
];
export function InterviewLab() {
  const [asked, setAsked] = useState<number[]>([]);
  const [typing, setTyping] = useState(false);
  const log = useRef<HTMLDivElement>(null);
  const facts = asked.filter((i) => INTERVIEW[i].fact).length, flattery = asked.length - facts;
  useEffect(() => { log.current?.scrollTo({ top: log.current.scrollHeight, behavior: "smooth" }); }, [asked, typing]);
  const done = asked.length >= 3 && !typing;
  const ask = (i: number) => { if (typing || asked.includes(i)) return; setAsked((a) => [...a, i]); setTyping(true); };
  return (
    <Lab title="The interview simulator" status={`${asked.length} of 6 asked`} lesson={<>Ask about the last time, not the next time. The future is where people are polite; the past is where the facts are.</>}>
      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <p className="serif m-0 text-[1.05rem] leading-snug text-dim">Maya runs operations at a 40-person logistics firm. She asked for <b className="text-text">bulk export</b>. You have time for a few questions. Pick them.</p>
          <div className="mt-4 grid gap-1.5">
            {INTERVIEW.map((x, i) => (
              <button key={i} onClick={() => ask(i)} disabled={asked.includes(i) || typing} className={cn("border px-3 py-2 text-left text-[.9rem] transition-colors", asked.includes(i) ? "border-line-soft text-muted line-through decoration-line" : "border-line-soft bg-ink hover:border-rule disabled:opacity-60")}>“{x.q}”</button>
            ))}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-4">
            <Meter label="Facts collected" v={facts} max={3} tone="a" />
            <Meter label="Compliments collected" v={flattery} max={3} tone="bad" />
          </div>
        </div>
        <div ref={log} className="thin flex max-h-[26rem] min-h-[18rem] flex-col gap-3 overflow-y-auto border-l border-line-soft pl-5">
          {!asked.length && <p className="my-auto font-mono text-[.66rem] uppercase tracking-[.1em] text-muted">The transcript appears here.</p>}
          {asked.map((i, k) => {
            const x = INTERVIEW[i], last = k === asked.length - 1;
            return (
              <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <p className="m-0 text-right text-[.86rem] text-muted">You: “{x.q}”</p>
                <p className="serif m-0 mt-1 border-l-2 border-rule pl-3 text-[1.02rem] leading-snug text-text">Maya: “{last && typing ? <Typed text={x.a} onDone={() => setTyping(false)} /> : x.a}”</p>
                {!(last && typing) && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={cn("m-0 mt-1.5 font-mono text-[.64rem] leading-relaxed", x.fact ? "text-a" : "text-bad")}>{x.fact ? "FACT · " : "FLATTERY · "}<span className="normal-case text-dim">{x.why}</span></motion.p>}
              </motion.div>
            );
          })}
          <AnimatePresence>{done && (
            <motion.div initial={{ opacity: 0, scale: .96 }} animate={{ opacity: 1, scale: 1 }} className={cn("mt-2 border-2 p-3", facts >= 2 ? "border-a" : "border-bad")}>
              <b className={cn("serif text-[1.1rem]", facts >= 2 ? "text-a" : "text-bad")}>{facts >= 2 ? "You found the job." : "You collected compliments."}</b>
              <p className="m-0 mt-1 text-[.86rem] text-dim">{facts >= 2 ? "Maya doesn't want a file — she wants a weekly number her manager trusts. That might be one report view, not six weeks of export work." : "Everything you heard would justify building export, and none of it would survive contact with Maya's actual week. Try the questions about what already happened."}</p>
              <button className="mt-2 font-mono text-[.62rem] uppercase tracking-[.1em] text-muted hover:text-acc" onClick={() => setAsked([])}>Interview her again ↺</button>
            </motion.div>)}</AnimatePresence>
        </div>
      </div>
    </Lab>
  );
}

/* ============ 02 Strategy — strategy or slogan? ============ */
const STATEMENTS: [string, boolean, string][] = [
  ["Be the best product in our category.", false, "Everyone wants this. It chooses nothing and rules nothing out."],
  ["Win mid-market finance teams by owning month-end close; no enterprise procurement features this year.", true, "A where-to-play, a how-to-win, and an explicit no."],
  ["Grow revenue 40% next year.", false, "A goal, not a strategy. It says where you want to end up, not how you will get there."],
  ["Import is the constraint on activation, so two quarters go to import and nothing else in onboarding.", true, "A diagnosis, a guiding policy, and actions that follow from both."],
  ["Delight customers through relentless innovation.", false, "Sounds like a plan, decides nothing. Which customers? Delighted how? Instead of what?"],
  ["Compete on price with self-serve only; no sales team until 1,000 paying accounts.", true, "A trade-off you can hold people to — including what you will not hire."],
  ["Leverage AI across the product.", false, "A technology is not a strategy. Leverage it for whom, to win what?"],
  ["Serve clinics under ten staff, where incumbents' setup cost is prohibitive; decline hospital RFPs.", true, "Picks a segment for a reason, and names the tempting deals it will say no to."],
];
export function StrategySorter() {
  const shuffle = () => [...STATEMENTS.keys()].sort(() => Math.random() - 0.5);
  const [order, setOrder] = useState(shuffle);
  const [k, setK] = useState(0);
  const [picked, setPicked] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const cur = STATEMENTS[order[k]];
  const done = k >= order.length;
  const choose = (v: boolean) => { if (picked != null) return; setPicked(v); if (v === cur[1]) setScore((s) => s + 1); };
  const next = () => { setPicked(null); setK((x) => x + 1); };
  return (
    <Lab title="Strategy or slogan?" status={done ? `${score}/${order.length}` : `card ${k + 1} of ${order.length} · score ${score}`} lesson={<>A strategy is a choice that makes something else harder. If a sentence would fit on any company's wall, it is a slogan.</>}>
      <div className="mx-auto max-w-2xl">
        <div className="mb-4 flex gap-[3px]" aria-hidden>{order.map((_, i) => <i key={i} className="h-[3px] flex-1" style={{ background: i < k ? "var(--text)" : i === k ? "var(--acc)" : "var(--line-soft)" }} />)}</div>
        <AnimatePresence mode="wait">
          {!done ? (
            <motion.div key={k} initial={{ opacity: 0, x: 40, rotate: 2 }} animate={{ opacity: 1, x: 0, rotate: 0 }} exit={{ opacity: 0, x: picked === cur[1] ? -60 : 60, rotate: picked === cur[1] ? -4 : 4 }} transition={{ duration: .3 }}>
              <blockquote className="serif m-0 border-y-[3px] border-double border-rule py-6 text-center text-[clamp(1.3rem,2.6vw,1.9rem)] italic leading-snug text-text">“{cur[0]}”</blockquote>
              {picked == null ? (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button className="btn justify-center" onClick={() => choose(false)}>← Slogan</button>
                  <button className="btn btn-key justify-center" onClick={() => choose(true)}>Strategy →</button>
                </div>
              ) : (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-4 text-center" role="status">
                  <b className={cn("serif text-[1.2rem]", picked === cur[1] ? "text-a" : "text-bad")}>{picked === cur[1] ? "Right." : "Not quite."} It's {cur[1] ? "a strategy" : "a slogan"}.</b>
                  <p className="mx-auto mt-1 max-w-lg text-[.92rem] text-dim">{cur[2]}</p>
                  <button className="btn btn-key" onClick={next}>{k + 1 < order.length ? "Next card →" : "See how you did"}</button>
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-4 text-center">
              <p className="display m-0 text-[4rem]"><span className="text-acc">{score}</span><span className="text-muted">/{order.length}</span></p>
              <p className="serif text-[1.1rem] text-dim">{score === order.length ? "You can smell a slogan. Now go and find one in your own roadmap." : "The tell is always the same: does it say no to anything?"}</p>
              <button className="btn" onClick={() => { setOrder(shuffle()); setK(0); setScore(0); setPicked(null); }}>Shuffle and replay</button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Lab>
  );
}

/* ============ 03 Pricing — price vs volume ============ */
export function PriceVolumeLab() {
  const [p, setP] = useState(10);   // price change %
  const [v, setV] = useState(4);    // customers lost %
  const [m, setM] = useState(70);   // gross margin %
  const rev = (1 + p / 100) * (1 - v / 100) - 1;
  const unit0 = m / 100, unit1 = unit0 + p / 100;               // profit per unit, as a share of the old price
  const prof = unit0 > 0 ? (unit1 * (1 - v / 100)) / unit0 - 1 : 0;
  const breakEvenRev = p > 0 ? p / (100 + p) : 0;               // volume you can lose before revenue falls
  const breakEvenProf = p > 0 ? (p / 100) / (unit0 + p / 100) : 0;
  const W = 420, H = 180, pad = 26;
  const xs = (x: number) => pad + (x / 50) * (W - 2 * pad), ys = (y: number) => H - pad - (y / 50) * (H - 2 * pad);
  const curve = (fn: (x: number) => number) => Array.from({ length: 51 }, (_, i) => `${i ? "L" : "M"}${xs(i).toFixed(1)} ${ys(Math.min(50, fn(i) * 100)).toFixed(1)}`).join(" ");
  const Bar = ({ label, d }: { label: string; d: number }) => (
    <div>
      <div className="flex items-baseline justify-between"><span className="kicker">{label}</span><b className={cn("serif text-[1.8rem] font-semibold leading-none", d >= 0 ? "text-a" : "text-bad")}>{d >= 0 ? "+" : ""}{(d * 100).toFixed(1)}%</b></div>
      <div className="relative mt-2 h-3 bg-line-soft"><span className="absolute inset-y-0 left-1/2 w-px bg-rule" /><motion.span className="absolute inset-y-0" style={{ background: d >= 0 ? "var(--a)" : "var(--bad)" }} animate={{ left: d >= 0 ? "50%" : `${50 + Math.max(-50, d * 100)}%`, width: `${Math.min(50, Math.abs(d) * 100)}%` }} /></div>
    </div>
  );
  const S = ({ l, val, min, max, set, fmt }: { l: string; val: number; min: number; max: number; set: (n: number) => void; fmt: (n: number) => string }) => (
    <label className="block"><span className="flex justify-between text-[.84rem] text-dim"><span>{l}</span><b className="mono text-acc">{fmt(val)}</b></span><input type="range" min={min} max={max} value={val} onChange={(e) => set(+e.target.value)} /></label>
  );
  return (
    <Lab title="The price–volume trade" status={`+${p}% price vs ${v}% lost`} lesson={<>A price rise survives far more churn than intuition suggests — and at high margins, even more on profit than on revenue. The curves show exactly how much.</>}>
      <div className="grid gap-6 lg:grid-cols-[1fr_1.15fr]">
        <div className="space-y-4">
          <S l="Price change" val={p} min={-30} max={50} set={setP} fmt={(n) => (n >= 0 ? "+" : "") + n + "%"} />
          <S l="Customers you lose (or gain, if negative)" val={v} min={-20} max={40} set={setV} fmt={(n) => n + "%"} />
          <S l="Gross margin" val={m} min={10} max={95} set={setM} fmt={(n) => n + "%"} />
          <div className="space-y-4 border-t border-line-soft pt-4"><Bar label="Revenue" d={rev} /><Bar label="Gross profit" d={prof} /></div>
        </div>
        <div>
          <span className="kicker">How much volume can a price rise lose before it hurts?</span>
          <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 h-auto w-full overflow-visible" role="img" aria-label="Break-even curves: the share of customers you can lose after a price rise before revenue or profit falls.">
            {[0, 10, 20, 30, 40, 50].map((g) => <g key={g}><line x1={pad} x2={W - pad} y1={ys(g)} y2={ys(g)} stroke="var(--line-soft)" strokeDasharray="2 4" /><text x={pad - 6} y={ys(g) + 3} textAnchor="end" fontSize="8" fill="var(--muted)" fontFamily="var(--f-mono)">{g}%</text></g>)}
            <path d={curve((x) => x / (100 + x))} fill="none" stroke="var(--text)" strokeWidth="1.5" />
            <path d={curve((x) => (x / 100) / (m / 100 + x / 100))} fill="none" stroke="var(--acc)" strokeWidth="1.8" />
            <text x={W - pad} y={ys(Math.min(48, (0.5 / (m / 100 + 0.5)) * 100)) - 6} textAnchor="end" fontSize="9" fill="var(--acc)" fontFamily="var(--f-mono)">PROFIT BREAK-EVEN</text>
            <text x={W - pad} y={ys(50 / 150 * 100) + 14} textAnchor="end" fontSize="9" fill="var(--text)" fontFamily="var(--f-mono)">REVENUE BREAK-EVEN</text>
            {p >= 0 && p <= 50 && v >= 0 && v <= 50 && <motion.rect animate={{ x: xs(p) - 5, y: ys(v) - 5 }} transition={{ type: "spring", stiffness: 200, damping: 20 }} width="10" height="10" fill={prof >= 0 ? "var(--a)" : "var(--bad)"} stroke="var(--ink)" />}
            <text x={W / 2} y={H - 4} textAnchor="middle" fontSize="8" fill="var(--muted)" fontFamily="var(--f-mono)">PRICE RISE →</text>
          </svg>
          <p className="mt-2 text-[.86rem] text-dim">{p > 0 ? <>At +{p}%, you can lose up to <b className="text-text">{(breakEvenRev * 100).toFixed(1)}%</b> of customers before revenue falls, and <b className="text-acc">{(breakEvenProf * 100).toFixed(1)}%</b> before gross profit does. The square is you: {prof >= 0 ? "under the line, so you're ahead." : "over the line, so you've lost."}</> : "Try a price rise to see how much churn it can absorb. (A cut has to win a lot of new volume just to stand still.)"}</p>
        </div>
      </div>
    </Lab>
  );
}

/* ============ 05 Specs — slicing a feature ============ */
const LAYERS = ["UI", "API", "Data"], FEATS = ["Import", "Map fields", "Schedule", "Alerts"];
export function SlicingLab() {
  const [mode, setMode] = useState<"horizontal" | "vertical">("vertical");
  const [week, setWeek] = useState(0);
  const [play, setPlay] = useState(false);
  useEffect(() => {
    if (!play) return;
    if (week >= 12) { setPlay(false); return; }
    const id = setTimeout(() => setWeek((w) => w + 1), REDUCED ? 0 : 420);
    return () => clearTimeout(id);
  }, [play, week]);
  // week a cell is finished, per mode (one cell per week)
  const doneAt = (m: "horizontal" | "vertical", layer: number, f: number) => m === "horizontal" ? (2 - layer) * 4 + f + 1 : f * 3 + (2 - layer) + 1;
  const usable = (m: "horizontal" | "vertical", w: number) => FEATS.filter((_, f) => [0, 1, 2].every((l) => doneAt(m, l, f) <= w)).length;
  const W = 300, H = 110, pad = 18;
  const line = (m: "horizontal" | "vertical") => Array.from({ length: 13 }, (_, w) => `${w ? "L" : "M"}${pad + (w / 12) * (W - 2 * pad)} ${H - pad - (usable(m, w) / 4) * (H - 2 * pad)}`).join(" ");
  return (
    <Lab title="Slice it thin" status={`week ${week} of 12 · ${usable(mode, week)} usable`} lesson={<>Horizontal slices deliver nothing a customer can touch until the last layer lands, so all the feedback — and all the risk — arrives at the end. Vertical slices let you learn, and stop, at any point.</>}>
      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-1">
            <button className="pill" aria-pressed={mode === "vertical"} onClick={() => setMode("vertical")}>Vertical slices</button>
            <button className="pill" aria-pressed={mode === "horizontal"} onClick={() => setMode("horizontal")}>Horizontal layers</button>
            <button className="btn ml-auto !py-1.5" onClick={() => { if (week >= 12) setWeek(0); setPlay((x) => !x); }}>{play ? "Pause" : week >= 12 ? "Replay" : "Play the quarter"}</button>
          </div>
          <div className="grid grid-cols-[3rem_repeat(4,1fr)] gap-1">
            <span />{FEATS.map((f, i) => <span key={f} className={cn("text-center font-mono text-[.6rem] uppercase tracking-[.06em]", [0, 1, 2].every((l) => doneAt(mode, l, i) <= week) ? "text-a" : "text-muted")}>{f}</span>)}
            {LAYERS.map((l, li) => (
              <span key={l} className="contents">
                <span className="flex items-center font-mono text-[.6rem] uppercase text-muted">{l}</span>
                {FEATS.map((f, fi) => {
                  const d = doneAt(mode, li, fi) <= week;
                  return <motion.span key={f} className="grid h-11 place-content-center border font-mono text-[.62rem]" animate={{ backgroundColor: d ? "var(--text)" : "var(--ink)", color: d ? "var(--ink)" : "var(--muted)", borderColor: d ? "var(--text)" : "var(--line-soft)" }} transition={{ duration: .25 }}>wk {doneAt(mode, li, fi)}</motion.span>;
                })}
              </span>
            ))}
          </div>
          <input type="range" min={0} max={12} value={week} onChange={(e) => { setPlay(false); setWeek(+e.target.value); }} aria-label="Week" className="mt-4" />
        </div>
        <div>
          <span className="kicker">Features a customer can use</span>
          <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 h-auto w-full" role="img" aria-label="Usable features over twelve weeks: vertical slicing delivers one every three weeks, horizontal delivers everything in the last four weeks.">
            {[0, 1, 2, 3, 4].map((g) => <line key={g} x1={pad} x2={W - pad} y1={H - pad - (g / 4) * (H - 2 * pad)} y2={H - pad - (g / 4) * (H - 2 * pad)} stroke="var(--line-soft)" strokeDasharray="2 4" />)}
            <path d={line("horizontal")} fill="none" stroke={mode === "horizontal" ? "var(--acc)" : "var(--line)"} strokeWidth={mode === "horizontal" ? 2 : 1.2} />
            <path d={line("vertical")} fill="none" stroke={mode === "vertical" ? "var(--acc)" : "var(--line)"} strokeWidth={mode === "vertical" ? 2 : 1.2} />
            <motion.line animate={{ x1: pad + (week / 12) * (W - 2 * pad), x2: pad + (week / 12) * (W - 2 * pad) }} y1={pad / 2} y2={H - pad} stroke="var(--text)" strokeDasharray="3 3" />
            <text x={pad} y={H - 4} fontSize="8" fill="var(--muted)" fontFamily="var(--f-mono)">WEEK 0</text><text x={W - pad} y={H - 4} textAnchor="end" fontSize="8" fill="var(--muted)" fontFamily="var(--f-mono)">WEEK 12</text>
          </svg>
          <div className="mt-3 grid grid-cols-2 gap-px bg-line-soft">
            {(["vertical", "horizontal"] as const).map((m) => <div key={m} className="bg-ink-1 p-3"><span className="kicker">{m}</span><b className="serif block text-[1.6rem] leading-none">{usable(m, week)}<span className="text-[1rem] text-muted">/4</span></b><span className="text-[.74rem] text-muted">first usable: week {m === "vertical" ? 3 : 9}</span></div>)}
          </div>
          <p className="mt-3 text-[.86rem] text-dim">Stop the quarter at week 6. Vertical: two features in customers' hands and six weeks of feedback. Horizontal: a finished database and nothing anyone can click.</p>
        </div>
      </div>
    </Lab>
  );
}

/* ============ 06 Analytics — one person, two IDs ============ */
export function IdentityLab() {
  const [stitch, setStitch] = useState(false);
  // 12 people browse on phones; 8 of them later sign up on desktop; 4 desktop-only visitors, 2 sign up
  const visitors = stitch ? 16 : 24, signups = 10, rate = signups / visitors;
  const lanes = useMemo(() => Array.from({ length: 12 }, (_, i) => ({ id: i, converts: i < 8 })), []);
  return (
    <Lab title="One person, two IDs" status={stitch ? "identities stitched" : "anonymous IDs only"} lesson={<>If the anonymous device ID is never linked to the user ID at sign-up, every cross-device customer is counted twice and the phone journey that persuaded them disappears from the funnel.</>}>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <button role="switch" aria-checked={stitch} onClick={() => setStitch((s) => !s)} className="flex items-center gap-3 border border-rule px-3 py-2 text-left">
          <span className={cn("relative h-4 w-8 border border-rule transition-colors", stitch && "bg-acc")}><motion.span className="absolute top-[1px] h-3 w-3 bg-text" animate={{ left: stitch ? 16 : 1 }} /></span>
          <span className="font-mono text-[.66rem] uppercase tracking-[.1em]">Stitch anon ID → user ID at sign-up</span>
        </button>
        <span className="text-[.84rem] text-muted">Twelve people browse on their phones. Eight of them sign up later on a laptop.</span>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <svg viewBox="0 0 420 230" className="h-auto w-full" role="img" aria-label="Phone visits on the left, desktop sign-ups on the right; when stitched, lines connect each phone visitor to their sign-up.">
          <text x="60" y="14" textAnchor="middle" fontSize="9" fill="var(--muted)" fontFamily="var(--f-mono)">PHONE · anon_…</text>
          <text x="360" y="14" textAnchor="middle" fontSize="9" fill="var(--muted)" fontFamily="var(--f-mono)">LAPTOP · sign-up</text>
          {lanes.map((l) => {
            const y = 28 + l.id * 16.5;
            return (
              <g key={l.id}>
                <rect x="30" y={y - 5} width="60" height="10" fill="none" stroke="var(--text)" strokeWidth=".8" />
                <text x="60" y={y + 3} textAnchor="middle" fontSize="7" fill="var(--text)" fontFamily="var(--f-mono)">anon_{(l.id * 7919 % 4096).toString(16)}</text>
                {l.converts && <>
                  <rect x="330" y={y - 5} width="60" height="10" fill={stitch ? "var(--acc)" : "none"} stroke={stitch ? "var(--acc)" : "var(--text)"} strokeWidth=".8" />
                  <text x="360" y={y + 3} textAnchor="middle" fontSize="7" fill={stitch ? "var(--acc-ink)" : "var(--text)"} fontFamily="var(--f-mono)">{stitch ? `user_${40 + l.id}` : `anon_${(l.id * 104729 % 4096).toString(16)}`}</text>
                  <motion.path d={`M90 ${y} C 210 ${y}, 210 ${y}, 330 ${y}`} fill="none" stroke="var(--acc)" strokeWidth="1.2" initial={false} animate={{ pathLength: stitch ? 1 : 0, opacity: stitch ? 1 : 0 }} transition={{ duration: .6, delay: stitch ? l.id * .05 : 0 }} />
                  {!stitch && <text x="210" y={y + 3} textAnchor="middle" fontSize="8" fill="var(--bad)" fontFamily="var(--f-mono)">? ? ?</text>}
                </>}
              </g>
            );
          })}
        </svg>
        <div className="space-y-3">
          {([["Visitors counted", visitors, stitch ? "16 real people" : "24 — eight people counted twice"], ["Sign-ups", signups, "the same either way"], ["Conversion", `${(rate * 100).toFixed(0)}%`, stitch ? "the true rate" : "understated by a third"], ["Sign-ups the phone journey influenced", stitch ? 8 : 0, stitch ? "now visible" : "invisible: mobile looks useless"]] as const).map(([l, val, note]) => (
            <div key={l} className="border-b border-line-soft pb-2">
              <span className="kicker">{l}</span>
              <div className="flex items-baseline justify-between gap-3"><motion.b key={String(val)} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="serif text-[1.7rem] font-semibold leading-none">{val}</motion.b><span className={cn("text-right text-[.76rem]", stitch ? "text-a" : "text-bad")}>{note}</span></div>
            </div>
          ))}
        </div>
      </div>
    </Lab>
  );
}

/* ============ 09 Launch — blast radius ============ */
const STAGES = [0, 1, 5, 25, 50, 100];
export function RolloutLab() {
  const [stage, setStage] = useState(0);
  const [hist, setHist] = useState<number[]>([0.5]);
  const [affected, setAffected] = useState(0);
  const [ended, setEnded] = useState<null | "rolled-back" | "shipped">(null);
  const users = 1_000_000;
  const noise = () => (Math.random() - 0.5) * 0.08;
  const day = (s: number) => { const share = STAGES[s] / 100; setHist((h) => [...h, 0.5 + 2 * share + noise()]); setAffected((a) => a + Math.round(users * share * 0.02)); };
  const advance = () => { if (ended) return; const s = Math.min(STAGES.length - 1, stage + 1); setStage(s); day(s); if (s === STAGES.length - 1) setEnded("shipped"); };
  const bigBang = () => { if (ended || stage) return; setStage(STAGES.length - 1); day(STAGES.length - 1); setEnded("shipped"); };
  const rollback = () => { if (ended || !stage) return; setStage(0); setHist((h) => [...h, 0.5 + noise()]); setEnded("rolled-back"); };
  const reset = () => { setStage(0); setHist([0.5]); setAffected(0); setEnded(null); };
  const alert = hist[hist.length - 1] > 0.6;
  const W = 360, H = 130, pad = 22, maxY = 2.8;
  const pts = hist.map((y, i) => [pad + (i / 7) * (W - 2 * pad), H - pad - (y / maxY) * (H - 2 * pad)]);
  return (
    <Lab title="Blast radius" status={`${STAGES[stage]}% of users · day ${hist.length - 1}`} lesson={<>The bug is identical in every run. What changes is how many people meet it before you notice. Phased rollouts don't prevent defects — they cap the damage while a guardrail has time to speak.</>}>
      <p className="serif m-0 max-w-3xl text-[1.02rem] leading-snug text-dim">You are shipping a new checkout to a million users. It has a bug you don't know about: <b className="text-text">2% of people who see it can't pay.</b> Each step is one day. Watch the error-rate guardrail and decide when to push on and when to pull back.</p>
      <div className="mt-5 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div>
          <div className="flex items-baseline justify-between"><span className="kicker">Checkout error rate · guardrail at 0.6%</span>{alert && <span className="blip font-mono text-[.62rem] uppercase tracking-[.1em] text-bad">Guardrail breached</span>}</div>
          <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 h-auto w-full" role="img" aria-label="Daily checkout error rate against a 0.6% guardrail.">
            <line x1={pad} x2={W - pad} y1={H - pad - (0.6 / maxY) * (H - 2 * pad)} y2={H - pad - (0.6 / maxY) * (H - 2 * pad)} stroke="var(--bad)" strokeDasharray="4 3" />
            <path d={pts.map((q, i) => `${i ? "L" : "M"}${q[0]} ${q[1]}`).join(" ")} fill="none" stroke="var(--text)" strokeWidth="1.6" />
            {pts.map((q, i) => <rect key={i} x={q[0] - 3} y={q[1] - 3} width="6" height="6" fill={hist[i] > 0.6 ? "var(--bad)" : "var(--text)"} />)}
            <text x={pad} y={H - 5} fontSize="8" fill="var(--muted)" fontFamily="var(--f-mono)">DAY 0</text>
          </svg>
          <div className="mt-3 flex gap-1" aria-label="Rollout stages">{STAGES.slice(1).map((s, i) => <span key={s} className={cn("flex-1 border py-1 text-center font-mono text-[.62rem]", stage >= i + 1 ? "border-text bg-text text-ink" : "border-line-soft text-muted")}>{s}%</span>)}</div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="btn btn-key !py-2" onClick={advance} disabled={!!ended}>{stage === 0 ? "Start at 1%" : `Advance to ${STAGES[Math.min(stage + 1, 5)]}%`} →</button>
            <button className="btn !py-2" onClick={rollback} disabled={!!ended || !stage}>Roll back</button>
            <button className="btn !py-2" onClick={bigBang} disabled={!!ended || stage > 0}>Big bang: 100% now</button>
          </div>
        </div>
        <div>
          <span className="kicker">People who couldn't pay</span>
          <motion.b key={affected} initial={{ scale: 1.15 }} animate={{ scale: 1 }} className={cn("serif block text-[3rem] font-semibold leading-none", affected > 5000 ? "text-bad" : "text-text")}>{affected.toLocaleString()}</motion.b>
          <AnimatePresence>{ended && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cn("mt-4 border-2 p-3", ended === "rolled-back" && affected < 3000 ? "border-a" : "border-bad")} role="status">
              <b className="serif text-[1.1rem]">{ended === "rolled-back" ? (affected < 3000 ? "Caught early." : "Caught — eventually.") : "Shipped to everyone."}</b>
              <p className="m-0 mt-1 text-[.86rem] text-dim">{ended === "rolled-back" ? `The guardrail did its job. ${affected.toLocaleString()} people hit the bug instead of the 20,000 a big-bang release would have hurt on day one.` : `Every user now meets the bug: ${affected.toLocaleString()} failed payments so far, and 20,000 more each day until someone notices.`}</p>
              <button className="mt-2 font-mono text-[.62rem] uppercase tracking-[.1em] text-muted hover:text-acc" onClick={reset}>Run it again ↺</button>
            </motion.div>)}</AnimatePresence>
        </div>
      </div>
    </Lab>
  );
}

/* ============ 10 Frameworks I — the 5 whys ladder ============ */
const WHYS: { q: string; opts: [string, "go" | "blame" | "vague", string][] }[] = [
  { q: "Checkout conversion fell 8% on Tuesday. Why?", opts: [["The card form failed for some Safari users", "go", "Specific and testable. Keep going."], ["Customers were less motivated on Tuesday", "vague", "Untestable. A 5 Whys chain needs a cause you can check."]] },
  { q: "Why did the card form fail?", opts: [["A payment-provider script update renamed a field", "go", "A mechanism, not a person. Keep going."], ["The front-end engineer made a mistake", "blame", "Stopping at a person ends the investigation. People make mistakes; systems decide whether they ship."]] },
  { q: "Why did the provider's change reach production?", opts: [["Their script loads live from a CDN, unpinned", "go", "Now you are looking at how the system is built."], ["Nobody was paying attention", "vague", "Too vague to fix. What, specifically, would 'paying attention' have caught?"]] },
  { q: "Why was it unpinned?", opts: [["Nobody owns third-party script versions", "go", "An ownership gap. These are the roots that keep producing incidents."], ["It's the provider's fault", "blame", "Maybe — but it isn't actionable by you. Ask what you control."]] },
  { q: "Why did it take a whole day to notice?", opts: [["No alert on checkout success rate by browser", "go", "That's the root. Everything above it is a symptom."], ["Support was slow to escalate", "blame", "Support reported what they saw. The system gave them nothing to see sooner."]] },
];
export function WhysLadder() {
  const [path, setPath] = useState<number[]>([]);
  const [miss, setMiss] = useState<{ level: number; i: number } | null>(null);
  const level = path.length, done = level >= WHYS.length;
  const pick = (i: number) => {
    const o = WHYS[level].opts[i];
    if (o[1] === "go") { setPath((p) => [...p, i]); setMiss(null); } else setMiss({ level, i });
  };
  return (
    <Lab title="Climb down the five whys" status={`${level} of 5 whys`} lesson={<>Each good "why" moves from a person to a mechanism to a missing control. If your chain ends at someone's name, it ended too early.</>}>
      <ol className="relative m-0 list-none space-y-3 border-l border-line-soft p-0 pl-6">
        {WHYS.slice(0, Math.min(level + 1, WHYS.length)).map((w, l) => {
          const chosen = path[l];
          return (
            <motion.li key={l} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="relative">
              <span className={cn("absolute -left-[30px] top-1 grid h-4 w-4 place-content-center border text-[.55rem] font-mono", chosen != null ? "border-text bg-text text-ink" : "border-acc bg-acc text-acc-ink")}>{l + 1}</span>
              <p className="serif m-0 text-[1.08rem] font-semibold">{w.q}</p>
              {chosen != null ? <p className="m-0 mt-1 text-[.92rem] text-dim">→ {w.opts[chosen][0]} <span className="font-mono text-[.62rem] text-a">✓</span></p> : (
                <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                  {w.opts.map((o, i) => <button key={i} onClick={() => pick(i)} className={cn("border px-3 py-2 text-left text-[.9rem] transition-colors", miss?.level === l && miss.i === i ? "border-bad text-bad" : "border-line-soft bg-ink hover:border-rule")}>{o[0]}</button>)}
                </div>
              )}
              <AnimatePresence>{miss?.level === l && <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="m-0 mt-2 overflow-hidden border-l-2 border-bad pl-3 text-[.86rem] text-dim"><b className="text-bad">{WHYS[l].opts[miss.i][1] === "blame" ? "That's blame. " : "Too vague. "}</b>{WHYS[l].opts[miss.i][2]}</motion.p>}</AnimatePresence>
            </motion.li>
          );
        })}
      </ol>
      <AnimatePresence>{done && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-5 border-2 border-a p-4">
          <b className="serif text-[1.2rem] text-a">Root cause found. Now the countermeasures:</b>
          <ul className="m-0 mt-2 list-none space-y-1 p-0 text-[.92rem] text-dim">
            <li>1 · Pin third-party script versions and review upgrades like any dependency.</li>
            <li>2 · Name an owner for third-party scripts.</li>
            <li>3 · Alert on checkout success rate, split by browser, within the hour.</li>
          </ul>
          <button className="mt-3 font-mono text-[.62rem] uppercase tracking-[.1em] text-muted hover:text-acc" onClick={() => { setPath([]); setMiss(null); }}>Start again ↺</button>
        </motion.div>)}</AnimatePresence>
    </Lab>
  );
}

/* ============ 12 Frameworks III — stakeholder grid ============ */
type Quad = "manage" | "satisfy" | "inform" | "monitor";
const QUADS: { id: Quad; label: string; axis: string; how: string }[] = [
  { id: "satisfy", label: "Keep satisfied", axis: "High power · low interest", how: "Short, infrequent updates on what affects them. Never surprise them." },
  { id: "manage", label: "Manage closely", axis: "High power · high interest", how: "Involve early and often. Their objections are your design input." },
  { id: "monitor", label: "Monitor", axis: "Low power · low interest", how: "A line in the release notes. Check occasionally that nothing changed." },
  { id: "inform", label: "Keep informed", axis: "Low power · high interest", how: "Regular, detailed updates. They are often your best early warning." },
];
const PEOPLE: { name: string; note: string; q: Quad }[] = [
  { name: "CFO", note: "Signs off the budget; rarely reads product updates.", q: "satisfy" },
  { name: "VP Engineering", note: "Owns the team building it; reviews scope weekly.", q: "manage" },
  { name: "Head of Support", note: "Will take every ticket the launch creates.", q: "inform" },
  { name: "Legal counsel", note: "Must approve data retention; otherwise uninvolved.", q: "satisfy" },
  { name: "Beta power users", note: "Vocal, detailed, influence nobody's budget.", q: "inform" },
  { name: "Sales leader", note: "Their quota depends on the launch date.", q: "manage" },
  { name: "Facilities team", note: "Entirely unaffected.", q: "monitor" },
];
export function StakeholderGrid() {
  const [placed, setPlaced] = useState<Record<string, Quad>>({});
  const [sel, setSel] = useState<string | null>(null);
  const [hover, setHover] = useState<Quad | null>(null);
  const place = (name: string, q: Quad) => { setPlaced((p) => ({ ...p, [name]: q })); setSel(null); };
  const right = PEOPLE.filter((p) => placed[p.name] === p.q).length, count = Object.keys(placed).length;
  const unplaced = PEOPLE.filter((p) => !placed[p.name]);
  return (
    <Lab title="Map the stakeholders" status={`${count}/${PEOPLE.length} placed · ${right} right`} lesson={<>Power decides who can stop you; interest decides who is paying attention. PMs over-serve the loud high-interest people and under-serve the quiet high-power ones — until the CFO reads about the launch in a board pack.</>}>
      <p className="m-0 mb-3 text-[.86rem] text-muted">Drag a card onto the grid — or tap a card, then tap a square.</p>
      <div className="grid gap-5 lg:grid-cols-[15rem_1fr]">
        <div className="flex flex-wrap content-start gap-1.5 lg:flex-col">
          {unplaced.map((p) => (
            <button key={p.name} draggable onDragStart={(e) => { e.dataTransfer.setData("text/plain", p.name); setSel(p.name); }} onClick={() => setSel(sel === p.name ? null : p.name)} aria-pressed={sel === p.name} className={cn("cursor-grab border px-3 py-2 text-left transition-colors active:cursor-grabbing", sel === p.name ? "border-acc bg-[color-mix(in_srgb,var(--acc)_10%,transparent)]" : "border-line-soft bg-ink hover:border-rule")}>
              <b className="serif block text-[1rem]">{p.name}</b><span className="block text-[.76rem] leading-snug text-muted">{p.note}</span>
            </button>
          ))}
          {!unplaced.length && <div className="border border-dashed border-line p-3 text-[.86rem] text-dim">All placed. <b className="text-text">{right} of {PEOPLE.length}</b> where they belong. <button className="link" onClick={() => setPlaced({})}>Reset</button></div>}
        </div>
        <div className="relative">
          <span className="absolute -left-1 top-1/2 hidden -translate-x-full -translate-y-1/2 font-mono text-[.58rem] uppercase tracking-[.1em] text-muted [writing-mode:vertical-rl] rotate-180 sm:block">Power ↑</span>
          <div className="grid grid-cols-2 gap-px bg-line-soft">
            {QUADS.map((q) => {
              const here = PEOPLE.filter((p) => placed[p.name] === q.id);
              return (
                <div key={q.id} role="button" tabIndex={0} aria-label={`${q.label}: ${q.axis}`} onClick={() => sel && place(sel, q.id)} onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && sel) place(sel, q.id); }}
                  onDragOver={(e) => { e.preventDefault(); setHover(q.id); }} onDragLeave={() => setHover(null)} onDrop={(e) => { e.preventDefault(); setHover(null); const n = e.dataTransfer.getData("text/plain"); if (n) place(n, q.id); }}
                  className={cn("min-h-[9.5rem] bg-ink p-3 transition-colors", (hover === q.id || (sel && "cursor-pointer")) && "hover:bg-ink-1", hover === q.id && "!bg-ink-2")}>
                  <b className="serif block text-[1.05rem]">{q.label}</b>
                  <span className="block font-mono text-[.56rem] uppercase tracking-[.08em] text-muted">{q.axis}</span>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <AnimatePresence>{here.map((p) => (
                      <motion.button key={p.name} layout initial={{ scale: .6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: .6, opacity: 0 }} onClick={(e) => { e.stopPropagation(); setPlaced((x) => { const n = { ...x }; delete n[p.name]; return n; }); }} title={p.q === q.id ? "Right quadrant — tap to take back" : `Belongs in “${QUADS.find((z) => z.id === p.q)?.label}” — tap to take back`}
                        className={cn("border px-2 py-0.5 font-mono text-[.64rem]", p.q === q.id ? "border-a text-a" : "border-bad text-bad")}>{p.name} {p.q === q.id ? "✓" : "✗"}</motion.button>
                    ))}</AnimatePresence>
                  </div>
                  {here.length > 0 && <p className="m-0 mt-2 text-[.76rem] leading-snug text-dim">{q.how}</p>}
                </div>
              );
            })}
          </div>
          <span className="mt-1 block text-right font-mono text-[.58rem] uppercase tracking-[.1em] text-muted">Interest →</span>
        </div>
      </div>
    </Lab>
  );
}
