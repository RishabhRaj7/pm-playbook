import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { search, TOPICS, type SearchHit } from "@/data";

const KIND_COLOR: Record<SearchHit["kind"], string> = { Topic: "text-acc", Term: "text-a", Framework: "text-b", Step: "text-signal", Section: "text-dim", Case: "text-signal" };
const SUGGEST = ["p-value", "DACI", "5 whys", "North Star", "RICE", "guardrail", "Kano", "novelty effect", "working backwards", "cost of delay"];

export default function Search({ open, onClose, go }: { open: boolean; onClose: () => void; go: (t: string | null, a?: string | null) => void }) {
  const [q, setQ] = useState(""); const [sel, setSel] = useState(0);
  const inp = useRef<HTMLInputElement>(null);
  const hits = useMemo(() => search(q), [q]);
  useEffect(() => { if (open) { setQ(""); setSel(0); setTimeout(() => inp.current?.focus(), 30); } }, [open]);
  useEffect(() => setSel(0), [q]);
  const pick = (h: SearchHit) => { go(h.topic, h.anchor); onClose(); };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(hits.length - 1, s + 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
    if (e.key === "Enter" && hits[sel]) pick(hits[sel]);
    if (e.key === "Escape") onClose();
  };
  useEffect(() => { document.getElementById("sr-" + sel)?.scrollIntoView({ block: "nearest" }); }, [sel]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-start justify-center bg-ink/70 backdrop-blur-sm p-4 pt-[10vh]" onMouseDown={onClose}>
          <motion.div initial={{ opacity: 0, y: -12, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -12, scale: .98 }} transition={{ duration: .22 }} onMouseDown={(e) => e.stopPropagation()} className="w-full max-w-2xl overflow-hidden rounded-2xl border border-line bg-ink-1 shadow-[var(--shadow)]" role="dialog" aria-label="Search the playbook">
            <div className="flex items-center gap-3 border-b border-line-soft px-4 py-3">
              <span className="text-acc text-lg">⌕</span>
              <input ref={inp} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey} placeholder="Search terms, frameworks, steps, cases…" className="flex-1 bg-transparent text-[1rem] outline-none placeholder:text-muted" />
              <kbd>esc</kbd>
            </div>
            <div className="thin max-h-[56vh] overflow-y-auto p-2">
              {!q && (
                <div className="p-3">
                  <span className="font-mono text-[.6rem] uppercase tracking-[.16em] text-muted">Try</span>
                  <div className="mt-2 flex flex-wrap gap-1.5">{SUGGEST.map((s) => <button key={s} onClick={() => setQ(s)} className="pill">{s}</button>)}</div>
                  <span className="mt-5 block font-mono text-[.6rem] uppercase tracking-[.16em] text-muted">Jump to a topic</span>
                  <div className="mt-2 grid gap-1 sm:grid-cols-2">{TOPICS.map((t) => <button key={t.id} onClick={() => { go(t.id); onClose(); }} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[.84rem] text-dim hover:bg-ink-3 hover:text-text"><span className="mono text-[.62rem] text-acc">{t.n}</span>{t.title}</button>)}</div>
                </div>
              )}
              {q && !hits.length && <p className="p-6 text-center font-mono text-[.8rem] text-muted">No matches for “{q}”.</p>}
              {hits.map((h, i) => (
                <button id={"sr-" + i} key={h.kind + h.title + h.topic} onMouseEnter={() => setSel(i)} onClick={() => pick(h)} className={"grid w-full grid-cols-[1fr_auto] items-baseline gap-3 rounded-lg px-3 py-2 text-left transition-colors " + (i === sel ? "bg-ink-3" : "hover:bg-ink-2")}>
                  <span className="min-w-0"><b className="block truncate text-[.9rem] text-text">{h.title}</b><span className="block truncate text-[.78rem] text-muted">{h.sub}</span></span>
                  <span className="text-right"><span className={"block font-mono text-[.58rem] uppercase tracking-[.14em] " + KIND_COLOR[h.kind]}>{h.kind}</span><span className="block font-mono text-[.6rem] text-muted truncate max-w-[140px]">{h.topicTitle}</span></span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-4 border-t border-line-soft px-4 py-2 font-mono text-[.6rem] text-muted"><span><kbd>↑</kbd> <kbd>↓</kbd> navigate</span><span><kbd>↵</kbd> open</span><span className="ml-auto">{search.length ? "" : ""}{hits.length ? `${hits.length} results` : ""}</span></div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
