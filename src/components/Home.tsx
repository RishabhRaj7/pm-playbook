import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { STAGES, STATS, TOPICS, stageOf, type StageId } from "@/data";
import { useReveal } from "@/lib/hooks";
import LoopCanvas, { type LoopStats } from "./LoopCanvas";
import QuarterEngine from "./QuarterEngine";
import { cn } from "@/utils/cn";

const PATHS = [
  { k: "Interview prep", h: "The order an interviewer thinks in", p: "Metrics first, then prioritisation and strategy — the three that show up in every PM loop — then frameworks to give your answers structure.", ids: ["metrics", "prioritisation", "strategy", "discovery", "fw-decide", "ab-testing"] },
  { k: "First 90 days", h: "What a new PM actually gets asked to do", p: "Write a spec, size a test, read the analytics, ship it. Then the frameworks for the meetings you will be dragged into.", ids: ["specs", "analytics", "ab-testing", "launch", "fw-diagnosis", "fw-deliver"] },
  { k: "Quick reference", h: "Keep it open in a tab", p: "The three framework libraries plus pricing — the four topics most useful when someone asks “what is that model called again?”", ids: ["fw-diagnosis", "fw-decide", "fw-deliver", "pricing"] },
];

const ANATOMY = [
  ["Analogy", "One scene that every term in the topic maps onto, so the vocabulary has somewhere to live."],
  ["Terms", "Flip cards. Front: what it means. Back: what it is in the analogy."],
  ["Process", "A numbered order of operations for a real Tuesday, with a do / don't for each step."],
  ["Diagrams", "The bits that are hard to hold in words. Hover to have them explain themselves."],
  ["Worked examples", "Composite cases with real arithmetic and a verdict stamp."],
  ["Cheat sheet + quiz", "Everything in one filterable table, then ten questions that go for the traps."],
];

export default function Home({ go, openSearch }: { go: (t: string | null, a?: string | null) => void; openSearch: () => void }) {
  const [hover, setHover] = useState<StageId | null>(null);
  const [filter, setFilter] = useState<StageId | null>(null);
  const [stats, setStats] = useState<LoopStats>({ considered: 0, shipped: 0 });
  useReveal("home");
  useEffect(() => { window.scrollTo({ top: 0 }); }, []);
  const active = hover ?? filter;
  const cards = useMemo(() => TOPICS.filter((t) => !filter || t.stage === filter), [filter]);
  const rate = stats.considered ? Math.round((stats.shipped / stats.considered) * 100) : 0;

  return (
    <div className="w-full">
      {/* ================= HERO ================= */}
      <section className="relative mx-auto grid max-w-[1280px] gap-8 px-5 pt-10 pb-8 sm:px-8 lg:grid-cols-[1fr_1fr] lg:items-center lg:pt-14 lg:min-h-[calc(100vh-64px)]">
        <div className="relative z-10 max-w-xl">
          <span className="rise inline-flex items-center gap-2 font-mono text-[.66rem] uppercase tracking-[.22em] text-muted"><i className="h-1.5 w-1.5 rounded-full bg-acc blip" />The PM Playbook · v4</span>
          <h1 className="rise mt-5 text-[clamp(2.6rem,6vw,4.8rem)]" style={{ animationDelay: ".05s" }}>Product management is taught as a line. It runs as a <span className="sw">loop</span>.</h1>
          <p className="lede rise mt-6" style={{ animationDelay: ".12s" }}>Discover, define, prioritise, build, measure, land — then again, a little higher. Twelve topics cover every plate on the climb: the vocabulary, a process, worked arithmetic, the frameworks, and a quiz that goes for the traps.</p>
          <div className="rise mt-7 flex flex-wrap gap-3" style={{ animationDelay: ".2s" }}>
            <button className="btn btn-key" onClick={() => go("ab-testing")}>Start at topic 01 →</button>
            <button className="btn" onClick={openSearch}><span className="text-acc">⌕</span> Search everything <kbd className="ml-1">/</kbd></button>
          </div>
          {/* live tally from the loop */}
          <div className="rise mt-8 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-line-soft bg-line-soft" style={{ animationDelay: ".28s" }}>
            {[["Ideas in", stats.considered, false], ["Shipped", stats.shipped, true], ["Survival", stats.considered ? rate + "%" : "—", false]].map(([l, v, win]) => (
              <div key={String(l)} className="bg-ink-1 px-4 py-3"><span className="block font-mono text-[.56rem] uppercase tracking-[.16em] text-muted">{l}</span><b className={cn("font-mono text-xl font-bold tabular-nums", win ? "text-acc" : "text-text")}>{v}</b></div>
            ))}
          </div>
          <p className="mt-3 text-[.76rem] text-muted">Live from the loop on the right: most ideas die on the climb, at a research session, a sizing calculation, a guardrail. Killing them cheaply is the craft.</p>
        </div>
        <div className="relative h-[420px] sm:h-[520px] lg:h-[620px] -mx-5 sm:mx-0">
          <div className="absolute inset-0 rounded-3xl border border-line-soft/60 bg-gradient-to-b from-ink-1/40 to-transparent" />
          <LoopCanvas onStageHover={setHover} onStageClick={(s) => { setFilter((f) => (f === s ? null : s)); document.getElementById("topics")?.scrollIntoView({ behavior: "smooth", block: "start" }); }} activeStage={active} onStats={setStats} />
          <div className="pointer-events-none absolute left-4 top-4 flex flex-col gap-1">
            <span className="font-mono text-[.6rem] uppercase tracking-[.2em] text-muted">The rising loop</span>
            <AnimatePresence mode="wait">
              <motion.span key={hover ?? "none"} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="text-[.82rem] text-dim">{hover ? <><b className="text-text">{stageOf(hover).label}</b> · {stageOf(hover).note} · {TOPICS.filter((t) => t.stage === hover).length} topics</> : "drag to orbit · hover a stage · click to filter"}</motion.span>
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* ================= STATS MARQUEE ================= */}
      <div className="relative overflow-hidden border-y border-line-soft bg-ink-1/50 py-3">
        <div className="marquee flex w-max gap-10 whitespace-nowrap font-mono text-[.66rem] uppercase tracking-[.2em] text-muted">
          {[...Array(2)].map((_, r) => (
            <span key={r} className="flex gap-10">
              {[[STATS.topics, "topics"], [STATS.terms, "terms"], [STATS.fw, "frameworks"], [STATS.viz, "diagrams"], [STATS.steps, "process steps"], [STATS.cases, "worked examples"], [STATS.quiz, "quiz questions"], [5, "interactive tools"]].map(([n, l]) => <span key={String(l)}><b className="text-acc">{n}</b> {l} <span className="ml-10 text-line">✦</span></span>)}
            </span>
          ))}
        </div>
      </div>

      {/* ================= TOPIC GRID ================= */}
      <section id="topics" className="mx-auto max-w-[1280px] px-5 py-16 sm:px-8 scroll-mt-20">
        <p className="eyebrow rv">The curriculum</p>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="rv d1 text-[clamp(1.9rem,4vw,3rem)]">Twelve topics. <span className="sw">One shape.</span></h2>
          <div className="rv d2 flex flex-wrap gap-1.5">
            <button className="pill" aria-pressed={!filter} onClick={() => setFilter(null)}>All · 12</button>
            {STAGES.map((s) => <button key={s.id} className="pill flex items-center gap-1.5" aria-pressed={filter === s.id} onClick={() => setFilter(filter === s.id ? null : s.id)} onMouseEnter={() => setHover(s.id)} onMouseLeave={() => setHover(null)}><i className="h-1.5 w-1.5 rounded-full" style={{ background: `hsl(${s.hue} 80% 62%)` }} />{s.label} · {TOPICS.filter((t) => t.stage === s.id).length}</button>)}
          </div>
        </div>
        <motion.div layout className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {cards.map((t, i) => {
              const st = stageOf(t.stage); const dim = active && active !== t.stage;
              return (
                <motion.button layout key={t.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: dim ? .35 : 1, y: 0 }} exit={{ opacity: 0, scale: .96 }} transition={{ duration: .35, delay: i * .03 }} onClick={() => go(t.id)} className="card card-hover group relative overflow-hidden p-5 text-left">
                  <span className="absolute inset-x-0 top-0 h-[2px] opacity-70" style={{ background: `hsl(${st.hue} 80% 62%)` }} />
                  <div className="flex items-center justify-between"><span className="font-mono text-[.72rem] font-bold text-acc">{t.n}</span><span className="chip py-1"><i className="h-1.5 w-1.5 rounded-full" style={{ background: `hsl(${st.hue} 80% 62%)` }} />{st.label}</span></div>
                  <h3 className="mt-4 text-[1.2rem] leading-tight">{t.title}</h3>
                  <p className="mt-2 mb-0 text-[.86rem] text-dim line-clamp-3">{t.one}</p>
                  <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[.6rem] uppercase tracking-[.12em] text-muted">
                    {t.terms?.length ? <span>{t.terms.length} terms</span> : null}{t.frameworks?.length ? <span>{t.frameworks.length} frameworks</span> : null}{t.steps?.length ? <span>{t.steps.length} steps</span> : null}{t.cases?.length ? <span>{t.cases.length} cases</span> : null}
                    <span className="ml-auto text-acc transition-transform group-hover:translate-x-1">Open →</span>
                  </div>
                </motion.button>
              );
            })}
          </AnimatePresence>
        </motion.div>
      </section>

      {/* ================= PATHS ================= */}
      <section className="border-t border-line-soft bg-ink-1/30">
        <div className="mx-auto max-w-[1280px] px-5 py-16 sm:px-8">
          <p className="eyebrow rv">Where to start</p>
          <h2 className="rv d1 text-[clamp(1.9rem,4vw,3rem)]">Three ways <span className="sw">through</span></h2>
          <p className="lede rv d2 mt-4">The topics are numbered, but nobody has to read them in order. Pick the reason you are here.</p>
          <div className="mt-8 grid gap-3 lg:grid-cols-3">
            {PATHS.map((p, i) => (
              <div key={p.k} className={cn("panel rv p-6 flex flex-col", `d${i + 1}`)}>
                <span className="font-mono text-[.6rem] uppercase tracking-[.16em] text-acc">{p.k}</span>
                <h3 className="mt-2 text-[1.2rem]">{p.h}</h3>
                <p className="mt-2 text-[.86rem] text-dim">{p.p}</p>
                <ol className="m-0 mt-auto list-none space-y-1 p-0">
                  {p.ids.map((id, k) => { const t = TOPICS.find((x) => x.id === id)!; return <li key={id}><button onClick={() => go(id)} className="group flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left text-[.86rem] text-dim transition-colors hover:bg-ink-3 hover:text-text"><span className="mono text-[.62rem] text-muted w-4">{k + 1}</span><span className="mono text-[.62rem] text-acc">{t.n}</span><span className="truncate">{t.title}</span><span className="ml-auto opacity-0 transition-opacity group-hover:opacity-100 text-acc">→</span></button></li>; })}
                </ol>
                <button className="btn btn-key mt-5 self-start" onClick={() => go(p.ids[0])}>Begin this path</button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= QUARTER ENGINE ================= */}
      <section id="engine" className="mx-auto max-w-[1280px] px-5 py-16 sm:px-8">
        <div className="grid gap-8 lg:grid-cols-[.8fr_1.2fr] lg:items-start">
          <div className="lg:sticky lg:top-24">
            <p className="eyebrow rv">Try it</p>
            <h2 className="rv d1 text-[clamp(1.9rem,4vw,3rem)]">Every quarter, in <span className="sw">miniature</span></h2>
            <p className="lede rv d2 mt-4">Ideas arrive faster than capacity, so the quarter is decided by where you draw the line. This is one quarter running end to end — intake, run cost, scoring, the line, reality, delivery, review — on a loop. Almost everything in it will feel familiar.</p>
            <div className="rv d3 mt-6 flex flex-wrap gap-2"><button className="btn" onClick={() => go("prioritisation")}>Topic 04 · Prioritisation →</button><button className="btn" onClick={() => go("fw-decide", "tool")}>Try the RICE scorer</button></div>
          </div>
          <div className="rv d1"><QuarterEngine /></div>
        </div>
      </section>

      {/* ================= ANATOMY ================= */}
      <section className="border-t border-line-soft">
        <div className="mx-auto max-w-[1280px] px-5 py-16 sm:px-8">
          <p className="eyebrow rv">How each topic is built</p>
          <h2 className="rv d1 text-[clamp(1.9rem,4vw,3rem)]">Same shape, <span className="sw">every time</span></h2>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ANATOMY.map(([h, p], i) => <div key={h} className={cn("card rv p-5", `d${(i % 3) + 1}`)}><span className="mono text-[.62rem] text-acc">0{i + 1}</span><h3 className="mt-2 text-[1.05rem]">{h}</h3><p className="mt-2 mb-0 text-[.84rem] text-dim">{p}</p></div>)}
          </div>
        </div>
      </section>
    </div>
  );
}
