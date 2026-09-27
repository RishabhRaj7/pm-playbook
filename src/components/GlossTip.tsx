import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { topicById } from "@/data";
import { GLOSS_BY_KEY } from "@/lib/gloss";
import { Html } from "./Sections";

type Go = (t: string | null, a?: string | null) => void;

/** One floating definition card for every `.gl` term on the page (hover, focus or tap). */
export default function GlossTip({ go }: { go: Go }) {
  const [tip, setTip] = useState<{ key: string; x: number; y: number; below: boolean } | null>(null);
  const hideT = useRef(0);
  const card = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const show = (el: HTMLElement) => {
      window.clearTimeout(hideT.current);
      const r = el.getBoundingClientRect();
      const below = r.top < 220;
      // keep the whole card on screen: its centre can come no closer to an edge than half its width
      const half = Math.min(320, window.innerWidth - 32) / 2 + 16;
      setTip({ key: el.dataset.gl!, x: Math.min(Math.max(half, r.left + r.width / 2), window.innerWidth - half), y: below ? r.bottom + 8 : r.top - 8, below });
    };
    const hide = () => { window.clearTimeout(hideT.current); hideT.current = window.setTimeout(() => setTip(null), 180); };
    const over = (e: Event) => { const el = (e.target as HTMLElement).closest?.<HTMLElement>(".gl"); if (el) show(el); else if (card.current?.contains(e.target as Node)) window.clearTimeout(hideT.current); };
    const out = (e: Event) => { if ((e.target as HTMLElement).closest?.(".gl")) hide(); };
    const click = (e: MouseEvent) => {
      const el = (e.target as HTMLElement).closest?.<HTMLElement>(".gl");
      if (el) { e.preventDefault(); e.stopPropagation(); show(el); return; }
      if (!card.current?.contains(e.target as Node)) setTip(null);
    };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setTip(null); };
    const scroll = () => setTip(null);
    document.addEventListener("pointerover", over);
    document.addEventListener("pointerout", out);
    document.addEventListener("focusin", over);
    document.addEventListener("focusout", out);
    document.addEventListener("click", click, true);
    document.addEventListener("keydown", key);
    window.addEventListener("scroll", scroll, { passive: true });
    return () => {
      document.removeEventListener("pointerover", over); document.removeEventListener("pointerout", out);
      document.removeEventListener("focusin", over); document.removeEventListener("focusout", out);
      document.removeEventListener("click", click, true); document.removeEventListener("keydown", key); window.removeEventListener("scroll", scroll);
    };
  }, []);

  const e = tip ? GLOSS_BY_KEY.get(tip.key) : undefined;
  const sense = e?.senses[0];
  const t = sense ? topicById(sense.topic) : undefined;
  return (
    <AnimatePresence>
      {tip && e && sense && (
        <motion.div ref={card} key={tip.key} role="tooltip" initial={{ opacity: 0, y: tip.below ? -4 : 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: .14 }}
          onPointerEnter={() => window.clearTimeout(hideT.current)} onPointerLeave={() => setTip(null)}
          className="fixed z-[90] w-[min(20rem,calc(100vw-2rem))] border border-rule bg-ink p-4 shadow-[var(--shadow)]"
          style={{ left: tip.x, top: tip.y, transform: `translate(-50%, ${tip.below ? "0" : "-100%"})` }}>
          <span className="kicker">{sense.kind === "Framework" ? "Framework" : "From the index"}</span>
          <b className="serif mt-1 block text-[1.2rem] font-semibold leading-tight">{e.head}</b>
          <Html as="p" className="prose mb-0 mt-1.5 text-[.88rem] leading-snug text-dim" html={sense.d} />
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[.6rem] uppercase tracking-[.08em]">
            {t && <button className="text-dim hover:text-acc" onClick={() => { setTip(null); go(t.id, sense.anchor); }}>{t.n} · {t.title.split(/[ ,&—]/)[0]} →</button>}
            <button className="text-muted hover:text-acc" onClick={() => { setTip(null); go("glossary", e.key); }}>In the index →</button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
