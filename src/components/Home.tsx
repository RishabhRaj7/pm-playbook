import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CORE, GLOSSARY, LIBRARY, STAGES, STATS, TOPICS, stageOf, termOfTheDay, topicById, type StageId, type Topic } from "@/data";
import { MOCK_QS } from "@/data/prep";
import { PATHS } from "@/data/paths";
import { scrollToId, useReveal } from "@/lib/hooks";
import { useStore } from "@/lib/progress";
import ScrollLoop, { Stat } from "./ScrollLoop";
import QuarterEngine from "./QuarterEngine";
import ParticleType from "./ParticleType";
import { PathsGrid, ResumeCard } from "./Paths";
import { Html } from "./Sections";
import { cn } from "@/utils/cn";

type Go = (t: string | null, a?: string | null) => void;

const ANATOMY: [string, string][] = [
  ["The big idea", "One framing, or one scene, that every term in the topic hangs on, so the vocabulary has somewhere to live."],
  ["Terms", "Flip cards. Front: what it means. Back: where it sits in the analogy."],
  ["Process", "A numbered order of operations for a real Tuesday, with a do and a don't for each step."],
  ["Diagrams", "The ideas that are hard to hold in words. Hover or tap and they explain themselves."],
  ["Worked examples", "Composite cases with the arithmetic shown and a verdict stamped on the end."],
  ["Cheat sheet + quiz", "Everything in one searchable table, then ten questions that go for the traps."],
];

const ordinalDay = (d: Date) => Math.floor((+d - +new Date(d.getFullYear(), 0, 0)) / 864e5);

export default function Home({ go, openSearch, anchor }: { go: Go; openSearch: () => void; anchor?: string | null }) {
  const [filter, setFilter] = useState<StageId | null>(null);
  useReveal("home");
  useEffect(() => {
    if (anchor) { const id = requestAnimationFrame(() => setTimeout(() => scrollToId(anchor), 80)); return () => cancelAnimationFrame(id); }
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [anchor]);
  const today = useMemo(() => new Date(), []);
  const first = CORE[0];

  const lead = (
    <>
      <p className="kicker rise">The lead · why this playbook is shaped like a loop</p>
      <h1 className="rise mt-4 text-[clamp(2.3rem,5.4vw,4.6rem)]" style={{ animationDelay: ".05s" }}>Product management is taught as a line. It runs as a <span className="sw">loop</span>.</h1>
      <p className="lede rise mt-5" style={{ animationDelay: ".12s" }}>Discover, define, prioritise, build, measure, land — then round again, a little higher. Nine topics take one lap; three framework libraries sit on the shelf beside it. Scroll to walk the loop.</p>
      <div className="rise mt-6 flex flex-wrap gap-2" style={{ animationDelay: ".2s" }}>
        <button className="btn btn-key" onClick={() => go(first.id)}>Start at {first.n} · {first.title.split(" ")[0]} →</button>
        <button className="btn" onClick={() => scrollToId("paths")}>Choose a path</button>
        <button className="btn hidden sm:inline-flex" onClick={openSearch}>Search <kbd>/</kbd></button>
      </div>
      <div className="rise mt-6 hidden font-mono text-[.64rem] uppercase tracking-[.1em] text-muted sm:block" style={{ animationDelay: ".28s" }}>
        Live on the plate · ideas in <b className="font-medium text-text"><Stat k="considered" /></b> · shipped <b className="font-medium text-acc"><Stat k="shipped" /></b> · survival <b className="font-medium text-text"><Stat k="rate" /></b>
      </div>
    </>
  );

  const summit = (
    <>
      <p className="kicker text-acc">The summit · shipped</p>
      <h2 className="mt-3 text-[clamp(2rem,4.6vw,3.7rem)]">Most ideas die on the climb. <span className="sw">Killing them cheaply</span> is the craft.</h2>
      <p className="lede mt-4"><Stat k="considered" /> ideas entered while you read; <Stat k="shipped" /> shipped. The rest of this page is the curriculum: twelve topics, four paths through them, an index of every term, and a lab for the interview loop.</p>
      <div className="mt-6 flex flex-wrap gap-2">
        <button className="btn btn-key" onClick={() => scrollToId("curriculum")}>See the curriculum ↓</button>
        <button className="btn" onClick={() => scrollToId("paths")}>Pick a path</button>
      </div>
    </>
  );

  const pickStage = (st: StageId | null) => { setFilter(st); scrollToId("curriculum"); };

  return (
    <div className="w-full">
      {/* ================= NAMEPLATE ================= */}
      <div className="mx-auto max-w-[1320px] px-5 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-b border-line-soft py-2.5 font-mono text-[.6rem] uppercase tracking-[.12em] text-muted">
          <span>Vol. V · No. {ordinalDay(today)}</span>
          <span className="hidden sm:inline">{today.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>
          <span>{STATS.topics} topics · {GLOSSARY.length} index entries · free</span>
        </div>
        <ParticleType
          className="-mx-1 my-3 h-[36vw] sm:my-4 sm:h-[clamp(100px,15vw,210px)]"
          shapes={[["The PM Playbook"], [`${STATS.terms} terms`], [`${STATS.fw} frameworks`], ["Ship it."]]}
          label="The PM Playbook"
          weight={700}
        />
        <div className="rule-2 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-line-soft py-2.5">
          <span className="serif text-[.95rem] italic text-dim">A reference for product managers — the aspiring and the working.</span>
          <nav className="no-scrollbar -mx-1 flex max-w-full gap-0.5 overflow-x-auto" aria-label="Sections">
            {STAGES.map((st) => (
              <button key={st.id} onClick={() => pickStage(st.id)} className="shrink-0 px-2 py-1 font-mono text-[.62rem] uppercase tracking-[.1em] text-dim hover:bg-text hover:text-ink"><span className="serif mr-1 normal-case italic text-acc">{st.roman}</span>{st.label}</button>
            ))}
            <span className="mx-1 w-px self-stretch bg-line-soft" />
            <button onClick={() => go("glossary")} className="shrink-0 px-2 py-1 font-mono text-[.62rem] uppercase tracking-[.1em] text-dim hover:bg-text hover:text-ink">Index</button>
            <button onClick={() => go("prep")} className="shrink-0 px-2 py-1 font-mono text-[.62rem] uppercase tracking-[.1em] text-dim hover:bg-text hover:text-ink">Prep lab</button>
          </nav>
        </div>
      </div>

      {/* ================= THE LEAD: FIG. 1 ================= */}
      <ScrollLoop hero={lead} summit={summit} go={go} onStageClick={pickStage} />

      {/* ================= EDITOR'S NOTE + DESK ================= */}
      <section id="start" className="mx-auto max-w-[1320px] scroll-mt-16 px-5 sm:px-8">
        <div className="rule grid gap-10 pt-8 pb-14 lg:grid-cols-[1fr_22rem]">
          <div>
            <p className="kicker rv">From the editors · start here</p>
            <h2 className="rv d1 mt-3 max-w-3xl text-[clamp(1.9rem,3.8vw,3rem)]">If you are new to product management, <span className="sw">read this first</span>.</h2>
            <div className="rv d2 mt-6 gap-8 text-[.98rem] leading-relaxed text-dim md:columns-2 [&>p]:mt-0 [&>p]:mb-4 [&>p]:break-inside-avoid-column">
              <p className="dropcap">Product management has an odd problem for a profession: almost nobody studies it first. People arrive from engineering, design, sales, consulting or straight out of university, and pick up the vocabulary on the job — usually by nodding through meetings where RICE, North Stars and guardrail metrics are used as if everyone was born knowing them.</p>
              <p>This playbook is the reference we wished we had. Every topic takes one part of the job and gives it the same shape: a framing to hang the terms on, the terms themselves, a numbered process, diagrams, worked examples with the arithmetic shown, a cheat sheet and a ten-question quiz that goes for the traps.</p>
              <p><b className="text-text">Three ways in.</b> New to it? Follow <button className="link" onClick={() => scrollToId("paths")}>Start here</button> — five topics, about two weeks at an hour a day. Interview coming up? Take the interview path and spend the evenings in the <button className="link" onClick={() => go("prep")}>prep lab</button>. Already doing the job? Use <button className="link" onClick={() => go("glossary")}>the index</button>: every term and framework, A to Z, one click from its full explanation.</p>
            </div>
          </div>
          <Desk go={go} />
        </div>
      </section>

      {/* ================= THE CURRICULUM ================= */}
      <section id="curriculum" className="mx-auto max-w-[1320px] scroll-mt-16 px-5 sm:px-8">
        <div className="rule-2 pt-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="kicker rv">The curriculum · one lap of the loop</p>
              <h2 className="rv d1 mt-3 text-[clamp(1.9rem,4vw,3.1rem)]">Nine topics. <span className="sw">One shape.</span></h2>
            </div>
            <div className="rv d2 flex flex-wrap gap-1" role="group" aria-label="Filter by stage">
              <button className="pill" aria-pressed={!filter} onClick={() => setFilter(null)}>All</button>
              {STAGES.map((st) => <button key={st.id} className="pill" aria-pressed={filter === st.id} onClick={() => setFilter(filter === st.id ? null : st.id)}><span className="serif mr-1 italic">{st.roman}</span>{st.label}</button>)}
            </div>
          </div>
          <Curriculum topics={CORE} filter={filter} go={go} />

          <div className="mt-14 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="kicker rv">The reference shelf</p>
              <h2 className="rv d1 mt-3 text-[clamp(1.6rem,3vw,2.4rem)]">{STATS.fw} frameworks, <span className="sw">kept to hand</span>.</h2>
            </div>
            <p className="rv d2 max-w-md text-[.86rem] text-dim">Three libraries, each framework written the same way: when to reach for it, how to run it, what you end up with, and how it fails.</p>
          </div>
          <Curriculum topics={LIBRARY} filter={filter} go={go} shelf />
        </div>
      </section>

      {/* ================= PATHS ================= */}
      <section id="paths" className="mx-auto max-w-[1320px] scroll-mt-16 px-5 pt-16 sm:px-8">
        <div className="rule-2 pt-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="kicker rv">Learning paths</p>
              <h2 className="rv d1 mt-3 text-[clamp(1.9rem,4vw,3.1rem)]">{["One", "Two", "Three", "Four", "Five"][PATHS.length - 1]} ways <span className="sw">through</span>.</h2>
            </div>
            <p className="rv d2 max-w-md text-[.86rem] text-dim">Pick one and the playbook remembers it: which step you are on, where you stopped reading, and what is left. Saved in this browser, nowhere else.</p>
          </div>
          <PathsGrid go={go} />
        </div>
      </section>

      {/* ================= QUARTER ENGINE ================= */}
      <section id="engine" className="mx-auto max-w-[1320px] scroll-mt-16 px-5 pt-16 sm:px-8">
        <div className="rule grid gap-8 pt-6 lg:grid-cols-[.8fr_1.2fr] lg:items-start">
          <div className="lg:sticky lg:top-24">
            <p className="kicker rv">Fig. 2 · try it</p>
            <h2 className="rv d1 mt-3 text-[clamp(1.9rem,4vw,3.1rem)]">Every quarter, in <span className="sw">miniature</span>.</h2>
            <p className="lede rv d2 mt-4">Ideas arrive faster than capacity, so the quarter is decided by where you draw the line. This is one quarter running end to end — intake, run cost, scoring, the line, reality, delivery, review — on a loop.</p>
            <div className="rv d3 mt-6 flex flex-wrap gap-2"><button className="btn" onClick={() => go("prioritisation")}>{topicById("prioritisation")?.n} · Prioritisation →</button><button className="btn" onClick={() => go("prioritisation", "rice")}>Try the RICE scorer</button></div>
          </div>
          <div className="rv d1"><QuarterEngine /></div>
        </div>
      </section>

      {/* ================= PREP LAB + TERM OF THE DAY ================= */}
      <section className="mx-auto max-w-[1320px] px-5 pt-16 sm:px-8">
        <div className="rule-2 grid gap-10 pt-6 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="kicker rv">Interview prep lab</p>
            <h2 className="rv d1 mt-3 text-[clamp(1.8rem,3.6vw,2.8rem)]">Practise the way the loop <span className="sw">gets asked</span>.</h2>
            <p className="lede rv d2 mt-4">Mixed drills across all {STATS.quiz} quiz questions, {MOCK_QS.length} timed mock-interview cards with rubrics and traps, {STATS.terms} flashcards, and a progress view that tells you where you are weak.</p>
            <div className="cols rv d3 mt-6 sm:grid-cols-2">
              {([["Drill", "Shuffled questions from the topics you choose. Misses become weak spots.", "drill"], ["Mock interview", "Product sense, execution, strategy, estimation, behavioural, technical. Timed.", "mock"], ["Flashcards", "Every term in the playbook. Space flips, arrows sort into again or known.", "cards"], ["Progress", "Accuracy by topic, rubric coverage, recent sessions, streak — and a backup of it all.", "progress"]] as const).map(([h, p, tab], i) => (
                <button key={h} onClick={() => go("prep", tab)} className="group p-5 text-left hover:!bg-ink-1"><span className="mono text-[.62rem] text-muted">0{i + 1}</span><b className="serif mt-1 block text-[1.2rem] font-semibold group-hover:text-acc">{h} →</b><span className="mt-1 block text-[.84rem] text-dim">{p}</span></button>
              ))}
            </div>
          </div>
          <TermOfTheDay go={go} />
        </div>
      </section>

      {/* ================= ANATOMY ================= */}
      <section className="mx-auto max-w-[1320px] px-5 py-16 sm:px-8">
        <div className="rule pt-6">
          <p className="kicker rv">How to read a topic</p>
          <h2 className="rv d1 mt-3 text-[clamp(1.7rem,3.4vw,2.6rem)]">Same shape, <span className="sw">every time</span>.</h2>
          <ol className="cols mt-8 list-none p-0 sm:grid-cols-2 lg:grid-cols-6">
            {ANATOMY.map(([h, p], i) => <li key={h} className={cn("rv p-5", `d${(i % 4) + 1}`)}><span className="serif text-[2rem] font-light italic leading-none text-acc">{i + 1}</span><h3 className="mt-3 text-[1.08rem]">{h}</h3><p className="mb-0 mt-2 text-[.84rem] text-dim">{p}</p></li>)}
          </ol>
        </div>
      </section>
    </div>
  );
}

/* ---------- curriculum grid ---------- */
function Curriculum({ topics, filter, go, shelf }: { topics: Topic[]; filter: StageId | null; go: Go; shelf?: boolean }) {
  const s = useStore();
  const cards = topics.filter((t) => !filter || t.stage === filter);
  if (!cards.length) return <p className="mt-6 border-y border-line-soft py-6 font-mono text-[.72rem] text-muted">Nothing on this shelf for that stage.</p>;
  return (
    <motion.div layout className={cn("cols mt-8", shelf ? "md:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-3")}>
      <AnimatePresence mode="popLayout" initial={false}>
        {cards.map((t) => {
          const st = stageOf(t.stage); const tp = s.topics[t.id];
          const read = tp ? Math.min(1, tp.seen.length / t.sections.length) : 0;
          const fw = t.frameworks ?? [];
          return (
            <motion.button layout key={t.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .25 }} onClick={() => go(t.id, tp && tp.scrollY > 400 && !tp.completed ? "~resume" : undefined)} className="group relative flex min-h-[15rem] flex-col p-6 text-left hover:!bg-ink-1">
              <div className="flex items-start justify-between gap-4">
                <span className="serif text-[3rem] font-light leading-[.8] tracking-[-.04em] text-muted transition-colors group-hover:text-acc">{t.n}</span>
                <span className="kicker text-right"><span className="serif mr-1 normal-case italic text-acc">{st.roman}</span>{st.label}</span>
              </div>
              <h3 className="mt-5 text-[1.5rem]">{t.title}</h3>
              <p className="mb-0 mt-2 line-clamp-3 text-[.88rem] text-dim">{t.one}</p>
              {shelf && <p className="mb-0 mt-3 text-[.8rem] italic text-muted serif">{fw.slice(0, 5).map((f) => f.name).join(" · ")}{fw.length > 5 ? ` and ${fw.length - 5} more` : ""}</p>}
              <div className="mt-auto flex flex-wrap items-baseline gap-x-3 gap-y-1 pt-5 font-mono text-[.6rem] uppercase tracking-[.1em] text-muted">
                {t.terms?.length ? <span>{t.terms.length} terms</span> : null}{fw.length ? <span>{fw.length} frameworks</span> : null}{t.steps?.length ? <span>{t.steps.length} steps</span> : null}{t.cases?.length ? <span>{t.cases.length} cases</span> : null}{t.quiz?.length ? <span>{t.quiz.length} q</span> : null}
                <span className="ml-auto text-text">{tp?.completed ? "Read ✓" : read > 0 ? `Resume · ${Math.round(read * 100)}%` : <span className="text-acc">Open →</span>}</span>
              </div>
              {read > 0 && <span className="absolute inset-x-0 bottom-0 h-[2px]"><span className="block h-full bg-acc" style={{ width: `${(tp?.completed ? 1 : read) * 100}%` }} /></span>}
            </motion.button>
          );
        })}
      </AnimatePresence>
    </motion.div>
  );
}

/* ---------- the reader's desk: progress at a glance ---------- */
function Desk({ go }: { go: Go }) {
  const s = useStore();
  const read = TOPICS.filter((t) => s.topics[t.id]?.completed).length;
  const started = Object.values(s.topics).some((t) => t.visits > 0);
  return (
    <aside className="rv d2 self-start border border-rule p-5">
      <p className="kicker">Your desk</p>
      {s.ready && started ? (
        <>
          <div className="mt-3"><ResumeCard go={go} /></div>
          <dl className="cols mt-4 grid-cols-3 !border-0 text-center">
            {([["Topics read", `${read}/${TOPICS.length}`], ["Quiz sessions", s.attempts.length], ["Terms known", s.flash.known.length]] as const).map(([l, v]) => <div key={l} className="px-1 py-2"><dd className="serif m-0 text-[1.6rem] font-semibold leading-none">{v}</dd><dt className="mt-1 font-mono text-[.54rem] uppercase tracking-[.1em] text-muted">{l}</dt></div>)}
          </dl>
          <button onClick={() => go("prep", "progress")} className="mt-3 font-mono text-[.6rem] uppercase tracking-[.1em] text-muted hover:text-acc">Full progress, backup and restore →</button>
        </>
      ) : (
        <>
          <p className="serif mt-3 text-[1.15rem] leading-snug">Nothing on your desk yet.</p>
          <p className="mt-2 text-[.86rem] text-dim">As you read, the playbook quietly keeps your place: the section you stopped at, your path, quiz scores and flashcard piles. It lives in this browser only — no account, nothing sent anywhere. You can back it up from the prep lab.</p>
          <button className="btn btn-key mt-2" onClick={() => go(CORE[0].id)}>Open {CORE[0].n} · {CORE[0].title.split(" ")[0]} →</button>
        </>
      )}
    </aside>
  );
}

/* ---------- a word a day ---------- */
function TermOfTheDay({ go }: { go: Go }) {
  const e = useMemo(() => termOfTheDay(), []);
  const sense = e.senses[0];
  const t = topicById(sense.topic);
  return (
    <aside className="rv d2 self-start border-t-4 border-double border-rule pt-4">
      <p className="kicker">Term of the day</p>
      <h3 className="mt-3 text-[clamp(1.8rem,3vw,2.4rem)]">{e.head}</h3>
      {sense.alias && <p className="mb-0 mt-1 text-[.82rem] italic text-muted serif">also: {sense.alias}</p>}
      <Html as="p" className="prose serif mt-3 text-[1.05rem] leading-snug text-dim" html={sense.d} />
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[.62rem] uppercase tracking-[.1em]">
        {t && <button className="text-dim hover:text-acc" onClick={() => go(t.id, sense.anchor)}>From {t.n} · {t.title} →</button>}
        <button className="text-muted hover:text-acc" onClick={() => go("glossary", e.key)}>All {GLOSSARY.length} entries A–Z →</button>
      </div>
    </aside>
  );
}
