import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { TOPICS, topicIndex, type Topic } from "@/data";
import { scrollToId, useReveal } from "@/lib/hooks";
import { useStore } from "@/lib/progress";
import { Analogy, BigIdea, Cases, Cheatsheet, Compare, Frameworks, Hero, QuizSec, Steps, Terms, Tool, Visual } from "./Sections";
import { PathBar } from "./Paths";
import { cn } from "@/utils/cn";

type Go = (topic: string | null, anchor?: string | null) => void;

export default function TopicPage({ t, anchor, activeSec, go }: { t: Topic; anchor: string | null; activeSec: string | null; go: Go }) {
  useReveal(t.id);
  const s = useStore();
  const idx = topicIndex(t.id);
  const prev = TOPICS[idx - 1], next = TOPICS[idx + 1];
  const [offer, setOffer] = useState<{ y: number; sec: string | null } | null>(null);

  // arrive: record the visit, then restore position — or offer to
  useEffect(() => {
    if (!s.ready) return;
    s.visit(t.id);
    const saved = s.topics[t.id];
    if (anchor === "~resume") {
      history.replaceState(null, "", `#/${t.id}`);
      const y = saved?.scrollY ?? 0;
      const id = requestAnimationFrame(() => setTimeout(() => { if (y > 0) window.scrollTo({ top: y, behavior: "smooth" }); else if (saved?.lastSection) scrollToId(saved.lastSection); }, 120));
      return () => cancelAnimationFrame(id);
    }
    if (anchor) { const id = requestAnimationFrame(() => setTimeout(() => scrollToId(anchor), 60)); return () => cancelAnimationFrame(id); }
    window.scrollTo({ top: 0, behavior: "instant" });
    if (saved && saved.scrollY > 600 && !saved.completed) { setOffer({ y: saved.scrollY, sec: saved.lastSection }); const to = setTimeout(() => setOffer(null), 9000); return () => clearTimeout(to); }
    // a visit is recorded once per arrival, not again when an in-page anchor changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t.id, s.ready]);

  // in-page anchor changes (search results, the contents drawer) just scroll
  useEffect(() => {
    if (!s.ready || !anchor || anchor === "~resume") return;
    const id = requestAnimationFrame(() => setTimeout(() => scrollToId(anchor), 60));
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchor]);

  // persist reading position as you scroll
  useEffect(() => {
    let raf = 0;
    const on = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => s.position(t.id, activeSec, window.scrollY)); };
    window.addEventListener("scroll", on, { passive: true });
    return () => { window.removeEventListener("scroll", on); cancelAnimationFrame(raf); };
  }, [t.id, activeSec, s.position]);

  const cheat = t.sections.find((x) => x.type === "cheatsheet");
  const secName = offer?.sec ? t.sections.find((x) => x.id === offer.sec)?.nav : null;
  const [hero, ...body] = t.sections;

  return (
    <>
      <PathBar topicId={t.id} go={go} />
      <motion.article key={t.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .45, ease: [.16, 1, .3, 1] }} className="mx-auto w-full max-w-[1320px] px-5 sm:px-8">
        {hero?.type === "hero" && <Hero s={hero} t={t} onNext={() => (next ? go(next.id) : go(null))} />}
        <div className="grid gap-x-12 lg:grid-cols-[12.5rem_minmax(0,1fr)]">
          <Toc t={t} activeSec={activeSec} />
          <div className="min-w-0">
            {body.map((sec) => {
              switch (sec.type) {
                case "bigidea": return <BigIdea key={sec.id} s={sec} t={t} />;
                case "analogy": return <Analogy key={sec.id} s={sec} t={t} />;
                case "terms": return <Terms key={sec.id} s={sec} t={t} col3={cheat?.col3} />;
                case "steps": return <Steps key={sec.id} s={sec} t={t} />;
                case "calculator": case "tool": return <Tool key={sec.id} s={sec} t={t} />;
                case "visual": return <Visual key={sec.id} s={sec} t={t} />;
                case "compare": return <Compare key={sec.id} s={sec} t={t} />;
                case "cases": return <Cases key={sec.id} s={sec} t={t} />;
                case "cheatsheet": return <Cheatsheet key={sec.id} s={sec} t={t} />;
                case "quiz": return <QuizSec key={sec.id} s={sec} t={t} />;
                case "frameworks": return <Frameworks key={sec.id} s={sec} t={t} />;
                default: return null;
              }
            })}
          </div>
        </div>
        <div className="mt-6 flex items-center justify-between gap-4 border-t border-rule py-4 lg:hidden no-print">
          <span className="kicker">{s.topics[t.id]?.seen.length ?? 0}/{t.sections.length} sections read</span>
          <button onClick={() => s.complete(t.id, !s.topics[t.id]?.completed)} aria-pressed={!!s.topics[t.id]?.completed} className="btn !py-2">{s.topics[t.id]?.completed ? "✓ Marked as read" : "Mark as read"}</button>
        </div>
        <nav className="cols mt-6 md:grid-cols-2 no-print" aria-label="Topic pagination">
          {prev ? <button onClick={() => go(prev.id)} className="group p-6 text-left hover:!bg-ink-1"><span className="kicker">← Previous · {prev.n}</span><b className="serif mt-1 block text-[1.5rem] font-semibold group-hover:text-acc">{prev.title}</b></button>
            : <button onClick={() => go(null)} className="group p-6 text-left hover:!bg-ink-1"><span className="kicker">← Back to</span><b className="serif mt-1 block text-[1.5rem] font-semibold group-hover:text-acc">The front page</b></button>}
          {next ? <button onClick={() => { s.complete(t.id, true); go(next.id); }} className="group p-6 text-right hover:!bg-ink-1"><span className="kicker">Finished · continue to {next.n} →</span><b className="serif mt-1 block text-[1.5rem] font-semibold group-hover:text-acc">{next.title}</b></button>
            : <button onClick={() => { s.complete(t.id, true); go(null); }} className="group p-6 text-right hover:!bg-ink-1"><span className="kicker">You finished the loop →</span><b className="serif mt-1 block text-[1.5rem] font-semibold group-hover:text-acc">Start another lap</b></button>}
        </nav>
      </motion.article>

      {/* resume offer */}
      <AnimatePresence>
        {offer && (
          <motion.div role="status" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }} className="fixed bottom-5 left-1/2 z-40 flex w-[min(34rem,calc(100vw-2rem))] -translate-x-1/2 items-center gap-3 border border-rule bg-ink py-2 pl-4 pr-2 shadow-[var(--shadow)]">
            <span className="flex-1 text-[.86rem] text-dim">You were {secName ? <>at <b className="text-text">{secName}</b></> : "part-way through"}.</span>
            <button className="btn btn-key !py-1.5" onClick={() => { window.scrollTo({ top: offer.y, behavior: "smooth" }); setOffer(null); }}>Pick up there ↓</button>
            <button className="grid h-8 w-8 place-content-center text-muted hover:text-text" onClick={() => setOffer(null)} aria-label="Dismiss">✕</button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ---------- the margin column: "in this piece" ---------- */
function Toc({ t, activeSec }: { t: Topic; activeSec: string | null }) {
  const s = useStore();
  const tp = s.topics[t.id];
  const seen = tp?.seen ?? [];
  const done = !!tp?.completed;
  const pct = Math.min(1, seen.length / t.sections.length);
  return (
    <aside className="no-print hidden lg:block">
      <div className="sticky top-[76px] pt-12">
        <p className="kicker">In this piece</p>
        <ol className="m-0 mt-3 list-none border-t border-rule p-0">
          {t.sections.map((sec, i) => {
            const on = activeSec === sec.id;
            return (
              <li key={sec.id}>
                <button onClick={() => { scrollToId(sec.id); history.replaceState(null, "", `#/${t.id}/${sec.id}`); }} aria-current={on ? "location" : undefined} className={cn("grid w-full grid-cols-[1.4rem_1fr_auto] items-baseline gap-1 border-b border-line-soft py-1.5 text-left text-[.84rem] transition-colors", on ? "text-text" : "text-muted hover:text-text")}>
                  <span className={cn("mono text-[.6rem]", on && "text-acc")}>{String(i + 1).padStart(2, "0")}</span>
                  <span className={cn(on && "serif text-[.95rem] italic")}>{sec.nav}</span>
                  <span className="font-mono text-[.6rem] text-muted">{seen.includes(sec.id) ? "✓" : ""}</span>
                </button>
              </li>
            );
          })}
        </ol>
        <div className="mt-4">
          <div className="flex justify-between font-mono text-[.58rem] uppercase tracking-[.1em] text-muted"><span>Read</span><span>{seen.length}/{t.sections.length}</span></div>
          <div className="mt-1 h-px bg-line-soft"><div className="h-px bg-acc transition-[width] duration-500" style={{ width: `${(done ? 1 : pct) * 100}%` }} /></div>
        </div>
        <button onClick={() => s.complete(t.id, !done)} aria-pressed={done} className={cn("mt-4 w-full border px-3 py-2 font-mono text-[.62rem] uppercase tracking-[.1em] transition-colors", done ? "border-text bg-text text-ink" : "border-line text-dim hover:border-rule hover:text-text")}>{done ? "✓ Marked as read" : "Mark as read"}</button>
      </div>
    </aside>
  );
}
