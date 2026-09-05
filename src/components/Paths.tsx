import { AnimatePresence, motion } from "motion/react";
import { TOPICS, topicById } from "@/data";
import { PATHS, type Path } from "@/data/paths";
import { useStore } from "@/lib/progress";
import { cn } from "@/utils/cn";

type Go = (t: string | null, a?: string | null) => void;

const ago = (t: number) => {
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return "just now"; if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60); if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24); return d === 1 ? "yesterday" : `${d} days ago`;
};

export function Ring({ v, size = 44, children }: { v: number; size?: number; children?: React.ReactNode }) {
  return <span className="ring" style={{ width: size, height: size, ["--v" as any]: Math.round(v * 100) }}><span style={{ width: size - 8, height: size - 8 }}>{children}</span></span>;
}

/* ---------- sidebar widget ---------- */
export function PathRail({ go, compact }: { go: Go; compact?: boolean }) {
  const s = useStore();
  if (!s.ready) return null;
  if (!s.pathDef || !s.path) {
    return (
      <button onClick={() => go(null, "paths")} className="mt-3 flex w-full items-center gap-3 rounded-xl border border-dashed border-line-soft px-3 py-2.5 text-left text-[.8rem] text-dim hover:border-line hover:text-text">
        <span className="grid h-7 w-7 place-content-center rounded-full border border-line-soft text-acc">⟳</span>
        <span className="flex-1"><b className="block text-[.82rem] font-semibold text-text">Choose a path</b><span className="text-[.7rem] text-muted">and the playbook will remember where you are</span></span>
      </button>
    );
  }
  const def = s.pathDef; const pct = s.pathDone / def.ids.length;
  const cur = def.ids[s.path.current];
  return (
    <div className="mt-3 rounded-xl border border-line-soft bg-ink-2/60 p-3">
      <div className="flex items-center gap-3">
        <Ring v={pct} size={40}><b className="font-mono text-[.6rem] text-text">{Math.round(pct * 100)}%</b></Ring>
        <div className="min-w-0 flex-1">
          <span className="block font-mono text-[.56rem] uppercase tracking-[.18em] text-muted">Your path</span>
          <b className="block truncate text-[.84rem] font-semibold">{def.k}</b>
          <span className="block text-[.68rem] text-muted">{s.pathDone}/{def.ids.length} done · step {s.path.current + 1}</span>
        </div>
      </div>
      {!compact && (
        <ol className="m-0 mt-3 list-none space-y-0.5 p-0">
          {def.ids.map((id, i) => {
            const t = topicById(id)!; const done = !!s.topics[id]?.completed; const on = i === s.path!.current;
            return <li key={id}><button onClick={() => go(id, done || !on ? undefined : "~resume")} className={cn("flex w-full items-center gap-2.5 rounded-lg px-2 py-1 text-left text-[.76rem] transition-colors", on ? "bg-ink-3 text-text" : "text-dim hover:bg-ink-3 hover:text-text")}><i className="step-dot" data-state={done ? "done" : on ? "current" : "todo"} /><span className={cn("truncate", done && "line-through decoration-line opacity-70")}>{t.title}</span></button></li>;
          })}
        </ol>
      )}
      <div className="mt-3 flex gap-2">
        <button className="btn btn-key flex-1 justify-center !py-1.5 !text-[.76rem]" onClick={() => go(s.pathNext ?? cur, s.pathNext === cur ? "~resume" : undefined)}>{s.pathDone === def.ids.length ? "Review path" : "Continue →"}</button>
        <button className="btn !px-3 !py-1.5 !text-[.76rem]" title="Leave this path" onClick={() => { if (confirm("Leave this path? Your topic progress is kept.")) s.quitPath(); }}>✕</button>
      </div>
    </div>
  );
}

/* ---------- sticky bar on topic pages ---------- */
export function PathBar({ topicId, go }: { topicId: string; go: Go }) {
  const s = useStore();
  const def = s.pathDef;
  const i = def ? def.ids.indexOf(topicId) : -1;
  const tp = s.topics[topicId];
  const done = !!tp?.completed;
  const total = TOPICS.find((t) => t.id === topicId)?.sections.length ?? 0;
  const seen = tp?.seen.length ?? 0;
  const readPct = total ? Math.min(1, seen / total) : 0;
  const nextId = def && i >= 0 ? def.ids[i + 1] : undefined;
  return (
    <div className="sticky top-14 z-20 border-b border-line-soft bg-ink/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1180px] flex-wrap items-center gap-x-4 gap-y-2 px-5 py-2 sm:px-8">
        {def && i >= 0 ? (
          <>
            <span className="flex items-center gap-2 font-mono text-[.6rem] uppercase tracking-[.16em] text-muted"><i className="h-1.5 w-1.5 rounded-full" style={{ background: `hsl(${def.hue} 80% 62%)` }} />{def.k} · step {i + 1}/{def.ids.length}</span>
            <ol className="m-0 flex list-none items-center gap-1.5 p-0">
              {def.ids.map((id, k) => <li key={id}><button title={topicById(id)?.title} onClick={() => go(id)} className="step-dot block" data-state={s.topics[id]?.completed ? "done" : k === i ? "current" : "todo"} /></li>)}
            </ol>
          </>
        ) : (
          <span className="font-mono text-[.6rem] uppercase tracking-[.16em] text-muted">Reading · {seen}/{total} sections</span>
        )}
        <span className="hidden h-1 w-24 overflow-hidden rounded-full bg-line-soft sm:block" title="Sections read"><span className="block h-full bg-acc transition-[width] duration-500" style={{ width: `${readPct * 100}%` }} /></span>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => s.complete(topicId, !done)} className={cn("rounded-full border px-3 py-1 font-mono text-[.62rem] uppercase tracking-[.12em] transition-colors", done ? "border-acc bg-acc text-acc-ink" : "border-line-soft text-dim hover:border-acc hover:text-text")} aria-pressed={done}>{done ? "✓ Completed" : "Mark complete"}</button>
          {nextId && <button onClick={() => { s.complete(topicId, true); go(nextId); }} className="hidden rounded-full border border-line-soft px-3 py-1 font-mono text-[.62rem] uppercase tracking-[.12em] text-dim hover:border-line hover:text-text sm:inline">Done, next: {topicById(nextId)?.n} →</button>}
          {def && i >= 0 && !nextId && done && <button onClick={() => go(null, "paths")} className="hidden rounded-full border border-acc/40 px-3 py-1 font-mono text-[.62rem] uppercase tracking-[.12em] text-acc sm:inline">Path complete · pick another</button>}
        </div>
      </div>
    </div>
  );
}

/* ---------- home: continue card ---------- */
export function ResumeCard({ go }: { go: Go }) {
  const s = useStore();
  if (!s.ready) return null;
  const def = s.pathDef;
  const last = s.lastTopic;
  if (!def && !last) return null;
  const topic = def && s.path ? topicById(s.pathNext ?? def.ids[s.path.current]) : last ? topicById(last.id) : undefined;
  if (!topic) return null;
  const tp = s.topics[topic.id];
  const sec = tp?.lastSection ? topic.sections.find((x) => x.id === tp.lastSection)?.nav : null;
  const pct = def ? s.pathDone / def.ids.length : 0;
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rise mt-8 flex flex-wrap items-center gap-4 rounded-2xl border border-acc/30 bg-ink-1/80 p-4 backdrop-blur" style={{ animationDelay: ".28s" }}>
      {def ? <Ring v={pct} size={48}><b className="font-mono text-[.62rem]">{Math.round(pct * 100)}%</b></Ring> : <span className="grid h-12 w-12 place-content-center rounded-full border border-line-soft text-acc">↩</span>}
      <div className="min-w-0 flex-1">
        <span className="block font-mono text-[.58rem] uppercase tracking-[.2em] text-muted">{def ? `Continue · ${def.k}` : "Pick up where you left off"}</span>
        <b className="block truncate font-display text-[1.02rem]">{topic.n} · {topic.title}</b>
        <span className="block text-[.74rem] text-muted">{sec ? `at “${sec}”` : "from the top"}{tp?.updatedAt ? ` · ${ago(tp.updatedAt)}` : ""}</span>
      </div>
      <button className="btn btn-key" onClick={() => go(topic.id, "~resume")}>Resume →</button>
    </motion.div>
  );
}

/* ---------- home: paths grid ---------- */
export function PathsGrid({ go }: { go: Go }) {
  const s = useStore();
  return (
    <div className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {PATHS.map((p, i) => <PathCard key={p.id} p={p} i={i} go={go} active={s.path?.id === p.id} />)}
    </div>
  );
}

function PathCard({ p, i, go, active }: { p: Path; i: number; go: Go; active: boolean }) {
  const s = useStore();
  const done = p.ids.filter((id) => s.topics[id]?.completed).length;
  const pct = done / p.ids.length;
  const start = () => { s.startPath(p.id); const first = p.ids.find((id) => !s.topics[id]?.completed) ?? p.ids[0]; go(first); };
  return (
    <div className={cn("card rv flex flex-col p-5 transition-colors", `d${(i % 3) + 1}`, active && "border-acc/60 shadow-[0_0_0_1px_var(--acc)_inset]")}>
      <div className="flex items-center justify-between">
        <span className="chip"><i className="h-1.5 w-1.5 rounded-full" style={{ background: `hsl(${p.hue} 80% 62%)` }} />{p.k}</span>
        <AnimatePresence>{(active || done > 0) && <motion.span initial={{ opacity: 0, scale: .8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="font-mono text-[.62rem] text-acc">{active ? "● active · " : ""}{done}/{p.ids.length}</motion.span>}</AnimatePresence>
      </div>
      <h3 className="mt-3 text-[1.1rem] leading-tight">{p.h}</h3>
      <p className="mt-2 text-[.82rem] text-dim">{p.p}</p>
      <div className="my-3 h-1 overflow-hidden rounded-full bg-line-soft"><div className="h-full bg-acc transition-[width] duration-700" style={{ width: `${pct * 100}%` }} /></div>
      <ol className="m-0 mt-auto list-none space-y-0.5 p-0">
        {p.ids.slice(0, 6).map((id, k) => { const t = topicById(id)!; const d = !!s.topics[id]?.completed; const cur = active && s.path?.current === k; return <li key={id}><button onClick={() => go(id)} className="group flex w-full items-center gap-2.5 rounded-lg px-2 py-1 text-left text-[.8rem] text-dim transition-colors hover:bg-ink-3 hover:text-text"><i className="step-dot" data-state={d ? "done" : cur ? "current" : "todo"} /><span className="mono text-[.6rem] text-acc">{t.n}</span><span className={cn("truncate", d && "opacity-60")}>{t.title}</span><span className="ml-auto text-acc opacity-0 transition-opacity group-hover:opacity-100">→</span></button></li>; })}
        {p.ids.length > 6 && <li className="px-2 font-mono text-[.62rem] text-muted">+ {p.ids.length - 6} more</li>}
      </ol>
      <button className={cn("btn mt-4 self-start", !active && "btn-key")} onClick={active ? () => go(s.pathNext ?? p.ids[0], "~resume") : start}>{active ? (done === p.ids.length ? "Review →" : "Continue →") : done > 0 ? "Resume this path" : "Begin this path"}</button>
    </div>
  );
}
