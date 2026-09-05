import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { TOPICS, topicById, type Quiz } from "@/data";
import { FRAMEWORKS, MOCK_CATS, MOCK_QS, type MockCat, type MockQ } from "@/data/prep";
import { useStore } from "@/lib/progress";
import { replaceHash, useReveal } from "@/lib/hooks";
import { Html } from "./Sections";
import { Ring } from "./Paths";
import { cn } from "@/utils/cn";

type Go = (t: string | null, a?: string | null) => void;
type Tab = "drill" | "mock" | "cards" | "progress";
const TABS: { id: Tab; label: string; hint: string }[] = [
  { id: "drill", label: "Drill", hint: "mixed quiz" },
  { id: "mock", label: "Mock interview", hint: "timed cards" },
  { id: "cards", label: "Flashcards", hint: "terms" },
  { id: "progress", label: "Progress", hint: "weak spots" },
];

const shuffle = <T,>(xs: T[]) => { const a = [...xs]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const day = (t: number) => new Date(t).toDateString();

/* ---------- accuracy per topic from history ---------- */
function useAccuracy() {
  const s = useStore();
  return useMemo(() => {
    const acc: Record<string, { right: number; total: number }> = {};
    const bump = (id: string, right: number, total: number) => { acc[id] ??= { right: 0, total: 0 }; acc[id].right += right; acc[id].total += total; };
    for (const a of s.attempts) {
      if (a.kind === "topic" && a.topic) bump(a.topic, a.score, a.total);
      if (a.kind === "drill" && a.topics) {
        const missed = a.missed ?? [];
        // per-topic: count questions asked per topic via 'topics' (one entry per question)
        const asked: Record<string, number> = {}; for (const t of a.topics) asked[t] = (asked[t] ?? 0) + 1;
        const miss: Record<string, number> = {}; for (const t of missed) miss[t] = (miss[t] ?? 0) + 1;
        for (const t of Object.keys(asked)) bump(t, asked[t] - (miss[t] ?? 0), asked[t]);
      }
    }
    return acc;
  }, [s.attempts]);
}

const isTab = (x: unknown): x is Tab => TABS.some((t) => t.id === x);

export default function Prep({ go, tab: initial }: { go: Go; tab?: string | null }) {
  const [tab, setTabState] = useState<Tab>(isTab(initial) ? initial : "drill");
  const s = useStore();
  useReveal(tab);
  useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" }); }, []);
  // URL → tab: links such as go("prep", "mock") from Home / the sidebar must always win
  useEffect(() => { if (isTab(initial)) setTabState(initial); }, [initial]);
  // tab → URL: keep the hash in step without pushing history, and notify the router
  useEffect(() => { replaceHash(`#/prep/${tab}`); }, [tab]);
  const setTab = (t: Tab) => { setTabState(t); if (t === tab) window.scrollTo({ top: 0, behavior: "smooth" }); };
  const acc = useAccuracy();
  const totals = Object.values(acc).reduce((b, x) => ({ right: b.right + x.right, total: b.total + x.total }), { right: 0, total: 0 });
  const pct = totals.total ? totals.right / totals.total : 0;
  const days = new Set(s.attempts.map((a) => day(a.at)));
  const streak = (() => { let n = 0; const d = new Date(); for (;;) { if (days.has(d.toDateString())) { n++; d.setDate(d.getDate() - 1); } else break; } return n; })();

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .45, ease: [.16, 1, .3, 1] }} className="mx-auto w-full max-w-[1180px] px-5 pb-16 sm:px-8">
      <section className="grid gap-8 pt-12 lg:grid-cols-[1.2fr_.8fr] lg:items-end">
        <div>
          <p className="eyebrow rise">Interview prep lab</p>
          <h1 className="rise text-[clamp(2.2rem,5vw,4rem)]" style={{ animationDelay: ".05s" }}>Practise the way the <span className="sw">loop</span> gets asked.</h1>
          <p className="lede rise mt-5" style={{ animationDelay: ".12s" }}>Every PM loop asks the same six things in different clothes: pick a user, pick a metric, size it, decide, defend it, and tell the story afterwards. Drill the traps, run timed mock cards against a rubric, and let the lab remember where you are weak.</p>
        </div>
        <div className="rise grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-line-soft bg-line-soft" style={{ animationDelay: ".2s" }}>
          {[["Sessions", s.attempts.length], ["Accuracy", totals.total ? Math.round(pct * 100) + "%" : "—"], ["Day streak", streak]].map(([l, v]) => <div key={String(l)} className="bg-ink-1 px-4 py-3"><span className="block font-mono text-[.56rem] uppercase tracking-[.16em] text-muted">{l}</span><b className="font-mono text-xl tabular-nums text-text">{v}</b></div>)}
        </div>
      </section>

      <div className="sticky top-14 z-20 -mx-5 mt-8 border-y border-line-soft bg-ink/85 px-5 backdrop-blur-xl sm:-mx-8 sm:px-8">
        <div className="thin flex gap-1 overflow-x-auto py-2">
          {TABS.map((t) => <button key={t.id} onClick={() => setTab(t.id)} className={cn("flex shrink-0 items-baseline gap-2 rounded-lg px-3 py-1.5 text-[.86rem] transition-colors", tab === t.id ? "bg-ink-3 text-text" : "text-dim hover:text-text")}><b className="font-semibold">{t.label}</b><span className="font-mono text-[.58rem] uppercase tracking-[.14em] text-muted">{t.hint}</span></button>)}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: .3 }} className="pt-10">
          {tab === "drill" && <Drill go={go} acc={acc} />}
          {tab === "mock" && <Mock go={go} />}
          {tab === "cards" && <Cards go={go} />}
          {tab === "progress" && <Progress go={go} acc={acc} onPractise={() => setTab("drill")} />}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

/* ============================================================ DRILL */
type DQ = Quiz & { topic: string };
function Drill({ go, acc }: { go: Go; acc: Record<string, { right: number; total: number }> }) {
  const s = useStore();
  const [sel, setSel] = useState<string[]>(() => TOPICS.map((t) => t.id));
  const [n, setN] = useState(10);
  const [qs, setQs] = useState<DQ[] | null>(null);
  const [i, setI] = useState(0); const [pick, setPick] = useState<number | null>(null); const [score, setScore] = useState(0); const [missed, setMissed] = useState<string[]>([]); const [done, setDone] = useState(false);
  const [t0, setT0] = useState(0); const [elapsed, setElapsed] = useState(0);
  useEffect(() => { if (!qs || done) return; const id = setInterval(() => setElapsed(Math.floor((Date.now() - t0) / 1000)), 1000); return () => clearInterval(id); }, [qs, done, t0]);

  const weak = TOPICS.filter((t) => acc[t.id] && acc[t.id].total >= 3 && acc[t.id].right / acc[t.id].total < 0.7).map((t) => t.id);
  const pool = useMemo(() => TOPICS.filter((t) => sel.includes(t.id)).flatMap((t) => (t.quiz ?? []).map((q) => ({ ...q, topic: t.id }))), [sel]);

  const start = () => { setQs(shuffle(pool).slice(0, n)); setI(0); setPick(null); setScore(0); setMissed([]); setDone(false); setT0(Date.now()); setElapsed(0); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const choose = (k: number) => { if (pick != null || !qs) return; setPick(k); if (k === qs[i].a) setScore((x) => x + 1); else setMissed((m) => [...m, qs[i].topic]); };
  const next = () => {
    if (!qs) return;
    if (i + 1 >= qs.length) { setDone(true); s.recordAttempt({ kind: "drill", topics: qs.map((q) => q.topic), score: score, total: qs.length, missed, durationMs: Date.now() - t0 }); }
    else { setI(i + 1); setPick(null); }
  };

  if (!qs) return (
    <div className="grid gap-8 lg:grid-cols-[1fr_.9fr]">
      <div>
        <p className="eyebrow rv">Build a drill</p>
        <h2 className="rv d1 text-[clamp(1.6rem,3.4vw,2.4rem)]">Mixed questions, <span className="sw">shuffled</span>, from the topics you pick.</h2>
        <div className="rv d2 mt-6 flex flex-wrap gap-1.5">
          <button className="pill" onClick={() => setSel(TOPICS.map((t) => t.id))}>All twelve</button>
          <button className="pill" onClick={() => setSel([])}>None</button>
          {weak.length > 0 && <button className="pill flex items-center gap-1.5" onClick={() => setSel(weak)}><i className="h-1.5 w-1.5 rounded-full bg-bad" />Weak spots · {weak.length}</button>}
        </div>
        <div className="rv d2 mt-3 grid gap-1.5 sm:grid-cols-2">
          {TOPICS.map((t) => { const on = sel.includes(t.id); const a = acc[t.id]; return (
            <button key={t.id} onClick={() => setSel((x) => on ? x.filter((y) => y !== t.id) : [...x, t.id])} className={cn("flex items-center gap-3 rounded-xl border px-3 py-2 text-left text-[.84rem] transition-colors", on ? "border-acc/60 bg-acc/5 text-text" : "border-line-soft text-dim hover:border-line")}>
              <span className={cn("grid h-4 w-4 shrink-0 place-content-center rounded border text-[.6rem]", on ? "border-acc bg-acc text-acc-ink" : "border-line")}>{on ? "✓" : ""}</span>
              <span className="mono text-[.62rem] text-acc">{t.n}</span><span className="truncate">{t.title}</span>
              <span className="ml-auto font-mono text-[.6rem] text-muted">{t.quiz?.length ?? 0}q{a && a.total ? ` · ${Math.round((a.right / a.total) * 100)}%` : ""}</span>
            </button>); })}
        </div>
      </div>
      <div className="rv d3 panel h-fit p-6 lg:sticky lg:top-32">
        <span className="font-mono text-[.6rem] uppercase tracking-[.2em] text-muted">Length</span>
        <div className="mt-2 flex gap-1.5">{[5, 10, 20].map((k) => <button key={k} className="pill" aria-pressed={n === k} onClick={() => setN(k)}>{k} questions</button>)}</div>
        <dl className="mt-5 grid grid-cols-2 gap-3 text-[.84rem]">
          <div><dt className="font-mono text-[.58rem] uppercase tracking-[.16em] text-muted">Pool</dt><dd className="m-0 font-mono text-lg">{pool.length}</dd></div>
          <div><dt className="font-mono text-[.58rem] uppercase tracking-[.16em] text-muted">Topics</dt><dd className="m-0 font-mono text-lg">{sel.length}</dd></div>
        </dl>
        <button className="btn btn-key mt-6 w-full justify-center" disabled={!pool.length} onClick={start}>Start drill →</button>
        <p className="mt-3 text-[.76rem] text-muted">Results are saved locally and feed the weak-spot list. Nothing leaves this browser.</p>
      </div>
    </div>
  );

  const q = qs[i];
  return (
    <div className="mx-auto max-w-3xl">
      <div className="panel p-6 lg:p-8">
        <div className="mb-5 flex items-center justify-between font-mono text-[.66rem] uppercase tracking-[.16em] text-muted"><span>Question {Math.min(i + 1, qs.length)} / {qs.length}</span><span className="flex gap-4"><span>{fmt(elapsed)}</span><span className="text-acc">score {score}</span></span></div>
        <div className="mb-6 flex gap-1">{qs.map((_, k) => <i key={k} className="h-1 flex-1 rounded-full transition-colors" style={{ background: k < i || done ? "var(--acc)" : k === i ? "var(--text)" : "var(--line-soft)" }} />)}</div>
        <AnimatePresence mode="wait">
          {done ? (
            <motion.div key="done" initial={{ opacity: 0, scale: .96 }} animate={{ opacity: 1, scale: 1 }} className="py-4 text-center">
              <span className="font-mono text-[.66rem] uppercase tracking-[.2em] text-muted">Drill result · {fmt(elapsed)}</span>
              <p className="display my-3 text-[clamp(2.4rem,6vw,4rem)]"><span className="text-acc">{score}</span><span className="text-muted">/{qs.length}</span></p>
              <p className="text-dim">{score === qs.length ? "Clean sweep. Raise the difficulty: pick fewer topics and twenty questions." : score >= qs.length * .7 ? "Solid. The ones you missed are logged as weak spots." : "Go read the cheat sheets for the topics below, then run it again."}</p>
              {missed.length > 0 && <div className="mt-4 flex flex-wrap justify-center gap-1.5">{[...new Set(missed)].map((id) => <button key={id} className="chip hover:border-acc" onClick={() => go(id, "cheatsheet")}>{topicById(id)?.n} · {topicById(id)?.title} ↗</button>)}</div>}
              <div className="mt-6 flex flex-wrap justify-center gap-2"><button className="btn btn-key" onClick={start}>Same set, reshuffled</button><button className="btn" onClick={() => setQs(null)}>Change topics</button></div>
            </motion.div>
          ) : (
            <motion.div key={i} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: .3 }}>
              <span className="chip mb-3">{topicById(q.topic)?.n} · {topicById(q.topic)?.title}</span>
              <Html as="h3" className="prose text-[1.25rem] leading-snug" html={q.q} />
              <div className="mt-5 grid gap-2">
                {q.o.map((o, k) => { const st = pick == null ? "" : k === q.a ? "right" : k === pick ? "wrong" : "dim"; return (
                  <button key={k} onClick={() => choose(k)} disabled={pick != null} className={cn("flex items-start gap-3 rounded-xl border p-4 text-left text-[.9rem] transition-all", st === "" && "border-line-soft bg-ink-1 hover:translate-x-1 hover:border-acc", st === "right" && "border-acc bg-acc/10 text-text", st === "wrong" && "border-bad bg-bad/10", st === "dim" && "border-line-soft opacity-50")}>
                    <span className={cn("mono grid h-6 w-6 shrink-0 place-content-center rounded-full border text-[.7rem]", st === "right" ? "border-acc text-acc" : st === "wrong" ? "border-bad text-bad" : "border-line text-muted")}>{st === "right" ? "✓" : st === "wrong" ? "✗" : String.fromCharCode(65 + k)}</span><Html html={o} className="prose" />
                  </button>); })}
              </div>
              <AnimatePresence>{pick != null && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={cn("mt-4 rounded-xl border p-4", pick === q.a ? "border-acc/40 bg-acc/5" : "border-bad/40 bg-bad/5")}>
                  <b className={pick === q.a ? "text-acc" : "text-bad"}>{pick === q.a ? "Correct." : "Not quite."}</b> <Html html={q.e} className="prose text-[.88rem] text-dim" />
                  <div className="mt-3 flex flex-wrap gap-2"><button className="btn btn-key" onClick={next}>{i + 1 >= qs.length ? "See result" : "Next question →"}</button><button className="btn" onClick={() => go(q.topic, "cheatsheet")}>Open cheat sheet ↗</button></div>
                </motion.div>)}</AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ============================================================ MOCK */
function Mock({ go }: { go: Go }) {
  const s = useStore();
  const [cat, setCat] = useState<MockCat | "all">("all");
  const [q, setQ] = useState<MockQ | null>(null);
  const [seen, setSeen] = useState<string[]>([]);
  const [left, setLeft] = useState(0); const [running, setRunning] = useState(false);
  const [reveal, setReveal] = useState(false); const [ticks, setTicks] = useState<boolean[]>([]); const [probe, setProbe] = useState(false); const [fw, setFw] = useState(false);
  const [logged, setLogged] = useState(false);
  const startedAt = useRef(0);
  const pool = MOCK_QS.filter((x) => cat === "all" || x.cat === cat);
  const catDef = (c: MockCat) => MOCK_CATS.find((x) => x.id === c)!;

  useEffect(() => { if (!running) return; if (left <= 0) { setRunning(false); return; } const id = setTimeout(() => setLeft((l) => l - 1), 1000); return () => clearTimeout(id); }, [running, left]);

  const draw = (c: MockCat | "all" = cat) => {
    const p = MOCK_QS.filter((x) => c === "all" || x.cat === c);
    const fresh = p.filter((x) => !seen.includes(x.id)); const src = fresh.length ? fresh : p; const pick = src[Math.floor(Math.random() * src.length)];
    if (!pick) return;
    setQ(pick); setSeen((x) => (fresh.length ? [...x, pick.id] : [pick.id])); setReveal(false); setTicks(pick.rubric.map(() => false)); setProbe(false); setFw(false); setLogged(false);
    setLeft(catDef(pick.cat).mins * 60); setRunning(true); startedAt.current = Date.now();
  };
  const log = () => { if (!q) return; const score = ticks.filter(Boolean).length; s.recordAttempt({ kind: "mock", topics: q.topics, score, total: q.rubric.length, durationMs: Date.now() - startedAt.current }); setLogged(true); };
  const note = q ? (s.notes[`mock:${q.id}`] ?? "") : "";
  const fwDef = q ? (FRAMEWORKS.find((f) => f.cat === q.cat) ?? FRAMEWORKS.find((f) => f.for.toLowerCase().startsWith(catDef(q.cat).label.split(" ")[0].toLowerCase()))) : undefined;
  const total = q ? catDef(q.cat).mins * 60 : 1;

  return (
    <div>
      <p className="eyebrow rv">Mock interview</p>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 className="rv d1 text-[clamp(1.6rem,3.4vw,2.4rem)]">Draw a card. Talk out loud. <span className="sw">Grade yourself.</span></h2>
        <div className="rv d2 flex flex-wrap gap-1.5"><button className="pill" aria-pressed={cat === "all"} onClick={() => setCat("all")}>All · {MOCK_QS.length}</button>{MOCK_CATS.map((c) => <button key={c.id} className="pill flex items-center gap-1.5" aria-pressed={cat === c.id} onClick={() => setCat(c.id)}><i className="h-1.5 w-1.5 rounded-full" style={{ background: `hsl(${c.hue} 80% 62%)` }} />{c.label} · {MOCK_QS.filter((x) => x.cat === c.id).length}</button>)}</div>
      </div>

      {!q ? (
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MOCK_CATS.filter((c) => cat === "all" || c.id === cat).map((c, i) => (
            <div key={c.id} className={cn("card rv flex flex-col p-5", `d${(i % 3) + 1}`)}>
              <div className="flex items-center justify-between"><span className="chip"><i className="h-1.5 w-1.5 rounded-full" style={{ background: `hsl(${c.hue} 80% 62%)` }} />{c.label}</span><span className="font-mono text-[.62rem] text-muted">{c.mins} min</span></div>
              <p className="mt-3 text-[.86rem] text-dim">{c.blurb}</p>
              <p className="mt-2 font-mono text-[.62rem] uppercase tracking-[.14em] text-muted">Framework · <span className="text-text">{c.fw}</span></p>
              <button className="btn btn-key mt-4 self-start" onClick={() => { setCat(c.id); draw(c.id); }}>Draw a {c.label.toLowerCase()} card</button>
            </div>
          ))}
          {cat === "all" && <div className="card rv d3 flex flex-col items-start justify-center gap-3 border-dashed p-5"><b className="font-display text-lg">Surprise me</b><p className="m-0 text-[.84rem] text-dim">A random card from any category — the closest thing to a real loop.</p><button className="btn" onClick={() => draw()}>Shuffle and draw →</button></div>}
        </div>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
          <div className="panel p-6 lg:p-8">
            <div className="flex flex-wrap items-center gap-3">
              <span className="chip"><i className="h-1.5 w-1.5 rounded-full" style={{ background: `hsl(${catDef(q.cat).hue} 80% 62%)` }} />{catDef(q.cat).label}</span>
              <span className="font-mono text-[.62rem] text-muted">card {seen.length}/{pool.length}</span>
              <div className="ml-auto flex items-center gap-3">
                <Ring v={1 - left / total} size={54}><b className={cn("font-mono text-[.7rem] tabular-nums", left === 0 ? "text-bad" : left < 60 ? "text-signal" : "text-text")}>{fmt(left)}</b></Ring>
                <button className={cn("btn !px-3 !py-1.5 !text-[.74rem]", running && "pulse-acc")} onClick={() => setRunning((r) => !r)}>{running ? "Pause" : left === 0 ? "Time" : "Resume"}</button>
              </div>
            </div>
            <h3 className="mt-6 text-[clamp(1.4rem,2.8vw,2rem)] leading-tight">{q.q}</h3>
            {q.probe && <div className="mt-4">{probe ? <p className="rounded-xl border border-line-soft bg-ink-2 p-3 text-[.88rem] text-dim"><b className="text-text">Interviewer nudge:</b> {q.probe}</p> : <button className="font-mono text-[.62rem] uppercase tracking-[.16em] text-muted hover:text-acc" onClick={() => setProbe(true)}>Stuck? Reveal the interviewer’s nudge →</button>}</div>}
            <label className="mt-6 block font-mono text-[.6rem] uppercase tracking-[.2em] text-muted">Your notes · saved locally</label>
            <textarea value={note} onChange={(e) => s.setNote(`mock:${q.id}`, e.target.value)} placeholder="Structure first: who, what problem, why now, how you would know…" className="mt-2 min-h-[140px] w-full resize-y rounded-xl border border-line-soft bg-ink-1 p-3 text-[.9rem] text-text outline-none placeholder:text-muted focus:border-acc" />
            <div className="mt-4 flex flex-wrap gap-2">
              {!reveal ? <button className="btn btn-key" onClick={() => { setReveal(true); setRunning(false); }}>I’m done — show the rubric</button> : (
                <>{!logged ? <button className="btn btn-key" onClick={log}>Log {ticks.filter(Boolean).length}/{q.rubric.length} →</button> : <span className="btn border-acc/50 text-acc">✓ Logged</span>}<button className="btn" onClick={() => draw()}>Next card</button></>
              )}
              <button className="btn" onClick={() => { setQ(null); setRunning(false); setReveal(false); setCat("all"); }}>Back to categories</button>
            </div>
          </div>
          <div className="space-y-4">
            <div className="card p-5">
              <button className="flex w-full items-center justify-between text-left" onClick={() => setFw((f) => !f)}><span className="font-mono text-[.6rem] uppercase tracking-[.2em] text-muted">Framework · <span className="text-text">{catDef(q.cat).fw}</span></span><span className="text-acc">{fw ? "−" : "+"}</span></button>
              <AnimatePresence initial={false}>{fw && (
                <motion.div key="fw" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  {fwDef ? <ol className="m-0 mt-3 list-none space-y-1.5 p-0">{fwDef.steps.map((st, k) => <li key={k} className="flex gap-3 text-[.84rem] text-dim"><span className="mono text-[.62rem] text-acc">0{k + 1}</span>{st}</li>)}</ol>
                    : <p className="m-0 mt-3 text-[.84rem] text-dim">No step-by-step for this category yet — structure it as: clarify → decompose → decide → what would change your mind.</p>}
                </motion.div>)}</AnimatePresence>
            </div>
            <AnimatePresence>{reveal && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card p-5">
                <span className="font-mono text-[.6rem] uppercase tracking-[.2em] text-muted">Rubric · tick what you covered</span>
                <ul className="m-0 mt-3 list-none space-y-1.5 p-0">
                  {q.rubric.map((r, k) => <li key={k}><button onClick={() => setTicks((t) => t.map((x, j) => (j === k ? !x : x)))} className={cn("flex w-full items-start gap-3 rounded-lg border p-2.5 text-left text-[.84rem] transition-colors", ticks[k] ? "border-acc/50 bg-acc/5 text-text" : "border-line-soft text-dim hover:border-line")}><span className={cn("mt-0.5 grid h-4 w-4 shrink-0 place-content-center rounded border text-[.6rem]", ticks[k] ? "border-acc bg-acc text-acc-ink" : "border-line")}>{ticks[k] ? "✓" : ""}</span>{r}</button></li>)}
                </ul>
                <p className="mt-4 rounded-xl border border-bad/40 bg-bad/5 p-3 text-[.82rem] text-dim"><b className="text-bad">The trap:</b> {q.trap}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">{q.topics.map((id) => <button key={id} className="chip hover:border-acc" onClick={() => go(id)}>{topicById(id)?.n} · {topicById(id)?.title} ↗</button>)}</div>
              </motion.div>)}</AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================ FLASHCARDS */
function Cards({ go }: { go: Go }) {
  const s = useStore();
  const [topic, setTopic] = useState<string>("all");
  const [mode, setMode] = useState<"all" | "again">("all");
  const [flipped, setFlipped] = useState(false);
  const deckAll = useMemo(() => TOPICS.flatMap((t) => (t.terms ?? []).map((tm) => ({ key: `${t.id}:${tm.t}`, topic: t.id, ...tm }))), []);
  const [order, setOrder] = useState<string[]>([]);
  const [i, setI] = useState(0);
  const buildDeck = () => {
    let d = deckAll.filter((c) => topic === "all" || c.topic === topic);
    if (mode === "again") d = d.filter((c) => s.flash.again.includes(c.key));
    return d.map((c) => c.key);
  };
  // the session deck is frozen when topic/mode change — marking a card must not reshuffle it
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setOrder(shuffle(buildDeck())); setI(0); setFlipped(false); }, [topic, mode]);
  const deck = useMemo(() => order.map((k) => deckAll.find((c) => c.key === k)!).filter(Boolean), [order, deckAll]);
  const card = deck[i];
  const busy = useRef(false);
  const mark = (known: boolean) => {
    if (!card || busy.current) return;
    busy.current = true;
    const again = s.flash.again.filter((k) => k !== card.key), knownL = s.flash.known.filter((k) => k !== card.key);
    s.setFlash(known ? { again, known: [...knownL, card.key] } : { again: [...again, card.key], known: knownL });
    setFlipped(false); window.setTimeout(() => { setI((x) => x + 1); busy.current = false; }, 120);
  };
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null; const tag = el?.tagName;
      // let form fields and focused buttons keep their native behaviour
      if (tag === "TEXTAREA" || tag === "INPUT" || tag === "SELECT" || tag === "BUTTON" || el?.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === " ") { e.preventDefault(); setFlipped((f) => !f); }
      if (e.key === "ArrowRight" && flipped) mark(true);
      if (e.key === "ArrowLeft" && flipped) mark(false);
    };
    window.addEventListener("keydown", on); return () => window.removeEventListener("keydown", on);
  });
  const knownHere = deck.filter((c) => s.flash.known.includes(c.key)).length;

  return (
    <div>
      <p className="eyebrow rv">Flashcards</p>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 className="rv d1 text-[clamp(1.6rem,3.4vw,2.4rem)]">{deckAll.length} terms. <span className="sw">Space</span> flips, arrows sort.</h2>
        <div className="rv d2 flex gap-1.5"><button className="pill" aria-pressed={mode === "all"} onClick={() => setMode("all")}>Whole deck</button><button className="pill" aria-pressed={mode === "again"} onClick={() => setMode("again")}>Review again · {s.flash.again.length}</button></div>
      </div>
      <div className="rv d2 mt-4 flex flex-wrap gap-1.5"><button className="pill" aria-pressed={topic === "all"} onClick={() => setTopic("all")}>All</button>{TOPICS.filter((t) => t.terms?.length).map((t) => <button key={t.id} className="pill" aria-pressed={topic === t.id} onClick={() => setTopic(t.id)}>{t.n} · {t.title.split(" ")[0]}</button>)}</div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_280px]">
        <div>
          {card ? (
            <>
              <div className="flip h-[320px] cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-acc/60 rounded-[18px] sm:h-[360px]" data-flipped={flipped} role="button" tabIndex={0} aria-pressed={flipped} aria-label={flipped ? "Hide definition" : "Reveal definition"} onClick={() => setFlipped((f) => !f)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); setFlipped((f) => !f); } }}>
                <div className="flip-inner h-full">
                  <div className="flip-face panel flex h-full flex-col p-7">
                    <div className="flex items-center justify-between"><span className="chip">{topicById(card.topic)?.n} · {topicById(card.topic)?.title}</span><span className="font-mono text-[.62rem] text-muted">{i + 1}/{order.length}</span></div>
                    <div className="flex flex-1 flex-col items-center justify-center text-center"><span className="font-mono text-[.6rem] uppercase tracking-[.22em] text-muted">Term</span><b className="display mt-3 text-[clamp(1.6rem,4vw,2.8rem)]">{card.t}</b>{card.a && <span className="mt-2 text-[.82rem] text-muted">aka {card.a}</span>}</div>
                    <span className="text-center font-mono text-[.6rem] uppercase tracking-[.2em] text-muted">tap or space to flip</span>
                  </div>
                  <div className="flip-face flip-back panel flex h-full flex-col border-acc/40 p-7">
                    <div className="flex items-center justify-between"><span className="chip">{card.t}</span><span className="font-mono text-[.62rem] text-muted">{i + 1}/{order.length}</span></div>
                    <div className="thin flex flex-1 flex-col justify-center overflow-y-auto py-4"><span className="font-mono text-[.6rem] uppercase tracking-[.22em] text-muted">Means</span><Html className="prose mt-2 text-[1rem] leading-relaxed text-text" html={card.d} />{card.c && <><span className="mt-4 font-mono text-[.6rem] uppercase tracking-[.22em] text-muted">In the analogy</span><Html className="prose mt-1 text-[.88rem] text-dim" html={card.c} /></>}</div>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <button className="btn border-bad/50 hover:border-bad" onClick={() => mark(false)}>← Again</button>
                <button className="btn" onClick={() => setFlipped((f) => !f)}>{flipped ? "Hide" : "Reveal"} <kbd className="ml-1">space</kbd></button>
                <button className="btn btn-key" onClick={() => mark(true)}>Got it →</button>
              </div>
            </>
          ) : (
            <div className="panel flex min-h-[320px] flex-col items-center justify-center p-8 text-center">
              <b className="font-display text-2xl">{deck.length === 0 ? (mode === "again" ? "Nothing to review." : "No terms here.") : "Deck finished."}</b>
              <p className="mt-2 max-w-sm text-[.88rem] text-dim">{mode === "again" ? "Cards you mark “Again” collect here for a second pass." : `${knownHere} of ${deck.length} marked known.`}</p>
              <div className="mt-4 flex gap-2"><button className="btn btn-key" onClick={() => { setOrder(shuffle(buildDeck())); setI(0); }}>Shuffle again</button>{s.flash.again.length > 0 && mode !== "again" && <button className="btn" onClick={() => setMode("again")}>Review the {s.flash.again.length} “again” cards</button>}</div>
            </div>
          )}
        </div>
        <aside className="card h-fit p-5">
          <span className="font-mono text-[.6rem] uppercase tracking-[.2em] text-muted">This deck</span>
          <div className="mt-3 flex items-center gap-3"><Ring v={deck.length ? knownHere / deck.length : 0} size={52}><b className="font-mono text-[.66rem]">{deck.length ? Math.round((knownHere / deck.length) * 100) : 0}%</b></Ring><div className="text-[.82rem] text-dim"><b className="block text-text">{knownHere} known</b>{deck.filter((c) => s.flash.again.includes(c.key)).length} to review · {deck.length} total</div></div>
          <ul className="m-0 mt-4 list-none space-y-1 p-0 text-[.8rem]">
            {TOPICS.filter((t) => t.terms?.length).map((t) => { const ks = (t.terms ?? []).length; const kn = (t.terms ?? []).filter((tm) => s.flash.known.includes(`${t.id}:${tm.t}`)).length; return <li key={t.id} className="flex items-center gap-2"><span className="mono w-5 text-[.6rem] text-acc">{t.n}</span><span className="h-1 flex-1 overflow-hidden rounded-full bg-line-soft"><span className="block h-full bg-acc" style={{ width: `${(kn / ks) * 100}%` }} /></span><span className="font-mono text-[.6rem] text-muted">{kn}/{ks}</span></li>; })}
          </ul>
          <button className="mt-4 font-mono text-[.6rem] uppercase tracking-[.16em] text-muted hover:text-bad" onClick={() => { if (confirm("Forget all flashcard progress?")) s.setFlash({ again: [], known: [] }); }}>Reset deck progress</button>
          {card && <button className="mt-2 block font-mono text-[.6rem] uppercase tracking-[.16em] text-muted hover:text-acc" onClick={() => go(card.topic, "terms")}>Open this topic’s terms ↗</button>}
        </aside>
      </div>
    </div>
  );
}

/* ============================================================ PROGRESS */
function Progress({ go, acc, onPractise }: { go: Go; acc: Record<string, { right: number; total: number }>; onPractise: () => void }) {
  const s = useStore();
  const rows = TOPICS.map((t) => { const a = acc[t.id]; const tp = s.topics[t.id]; return { t, a, pct: a && a.total ? a.right / a.total : null, done: !!tp?.completed, seen: tp?.seen.length ?? 0, best: tp?.quizBest, quizTotal: tp?.quizTotal }; });
  const weak = rows.filter((r) => r.pct != null && r.a!.total >= 3).sort((a, b) => a.pct! - b.pct!).slice(0, 3);
  const completed = rows.filter((r) => r.done).length;
  const hist = [...s.attempts].sort((a, b) => b.at - a.at).slice(0, 12);
  const mocks = s.attempts.filter((a) => a.kind === "mock");
  const mockPct = mocks.length ? mocks.reduce((b, a) => b + a.score / a.total, 0) / mocks.length : 0;
  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_.9fr]">
      <div>
        <p className="eyebrow rv">Where you stand</p>
        <h2 className="rv d1 text-[clamp(1.6rem,3.4vw,2.4rem)]">{completed}/{TOPICS.length} topics complete. <span className="sw">{weak.length ? "Three weak spots." : "No weak spots yet."}</span></h2>
        {weak.length > 0 && <div className="rv d2 mt-6 grid gap-2 sm:grid-cols-3">{weak.map((r) => <button key={r.t.id} onClick={() => go(r.t.id, "cheatsheet")} className="card card-hover p-4 text-left"><span className="font-mono text-[.6rem] text-bad">{Math.round(r.pct! * 100)}% · {r.a!.total} asked</span><b className="mt-1 block font-display">{r.t.n} · {r.t.title}</b><span className="text-[.74rem] text-muted">Open cheat sheet →</span></button>)}</div>}
        {weak.length === 0 && <p className="rv d2 mt-4 text-[.88rem] text-dim">Weak spots appear once a topic has at least three questions in your history. <button className="text-acc underline-offset-2 hover:underline" onClick={onPractise}>Run a drill</button> to seed it.</p>}
        <div className="rv d3 mt-8 overflow-hidden rounded-2xl border border-line-soft">
          <table className="tbl"><thead><tr><th>Topic</th><th>Read</th><th>Quiz best</th><th>Accuracy</th><th></th></tr></thead>
            <tbody>{rows.map((r) => <tr key={r.t.id}><td><button className="text-left hover:text-acc" onClick={() => go(r.t.id)}><span className="mono mr-2 text-[.62rem] text-acc">{r.t.n}</span>{r.t.title}</button></td><td><span className="font-mono text-[.72rem]">{r.seen}/{r.t.sections.length}</span></td><td><span className="font-mono text-[.72rem]">{r.best != null ? `${r.best}/${r.quizTotal}` : "—"}</span></td><td>{r.pct == null ? <span className="text-muted">—</span> : <span className="flex items-center gap-2"><span className="h-1 w-16 overflow-hidden rounded-full bg-line-soft"><span className="block h-full" style={{ width: `${r.pct * 100}%`, background: r.pct < .7 ? "var(--bad)" : "var(--acc)" }} /></span><span className="font-mono text-[.72rem]">{Math.round(r.pct * 100)}%</span></span>}</td><td>{r.done ? <span className="text-acc">✓</span> : <button className="font-mono text-[.6rem] uppercase tracking-[.12em] text-muted hover:text-text" onClick={() => s.complete(r.t.id)}>mark done</button>}</td></tr>)}</tbody></table>
        </div>
      </div>
      <div className="space-y-4">
        <div className="card rv d1 p-5">
          <span className="font-mono text-[.6rem] uppercase tracking-[.2em] text-muted">Mock interviews</span>
          <div className="mt-3 flex items-center gap-4"><Ring v={mockPct} size={60}><b className="font-mono text-[.7rem]">{Math.round(mockPct * 100)}%</b></Ring><p className="m-0 text-[.84rem] text-dim"><b className="block text-text">{mocks.length} cards logged</b>average rubric coverage. Aim for 80%+ across every category before the real loop.</p></div>
        </div>
        <div className="card rv d2 p-5">
          <span className="font-mono text-[.6rem] uppercase tracking-[.2em] text-muted">Recent sessions</span>
          {hist.length === 0 ? <p className="mt-2 text-[.84rem] text-dim">Nothing yet. Every topic quiz, drill and mock card lands here.</p> : (
            <ul className="m-0 mt-3 list-none space-y-1.5 p-0">{hist.map((a) => <li key={a.id ?? a.at} className="flex items-center gap-3 text-[.82rem]"><span className={cn("chip py-0.5", a.kind === "mock" && "border-b/40", a.kind === "drill" && "border-a/40")}>{a.kind}</span><span className="truncate text-dim">{a.kind === "topic" ? topicById(a.topic!)?.title : a.kind === "drill" ? `${a.total} q · ${[...new Set(a.topics)].length} topics` : `rubric · ${[...new Set(a.topics)].map((t) => topicById(t)?.n).join(", ")}`}</span><b className={cn("ml-auto font-mono text-[.72rem]", a.score / a.total >= .7 ? "text-acc" : "text-bad")}>{a.score}/{a.total}</b><span className="font-mono text-[.6rem] text-muted">{new Date(a.at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span></li>)}</ul>
          )}
        </div>
        <div className="card rv d3 p-5">
          <span className="font-mono text-[.6rem] uppercase tracking-[.2em] text-muted">Your data</span>
          <p className="mt-2 text-[.82rem] text-dim">Everything here — path, positions, quiz history, flashcards, notes — is stored in this browser’s IndexedDB. Nothing is sent anywhere.</p>
          <button className="mt-3 font-mono text-[.6rem] uppercase tracking-[.16em] text-muted hover:text-bad" onClick={() => { if (confirm("Erase all local progress? This cannot be undone.")) void s.reset(); }}>Erase everything</button>
        </div>
      </div>
    </div>
  );
}
