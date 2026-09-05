import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { STAGES, STATS, TOPICS, stageOf, type StageId } from "@/data";
import { MOCK_QS } from "@/data/prep";
import { scrollToId, useReveal } from "@/lib/hooks";
import { useStore } from "@/lib/progress";
import ScrollLoop, { type LoopStats } from "./ScrollLoop";
import QuarterEngine from "./QuarterEngine";
import { PathsGrid, ResumeCard } from "./Paths";
import { cn } from "@/utils/cn";

const ANATOMY = [
  ["Analogy", "One scene that every term in the topic maps onto, so the vocabulary has somewhere to live."],
  ["Terms", "Flip cards. Front: what it means. Back: what it is in the analogy."],
  ["Process", "A numbered order of operations for a real Tuesday, with a do / don't for each step."],
  ["Diagrams", "The bits that are hard to hold in words. Hover to have them explain themselves."],
  ["Worked examples", "Composite cases with real arithmetic and a verdict stamp."],
  ["Cheat sheet + quiz", "Everything in one filterable table, then ten questions that go for the traps."],
];

export default function Home({ go, openSearch, anchor }: { go: (t: string | null, a?: string | null) => void; openSearch: () => void; anchor?: string | null }) {
  const [hover, setHover] = useState<StageId | null>(null);
  const [filter, setFilter] = useState<StageId | null>(null);
  const [stats, setStats] = useState<LoopStats>({ considered: 0, shipped: 0 });
  const s = useStore();
  useReveal("home");
  useEffect(() => {
    if (anchor) { const id = requestAnimationFrame(() => setTimeout(() => scrollToId(anchor), 80)); return () => cancelAnimationFrame(id); }
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [anchor]);
  const active = hover ?? filter;
  const cards = useMemo(() => TOPICS.filter((t) => !filter || t.stage === filter), [filter]);
  const rate = stats.considered ? Math.round((stats.shipped / stats.considered) * 100) : 0;
  const completed = TOPICS.filter((t) => s.topics[t.id]?.completed).length;

  const hero = (
    <>
      <span className="rise inline-flex items-center gap-2 font-mono text-[.66rem] uppercase tracking-[.22em] text-muted"><i className="h-1.5 w-1.5 rounded-full bg-acc blip" />The PM Playbook · v5</span>
      <h1 className="rise mt-5 text-[clamp(2.4rem,5.6vw,4.6rem)]" style={{ animationDelay: ".05s" }}>Product management is taught as a line. It runs as a <span className="sw">loop</span>.</h1>
      <p className="lede rise mt-5" style={{ animationDelay: ".12s" }}>Discover, define, prioritise, build, measure, land — then again, a little higher. Twelve topics cover every plate on the climb. Scroll to walk the loop.</p>
      <div className="rise mt-6 flex flex-wrap gap-3" style={{ animationDelay: ".2s" }}>
        <button className="btn btn-key" onClick={() => go("ab-testing")}>Start at topic 01 →</button>
        <button className="btn" onClick={() => go("prep")}>Interview prep lab</button>
        <button className="btn" onClick={openSearch}><span className="text-acc">⌕</span> Search <kbd className="ml-1">/</kbd></button>
      </div>
      <ResumeCard go={go} />
      <div className="rise mt-6 hidden max-w-md grid-cols-3 gap-px overflow-hidden rounded-xl border border-line-soft bg-line-soft sm:grid" style={{ animationDelay: ".28s" }}>
        {[["Ideas in", stats.considered, false], ["Shipped", stats.shipped, true], ["Survival", stats.considered ? rate + "%" : "—", false]].map(([l, v, win]) => (
          <div key={String(l)} className="bg-ink-1/90 px-4 py-2.5 backdrop-blur"><span className="block font-mono text-[.56rem] uppercase tracking-[.16em] text-muted">{l}</span><b className={cn("font-mono text-lg font-bold tabular-nums", win ? "text-acc" : "text-text")}>{v}</b></div>
        ))}
      </div>
    </>
  );

  const summit = (
    <>
      <span className="inline-flex items-center gap-2 font-mono text-[.66rem] uppercase tracking-[.22em] text-acc"><i className="h-1.5 w-1.5 rounded-full bg-acc blip" />Shipped · the top of the loop</span>
      <h2 className="mt-4 text-[clamp(2rem,4.8vw,3.8rem)]">Most ideas die on the climb. <span className="sw">Killing them cheaply</span> is the craft.</h2>
      <p className="lede mt-4">{stats.considered ? <>{stats.considered} ideas entered while you scrolled; {stats.shipped} shipped. </> : null}The rest of this page is the curriculum: twelve topics, four paths through them, and a lab for the interview loop.</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button className="btn btn-key" onClick={() => scrollToId("topics")}>See the twelve topics ↓</button>
        <button className="btn" onClick={() => scrollToId("paths")}>Pick a path</button>
      </div>
    </>
  );

  return (
    <div className="w-full">
      {/* ================= SCROLL-DRIVEN HERO ================= */}
      <ScrollLoop hero={hero} summit={summit} go={go} onStats={setStats} onStageClick={(st) => { setFilter(st); scrollToId("topics"); }} />

      {/* ================= STATS MARQUEE ================= */}
      <div className="relative overflow-hidden border-y border-line-soft bg-ink-1/50 py-3">
        <div className="marquee flex w-max gap-10 whitespace-nowrap font-mono text-[.66rem] uppercase tracking-[.2em] text-muted">
          {[...Array(2)].map((_, r) => (
            <span key={r} className="flex gap-10">
              {[[STATS.topics, "topics"], [STATS.terms, "terms"], [STATS.fw, "frameworks"], [STATS.viz, "diagrams"], [STATS.steps, "process steps"], [STATS.cases, "worked examples"], [STATS.quiz, "quiz questions"], [MOCK_QS.length, "mock interview cards"], [5, "interactive tools"]].map(([n, l]) => <span key={String(l)}><b className="text-acc">{n}</b> {l} <span className="ml-10 text-line">✦</span></span>)}
            </span>
          ))}
        </div>
      </div>

      {/* ================= TOPIC GRID ================= */}
      <section id="topics" className="mx-auto max-w-[1280px] scroll-mt-20 px-5 py-16 sm:px-8">
        <p className="eyebrow rv">The curriculum</p>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="rv d1 text-[clamp(1.9rem,4vw,3rem)]">Twelve topics. <span className="sw">One shape.</span>{completed > 0 && <span className="ml-3 align-middle font-mono text-[.7rem] font-normal tracking-normal text-muted">{completed}/12 done</span>}</h2>
          <div className="rv d2 flex flex-wrap gap-1.5">
            <button className="pill" aria-pressed={!filter} onClick={() => setFilter(null)}>All · 12</button>
            {STAGES.map((st) => <button key={st.id} className="pill flex items-center gap-1.5" aria-pressed={filter === st.id} onClick={() => setFilter(filter === st.id ? null : st.id)} onMouseEnter={() => setHover(st.id)} onMouseLeave={() => setHover(null)}><i className="h-1.5 w-1.5 rounded-full" style={{ background: `hsl(${st.hue} 80% 62%)` }} />{st.label} · {TOPICS.filter((t) => t.stage === st.id).length}</button>)}
          </div>
        </div>
        <motion.div layout className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {cards.map((t, i) => {
              const st = stageOf(t.stage); const dim = active && active !== t.stage; const tp = s.topics[t.id];
              const read = tp ? Math.min(1, tp.seen.length / t.sections.length) : 0;
              return (
                <motion.button layout key={t.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: dim ? .35 : 1, y: 0 }} exit={{ opacity: 0, scale: .96 }} transition={{ duration: .35, delay: i * .03 }} onClick={() => go(t.id, tp && tp.scrollY > 400 && !tp.completed ? "~resume" : undefined)} className={cn("card card-hover group relative overflow-hidden p-5 text-left", tp?.completed && "border-acc/40")}>
                  <span className="absolute inset-x-0 top-0 h-[2px] opacity-70" style={{ background: `hsl(${st.hue} 80% 62%)` }} />
                  <div className="flex items-center justify-between"><span className="font-mono text-[.72rem] font-bold text-acc">{t.n}</span><span className="flex items-center gap-1.5">{tp?.completed && <span className="chip border-acc/40 py-1 text-acc">✓ done</span>}<span className="chip py-1"><i className="h-1.5 w-1.5 rounded-full" style={{ background: `hsl(${st.hue} 80% 62%)` }} />{st.label}</span></span></div>
                  <h3 className="mt-4 text-[1.2rem] leading-tight">{t.title}</h3>
                  <p className="mb-0 mt-2 line-clamp-3 text-[.86rem] text-dim">{t.one}</p>
                  <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[.6rem] uppercase tracking-[.12em] text-muted">
                    {t.terms?.length ? <span>{t.terms.length} terms</span> : null}{t.frameworks?.length ? <span>{t.frameworks.length} frameworks</span> : null}{t.steps?.length ? <span>{t.steps.length} steps</span> : null}{t.cases?.length ? <span>{t.cases.length} cases</span> : null}
                    <span className="ml-auto text-acc transition-transform group-hover:translate-x-1">{tp && read > 0 && !tp.completed ? "Resume →" : "Open →"}</span>
                  </div>
                  {read > 0 && <span className="absolute inset-x-0 bottom-0 h-[2px] bg-line-soft"><span className="block h-full bg-acc transition-[width] duration-700" style={{ width: `${(tp?.completed ? 1 : read) * 100}%` }} /></span>}
                </motion.button>
              );
            })}
          </AnimatePresence>
        </motion.div>
      </section>

      {/* ================= PATHS ================= */}
      <section id="paths" className="scroll-mt-20 border-t border-line-soft bg-ink-1/30">
        <div className="mx-auto max-w-[1280px] px-5 py-16 sm:px-8">
          <p className="eyebrow rv">Where to start</p>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="rv d1 text-[clamp(1.9rem,4vw,3rem)]">Four ways <span className="sw">through</span></h2>
            <p className="rv d2 max-w-md text-[.84rem] text-dim">Pick one and the playbook remembers it: which step you are on, where you stopped reading, and what is left. Saved in this browser, nowhere else.</p>
          </div>
          <PathsGrid go={go} />
        </div>
      </section>

      {/* ================= PREP TEASER ================= */}
      <section className="mx-auto max-w-[1280px] px-5 py-16 sm:px-8">
        <div className="panel grid gap-8 overflow-hidden p-6 lg:grid-cols-[1fr_1fr] lg:p-10">
          <div>
            <p className="eyebrow rv">Interview prep lab</p>
            <h2 className="rv d1 text-[clamp(1.8rem,3.6vw,2.8rem)]">Practise the way the loop <span className="sw">gets asked</span>.</h2>
            <p className="lede rv d2 mt-4">Mixed drills across the twelve quizzes, {MOCK_QS.length} timed mock-interview cards with rubrics and traps, {STATS.terms} flashcards, and a progress view that tells you where you are weak.</p>
            <div className="rv d3 mt-6 flex flex-wrap gap-2"><button className="btn btn-key" onClick={() => go("prep", "drill")}>Run a 10-question drill →</button><button className="btn" onClick={() => go("prep", "mock")}>Draw a mock card</button></div>
          </div>
          <div className="rv d2 grid gap-2 sm:grid-cols-2">
            {[["Drill", "Shuffled questions from the topics you choose. Misses become weak spots."], ["Mock interview", "Product sense, execution, strategy, estimation, behavioural, technical. Timed."], ["Flashcards", "Every term in the playbook. Space flips, arrows sort into again / known."], ["Progress", "Accuracy by topic, rubric coverage, recent sessions, streak."]].map(([h, p], i) => (
              <button key={h} onClick={() => go("prep", ["drill", "mock", "cards", "progress"][i])} className="card card-hover p-4 text-left"><span className="mono text-[.62rem] text-acc">0{i + 1}</span><b className="mt-1 block font-display text-[1rem]">{h}</b><span className="mt-1 block text-[.8rem] text-dim">{p}</span></button>
            ))}
          </div>
        </div>
      </section>

      {/* ================= QUARTER ENGINE ================= */}
      <section id="engine" className="mx-auto max-w-[1280px] border-t border-line-soft px-5 py-16 sm:px-8">
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
            {ANATOMY.map(([h, p], i) => <div key={h} className={cn("card rv p-5", `d${(i % 3) + 1}`)}><span className="mono text-[.62rem] text-acc">0{i + 1}</span><h3 className="mt-2 text-[1.05rem]">{h}</h3><p className="mb-0 mt-2 text-[.84rem] text-dim">{p}</p></div>)}
          </div>
        </div>
      </section>
    </div>
  );
}
