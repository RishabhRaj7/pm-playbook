import { useCallback, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { stripTags, type Topic } from "@/data";
import { useStore } from "@/lib/progress";
import { cn } from "@/utils/cn";

/* ============================================================
   NAME THAT TERM — retrieval practice, generated from the topic's
   own vocabulary. A definition appears with the term blanked out;
   pick the term. Infinite, never the same order twice, and the
   best streak is kept with your progress.
   ============================================================ */

interface Card { name: string; clue: string }

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** Blank out the answer (and its alias) wherever the definition gives it away. */
function blank(text: string, words: string[]) {
  let out = text;
  for (const w of words.filter((x) => x && x.length > 2)) out = out.replace(new RegExp(esc(w), "ig"), "▢▢▢");
  return out;
}
const pickN = <T,>(xs: T[], n: number) => [...xs].sort(() => Math.random() - 0.5).slice(0, n);

export function NameThatTerm({ t }: { t: Topic }) {
  const s = useStore();
  const deck = useMemo<Card[]>(() => {
    const terms = (t.terms ?? []).map((x) => ({ name: x.t, clue: blank(stripTags(x.d), [x.t, ...(x.a ?? "").split(/[,/]/).map((a) => a.trim())]) }));
    const fws = (t.frameworks ?? []).map((f) => ({ name: f.name, clue: blank(stripTags(f.one), [f.name, ...(f.alias ?? "").split(/[,/]/).map((a) => a.trim())]) }));
    return [...terms, ...fws].filter((c) => c.clue.length > 30);
  }, [t]);
  const kind = t.terms?.length ? "term" : "framework";

  const deal = useCallback(() => {
    const answer = deck[Math.floor(Math.random() * deck.length)];
    const options = pickN([answer, ...pickN(deck.filter((c) => c.name !== answer.name), 3)], 4);
    return { answer, options };
  }, [deck]);
  const [round, setRound] = useState(deal);
  const [pick, setPick] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const [played, setPlayed] = useState(0);
  const best = s.topics[t.id]?.gameBest ?? 0;
  if (deck.length < 4) return null;

  const choose = (name: string) => {
    if (pick) return;
    setPick(name); setPlayed((p) => p + 1);
    if (name === round.answer.name) { const n = streak + 1; setStreak(n); s.recordGame(t.id, n); } else setStreak(0);
  };
  const next = () => { setRound(deal()); setPick(null); };
  const right = pick === round.answer.name;

  return (
    <div className="rv mt-10 border-t-[3px] border-double border-rule pt-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="kicker"><span className="mr-2 inline-block h-1.5 w-1.5 translate-y-[-1px] bg-acc blip" />Drill · name that {kind}</p>
          <h3 className="mt-2 text-[clamp(1.4rem,2.4vw,1.9rem)]">Read the clue. Name the {kind}.</h3>
        </div>
        <div className="flex gap-6 font-mono text-[.62rem] uppercase tracking-[.1em] text-muted">
          <span>Streak <motion.b key={streak} initial={{ scale: 1.6, color: "var(--acc)" }} animate={{ scale: 1, color: "var(--text)" }} className="serif ml-1 inline-block text-[1.5rem] font-semibold normal-case tracking-normal">{streak}</motion.b></span>
          <span>Best <b className="serif ml-1 text-[1.5rem] font-semibold normal-case tracking-normal text-text">{best}</b></span>
          <span>Played <b className="serif ml-1 text-[1.5rem] font-semibold normal-case tracking-normal text-text">{played}</b></span>
        </div>
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={round.answer.name + played} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: .22 }} className="mt-4 grid gap-5 lg:grid-cols-[1.2fr_1fr]">
          <blockquote className="serif m-0 bg-ink-1 p-5 text-[1.15rem] leading-snug text-text">“{round.answer.clue}”</blockquote>
          <div className="grid content-start gap-1.5" role="group" aria-label="Choose the answer">
            {round.options.map((o) => {
              const st = !pick ? "" : o.name === round.answer.name ? "right" : o.name === pick ? "wrong" : "dim";
              return (
                <motion.button key={o.name} onClick={() => choose(o.name)} disabled={!!pick} animate={st === "wrong" ? { x: [0, -6, 6, -4, 4, 0] } : {}} transition={{ duration: .35 }}
                  className={cn("border px-4 py-2.5 text-left text-[.95rem] transition-colors", st === "" && "border-line-soft bg-ink hover:border-rule", st === "right" && "border-a bg-[color-mix(in_srgb,var(--a)_10%,transparent)] text-text", st === "wrong" && "border-bad text-bad", st === "dim" && "border-line-soft opacity-40")}>
                  <span className="serif font-semibold">{o.name}</span>{st === "right" && <span className="float-right font-mono text-a">✓</span>}{st === "wrong" && <span className="float-right font-mono">✗</span>}
                </motion.button>
              );
            })}
            {pick && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-1 flex items-center justify-between gap-3" role="status">
                <span className={cn("text-[.86rem]", right ? "text-a" : "text-bad")}>{right ? (streak >= 5 ? `${streak} in a row. It's sticking.` : "Right.") : `It was ${round.answer.name}. Streak reset.`}</span>
                <button className="btn btn-key !py-2" onClick={next} autoFocus>Next clue →</button>
              </motion.div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
