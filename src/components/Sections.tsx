import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { stageOf, type Case, type Framework, type Section, type Step, type Term, type Topic } from "@/data";
import Viz from "./Viz";
import ParticleType from "./ParticleType";
import { CaseChart, ToolFor } from "./Tools";
import { NameThatTerm } from "./Drills";
import { glossify } from "@/lib/gloss";
import { useStore } from "@/lib/progress";
import { cn } from "@/utils/cn";

type Tag = "span" | "p" | "h1" | "h2" | "h3" | "h4" | "div";
/** Trusted, authored HTML from topics.json. `gloss` turns known terms into hoverable definitions. */
export const Html = ({ html, className, as: El = "span", gloss }: { html?: string; className?: string; as?: Tag; gloss?: boolean }) => <El className={className} dangerouslySetInnerHTML={{ __html: gloss ? glossify(html ?? "") : html ?? "" }} />;
const sub = (s: string | undefined, t: Topic) => (s ?? "").replace("{N}", String(t.terms?.length ?? 0));

/** Highlight `q` inside HTML without touching the tags themselves. */
function highlight(html: string, q: string) {
  if (!q) return html;
  const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "ig");
  return html.split(/(<[^>]+>)/).map((part) => (part.startsWith("<") ? part : part.replace(re, "<mark>$1</mark>"))).join("");
}

export function SecHead({ s, t, right }: { s: Section; t: Topic; right?: React.ReactNode }) {
  const n = t.sections.indexOf(s) + 1;
  return (
    <header className="rv draw mb-8 pt-4">
      <p className="kicker rv flex flex-wrap gap-x-3"><span className="text-text">§ {String(n).padStart(2, "0")}</span>{s.eyebrow && <span>{s.eyebrow}</span>}</p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 max-w-3xl">
          <Html as="h2" className="rv d1 prose text-[clamp(1.8rem,3.4vw,2.7rem)]" html={sub(s.h, t)} />
          {s.lede && <Html as="p" className="lede rv d2 prose mb-0 mt-4" html={sub(s.lede, t)} />}
        </div>
        {right}
      </div>
    </header>
  );
}
const Sec = ({ s, children }: { s: Section; children: React.ReactNode }) => <section id={s.id} className="scroll-mt-20 py-12">{children}</section>;

/* ---------- OPENER ---------- */
export function Hero({ s, t, onNext }: { s: Section; t: Topic; onNext: () => void }) {
  const p = s.panel;
  const st = stageOf(t.stage);
  return (
    <section id={s.id} className="scroll-mt-20 pt-6 pb-4">
      <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 border-b border-rule pb-2 font-mono text-[.62rem] uppercase tracking-[.12em] text-muted">
        <span className="text-text">No. {t.n}</span>
        <span><span className="serif mr-1 normal-case italic text-acc">{st.roman}</span>{st.label} · {st.note}</span>
        {s.tag && <span>{s.tag}</span>}
      </div>
      <div className="grid gap-x-10 gap-y-4 pt-6 lg:grid-cols-[12.5rem_minmax(0,1fr)]">
        <ParticleType shapes={[[t.n], [st.roman]]} label={`Topic ${t.n}`} className="-ml-1 h-[7.5rem] w-[11rem] sm:h-[10rem] sm:w-[13rem] lg:h-[12rem] lg:w-auto" weight={600} align="left" breakAt={0} density={{ narrow: [3, 2], wide: [3, 2.1] }} />
        <div className="min-w-0">
          <Html as="h1" className="rise prose max-w-[18ch] text-[clamp(2.3rem,5.2vw,4.6rem)]" html={s.h} />
          <Html as="p" className="lede rise prose mt-6" html={s.lede} gloss />
          <p className="rise mt-5 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[.62rem] uppercase tracking-[.1em] text-muted">{s.chips?.map((c, i) => <span key={c}>{i > 0 && <span className="mr-4 text-line" aria-hidden>/</span>}{sub(c, t)}</span>)}</p>
          <div className="rise mt-6 flex flex-wrap gap-2">
            <button className="btn btn-key" onClick={() => document.getElementById(t.sections[1]?.id)?.scrollIntoView({ behavior: "smooth", block: "start" })}>Start reading ↓</button>
            <button className="btn" onClick={onNext}>Skip to next topic →</button>
          </div>
        </div>
      </div>
      {typeof p === "string" ? <div className="rise mt-10"><ToolFor id={p} /></div> : p ? (
        <div className="rise mt-10 grid gap-6 border-y-[3px] border-double border-rule py-6 md:grid-cols-[1.1fr_1fr] md:gap-10">
          <div>
            <p className="kicker">{p.k}</p>
            <p className="serif m-0 mt-2 text-[clamp(1.5rem,2.6vw,2.2rem)] font-normal italic leading-[1.15] text-text">{p.big}</p>
          </div>
          <ol className="m-0 list-none space-y-3 p-0 md:border-l md:border-line-soft md:pl-8">
            {p.items?.map((it: string, i: number) => <li key={i} className="grid grid-cols-[1.6rem_1fr] text-[.94rem] text-dim"><span className="serif text-[1.1rem] italic leading-none text-acc">{i + 1}</span><span>{it}</span></li>)}
          </ol>
        </div>
      ) : null}
    </section>
  );
}

/* ---------- BIG IDEA ---------- */
export function BigIdea({ s, t }: { s: Section; t: Topic }) {
  return (
    <Sec s={s}>
      <SecHead s={s} t={t} />
      {s.statement && <blockquote className="rv m-0 my-10 max-w-4xl"><p className="serif m-0 text-[clamp(1.5rem,2.8vw,2.3rem)] font-normal italic leading-[1.18] text-text"><span className="text-acc">“</span>{s.statement}<span className="text-acc">”</span></p></blockquote>}
      <div className="cols md:grid-cols-3">
        {s.cards?.map((c, i) => (
          <div key={i} className={cn("rv p-5", `d${i + 1}`)}>
            <span className="kicker text-acc">{c.k}</span>
            <h3 className="mt-2 text-[1.3rem]">{c.h}</h3>
            <Html as="p" className="prose mb-0 mt-2 text-[.9rem] text-dim" html={c.p} gloss />
          </div>
        ))}
      </div>
    </Sec>
  );
}

/* ---------- ANALOGY: the two-door café ---------- */
export function Analogy({ s, t }: { s: Section; t: Topic }) {
  const [hot, setHot] = useState<string | null>(null);
  const setup = (t.terms ?? []).filter((x) => ["A/B test", "Control", "Variant", "Randomisation", "Randomisation unit", "Sample size", "Guardrail metric", "Primary metric", "Sample ratio mismatch"].includes(x.t));
  const cur = setup.find((x) => x.t === hot);
  const K = ({ id, x, y, w, h, label }: { id: string; x: number; y: number; w: number; h: number; label: string }) => (
    <g onMouseEnter={() => setHot(id)} onClick={() => setHot(id)} onFocus={() => setHot(id)} tabIndex={0} role="button" aria-label={id} className="cursor-pointer outline-none">
      <rect x={x} y={y} width={w} height={h} fill={hot === id ? "color-mix(in srgb,var(--acc) 16%,transparent)" : "transparent"} stroke={hot === id ? "var(--acc)" : "var(--line)"} strokeDasharray={hot === id ? undefined : "3 3"} />
      {label && <text x={x + w / 2} y={y - 6} textAnchor="middle" fill={hot === id ? "var(--acc)" : "var(--muted)"} fontFamily="var(--f-mono)" fontSize="9" fontWeight={500}>{label.toUpperCase()}</text>}
    </g>
  );
  return (
    <Sec s={s}>
      <SecHead s={s} t={t} />
      <div className="grid items-center gap-6 lg:grid-cols-[1.15fr_.85fr]">
        <figure className="rv panel m-0 p-4" onMouseLeave={() => setHot(null)}>
          <svg viewBox="0 0 520 300" className="h-auto w-full" role="img" aria-label="The two-door café: a host flips a coin to send each arriving customer through door A or door B, and each door has its own till.">
            <rect x="20" y="40" width="480" height="200" fill="var(--ink-2)" stroke="var(--line-soft)" />
            <text x="260" y="28" textAnchor="middle" fill="var(--text)" fontFamily="var(--f-display)" fontSize="17" fontStyle="italic" fontWeight={500}>The two-door café</text>
            <rect x="90" y="120" width="70" height="120" fill="var(--a)" fillOpacity=".16" stroke="var(--a)" strokeWidth="1.5" />
            <text x="125" y="188" textAnchor="middle" fill="var(--a)" fontFamily="var(--f-display)" fontSize="26" fontWeight={600}>A</text>
            <rect x="360" y="120" width="70" height="120" fill="var(--b)" fillOpacity=".16" stroke="var(--b)" strokeWidth="1.5" />
            <text x="395" y="188" textAnchor="middle" fill="var(--b)" fontFamily="var(--f-display)" fontSize="26" fontWeight={600}>B</text>
            <circle cx="260" cy="150" r="13" fill="none" stroke="var(--text)" />
            <rect x="248" y="168" width="24" height="40" fill="none" stroke="var(--text)" />
            <circle cx="260" cy="120" r="7" fill="var(--signal)" />
            {[0, 1, 2, 3, 4, 5].map((i) => <rect key={i} x={196 + i * 24} y={261} width={8} height={8} fill={i % 2 ? "var(--b)" : "var(--a)"} />)}
            <path d="M225 252 L150 246" stroke="var(--a)" strokeDasharray="4 3" fill="none" /><path d="M295 252 L370 246" stroke="var(--b)" strokeDasharray="4 3" fill="none" />
            <rect x="60" y="60" width="60" height="28" fill="var(--ink-1)" stroke="var(--line)" /><text x="90" y="78" textAnchor="middle" fill="var(--a)" fontFamily="var(--f-mono)" fontSize="9">TILL A</text>
            <rect x="400" y="60" width="60" height="28" fill="var(--ink-1)" stroke="var(--line)" /><text x="430" y="78" textAnchor="middle" fill="var(--b)" fontFamily="var(--f-mono)" fontSize="9">TILL B</text>
            <rect x="200" y="60" width="120" height="28" fill="var(--ink-1)" stroke="var(--line)" /><text x="260" y="78" textAnchor="middle" fill="var(--signal)" fontFamily="var(--f-mono)" fontSize="9">FIRE ALARM</text>
            <K id="A/B test" x={26} y={44} w={468} h={192} label="" />
            <K id="Control" x={84} y={112} w={82} h={134} label="control" />
            <K id="Variant" x={354} y={112} w={82} h={134} label="variant" />
            <K id="Randomisation" x={236} y={100} w={48} h={112} label="coin flip" />
            <K id="Sample size" x={188} y={254} w={144} h={22} label="arrivals" />
            <K id="Primary metric" x={54} y={54} w={72} h={40} label="the till" />
            <K id="Guardrail metric" x={194} y={54} w={132} h={40} label="guardrail" />
          </svg>
        </figure>
        <div className="rv d1">
          <div className="min-h-[10rem] border-t border-rule pt-4" aria-live="polite">
            <AnimatePresence mode="wait">
              <motion.div key={cur?.t ?? "none"} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: .2 }}>
                {cur ? <>
                  <span className="kicker text-acc">{cur.t}{cur.a ? ` · ${cur.a}` : ""}</span>
                  <p className="serif mt-2 text-[1.15rem] leading-snug text-text">{cur.c}</p>
                  <p className="mb-0 text-[.88rem] text-dim">{cur.d}</p>
                </> : <>
                  <span className="kicker">Hover or tap the scene</span>
                  <p className="serif mb-0 mt-2 text-[1.1rem] leading-snug text-dim">Every term in this topic lives somewhere in this café. Hover a door, the host, the arrivals or a till and its term appears here.</p>
                </>}
              </motion.div>
            </AnimatePresence>
          </div>
          <ul className="m-0 mt-3 flex list-none flex-wrap gap-1 p-0">
            {setup.map((x) => <li key={x.t}><button onMouseEnter={() => setHot(x.t)} onClick={() => setHot(x.t)} className="pill" aria-pressed={hot === x.t}>{x.t}</button></li>)}
          </ul>
        </div>
      </div>
    </Sec>
  );
}

/* ---------- TERMS: flip cards ---------- */
export function Terms({ s, t, col3 }: { s: Section; t: Topic; col3?: string }) {
  const [g, setG] = useState<string>("all");
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});
  const [q, setQ] = useState("");
  const terms = (t.terms ?? []).filter((x) => (g === "all" || x.g === g) && (!q || (x.t + " " + (x.a ?? "") + " " + x.d).toLowerCase().includes(q.toLowerCase())));
  return (
    <Sec s={s}>
      <SecHead s={s} t={t} />
      <div className="rv mb-6 flex flex-wrap items-center gap-1">
        <button className="pill" aria-pressed={g === "all"} onClick={() => setG("all")}>All · {t.terms?.length}</button>
        {t.groups?.map((gr) => <button key={gr.id} className="pill" aria-pressed={g === gr.id} onClick={() => setG(gr.id)}>{gr.label} · {t.terms?.filter((x) => x.g === gr.id).length}</button>)}
        <button className="pill" onClick={() => { const all = terms.every((x) => flipped[x.t]); const n: Record<string, boolean> = { ...flipped }; terms.forEach((x) => (n[x.t] = !all)); setFlipped(n); }}>Flip all</button>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter terms…" aria-label="Filter terms" className="field ml-auto w-44 font-mono text-[.76rem]" />
      </div>
      <motion.div layout className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <AnimatePresence>
          {terms.map((x) => <TermCard key={x.t} x={x} col3={col3} flipped={!!flipped[x.t]} onFlip={() => setFlipped((f) => ({ ...f, [x.t]: !f[x.t] }))} groupLabel={t.groups?.find((gr) => gr.id === x.g)?.label ?? x.g} />)}
        </AnimatePresence>
      </motion.div>
      {!terms.length && <p className="font-mono text-sm text-muted">Nothing matches.</p>}
      <NameThatTerm t={t} />
    </Sec>
  );
}
function TermCard({ x, flipped, onFlip, col3, groupLabel }: { x: Term; flipped: boolean; onFlip: () => void; col3?: string; groupLabel: string }) {
  return (
    <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .2 }} className="flip min-h-[210px]" data-flipped={flipped}>
      <button onClick={onFlip} className="flip-inner block h-full min-h-[210px] w-full text-left" aria-pressed={flipped} aria-label={`${x.t}: ${flipped ? "showing the analogy" : "showing the definition"}`}>
        <div className="flip-face card flex h-full min-h-[210px] flex-col p-5 hover:border-rule">
          <div className="flex items-center justify-between"><span className="kicker">{groupLabel}</span><span className="font-mono text-[.6rem] text-muted">flip ↻</span></div>
          <h3 className="mt-3 text-[1.3rem]">{x.t}</h3>
          {x.a && <span className="serif text-[.82rem] italic text-muted">also: {x.a}</span>}
          <Html as="p" className="prose mb-0 mt-2 text-[.88rem] text-dim" html={x.d} />
        </div>
        <div className="flip-face flip-back flex h-full min-h-[210px] flex-col border border-text bg-text p-5 text-ink">
          <span className="font-mono text-[.62rem] uppercase tracking-[.12em] opacity-70">{col3 ?? "In the analogy"}</span>
          <h3 className="mt-3 text-[1.3rem]">{x.t}</h3>
          <Html as="p" className="serif mb-0 mt-2 text-[1.02rem] leading-snug [&_b]:font-semibold [&_em]:italic" html={x.c ?? x.d} />
        </div>
      </button>
    </motion.div>
  );
}

/* ---------- STEPS ---------- */
export function Steps({ s, t }: { s: Section; t: Topic }) {
  const [open, setOpen] = useState<number | null>(0);
  const list = useRef<HTMLOListElement>(null);
  const spine = useRef<HTMLSpanElement>(null);
  const [lit, setLit] = useState(-1);
  // the spine fills as the reading line (40% down the screen) travels through the steps
  useEffect(() => {
    let raf = 0;
    const on = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = list.current; if (!el) return;
        const line = window.innerHeight * 0.4, r = el.getBoundingClientRect();
        const k = Math.max(0, Math.min(1, (line - r.top) / r.height));
        if (spine.current) spine.current.style.transform = `scaleY(${k})`;
        const items = [...el.querySelectorAll<HTMLElement>(":scope > li")];
        setLit(items.reduce((n, li, i) => (li.getBoundingClientRect().top < line ? i : n), -1));
      });
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("scroll", on); window.removeEventListener("resize", on); };
  }, []);
  return (
    <Sec s={s}>
      <SecHead s={s} t={t} />
      <ol ref={list} className="relative m-0 list-none border-t border-line-soft p-0">
        <span aria-hidden className="absolute bottom-0 left-[1.45rem] top-0 hidden w-px bg-line-soft sm:left-[2.2rem] sm:block" />
        <span ref={spine} aria-hidden className="absolute bottom-0 left-[1.45rem] top-0 hidden w-[2px] origin-top -translate-x-[.5px] bg-acc sm:left-[2.2rem] sm:block" style={{ transform: "scaleY(0)" }} />
        {t.steps?.map((st, i) => <StepItem key={i} st={st} i={i} lit={i <= lit} open={open === i} onToggle={() => setOpen(open === i ? null : i)} />)}
      </ol>
    </Sec>
  );
}
function StepItem({ st, i, open, lit, onToggle }: { st: Step; i: number; open: boolean; lit: boolean; onToggle: () => void }) {
  return (
    <li className="rv border-b border-line-soft">
      <button onClick={onToggle} aria-expanded={open} className="group grid w-full grid-cols-[3rem_1fr_auto] items-baseline gap-3 py-4 text-left sm:grid-cols-[4.5rem_1fr_auto]">
        <span className={cn("serif relative z-[1] bg-ink text-[2rem] font-light leading-none transition-colors duration-500 sm:text-[2.6rem]", open || lit ? "text-acc" : "text-muted group-hover:text-text")}>{String(i + 1).padStart(2, "0")}</span>
        <span><h3 className="text-[1.25rem]">{st.t}</h3>{st.out && <Html as="p" className="prose mb-0 mt-1 text-[.84rem] text-muted" html={"→ " + st.out} />}</span>
        <span className={cn("font-mono text-lg text-muted transition-transform", open && "rotate-45 text-acc")} aria-hidden>+</span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: .32, ease: [.22, .61, .36, 1] }} className="overflow-hidden">
            <div className="grid gap-5 pb-6 sm:pl-[5.25rem] lg:grid-cols-[1.3fr_1fr]">
              <Html as="p" className="prose mb-0 text-[.95rem] leading-relaxed text-dim" html={st.b} gloss />
              <div className="space-y-3">
                {st.do && <div className="border-l-2 border-a pl-3 text-[.86rem]"><span className="font-mono text-[.6rem] uppercase tracking-[.12em] text-a">Do this</span><Html as="p" className="prose mb-0 mt-1 text-dim" html={st.do} gloss /></div>}
                {st.no && <div className="border-l-2 border-bad pl-3 text-[.86rem]"><span className="font-mono text-[.6rem] uppercase tracking-[.12em] text-bad">Not this</span><Html as="p" className="prose mb-0 mt-1 text-dim" html={st.no} gloss /></div>}
                {st.snip && <pre className="thin m-0 overflow-x-auto border border-line-soft bg-ink-1 p-3 font-mono text-[.74rem] leading-relaxed text-dim">{st.snip}</pre>}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

/* ---------- VISUAL (diagrams) ---------- */
export function Visual({ s, t }: { s: Section; t: Topic }) {
  return (
    <Sec s={s}>
      <SecHead s={s} t={t} />
      <div className="grid gap-4 lg:grid-cols-2">
        {s.items?.map((it, i) => (
          <figure key={i} className={cn("card rv m-0 p-5", i % 2 ? "d1" : "")}>
            <span className="kicker text-acc">Fig. {i + 1} · {it.k}</span>
            <h3 className="mb-4 mt-1 text-[1.25rem]">{it.h}</h3>
            {it.viz && <Viz viz={it.viz} />}
            {it.p && <Html as="p" className="prose mb-0 mt-3 text-[.88rem] text-dim" html={it.p} gloss />}
          </figure>
        ))}
      </div>
    </Sec>
  );
}

/* ---------- TOOL / CALCULATOR ---------- */
export function Tool({ s, t }: { s: Section; t: Topic }) {
  return (
    <Sec s={s}>
      <SecHead s={s} t={t} />
      <div className="rv"><ToolFor id={s.tool ?? s.id} /></div>
    </Sec>
  );
}

/* ---------- COMPARE ---------- */
export function Compare({ s, t }: { s: Section; t: Topic }) {
  return (
    <Sec s={s}>
      <SecHead s={s} t={t} />
      <div className="rv thin overflow-x-auto border-y border-rule">
        <table className="tbl"><thead><tr>{s.cols?.map((c) => <th key={c}>{c}</th>)}</tr></thead>
          <tbody>{s.rows?.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}><Html html={c} className="prose" /></td>)}</tr>)}</tbody></table>
      </div>
    </Sec>
  );
}

/* ---------- CASES ---------- */
export function Cases({ s, t }: { s: Section; t: Topic }) {
  return (
    <Sec s={s}>
      <SecHead s={s} t={t} />
      <div className="space-y-8">{t.cases?.map((c, i) => <CaseCard key={i} c={c} />)}</div>
    </Sec>
  );
}
function CaseCard({ c }: { c: Case }) {
  const [open, setOpen] = useState(false);
  const win = c.cls === "bg-win";
  return (
    <article className="rv panel overflow-hidden">
      <header className="grid gap-5 p-6 lg:grid-cols-[1fr_auto] lg:items-start">
        <div>
          <div className="mb-3 flex flex-wrap gap-2"><span className="chip">{c.k}</span><span className={cn("chip", win ? "border-a/60 text-a" : "border-bad/60 text-bad")}>{c.badge ?? c.kind}</span></div>
          <h3 className="text-[1.7rem]">{c.title}</h3>
          {c.sub && <Html as="p" className="prose serif mb-0 mt-2 text-[1.02rem] leading-snug text-dim" html={c.sub} gloss />}
        </div>
        {c.facts && <dl className="m-0 grid min-w-[260px] grid-cols-2 gap-x-6 gap-y-2 border-t border-rule pt-3">{c.facts.map(([k, v]) => <div key={k}><dt className="font-mono text-[.56rem] uppercase tracking-[.12em] text-muted">{k}</dt><dd className="mono m-0 text-[.88rem] text-text">{v}</dd></div>)}</dl>}
      </header>
      {c.charts && <div className="grid gap-3 px-6 md:grid-cols-2 xl:grid-cols-3">{c.charts.map((ch, i) => <CaseChart key={i} c={ch} />)}</div>}
      <div className="p-6">
        <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="btn">{open ? "Hide the walkthrough" : `Walk through it · ${c.steps?.length ?? 0} moves`}</button>
        <AnimatePresence initial={false}>
          {open && <motion.ol initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="m-0 mt-5 grid list-none gap-x-8 overflow-hidden border-t border-line-soft p-0 md:grid-cols-2">
            {c.steps?.map(([k, v], i) => <li key={i} className="border-b border-line-soft py-3"><span className="font-mono text-[.6rem] uppercase tracking-[.12em] text-acc">{String(i + 1).padStart(2, "0")} · {k}</span><Html as="p" className="prose mb-0 mt-1 text-[.88rem] text-dim" html={v} gloss /></li>)}
          </motion.ol>}
        </AnimatePresence>
      </div>
      {c.verdict && (
        <footer className={cn("relative grid gap-4 border-t p-6 md:grid-cols-[auto_1fr] md:items-center", win ? "border-a/40" : "border-bad/40")}>
          <span className={cn("stamp serif inline-block border-[3px] px-3 py-1 text-2xl font-bold uppercase tracking-tight", win ? "border-a text-a" : "border-bad text-bad")}>{c.verdict.stamp}</span>
          <div><b className="serif text-[1.15rem] text-text">{c.verdict.h}</b><Html as="p" className="prose mb-0 mt-1 text-[.92rem] text-dim" html={c.verdict.p} gloss />{c.verdict.lesson && <Html as="p" className="prose mb-0 mt-2 text-[.88rem] text-text" html={"<b>Lesson:</b> " + c.verdict.lesson} />}</div>
        </footer>
      )}
    </article>
  );
}

/* ---------- CHEAT SHEET ---------- */
export function Cheatsheet({ s, t }: { s: Section; t: Topic }) {
  const [q, setQ] = useState("");
  const needle = q.trim();
  const rows = (t.terms ?? []).filter((x) => !needle || (x.t + " " + x.d + " " + (x.c ?? "") + " " + x.g).toLowerCase().includes(needle.toLowerCase()));
  return (
    <Sec s={s}>
      <SecHead s={s} t={t} right={<div className="flex items-end gap-2 no-print"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the sheet…" aria-label="Search the cheat sheet" className="field w-52 font-mono text-[.78rem]" /></div>} />
      <div className="rv thin max-h-[70vh] overflow-auto border-y border-rule">
        <table className="tbl"><thead className="sticky top-0 z-[1]"><tr><th>Term</th><th>Group</th><th>Meaning</th><th>{s.col3 ?? "Analogy"}</th></tr></thead>
          <tbody>{rows.map((x) => <tr key={x.t}><td><Html html={highlight(x.t, needle)} />{x.a && <span className="block text-[.72rem] font-normal text-muted">{x.a}</span>}</td><td className="whitespace-nowrap font-mono text-[.7rem]">{t.groups?.find((g) => g.id === x.g)?.label ?? x.g}</td><td><Html html={highlight(x.d, needle)} className="prose" /></td><td className="serif italic"><Html html={highlight(x.c ?? "", needle)} className="prose" /></td></tr>)}</tbody></table>
        {!rows.length && <p className="p-6 font-mono text-sm text-muted">Nothing matches “{q}”.</p>}
      </div>
    </Sec>
  );
}

/* ---------- QUIZ ---------- */
export function QuizSec({ s, t }: { s: Section; t: Topic }) {
  const qs = t.quiz ?? [];
  const [i, setI] = useState(0); const [pick, setPick] = useState<number | null>(null); const [score, setScore] = useState(0); const [done, setDone] = useState(false);
  const q = qs[i];
  const store = useStore();
  const best = store.topics[t.id]?.quizBest;
  if (!q) return null;
  const choose = (k: number) => { if (pick != null) return; setPick(k); if (k === q.a) setScore((x) => x + 1); };
  const next = () => {
    if (i + 1 >= qs.length) { setDone(true); store.recordAttempt({ kind: "topic", topic: t.id, score, total: qs.length }); store.complete(t.id, true); }
    else { setI(i + 1); setPick(null); }
  };
  const reset = () => { setI(0); setPick(null); setScore(0); setDone(false); };
  return (
    <Sec s={s}>
      <SecHead s={s} t={t} />
      <div className="rv max-w-3xl border-t-[3px] border-double border-rule pt-5">
        <div className="mb-4 flex items-center justify-between font-mono text-[.64rem] uppercase tracking-[.12em] text-muted"><span>Question {Math.min(i + 1, qs.length)} of {qs.length}</span><span className="flex gap-4">{best != null && <span>best {best}/{qs.length}</span>}<span className="text-acc">score {score}</span></span></div>
        <div className="mb-6 flex gap-[3px]" aria-hidden>{qs.map((_, k) => <i key={k} className="h-[3px] flex-1" style={{ background: k < i || done ? "var(--acc)" : k === i ? "var(--text)" : "var(--line-soft)" }} />)}</div>
        <AnimatePresence mode="wait">
          {done ? (
            <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-6 text-center">
              <span className="kicker">Result</span>
              <p className="display my-3 text-[clamp(3rem,7vw,5rem)]"><span className="text-acc">{score}</span><span className="text-muted">/{qs.length}</span></p>
              <p className="serif text-[1.1rem] text-dim">{score === qs.length ? "Clean sweep. Go and teach it to someone." : score >= qs.length * .7 ? "Solid. Re-read the ones you missed — they are usually the traps." : "The cheat sheet above is the fastest fix. Then come back."}</p>
              <button className="btn btn-key" onClick={reset}>Try again</button>
            </motion.div>
          ) : (
            <motion.div key={i} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: .25 }}>
              <Html as="h3" className="prose text-[clamp(1.3rem,2.2vw,1.6rem)] leading-snug" html={q.q} />
              <div className="mt-5 grid gap-2" role="group" aria-label="Answers">
                {q.o.map((o, k) => <Choice key={k} k={k} html={o} pick={pick} answer={q.a} onChoose={choose} />)}
              </div>
              <AnimatePresence>{pick != null && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cn("mt-4 border-l-2 py-1 pl-4", pick === q.a ? "border-a" : "border-bad")} role="status">
                  <b className={pick === q.a ? "text-a" : "text-bad"}>{pick === q.a ? "Correct." : "Not quite."}</b> <Html html={q.e} className="prose text-[.92rem] text-dim" gloss />
                  <div className="mt-3"><button className="btn btn-key" onClick={next}>{i + 1 >= qs.length ? "See result" : "Next question →"}</button></div>
                </motion.div>)}</AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Sec>
  );
}

/** One answer option; shared by the topic quiz and the prep-lab drill. */
export function Choice({ k, html, pick, answer, onChoose }: { k: number; html: string; pick: number | null; answer: number; onChoose: (k: number) => void }) {
  const st = pick == null ? "" : k === answer ? "right" : k === pick ? "wrong" : "dim";
  return (
    <button onClick={() => onChoose(k)} disabled={pick != null} className={cn("flex items-start gap-3 border p-4 text-left text-[.94rem] transition-colors", st === "" && "border-line-soft bg-ink-1 hover:border-rule", st === "right" && "border-a bg-[color-mix(in_srgb,var(--a)_8%,transparent)] text-text", st === "wrong" && "border-bad bg-[color-mix(in_srgb,var(--bad)_8%,transparent)]", st === "dim" && "border-line-soft opacity-45")}>
      <span className={cn("mono grid h-6 w-6 shrink-0 place-content-center border text-[.7rem]", st === "right" ? "border-a text-a" : st === "wrong" ? "border-bad text-bad" : "border-line text-muted")}>{st === "right" ? "✓" : st === "wrong" ? "✗" : String.fromCharCode(65 + k)}</span><Html html={html} className="prose" />
    </button>
  );
}

/* ---------- FRAMEWORKS ---------- */
export function Frameworks({ s, t }: { s: Section; t: Topic }) {
  const fams = useMemo(() => [...new Set((t.frameworks ?? []).map((f) => f.stage))], [t]);
  const [fam, setFam] = useState("all"); const [open, setOpen] = useState<string | null>(null);
  const list = (t.frameworks ?? []).filter((f) => fam === "all" || f.stage === fam);
  return (
    <Sec s={s}>
      <SecHead s={s} t={t} />
      <div className="rv mb-6 flex flex-wrap gap-1"><button className="pill" aria-pressed={fam === "all"} onClick={() => setFam("all")}>All · {t.frameworks?.length}</button>{fams.map((f) => <button key={f} className="pill" aria-pressed={fam === f} onClick={() => setFam(f)}>{f} · {t.frameworks?.filter((x) => x.stage === f).length}</button>)}</div>
      <motion.div layout className="grid gap-3 md:grid-cols-2">
        <AnimatePresence>{list.map((f) => <FwCard key={f.name} f={f} open={open === f.name} onToggle={() => setOpen(open === f.name ? null : f.name)} />)}</AnimatePresence>
      </motion.div>
      <NameThatTerm t={t} />
    </Sec>
  );
}
function FwCard({ f, open, onToggle }: { f: Framework; open: boolean; onToggle: () => void }) {
  return (
    <motion.article layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={cn("card overflow-hidden", open && "border-rule md:col-span-2")}>
      <button onClick={onToggle} aria-expanded={open} className="w-full p-5 text-left">
        <div className="flex items-center justify-between gap-3"><span className="kicker text-acc">{f.stage}</span><span className={cn("font-mono text-lg text-muted transition-transform", open && "rotate-45 text-acc")} aria-hidden>+</span></div>
        <h3 className="mt-2 text-[1.35rem]">{f.name}{f.alias && <span className="serif ml-2 text-[.9rem] font-normal italic text-muted">{f.alias}</span>}</h3>
        <Html as="p" className="prose mb-0 mt-2 text-[.9rem] text-dim" html={f.one} />
        {(f.time || f.who) && <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[.62rem] uppercase tracking-[.08em] text-muted">{f.time && <span>Time · <span className="text-dim normal-case tracking-normal">{f.time}</span></span>}{f.who && <span>Who · <span className="text-dim normal-case tracking-normal">{f.who}</span></span>}</div>}
      </button>
      <AnimatePresence initial={false}>{open && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: .35, ease: [.22, .61, .36, 1] }} className="overflow-hidden">
          <div className="grid gap-6 border-t border-line-soft p-5 lg:grid-cols-2">
            <div className="space-y-4">
              {f.when && <div><span className="kicker">Reach for it when</span><Html as="p" className="prose mb-0 mt-1 text-[.9rem] text-dim" html={f.when} gloss /></div>}
              {f.how && <div><span className="kicker">How</span><ol className="mb-0 mt-1 list-decimal space-y-1.5 pl-5 text-[.9rem] text-dim marker:font-mono marker:text-[.7rem] marker:text-acc">{f.how.map((h, i) => <li key={i}><Html html={h} className="prose" gloss /></li>)}</ol></div>}
              {f.out && <div className="border-l-2 border-a pl-3"><span className="font-mono text-[.6rem] uppercase tracking-[.12em] text-a">You end up with</span><Html as="p" className="prose mb-0 mt-1 text-[.88rem] text-dim" html={f.out} /></div>}
              {f.trap && <div className="border-l-2 border-bad pl-3"><span className="font-mono text-[.6rem] uppercase tracking-[.12em] text-bad">How it fails</span><Html as="p" className="prose mb-0 mt-1 text-[.88rem] text-dim" html={f.trap} gloss /></div>}
              {f.with && <div><span className="kicker">Pairs with</span><Html as="p" className="prose mb-0 mt-1 text-[.88rem] text-dim" html={f.with} gloss /></div>}
            </div>
            <div className="space-y-4">
              {f.viz && <div className="border border-line-soft bg-ink p-4"><span className="kicker">The shape</span><div className="mt-3"><Viz viz={f.viz} /></div></div>}
              {f.ex && <div className="border border-line-soft bg-ink p-4"><span className="kicker text-acc">Worked example</span><h4 className="mt-1 text-[1.1rem]">{f.ex.h}</h4>{f.ex.p && <Html as="p" className="prose mt-2 text-[.88rem] text-dim" html={f.ex.p} />}{f.ex.viz && <div className="mt-3"><Viz viz={f.ex.viz} /></div>}</div>}
            </div>
          </div>
        </motion.div>)}</AnimatePresence>
    </motion.article>
  );
}
