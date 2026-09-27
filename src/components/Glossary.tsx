import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { GLOSSARY, STATS, stripTags, topicById, type Entry } from "@/data";
import { scrollToId } from "@/lib/hooks";
import { Html } from "./Sections";
import { cn } from "@/utils/cn";

type Go = (t: string | null, a?: string | null) => void;
type Kind = "all" | "Term" | "Framework";
const LETTERS = ["#", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];

/* ============================================================
   THE INDEX — every term and framework in the playbook, A to Z.
   A headword used by more than one topic is one entry with
   numbered senses, the way a dictionary does it.
   ============================================================ */
export default function Glossary({ go, anchor }: { go: Go; anchor?: string | null }) {
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<Kind>("all");
  const needle = q.trim().toLowerCase();
  const list = useMemo(() => GLOSSARY.map((e) => ({ ...e, senses: e.senses.filter((s) => kind === "all" || s.kind === kind) }))
    .filter((e) => e.senses.length && (!needle || e.head.toLowerCase().includes(needle) || e.senses.some((s) => (s.alias ?? "").toLowerCase().includes(needle) || stripTags(s.d).toLowerCase().includes(needle)))), [needle, kind]);
  const byLetter = useMemo(() => {
    const m = new Map<string, Entry[]>();
    for (const e of list) m.set(e.letter, [...(m.get(e.letter) ?? []), e]);
    return m;
  }, [list]);
  const counts = useMemo(() => ({ Term: GLOSSARY.filter((e) => e.senses.some((s) => s.kind === "Term")).length, Framework: GLOSSARY.filter((e) => e.senses.some((s) => s.kind === "Framework")).length }), []);

  useEffect(() => {
    if (anchor) { const id = requestAnimationFrame(() => setTimeout(() => { scrollToId("g-" + anchor, 120); document.getElementById("g-" + anchor)?.setAttribute("data-hit", ""); }, 80)); return () => cancelAnimationFrame(id); }
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [anchor]);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .4, ease: [.16, 1, .3, 1] }} className="mx-auto w-full max-w-[1320px] px-5 pb-10 sm:px-8">
      <header className="grid gap-8 pt-10 pb-8 lg:grid-cols-[1.3fr_1fr] lg:items-end">
        <div>
          <p className="kicker">The index · {GLOSSARY.length} entries</p>
          <h1 className="mt-3 text-[clamp(2.4rem,6vw,5rem)]">Every term, <span className="sw">A to Z</span>.</h1>
          <p className="lede mt-5">The whole vocabulary of the playbook in one place — {STATS.terms} terms and {STATS.fw} frameworks. Each definition links back to the topic that explains it properly, with the analogy, the worked example and the traps.</p>
        </div>
        <div>
          <label className="kicker" htmlFor="gq">Look something up</label>
          <input id="gq" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. cohort, guardrail, DACI…" className="field serif mt-1 text-[1.4rem]" autoComplete="off" />
          <div className="mt-3 flex flex-wrap gap-1" role="group" aria-label="Filter entries">
            <button className="pill" aria-pressed={kind === "all"} onClick={() => setKind("all")}>Everything · {GLOSSARY.length}</button>
            <button className="pill" aria-pressed={kind === "Term"} onClick={() => setKind("Term")}>Terms · {counts.Term}</button>
            <button className="pill" aria-pressed={kind === "Framework"} onClick={() => setKind("Framework")}>Frameworks · {counts.Framework}</button>
          </div>
        </div>
      </header>

      <nav className="no-scrollbar sticky top-[52px] z-20 -mx-5 flex overflow-x-auto border-y border-rule bg-ink px-5 sm:-mx-8 sm:px-8" aria-label="Letters">
        {LETTERS.map((L) => {
          const has = byLetter.has(L);
          return <button key={L} disabled={!has} onClick={() => scrollToId("L-" + (L === "#" ? "num" : L), 110)} className={cn("serif min-w-[2.1rem] flex-1 py-2 text-center text-[1.05rem]", has ? "text-text hover:bg-text hover:text-ink" : "text-line-soft")}>{L}</button>;
        })}
      </nav>

      {list.length === 0 && <p className="py-16 text-center font-mono text-[.8rem] text-muted">Nothing in the index matches “{q}”. Try <button className="link" onClick={() => setQ("")}>clearing the search</button>.</p>}

      {[...byLetter.entries()].map(([L, entries]) => (
        <section key={L} id={"L-" + (L === "#" ? "num" : L)} className="grid gap-6 border-b border-line-soft py-8 md:grid-cols-[6rem_1fr]">
          <h2 className="serif text-[4.5rem] font-light italic leading-[.8] text-acc md:sticky md:top-32 md:self-start">{L}</h2>
          <dl className="m-0 gap-10 md:columns-2 xl:columns-3">
            {entries.map((e) => (
              <div key={e.key} id={"g-" + e.key} className="mb-6 break-inside-avoid scroll-mt-32 data-[hit]:bg-[color-mix(in_srgb,var(--acc)_10%,transparent)] data-[hit]:outline data-[hit]:outline-1 data-[hit]:outline-offset-4 data-[hit]:outline-acc">
                <dt className="flex flex-wrap items-baseline gap-x-2">
                  <b className="serif text-[1.18rem] font-semibold">{e.head}</b>
                  {e.senses.some((s) => s.kind === "Framework") && <span className="font-mono text-[.56rem] uppercase tracking-[.1em] text-acc">framework</span>}
                </dt>
                {e.senses.map((s, i) => {
                  const t = topicById(s.topic);
                  return (
                    <dd key={i} className="m-0 mt-1.5 text-[.9rem] leading-snug text-dim">
                      {e.senses.length > 1 && <b className="mr-1 font-mono text-[.66rem] text-text">{i + 1}.</b>}
                      {s.alias && <i className="serif mr-1 text-muted">({s.alias})</i>}
                      <Html html={s.d} className="prose" />{" "}
                      {t && <button onClick={() => go(t.id, s.anchor)} className="whitespace-nowrap font-mono text-[.62rem] uppercase tracking-[.06em] text-muted hover:text-acc">→ {t.n} {t.title.split(/[ ,&—]/)[0]}</button>}
                    </dd>
                  );
                })}
              </div>
            ))}
          </dl>
        </section>
      ))}
    </motion.div>
  );
}
