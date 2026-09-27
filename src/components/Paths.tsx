import { topicById } from "@/data";
import { PATHS, type Path } from "@/data/paths";
import { useStore } from "@/lib/progress";
import { cn } from "@/utils/cn";

type Go = (t: string | null, a?: string | null) => void;

export const ago = (t: number) => {
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return "just now"; if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60); if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24); return d === 1 ? "yesterday" : `${d} days ago`;
};

export function Ring({ v, size = 44, children }: { v: number; size?: number; children?: React.ReactNode }) {
  return <span className="ring shrink-0" style={{ width: size, height: size, ["--v" as string]: Math.round(v * 100) }}><span style={{ width: size - 6, height: size - 6 }}>{children}</span></span>;
}

/** A row of squares, one per topic: filled = read, spot colour = where you are. */
function Steps({ ids, current, go }: { ids: string[]; current?: number; go?: Go }) {
  const s = useStore();
  return (
    <ol className="m-0 flex list-none items-center gap-1 p-0">
      {ids.map((id, k) => {
        const state = s.topics[id]?.completed ? "done" : k === current ? "current" : "todo";
        return <li key={id}>{go ? <button title={`${topicById(id)?.n} ${topicById(id)?.title}`} onClick={() => go(id)} className="step-dot block" data-state={state} aria-label={`${topicById(id)?.title} (${state})`} /> : <i className="step-dot block" data-state={state} />}</li>;
      })}
    </ol>
  );
}

/* ---------- contents drawer widget ---------- */
export function PathRail({ go }: { go: Go }) {
  const s = useStore();
  if (!s.ready) return null;
  if (!s.pathDef || !s.path) {
    return (
      <button onClick={() => go(null, "paths")} className="mt-5 flex w-full items-center gap-3 border border-dashed border-line px-3 py-3 text-left hover:border-rule">
        <span className="flex-1"><b className="serif block text-[1rem] font-semibold">Choose a learning path</b><span className="text-[.76rem] text-muted">Four routes through the twelve. The playbook remembers where you are.</span></span>
        <span className="font-mono text-acc" aria-hidden>→</span>
      </button>
    );
  }
  const def = s.pathDef; const cur = def.ids[s.path.current];
  return (
    <div className="mt-5 border border-rule p-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className="kicker">Your path</span>
        <span className="font-mono text-[.62rem] text-muted">{s.pathDone}/{def.ids.length} read</span>
      </div>
      <b className="serif mt-1 block text-[1.2rem] font-semibold">{def.k}</b>
      <div className="mt-3"><Steps ids={def.ids} current={s.path.current} go={go} /></div>
      <div className="mt-4 flex gap-2">
        <button className="btn btn-key flex-1 justify-center !py-2" onClick={() => go(s.pathNext ?? cur, s.pathNext === cur ? "~resume" : undefined)}>{s.pathDone === def.ids.length ? "Review path" : `Continue · ${topicById(s.pathNext ?? cur)?.n}`} →</button>
        <button className="btn !px-3 !py-2" title="Leave this path" aria-label="Leave this path" onClick={() => { if (confirm("Leave this path? Your topic progress is kept.")) s.quitPath(); }}>✕</button>
      </div>
    </div>
  );
}

/* ---------- slim bar under the masthead on topic pages ---------- */
export function PathBar({ topicId, go }: { topicId: string; go: Go }) {
  const s = useStore();
  const def = s.pathDef;
  const i = def ? def.ids.indexOf(topicId) : -1;
  if (!def || i < 0) return null;
  const done = !!s.topics[topicId]?.completed;
  const nextId = def.ids[i + 1];
  return (
    <div className="border-b border-line-soft bg-ink-1 no-print">
      <div className="mx-auto flex max-w-[1320px] flex-wrap items-center gap-x-4 gap-y-2 px-5 py-2 sm:px-8">
        <span className="kicker">Path · {def.k} · step {i + 1} of {def.ids.length}</span>
        <Steps ids={def.ids} current={i} go={go} />
        <div className="ml-auto flex items-center gap-3">
          {nextId && <button onClick={() => { s.complete(topicId, true); go(nextId); }} className="font-mono text-[.62rem] uppercase tracking-[.1em] text-dim hover:text-acc">Done — next: {topicById(nextId)?.n} {topicById(nextId)?.title} →</button>}
          {!nextId && done && <button onClick={() => go(null, "paths")} className="font-mono text-[.62rem] uppercase tracking-[.1em] text-acc">Path complete · pick another →</button>}
        </div>
      </div>
    </div>
  );
}

/* ---------- front page: "your desk" ---------- */
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
  return (
    <div className="flex flex-col items-start gap-3 border-y border-rule py-4">
      <span className="kicker">{def ? `On your path · ${def.k}` : "Where you left off"}</span>
      <div className="w-full min-w-0">
        <b className="serif block text-[1.2rem] font-semibold leading-snug">{topic.n} · {topic.title}</b>
        <span className="mt-1 block text-[.8rem] text-muted">{sec ? `At “${sec}”` : "From the top"}{tp?.updatedAt ? ` · ${ago(tp.updatedAt)}` : ""}</span>
      </div>
      {def && <Steps ids={def.ids} current={s.path?.current} />}
      <button className="btn btn-key !py-2" onClick={() => go(topic.id, "~resume")}>Resume →</button>
    </div>
  );
}

/* ---------- front page: the paths ---------- */
export function PathsGrid({ go }: { go: Go }) {
  const s = useStore();
  return (
    <div className="cols mt-8 md:grid-cols-2 xl:grid-cols-4">
      {PATHS.map((p, i) => <PathCard key={p.id} p={p} i={i} go={go} active={s.path?.id === p.id} />)}
    </div>
  );
}

function PathCard({ p, i, go, active }: { p: Path; i: number; go: Go; active: boolean }) {
  const s = useStore();
  const done = p.ids.filter((id) => s.topics[id]?.completed).length;
  const start = () => { s.startPath(p.id); go(p.ids.find((id) => !s.topics[id]?.completed) ?? p.ids[0]); };
  return (
    <article className={cn("rv flex flex-col p-6", `d${(i % 4) + 1}`, active && "!bg-ink-1")}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="kicker">{String.fromCharCode(65 + i)} · {p.k}</span>
        <span className="font-mono text-[.62rem] text-muted">{active ? <b className="font-medium text-acc">● active · </b> : null}{done > 0 ? `${done}/${p.ids.length}` : p.weeks}</span>
      </div>
      <h3 className="mt-3 text-[1.45rem]">{p.h}</h3>
      <p className="mt-2 text-[.86rem] text-dim">{p.p}</p>
      <ol className="m-0 mb-5 mt-auto list-none border-t border-line-soft p-0 pt-2">
        {p.ids.map((id, k) => {
          const t = topicById(id)!; const d = !!s.topics[id]?.completed; const cur = active && s.path?.current === k;
          return <li key={id}><button onClick={() => go(id)} className="group grid w-full grid-cols-[1.6rem_1fr_auto] items-baseline gap-2 py-1 text-left text-[.84rem] text-dim hover:text-text"><span className={cn("mono text-[.62rem]", cur ? "text-acc" : "text-muted")}>{t.n}</span><span className={cn("truncate", d && "text-muted line-through decoration-line")}>{t.title}</span><span className="font-mono text-[.62rem] text-muted">{d ? "✓" : cur ? "now" : ""}</span></button></li>;
        })}
      </ol>
      <button className={cn("btn self-start", !active && "btn-key")} onClick={active ? () => go(s.pathNext ?? p.ids[0], "~resume") : start}>{active ? (done === p.ids.length ? "Review →" : "Continue →") : done > 0 ? "Resume this path" : "Begin this path"}</button>
    </article>
  );
}
