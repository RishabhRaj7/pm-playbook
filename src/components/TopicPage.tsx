import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { TOPICS, stageOf, topicIndex, type Topic } from "@/data";
import { scrollToId, useReveal } from "@/lib/hooks";
import { useStore } from "@/lib/progress";
import { Analogy, BigIdea, Cases, Cheatsheet, Compare, Frameworks, Hero, QuizSec, Steps, Terms, Tool, Visual } from "./Sections";
import { PathBar } from "./Paths";

export default function TopicPage({ t, anchor, activeSec, go }: { t: Topic; anchor: string | null; activeSec: string | null; go: (topic: string | null, anchor?: string | null) => void }) {
  useReveal(t.id);
  const s = useStore();
  const idx = topicIndex(t.id);
  const prev = TOPICS[idx - 1], next = TOPICS[idx + 1];
  const [offer, setOffer] = useState<{ y: number; sec: string | null } | null>(null);

  // arrive: record visit, restore position, or offer to
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t.id, anchor, s.ready]);

  // persist reading position as you scroll
  useEffect(() => {
    let raf = 0;
    const on = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => s.position(t.id, activeSec, window.scrollY)); };
    window.addEventListener("scroll", on, { passive: true });
    on();
    return () => { window.removeEventListener("scroll", on); cancelAnimationFrame(raf); };
  }, [t.id, activeSec, s.position]);

  const cheat = t.sections.find((x) => x.type === "cheatsheet");
  const secName = offer?.sec ? t.sections.find((x) => x.id === offer.sec)?.nav : null;

  return (
    <>
      <PathBar topicId={t.id} go={go} />
      <motion.div key={t.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .45, ease: [.16, 1, .3, 1] }} className="mx-auto w-full max-w-[1180px] px-5 sm:px-8">
        {t.sections.map((sec) => {
          switch (sec.type) {
            case "hero": return <Hero key={sec.id} s={sec} t={t} stageLabel={stageOf(t.stage).label} onNext={() => next ? go(next.id) : go(null)} />;
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
        <nav className="grid gap-3 border-t border-line-soft py-12 md:grid-cols-2" aria-label="Topic pagination">
          {prev ? <button onClick={() => go(prev.id)} className="card card-hover p-5 text-left"><span className="font-mono text-[.6rem] uppercase tracking-[.16em] text-muted">← Previous · {prev.n}</span><b className="mt-1 block font-display text-lg">{prev.title}</b></button> : <button onClick={() => go(null)} className="card card-hover p-5 text-left"><span className="font-mono text-[.6rem] uppercase tracking-[.16em] text-muted">← Back to</span><b className="mt-1 block font-display text-lg">The loop</b></button>}
          {next ? <button onClick={() => { s.complete(t.id, true); go(next.id); }} className="card card-hover border-acc/40 p-5 text-right"><span className="font-mono text-[.6rem] uppercase tracking-[.16em] text-acc">Next · {next.n} →</span><b className="mt-1 block font-display text-lg">{next.title}</b></button> : <button onClick={() => { s.complete(t.id, true); go(null); }} className="card card-hover border-acc/40 p-5 text-right"><span className="font-mono text-[.6rem] uppercase tracking-[.16em] text-acc">You finished the loop →</span><b className="mt-1 block font-display text-lg">Start another lap</b></button>}
        </nav>
      </motion.div>

      {/* resume offer */}
      <AnimatePresence>
        {offer && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full border border-acc/40 bg-ink-1/95 py-2 pl-4 pr-2 shadow-[var(--shadow)] backdrop-blur-xl">
            <span className="text-[.82rem] text-dim">You were {secName ? <>at <b className="text-text">{secName}</b></> : "part-way through"}.</span>
            <button className="btn btn-key !py-1.5 !text-[.78rem]" onClick={() => { window.scrollTo({ top: offer.y, behavior: "smooth" }); setOffer(null); }}>Pick up there ↓</button>
            <button className="grid h-7 w-7 place-content-center rounded-full text-muted hover:text-text" onClick={() => setOffer(null)} aria-label="Dismiss">✕</button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
