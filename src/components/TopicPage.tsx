import { useEffect } from "react";
import { motion } from "motion/react";
import { TOPICS, stageOf, topicIndex, type Topic } from "@/data";
import { scrollToId, useReveal } from "@/lib/hooks";
import { Analogy, BigIdea, Cases, Cheatsheet, Compare, Frameworks, Hero, QuizSec, Steps, Terms, Tool, Visual } from "./Sections";

export default function TopicPage({ t, anchor, go }: { t: Topic; anchor: string | null; go: (topic: string | null, anchor?: string | null) => void }) {
  useReveal(t.id);
  const idx = topicIndex(t.id);
  const prev = TOPICS[idx - 1], next = TOPICS[idx + 1];
  useEffect(() => {
    if (anchor) { const id = requestAnimationFrame(() => setTimeout(() => scrollToId(anchor), 60)); return () => cancelAnimationFrame(id); }
    window.scrollTo({ top: 0 });
  }, [t.id, anchor]);
  const cheat = t.sections.find((s) => s.type === "cheatsheet");
  return (
    <motion.div key={t.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .45, ease: [.16, 1, .3, 1] }} className="mx-auto w-full max-w-[1180px] px-5 sm:px-8">
      {t.sections.map((s) => {
        switch (s.type) {
          case "hero": return <Hero key={s.id} s={s} t={t} stageLabel={stageOf(t.stage).label} onNext={() => next ? go(next.id) : go(null)} />;
          case "bigidea": return <BigIdea key={s.id} s={s} t={t} />;
          case "analogy": return <Analogy key={s.id} s={s} t={t} />;
          case "terms": return <Terms key={s.id} s={s} t={t} col3={cheat?.col3} />;
          case "steps": return <Steps key={s.id} s={s} t={t} />;
          case "calculator": case "tool": return <Tool key={s.id} s={s} t={t} />;
          case "visual": return <Visual key={s.id} s={s} t={t} />;
          case "compare": return <Compare key={s.id} s={s} t={t} />;
          case "cases": return <Cases key={s.id} s={s} t={t} />;
          case "cheatsheet": return <Cheatsheet key={s.id} s={s} t={t} />;
          case "quiz": return <QuizSec key={s.id} s={s} t={t} />;
          case "frameworks": return <Frameworks key={s.id} s={s} t={t} />;
          default: return null;
        }
      })}
      {/* prev / next */}
      <nav className="grid gap-3 border-t border-line-soft py-12 md:grid-cols-2" aria-label="Topic pagination">
        {prev ? <button onClick={() => go(prev.id)} className="card card-hover p-5 text-left"><span className="font-mono text-[.6rem] uppercase tracking-[.16em] text-muted">← Previous · {prev.n}</span><b className="mt-1 block font-display text-lg">{prev.title}</b></button> : <button onClick={() => go(null)} className="card card-hover p-5 text-left"><span className="font-mono text-[.6rem] uppercase tracking-[.16em] text-muted">← Back to</span><b className="mt-1 block font-display text-lg">The loop</b></button>}
        {next ? <button onClick={() => go(next.id)} className="card card-hover p-5 text-right border-acc/40"><span className="font-mono text-[.6rem] uppercase tracking-[.16em] text-acc">Next · {next.n} →</span><b className="mt-1 block font-display text-lg">{next.title}</b></button> : <button onClick={() => go(null)} className="card card-hover p-5 text-right border-acc/40"><span className="font-mono text-[.6rem] uppercase tracking-[.16em] text-acc">You finished the loop →</span><b className="mt-1 block font-display text-lg">Start another lap</b></button>}
      </nav>
    </motion.div>
  );
}
