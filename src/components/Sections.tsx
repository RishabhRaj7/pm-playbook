import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { Case, Framework, Section, Step, Term, Topic } from "@/data";
import { STATS } from "@/data";
import Viz from "./Viz";
import { CaseChart, ToolFor } from "./Tools";
import { useStore } from "@/lib/progress";
import { cn } from "@/utils/cn";

export const Html = ({ html, className, as: Tag = "span" }: { html?: string; className?: string; as?: any }) => <Tag className={className} dangerouslySetInnerHTML={{ __html: html ?? "" }} />;
const sub = (s: string | undefined, t: Topic) => (s ?? "").replace("{N}", String(t.terms?.length ?? 0));

export function SecHead({ s, t, right }: { s: Section; t: Topic; right?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        {s.eyebrow && <p className="eyebrow rv">{s.eyebrow}</p>}
        <Html as="h2" className="rv d1 text-[clamp(1.7rem,3.4vw,2.6rem)] prose" html={sub(s.h, t)} />
        {s.lede && <Html as="p" className="lede rv d2 mt-4 mb-0 prose" html={sub(s.lede, t)} />}
      </div>
      {right}
    </div>
  );
}

/* ---------- HERO ---------- */
export function Hero({ s, t, stageLabel, onNext }: { s: Section; t: Topic; stageLabel: string; onNext: () => void }) {
  const p = s.panel;
  return (
    <section id={s.id} className="relative py-12 lg:py-16">
      <div className="grid gap-10 lg:grid-cols-[1.05fr_.95fr] lg:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-5 rise">
            <span className="chip border-acc/50 text-acc">{t.n}</span><span className="chip">{stageLabel}</span><span className="chip">{s.tag}</span>
          </div>
          <Html as="h1" className="rise text-[clamp(2.2rem,5vw,4.2rem)] prose" html={s.h} />
          <Html as="p" className="lede rise mt-6 prose" html={s.lede} />
          <div className="mt-6 flex flex-wrap gap-2 rise">{s.chips?.map((c) => <span key={c} className="chip">{sub(c, t)}</span>)}</div>
          <div className="mt-8 flex flex-wrap gap-3 rise">
            <button className="btn btn-key" onClick={() => document.getElementById(t.sections[1]?.id)?.scrollIntoView({ behavior: "smooth", block: "start" })}>Start reading ↓</button>
            <button className="btn" onClick={onNext}>Next topic →</button>
          </div>
        </div>
        <div className="rise" style={{ animationDelay: ".2s" }}>
          {typeof p === "string" ? <ToolFor id={p} /> : p ? (
            <div className="panel p-6 relative overflow-hidden">
              <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full blur-3xl opacity-40" style={{ background: "var(--acc)" }} />
              <span className="font-mono text-[.62rem] uppercase tracking-[.2em] text-muted">{p.k}</span>
              <p className="display mt-3 text-[clamp(1.4rem,2.4vw,2rem)] text-text">{p.big}</p>
              <ul className="mt-5 space-y-3 list-none p-0 m-0">
                {p.items?.map((it: string, i: number) => <li key={i} className="flex gap-3 text-[.9rem] text-dim"><span className="mono text-acc text-[.7rem] mt-1">0{i + 1}</span><span>{it}</span></li>)}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

/* ---------- BIG IDEA ---------- */
export function BigIdea({ s, t }: { s: Section; t: Topic }) {
  return (
    <section id={s.id} className="py-14 border-t border-line-soft">
      <SecHead s={s} t={t} />
      {s.statement && <blockquote className="rv panel my-8 px-7 py-6 border-l-4 border-l-acc"><p className="display m-0 text-[clamp(1.2rem,2.2vw,1.7rem)] leading-tight text-text">“{s.statement}”</p></blockquote>}
      <div className="grid gap-3 md:grid-cols-3">
        {s.cards?.map((c, i) => (
          <div key={i} className={cn("card card-hover rv p-5", `d${i + 1}`)}>
            <span className="font-mono text-[.6rem] uppercase tracking-[.16em] text-acc">{c.k}</span>
            <h3 className="mt-2 text-[1.15rem]">{c.h}</h3>
            <Html as="p" className="mt-2 mb-0 text-[.88rem] text-dim prose" html={c.p} />
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- ANALOGY: the two-door café ---------- */
export function Analogy({ s, t }: { s: Section; t: Topic }) {
  const [hot, setHot] = useState<string | null>(null);
  const setup = (t.terms ?? []).filter((x) => ["A/B test", "Control", "Variant", "Randomisation", "Randomisation unit", "Sample size", "Guardrail metric", "Primary metric", "Sample ratio mismatch"].includes(x.t));
  const cur = setup.find((x) => x.t === hot);
  const K = ({ id, x, y, w, h, label }: { id: string; x: number; y: number; w: number; h: number; label: string }) => (
    <g onMouseEnter={() => setHot(id)} onClick={() => setHot(id)} className="cursor-pointer">
      <rect x={x} y={y} width={w} height={h} rx={6} fill={hot === id ? "color-mix(in srgb,var(--acc) 25%,transparent)" : "transparent"} stroke={hot === id ? "var(--acc)" : "var(--line)"} strokeDasharray={hot === id ? undefined : "3 3"} />
      <text x={x + w / 2} y={y - 6} textAnchor="middle" fill={hot === id ? "var(--acc)" : "var(--muted)"} fontFamily="var(--f-mono)" fontSize="9" fontWeight={600}>{label}</text>
    </g>
  );
  return (
    <section id={s.id} className="py-14 border-t border-line-soft">
      <SecHead s={s} t={t} />
      <div className="grid gap-6 lg:grid-cols-[1.15fr_.85fr] items-center">
        <div className="panel p-4 rv" onMouseLeave={() => setHot(null)}>
          <svg viewBox="0 0 520 300" className="w-full h-auto">
            <rect x="20" y="40" width="480" height="200" rx="10" fill="var(--ink-2)" stroke="var(--line-soft)" />
            <text x="260" y="30" textAnchor="middle" fill="var(--text)" fontFamily="var(--f-display)" fontSize="16" fontWeight={800}>THE TWO-DOOR CAFÉ</text>
            {/* doors */}
            <rect x="90" y="120" width="70" height="120" rx="4" fill="var(--a)" fillOpacity=".25" stroke="var(--a)" strokeWidth="2" />
            <text x="125" y="185" textAnchor="middle" fill="var(--a)" fontFamily="var(--f-mono)" fontSize="20" fontWeight={700}>A</text>
            <rect x="360" y="120" width="70" height="120" rx="4" fill="var(--b)" fillOpacity=".25" stroke="var(--b)" strokeWidth="2" />
            <text x="395" y="185" textAnchor="middle" fill="var(--b)" fontFamily="var(--f-mono)" fontSize="20" fontWeight={700}>B</text>
            {/* host */}
            <circle cx="260" cy="150" r="14" fill="var(--signal)" fillOpacity=".3" stroke="var(--signal)" />
            <rect x="248" y="168" width="24" height="40" rx="6" fill="var(--signal)" fillOpacity=".2" stroke="var(--signal)" />
            <circle cx="260" cy="120" r="7" fill="var(--signal)" style={{ animation: "floaty 2s infinite" }} />
            <text x="260" y="124" textAnchor="middle" fill="var(--ink)" fontSize="8" fontWeight={700}>₵</text>
            {/* arrivals */}
            {[0, 1, 2, 3, 4, 5].map((i) => <circle key={i} cx={200 + i * 24} cy={265} r={5} fill={i % 2 ? "var(--b)" : "var(--a)"} opacity={.9} />)}
            <path d="M225 250 L140 245" stroke="var(--a)" strokeDasharray="4 3" fill="none" markerEnd="url(#ar)" /><path d="M295 250 L380 245" stroke="var(--b)" strokeDasharray="4 3" fill="none" />
            {/* tills */}
            <rect x="60" y="60" width="60" height="28" rx="4" fill="var(--ink-1)" stroke="var(--line)" /><text x="90" y="78" textAnchor="middle" fill="var(--a)" fontFamily="var(--f-mono)" fontSize="9">TILL A</text>
            <rect x="400" y="60" width="60" height="28" rx="4" fill="var(--ink-1)" stroke="var(--line)" /><text x="430" y="78" textAnchor="middle" fill="var(--b)" fontFamily="var(--f-mono)" fontSize="9">TILL B</text>
            <rect x="200" y="60" width="120" height="28" rx="4" fill="var(--ink-1)" stroke="var(--line)" /><text x="260" y="78" textAnchor="middle" fill="var(--signal)" fontFamily="var(--f-mono)" fontSize="9">FIRE ALARM</text>
            {/* hotspots */}
            <K id="Control" x={84} y={112} w={82} h={134} label="control" />
            <K id="Variant" x={354} y={112} w={82} h={134} label="variant" />
            <K id="Randomisation" x={236} y={100} w={48} h={112} label="coin flip" />
            <K id="Sample size" x={192} y={252} w={140} h={26} label="arrivals" />
            <K id="Primary metric" x={54} y={54} w={72} h={40} label="the till" />
            <K id="Guardrail metric" x={194} y={54} w={132} h={40} label="guardrail" />
            <K id="A/B test" x={26} y={44} w={468} h={192} label="" />
          </svg>
        </div>
        <div className="rv d1">
          <div className="min-h-[9rem] rounded-2xl border border-line-soft bg-ink-1 p-5">
            <AnimatePresence mode="wait">
              <motion.div key={cur?.t ?? "none"} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: .25 }}>
                {cur ? <>
                  <span className="font-mono text-[.6rem] uppercase tracking-[.16em] text-acc">{cur.t}{cur.a ? ` · ${cur.a}` : ""}</span>
                  <p className="mt-2 text-[.92rem] text-text">{cur.c}</p>
                  <p className="mb-0 text-[.84rem] text-dim">{cur.d}</p>
                </> : <>
                  <span className="font-mono text-[.6rem] uppercase tracking-[.16em] text-muted">Hover the scene</span>
                  <p className="mt-2 mb-0 text-[.92rem] text-dim">Every term in this topic is placed somewhere in this café. Hover a door, the host, the arrivals or a till — the term appears here.</p>
                </>}
              </motion.div>
            </AnimatePresence>
          </div>
          <ul className="mt-3 flex flex-wrap gap-1.5 list-none p-0 m-0">
            {setup.map((x) => <li key={x.t}><button onMouseEnter={() => setHot(x.t)} onClick={() => setHot(x.t)} className="pill" aria-pressed={hot === x.t}>{x.t}</button></li>)}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ---------- TERMS: flip cards ---------- */
export function Terms({ s, t, col3 }: { s: Section; t: Topic; col3?: string }) {
  const [g, setG] = useState<string>("all");
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});
  const [q, setQ] = useState("");
  const terms = (t.terms ?? []).filter((x) => (g === "all" || x.g === g) && (!q || (x.t + " " + (x.a ?? "") + " " + x.d).toLowerCase().includes(q.toLowerCase())));
  return (
    <section id={s.id} className="py-14 border-t border-line-soft">
      <SecHead s={s} t={t} />
      <div className="rv mb-6 flex flex-wrap items-center gap-2">
        <button className="pill" aria-pressed={g === "all"} onClick={() => setG("all")}>All · {t.terms?.length}</button>
        {t.groups?.map((gr) => <button key={gr.id} className="pill" aria-pressed={g === gr.id} onClick={() => setG(gr.id)}>{gr.label} · {t.terms?.filter((x) => x.g === gr.id).length}</button>)}
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="filter…" className="ml-auto w-36 rounded-full border border-line-soft bg-ink-1 px-3 py-1.5 font-mono text-[.72rem] outline-none focus:border-acc" />
        <button className="pill" onClick={() => { const all = terms.every((x) => flipped[x.t]); const n: Record<string, boolean> = { ...flipped }; terms.forEach((x) => (n[x.t] = !all)); setFlipped(n); }}>Flip all</button>
      </div>
      <motion.div layout className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <AnimatePresence>
          {terms.map((x) => <TermCard key={x.t} x={x} col3={col3} flipped={!!flipped[x.t]} onFlip={() => setFlipped((f) => ({ ...f, [x.t]: !f[x.t] }))} groupLabel={t.groups?.find((gr) => gr.id === x.g)?.label ?? x.g} />)}
        </AnimatePresence>
      </motion.div>
      {!terms.length && <p className="text-muted font-mono text-sm">Nothing matches.</p>}
    </section>
  );
}
function TermCard({ x, flipped, onFlip, col3, groupLabel }: { x: Term; flipped: boolean; onFlip: () => void; col3?: string; groupLabel: string }) {
  return (
    <motion.div layout initial={{ opacity: 0, scale: .96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: .96 }} transition={{ duration: .25 }} className="flip min-h-[200px]" data-flipped={flipped}>
      <button onClick={onFlip} className="flip-inner block w-full h-full min-h-[200px] text-left" aria-pressed={flipped}>
        <div className="flip-face card h-full min-h-[200px] p-5 flex flex-col hover:border-line">
          <div className="flex items-center justify-between"><span className="font-mono text-[.58rem] uppercase tracking-[.14em] text-muted">{groupLabel}</span><span className="font-mono text-[.58rem] text-acc">flip ↻</span></div>
          <h3 className="mt-2 text-[1.08rem]">{x.t}</h3>
          {x.a && <span className="text-[.74rem] text-muted italic">also: {x.a}</span>}
          <Html as="p" className="mt-2 mb-0 text-[.86rem] text-dim prose" html={x.d} />
        </div>
        <div className="flip-face flip-back card h-full min-h-[200px] p-5 flex flex-col border-acc/50 bg-ink-3">
          <span className="font-mono text-[.58rem] uppercase tracking-[.14em] text-acc">{col3 ?? "In the analogy"}</span>
          <h3 className="mt-2 text-[1.08rem]">{x.t}</h3>
          <Html as="p" className="mt-2 mb-0 text-[.9rem] text-text prose" html={x.c ?? x.d} />
        </div>
      </button>
    </motion.div>
  );
}

/* ---------- STEPS ---------- */
export function Steps({ s, t }: { s: Section; t: Topic }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id={s.id} className="py-14 border-t border-line-soft">
      <SecHead s={s} t={t} />
      <ol className="relative m-0 list-none p-0 pl-10 sm:pl-14">
        <span className="absolute left-[15px] sm:left-[23px] top-3 bottom-3 w-px bg-gradient-to-b from-acc via-line to-line-soft" />
        {t.steps?.map((st, i) => <StepItem key={i} st={st} i={i} open={open === i} onToggle={() => setOpen(open === i ? null : i)} />)}
      </ol>
    </section>
  );
}
function StepItem({ st, i, open, onToggle }: { st: Step; i: number; open: boolean; onToggle: () => void }) {
  return (
    <li className="relative mb-3 rv">
      <span className={cn("absolute -left-10 sm:-left-14 top-3 grid h-8 w-8 sm:h-12 sm:w-12 place-content-center rounded-full border font-mono text-[.7rem] sm:text-[.8rem] font-bold transition-all", open ? "border-acc bg-acc text-acc-ink shadow-[0_0_24px_-6px_var(--acc)]" : "border-line bg-ink-1 text-dim")}>{String(i + 1).padStart(2, "0")}</span>
      <div className={cn("card overflow-hidden", open && "border-line")}>
        <button onClick={onToggle} className="flex w-full items-start justify-between gap-4 p-5 text-left">
          <div><h3 className="text-[1.1rem]">{st.t}</h3>{st.out && <Html as="p" className="mb-0 mt-1 text-[.8rem] text-muted prose" html={"→ " + st.out} />}</div>
          <span className={cn("mono text-muted transition-transform", open && "rotate-45 text-acc")}>+</span>
        </button>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: .35, ease: [.22, .61, .36, 1] }} className="overflow-hidden">
              <div className="px-5 pb-5 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
                <Html as="p" className="mb-0 text-[.92rem] text-dim prose" html={st.b} />
                <div className="space-y-3">
                  {st.do && <div className="rounded-lg border border-a/40 bg-a/5 p-3 text-[.84rem]"><span className="font-mono text-[.58rem] uppercase tracking-[.14em] text-a">Do this</span><Html as="p" className="mb-0 mt-1 text-dim prose" html={st.do} /></div>}
                  {st.no && <div className="rounded-lg border border-bad/40 bg-bad/5 p-3 text-[.84rem]"><span className="font-mono text-[.58rem] uppercase tracking-[.14em] text-bad">Not this</span><Html as="p" className="mb-0 mt-1 text-dim prose" html={st.no} /></div>}
                  {st.snip && <pre className="thin overflow-x-auto rounded-lg border border-line-soft bg-ink p-3 font-mono text-[.72rem] leading-relaxed text-dim m-0">{st.snip}</pre>}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </li>
  );
}

/* ---------- VISUAL (diagrams) ---------- */
export function Visual({ s, t }: { s: Section; t: Topic }) {
  return (
    <section id={s.id} className="py-14 border-t border-line-soft">
      <SecHead s={s} t={t} />
      <div className="grid gap-4 lg:grid-cols-2">
        {s.items?.map((it, i) => (
          <div key={i} className={cn("card p-5 rv", i % 2 ? "d1" : "")}>
            <span className="font-mono text-[.6rem] uppercase tracking-[.16em] text-acc">{it.k}</span>
            <h3 className="mt-1 mb-4 text-[1.1rem]">{it.h}</h3>
            {it.viz && <Viz viz={it.viz} />}
            {it.p && <Html as="p" className="mt-3 mb-0 text-[.86rem] text-dim prose" html={it.p} />}
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- TOOL / CALCULATOR ---------- */
export function Tool({ s, t }: { s: Section; t: Topic }) {
  return (
    <section id={s.id} className="py-14 border-t border-line-soft">
      <SecHead s={s} t={t} />
      <div className="rv"><ToolFor id={s.tool ?? s.id} /></div>
    </section>
  );
}

/* ---------- COMPARE ---------- */
export function Compare({ s, t }: { s: Section; t: Topic }) {
  return (
    <section id={s.id} className="py-14 border-t border-line-soft">
      <SecHead s={s} t={t} />
      <div className="panel overflow-x-auto thin rv">
        <table className="tbl"><thead><tr>{s.cols?.map((c) => <th key={c}>{c}</th>)}</tr></thead>
          <tbody>{s.rows?.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}><Html html={c} className="prose" /></td>)}</tr>)}</tbody></table>
      </div>
    </section>
  );
}

/* ---------- CASES ---------- */
export function Cases({ s, t }: { s: Section; t: Topic }) {
  return (
    <section id={s.id} className="py-14 border-t border-line-soft">
      <SecHead s={s} t={t} />
      <div className="space-y-6">{t.cases?.map((c, i) => <CaseCard key={i} c={c} />)}</div>
    </section>
  );
}
function CaseCard({ c }: { c: Case }) {
  const [open, setOpen] = useState(false);
  const win = c.cls === "bg-win";
  return (
    <article className="panel overflow-hidden rv">
      <header className="p-6 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
        <div>
          <div className="flex flex-wrap gap-2 mb-3"><span className="chip">{c.k}</span><span className={cn("chip", win ? "border-acc/50 text-acc" : "border-bad/50 text-bad")}>{c.badge ?? c.kind}</span></div>
          <h3 className="text-[1.4rem]">{c.title}</h3>
          {c.sub && <Html as="p" className="mt-2 mb-0 text-[.92rem] text-dim prose" html={c.sub} />}
        </div>
        {c.facts && <dl className="grid grid-cols-2 gap-x-6 gap-y-2 m-0 rounded-xl border border-line-soft bg-ink-1 p-4 min-w-[260px]">{c.facts.map(([k, v]) => <div key={k}><dt className="font-mono text-[.56rem] uppercase tracking-[.14em] text-muted">{k}</dt><dd className="m-0 mono text-[.86rem] text-text">{v}</dd></div>)}</dl>}
      </header>
      {c.charts && <div className="grid gap-3 px-6 md:grid-cols-2 xl:grid-cols-3">{c.charts.map((ch, i) => <CaseChart key={i} c={ch} />)}</div>}
      <div className="p-6">
        <button onClick={() => setOpen((o) => !o)} className="btn">{open ? "Hide the walkthrough" : `Walk through it · ${c.steps?.length ?? 0} moves`}</button>
        <AnimatePresence initial={false}>
          {open && <motion.ol initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden m-0 mt-4 list-none p-0 grid gap-2 md:grid-cols-2">
            {c.steps?.map(([k, v], i) => <li key={i} className="rounded-xl border border-line-soft bg-ink-1 p-4"><span className="font-mono text-[.58rem] uppercase tracking-[.14em] text-acc">{String(i + 1).padStart(2, "0")} · {k}</span><Html as="p" className="mb-0 mt-1 text-[.86rem] text-dim prose" html={v} /></li>)}
          </motion.ol>}
        </AnimatePresence>
      </div>
      {c.verdict && (
        <footer className={cn("relative border-t p-6 grid gap-4 md:grid-cols-[auto_1fr] md:items-center", win ? "border-acc/30 bg-acc/5" : "border-bad/30 bg-bad/5")}>
          <span className={cn("stamp inline-block rounded-md border-[3px] px-3 py-1 font-display text-2xl font-extrabold tracking-tight", win ? "border-acc text-acc" : "border-bad text-bad")}>{c.verdict.stamp}</span>
          <div><b className="text-text">{c.verdict.h}</b><Html as="p" className="mt-1 mb-0 text-[.9rem] text-dim prose" html={c.verdict.p} />{c.verdict.lesson && <Html as="p" className="mt-2 mb-0 text-[.84rem] text-text prose" html={"<b>Lesson:</b> " + c.verdict.lesson} />}</div>
        </footer>
      )}
    </article>
  );
}

/* ---------- CHEAT SHEET ---------- */
export function Cheatsheet({ s, t }: { s: Section; t: Topic }) {
  const [q, setQ] = useState("");
  const rows = (t.terms ?? []).filter((x) => !q || (x.t + " " + x.d + " " + (x.c ?? "") + " " + x.g).toLowerCase().includes(q.toLowerCase()));
  const mark = (str: string) => q ? str.replace(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "ig"), "<mark>$1</mark>") : str;
  return (
    <section id={s.id} className="py-14 border-t border-line-soft">
      <SecHead s={s} t={t} right={<div className="flex gap-2 no-print"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="search the sheet…" className="w-52 rounded-full border border-line-soft bg-ink-1 px-4 py-2 font-mono text-[.76rem] outline-none focus:border-acc" /><button className="pill" onClick={() => window.print()}>⎙ Print</button></div>} />
      <div className="panel overflow-x-auto thin rv max-h-[70vh]">
        <table className="tbl"><thead className="sticky top-0 bg-ink-1"><tr><th>Term</th><th>Group</th><th>Meaning</th><th>{s.col3 ?? "Analogy"}</th></tr></thead>
          <tbody>{rows.map((x) => <tr key={x.t}><td><Html html={mark(x.t)} />{x.a && <span className="block text-[.7rem] text-muted font-normal">{x.a}</span>}</td><td className="whitespace-nowrap font-mono text-[.7rem]">{t.groups?.find((g) => g.id === x.g)?.label ?? x.g}</td><td><Html html={mark(x.d)} className="prose" /></td><td className="italic"><Html html={mark(x.c ?? "")} className="prose" /></td></tr>)}</tbody></table>
        {!rows.length && <p className="p-6 text-muted font-mono text-sm">Nothing matches “{q}”.</p>}
      </div>
    </section>
  );
}

/* ---------- QUIZ ---------- */
export function QuizSec({ s, t }: { s: Section; t: Topic }) {
  const qs = t.quiz ?? [];
  const [i, setI] = useState(0); const [pick, setPick] = useState<number | null>(null); const [score, setScore] = useState(0); const [done, setDone] = useState(false);
  const q = qs[i];
  const store = useStore();
  const best = store.topics[t.id]?.quizBest;
  const choose = (k: number) => { if (pick != null) return; setPick(k); if (k === q.a) setScore((x) => x + 1); };
  const next = () => {
    if (i + 1 >= qs.length) { setDone(true); store.recordAttempt({ kind: "topic", topic: t.id, score, total: qs.length }); store.complete(t.id, true); }
    else { setI(i + 1); setPick(null); }
  };
  const reset = () => { setI(0); setPick(null); setScore(0); setDone(false); };
  return (
    <section id={s.id} className="py-14 border-t border-line-soft">
      <SecHead s={s} t={t} />
      <div className="panel p-6 lg:p-8 rv max-w-3xl">
        <div className="flex items-center justify-between mb-5"><span className="font-mono text-[.66rem] uppercase tracking-[.16em] text-muted">Question {Math.min(i + 1, qs.length)} / {qs.length}</span><span className="flex gap-4 font-mono text-[.66rem]">{best != null && <span className="text-muted">best {best}/{qs.length}</span>}<span className="text-acc">score {score}</span></span></div>
        <div className="flex gap-1 mb-6">{qs.map((_, k) => <i key={k} className="h-1 flex-1 rounded-full transition-colors" style={{ background: k < i || done ? "var(--acc)" : k === i ? "var(--text)" : "var(--line-soft)" }} />)}</div>
        <AnimatePresence mode="wait">
          {done ? (
            <motion.div key="done" initial={{ opacity: 0, scale: .96 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-6">
              <span className="font-mono text-[.66rem] uppercase tracking-[.2em] text-muted">Result</span>
              <p className="display text-[clamp(2.4rem,6vw,4rem)] my-3"><span className="text-acc">{score}</span><span className="text-muted">/{qs.length}</span></p>
              <p className="text-dim">{score === qs.length ? "Clean sweep. Go teach it to someone." : score >= qs.length * .7 ? "Solid. Re-read the ones you missed — they are usually the traps." : "The cheat sheet above is the fastest fix. Then come back."}</p>
              <button className="btn btn-key" onClick={reset}>Try again</button>
            </motion.div>
          ) : (
            <motion.div key={i} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: .3 }}>
              <Html as="h3" className="text-[1.25rem] leading-snug prose" html={q.q} />
              <div className="mt-5 grid gap-2">
                {q.o.map((o, k) => { const st = pick == null ? "" : k === q.a ? "right" : k === pick ? "wrong" : "dim"; return (
                  <button key={k} onClick={() => choose(k)} disabled={pick != null} className={cn("flex items-start gap-3 rounded-xl border p-4 text-left text-[.9rem] transition-all", st === "" && "border-line-soft bg-ink-1 hover:border-acc hover:translate-x-1", st === "right" && "border-acc bg-acc/10 text-text", st === "wrong" && "border-bad bg-bad/10", st === "dim" && "border-line-soft opacity-50")}>
                    <span className={cn("mono text-[.7rem] mt-.5 shrink-0 h-6 w-6 grid place-content-center rounded-full border", st === "right" ? "border-acc text-acc" : st === "wrong" ? "border-bad text-bad" : "border-line text-muted")}>{st === "right" ? "✓" : st === "wrong" ? "✗" : String.fromCharCode(65 + k)}</span><Html html={o} className="prose" />
                  </button>); })}
              </div>
              <AnimatePresence>{pick != null && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={cn("mt-4 rounded-xl border p-4", pick === q.a ? "border-acc/40 bg-acc/5" : "border-bad/40 bg-bad/5")}>
                  <b className={pick === q.a ? "text-acc" : "text-bad"}>{pick === q.a ? "Correct." : "Not quite."}</b> <Html html={q.e} className="text-[.88rem] text-dim prose" />
                  <div className="mt-3"><button className="btn btn-key" onClick={next}>{i + 1 >= qs.length ? "See result" : "Next question →"}</button></div>
                </motion.div>)}</AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

/* ---------- FRAMEWORKS ---------- */
export function Frameworks({ s, t }: { s: Section; t: Topic }) {
  const fams = useMemo(() => [...new Set((t.frameworks ?? []).map((f) => f.stage))], [t]);
  const [fam, setFam] = useState("all"); const [open, setOpen] = useState<string | null>(null);
  const list = (t.frameworks ?? []).filter((f) => fam === "all" || f.stage === fam);
  return (
    <section id={s.id} className="py-14 border-t border-line-soft">
      <SecHead s={s} t={t} />
      <div className="rv mb-6 flex flex-wrap gap-2"><button className="pill" aria-pressed={fam === "all"} onClick={() => setFam("all")}>All · {t.frameworks?.length}</button>{fams.map((f) => <button key={f} className="pill" aria-pressed={fam === f} onClick={() => setFam(f)}>{f} · {t.frameworks?.filter((x) => x.stage === f).length}</button>)}</div>
      <motion.div layout className="grid gap-3 md:grid-cols-2">
        <AnimatePresence>{list.map((f) => <FwCard key={f.name} f={f} open={open === f.name} onToggle={() => setOpen(open === f.name ? null : f.name)} />)}</AnimatePresence>
      </motion.div>
    </section>
  );
}
function FwCard({ f, open, onToggle }: { f: Framework; open: boolean; onToggle: () => void }) {
  return (
    <motion.article layout initial={{ opacity: 0, scale: .97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: .97 }} className={cn("card overflow-hidden", open && "md:col-span-2 border-line")}>
      <button onClick={onToggle} className="w-full p-5 text-left">
        <div className="flex items-center justify-between gap-3"><span className="font-mono text-[.6rem] uppercase tracking-[.16em] text-acc">{f.stage}</span><span className={cn("mono text-muted transition-transform", open && "rotate-45 text-acc")}>+</span></div>
        <h3 className="mt-2 text-[1.15rem]">{f.name}{f.alias && <span className="ml-2 font-body text-[.78rem] font-normal text-muted">· {f.alias}</span>}</h3>
        <Html as="p" className="mt-2 mb-0 text-[.86rem] text-dim prose" html={f.one} />
        <div className="mt-3 flex flex-wrap gap-2 text-[.7rem] text-muted font-mono">{f.time && <span>⏱ {f.time}</span>}{f.who && <span>👥 {f.who}</span>}</div>
      </button>
      <AnimatePresence initial={false}>{open && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: .4, ease: [.22, .61, .36, 1] }} className="overflow-hidden">
          <div className="grid gap-5 border-t border-line-soft p-5 lg:grid-cols-2">
            <div className="space-y-4">
              {f.when && <div><span className="font-mono text-[.58rem] uppercase tracking-[.14em] text-muted">Reach for it when</span><Html as="p" className="mb-0 mt-1 text-[.88rem] text-dim prose" html={f.when} /></div>}
              {f.how && <div><span className="font-mono text-[.58rem] uppercase tracking-[.14em] text-muted">How</span><ol className="mt-1 mb-0 list-decimal space-y-1.5 pl-5 text-[.88rem] text-dim marker:font-mono marker:text-[.7rem] marker:text-acc">{f.how.map((h, i) => <li key={i}><Html html={h} className="prose" /></li>)}</ol></div>}
              {f.out && <div className="rounded-lg border border-a/40 bg-a/5 p-3"><span className="font-mono text-[.58rem] uppercase tracking-[.14em] text-a">You end up with</span><Html as="p" className="mb-0 mt-1 text-[.86rem] text-dim prose" html={f.out} /></div>}
              {f.trap && <div className="rounded-lg border border-bad/40 bg-bad/5 p-3"><span className="font-mono text-[.58rem] uppercase tracking-[.14em] text-bad">How it fails</span><Html as="p" className="mb-0 mt-1 text-[.86rem] text-dim prose" html={f.trap} /></div>}
              {f.with && <div><span className="font-mono text-[.58rem] uppercase tracking-[.14em] text-muted">Pairs with</span><Html as="p" className="mb-0 mt-1 text-[.86rem] text-dim prose" html={f.with} /></div>}
            </div>
            <div className="space-y-4">
              {f.viz && <div className="rounded-xl border border-line-soft bg-ink-2/40 p-4"><span className="font-mono text-[.58rem] uppercase tracking-[.14em] text-muted">The shape</span><div className="mt-3"><Viz viz={f.viz} /></div></div>}
              {f.ex && <div className="rounded-xl border border-line-soft bg-ink-2/40 p-4"><span className="font-mono text-[.58rem] uppercase tracking-[.14em] text-acc">Worked example</span><h4 className="mt-1 text-[1rem]">{f.ex.h}</h4>{f.ex.p && <Html as="p" className="mt-2 text-[.86rem] text-dim prose" html={f.ex.p} />}{f.ex.viz && <div className="mt-3"><Viz viz={f.ex.viz} /></div>}</div>}
            </div>
          </div>
        </motion.div>)}</AnimatePresence>
    </motion.article>
  );
}

export const TOTAL = STATS;
