import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { search, TOPICS, type SearchHit } from "@/data";
import { SearchGlyph } from "./Glyphs";

const SUGGEST = ["p-value", "DACI", "5 Whys", "North Star", "RICE", "guardrail", "Kano", "novelty effect", "Working Backwards", "cost of delay"];

export default function Search({ open, onClose, go }: { open: boolean; onClose: () => void; go: (t: string | null, a?: string | null) => void }) {
  const [q, setQ] = useState(""); const [sel, setSel] = useState(0);
  const inp = useRef<HTMLInputElement>(null);
  const hits = useMemo(() => search(q), [q]);
  useEffect(() => { if (open) { setQ(""); setSel(0); const id = setTimeout(() => inp.current?.focus(), 30); return () => clearTimeout(id); } }, [open]);
  useEffect(() => setSel(0), [q]);
  useEffect(() => { document.getElementById("sr-" + sel)?.scrollIntoView({ block: "nearest" }); }, [sel]);
  const pick = (h: SearchHit) => { go(h.topic, h.anchor); onClose(); };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(hits.length - 1, s + 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
    if (e.key === "Enter" && hits[sel]) pick(hits[sel]);
    if (e.key === "Escape") onClose();
  };
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .15 }} className="fixed inset-0 z-[100] flex items-start justify-center bg-[color-mix(in_srgb,var(--rule)_28%,transparent)] p-3 pt-[8vh] sm:p-4 sm:pt-[10vh]" onMouseDown={onClose}>
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: .18 }} onMouseDown={(e) => e.stopPropagation()} className="w-full max-w-2xl overflow-hidden border border-rule bg-ink shadow-[var(--shadow)]" role="dialog" aria-modal="true" aria-label="Search the playbook">
            <div className="flex items-center gap-3 border-b border-rule px-4 py-3">
              <span className="text-muted"><SearchGlyph /></span>
              <input ref={inp} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey} placeholder="Search terms, frameworks, steps, cases…" aria-label="Search" aria-controls="search-results" aria-activedescendant={hits[sel] ? "sr-" + sel : undefined} className="serif flex-1 bg-transparent text-[1.25rem] outline-none placeholder:text-muted" />
              <kbd>esc</kbd>
            </div>
            <div id="search-results" role="listbox" className="thin max-h-[60vh] overflow-y-auto">
              {!q && (
                <div className="p-4">
                  <span className="kicker">Try</span>
                  <div className="mt-2 flex flex-wrap gap-1">{SUGGEST.map((s) => <button key={s} onClick={() => setQ(s)} className="pill">{s}</button>)}</div>
                  <span className="kicker mt-5 block">Jump to a topic</span>
                  <div className="mt-2 grid sm:grid-cols-2">{TOPICS.map((t) => <button key={t.id} onClick={() => { go(t.id); onClose(); }} className="grid grid-cols-[2rem_1fr] items-baseline border-b border-line-soft py-1.5 text-left text-[.9rem] text-dim hover:text-text"><span className="mono text-[.64rem] text-muted">{t.n}</span><span className="serif">{t.title}</span></button>)}</div>
                </div>
              )}
              {q && !hits.length && <p className="p-8 text-center font-mono text-[.8rem] text-muted">No matches for “{q}”.</p>}
              {hits.map((h, i) => (
                <button id={"sr-" + i} key={i} role="option" aria-selected={i === sel} onMouseEnter={() => setSel(i)} onClick={() => pick(h)} className={"grid w-full grid-cols-[1fr_auto] items-baseline gap-4 border-b border-line-soft px-4 py-2.5 text-left transition-colors " + (i === sel ? "bg-ink-2" : "")}>
                  <span className="min-w-0"><b className="serif block truncate text-[1.02rem] font-semibold text-text">{h.title}</b><span className="block truncate text-[.8rem] text-muted">{h.sub}</span></span>
                  <span className="text-right"><span className={"block font-mono text-[.58rem] uppercase tracking-[.1em] " + (i === sel ? "text-acc" : "text-dim")}>{h.kind}</span><span className="block max-w-[140px] truncate font-mono text-[.6rem] text-muted">{h.topicTitle}</span></span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-4 border-t border-rule px-4 py-2 font-mono text-[.6rem] text-muted"><span><kbd>↑</kbd> <kbd>↓</kbd> move</span><span><kbd>↵</kbd> open</span><span className="ml-auto">{hits.length ? `${hits.length} results` : ""}</span></div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
