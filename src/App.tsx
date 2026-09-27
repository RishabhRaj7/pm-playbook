import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ACCENTS, CORE, LIBRARY, STAGES, STATS, TOPICS, GLOSSARY, stageOf, topicById, topicIndex, type Topic } from "@/data";
import { scrollToId, useProgress, useRoute, useScrollSpy, useTheme } from "@/lib/hooks";
import { ProgressProvider, useStore } from "@/lib/progress";
import Home from "@/components/Home";
import TopicPage from "@/components/TopicPage";
import Prep from "@/components/Prep";
import Glossary from "@/components/Glossary";
import Search from "@/components/Search";
import GlossTip from "@/components/GlossTip";
import { PathRail } from "@/components/Paths";
import { SearchGlyph } from "@/components/Glyphs";
import { cn } from "@/utils/cn";

type Go = (t: string | null, a?: string | null) => void;
const PAGES = { prep: "Interview prep lab", glossary: "The index" } as const;
type Page = keyof typeof PAGES;
const isPage = (x: string | null): x is Page => !!x && x in PAGES;

export default function App() {
  return <ProgressProvider><Shell /></ProgressProvider>;
}

function Shell() {
  const { route, go } = useRoute();
  const { theme, toggle, accent, setAccent } = useTheme();
  const store = useStore();
  const [searchOpen, setSearchOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [palOpen, setPalOpen] = useState(false);
  const page = isPage(route.topic) ? route.topic : null;
  const topic = route.topic && !page ? topicById(route.topic) : undefined;
  const progress = useProgress();
  const sectionIds = useMemo(() => topic?.sections.map((s) => s.id) ?? [], [topic]);
  const activeSec = useScrollSpy(sectionIds);
  const idx = topic ? topicIndex(topic.id) : -1;

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing = el?.tagName === "INPUT" || el?.tagName === "TEXTAREA" || el?.tagName === "SELECT" || !!el?.isContentEditable;
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) { e.preventDefault(); setSearchOpen(true); return; }
      if (e.key === "Escape") { setSearchOpen(false); setNavOpen(false); setPalOpen(false); return; }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "[" && idx > 0) go(TOPICS[idx - 1].id);
      if (e.key === "]" && idx < TOPICS.length - 1) go(TOPICS[idx + 1].id);
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [idx, go]);
  useEffect(() => {
    setNavOpen(false);
    document.title = topic ? `${topic.n} ${topic.title} — The PM Playbook` : page ? `${PAGES[page]} — The PM Playbook` : "The PM Playbook — product management, end to end";
  }, [route.topic, page, topic]);

  const nav: Go = (t, a) => { go(t, a); setNavOpen(false); };
  const skip = () => { const m = document.getElementById("content"); m?.focus(); m?.scrollIntoView(); };

  return (
    <div className="relative min-h-screen">
      <button onClick={skip} className="skip">Skip to content</button>
      <div className="fixed left-0 top-0 z-[60] h-[2px] w-full" aria-hidden><div className="h-full bg-acc" style={{ width: `${progress * 100}%` }} /></div>

      {/* ================= MASTHEAD BAR ================= */}
      <header className="sticky top-0 z-40 border-b border-line-soft bg-ink no-print">
        <div className="mx-auto flex h-[52px] max-w-[1320px] items-center gap-3 px-4 sm:px-6">
          <button onClick={() => setNavOpen(true)} className="group flex items-center gap-2.5 pr-1 font-mono text-[.66rem] uppercase tracking-[.12em] text-dim hover:text-text" aria-label="Open contents" aria-expanded={navOpen}>
            <span className="flex w-[18px] flex-col gap-[4px]" aria-hidden><i className="block h-px w-full bg-current" /><i className="block h-px w-full bg-current" /><i className="block h-px w-2/3 bg-current transition-all group-hover:w-full" /></span>
            <span className="hidden sm:inline">Contents</span>
          </button>
          <span className="h-5 w-px bg-line-soft" aria-hidden />
          <button onClick={() => nav(null)} className="serif shrink-0 text-[1.05rem] font-semibold tracking-[-.02em]">The PM Playbook</button>
          <nav className="hidden min-w-0 items-center gap-2 font-mono text-[.64rem] uppercase tracking-[.1em] text-muted md:flex" aria-label="Breadcrumb">
            {(topic || page) && <span aria-hidden>/</span>}
            {topic && <span className="shrink-0">{stageOf(topic.stage).roman} · {stageOf(topic.stage).label}</span>}
            {topic && <><span aria-hidden>/</span><b className="truncate font-medium text-text">{topic.n} {topic.title}</b></>}
            {page && <b className="truncate font-medium text-text">{PAGES[page]}</b>}
          </nav>
          <div className="ml-auto flex items-center gap-1">
            {store.pathDef && store.path && <button onClick={() => nav(store.pathNext ?? store.pathDef!.ids[store.path!.current], "~resume")} className="mr-2 hidden items-center gap-2 border border-line-soft px-2.5 py-1 font-mono text-[.6rem] uppercase tracking-[.1em] text-dim hover:border-rule hover:text-text lg:inline-flex" title="Continue your path"><i className="h-1.5 w-1.5 bg-acc" />{store.pathDef.k} · {store.pathDone}/{store.pathDef.ids.length}</button>}
            {topic && <span className="hidden items-center sm:flex">
              <IconBtn disabled={idx <= 0} onClick={() => go(TOPICS[idx - 1].id)} title="Previous topic  [" aria-label="Previous topic">‹</IconBtn>
              <span className="px-1 font-mono text-[.64rem] text-muted">{topic.n}<span className="opacity-60">/{TOPICS.length}</span></span>
              <IconBtn disabled={idx >= TOPICS.length - 1} onClick={() => go(TOPICS[idx + 1].id)} title="Next topic  ]" aria-label="Next topic">›</IconBtn>
              <span className="mx-1 h-5 w-px bg-line-soft" aria-hidden />
            </span>}
            <button className="flex h-8 items-center gap-2 px-2 font-mono text-[.64rem] uppercase tracking-[.1em] text-dim hover:text-text" onClick={() => setSearchOpen(true)} title="Search  /  or  ⌘K"><SearchGlyph /><span className="hidden sm:inline">Search</span><kbd className="hidden sm:inline">/</kbd></button>
            <div className="relative">
              <button className="grid h-8 w-8 place-content-center hover:bg-ink-2" onClick={() => setPalOpen((p) => !p)} title="Spot colour" aria-label="Choose spot colour" aria-expanded={palOpen}><i className="block h-3 w-3 bg-acc" /></button>
              <AnimatePresence>{palOpen && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: .15 }} className="absolute right-0 top-10 z-50 w-52 border border-rule bg-ink-1 p-3 shadow-[var(--shadow)]">
                  <span className="kicker flex justify-between">Spot colour<b className="font-medium text-text">{ACCENTS.find((a) => a.id === accent)?.name}</b></span>
                  <div className="mt-3 flex gap-2">{ACCENTS.map((a) => <button key={a.id} onClick={() => { setAccent(a.id); setPalOpen(false); }} className={cn("h-7 w-7 border transition-transform hover:scale-110", accent === a.id ? "border-text outline outline-1 outline-offset-2 outline-text" : "border-line-soft")} style={{ background: theme === "night" ? a.n : a.d }} aria-label={a.name} aria-pressed={accent === a.id} />)}</div>
                  <p className="mb-0 mt-3 text-[.7rem] leading-snug text-muted">One ink besides black. The tab icon follows along.</p>
                </motion.div>)}</AnimatePresence>
            </div>
            <button className="h-8 px-2 font-mono text-[.64rem] uppercase tracking-[.1em] text-dim hover:text-text" onClick={toggle} title="Switch edition" aria-label={`Switch to ${theme === "night" ? "day" : "night"} edition`}>{theme === "night" ? "Night" : "Day"}<span className="ml-1.5 inline-block h-2.5 w-2.5 translate-y-[1px] rounded-full border border-current" style={{ background: theme === "night" ? "currentColor" : "transparent" }} /></button>
          </div>
        </div>
      </header>

      <Contents open={navOpen} onClose={() => setNavOpen(false)} go={nav} topic={topic} page={page} activeSec={activeSec} openSearch={() => { setNavOpen(false); setSearchOpen(true); }} theme={theme} toggle={toggle} />

      {/* ================= PAGE ================= */}
      <main id="content" tabIndex={-1} className="relative z-10 min-w-0 outline-none">
        <AnimatePresence mode="wait">
          {topic ? <TopicPage key={topic.id} t={topic} anchor={route.anchor} activeSec={activeSec} go={nav} />
            : page === "prep" ? <Prep key="prep" go={nav} tab={route.anchor} />
            : page === "glossary" ? <Glossary key="glossary" go={nav} anchor={route.anchor} />
            : <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><Home go={nav} openSearch={() => setSearchOpen(true)} anchor={route.anchor} /></motion.div>}
        </AnimatePresence>
      </main>

      <Colophon go={nav} />
      <Search open={searchOpen} onClose={() => setSearchOpen(false)} go={nav} />
      <GlossTip go={nav} />
    </div>
  );
}

const IconBtn = ({ children, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button {...p} className="grid h-8 w-7 place-content-center text-[1.1rem] leading-none text-dim hover:text-text disabled:pointer-events-none disabled:opacity-25">{children}</button>
);

/* ============================================================
   CONTENTS — the index page of the paper, as a drawer
   ============================================================ */
function Contents({ open, onClose, go, topic, page, activeSec, openSearch, theme, toggle }: { open: boolean; onClose: () => void; go: Go; topic?: Topic; page: Page | null; activeSec: string | null; openSearch: () => void; theme: string; toggle: () => void }) {
  const store = useStore();
  const panel = useRef<HTMLDivElement>(null);
  const opener = useRef<Element | null>(null);
  useEffect(() => {
    if (open) { opener.current = document.activeElement; requestAnimationFrame(() => panel.current?.querySelector<HTMLElement>("button")?.focus()); document.body.style.overflow = "hidden"; }
    else { document.body.style.overflow = ""; (opener.current as HTMLElement | null)?.focus?.(); }
    return () => { document.body.style.overflow = ""; };
  }, [open]);
  const Row = ({ t }: { t: Topic }) => {
    const on = topic?.id === t.id; const tp = store.topics[t.id];
    const read = tp ? Math.min(1, tp.seen.length / t.sections.length) : 0;
    return (
      <li>
        <button onClick={() => go(t.id)} className={cn("group grid w-full grid-cols-[2rem_1fr_auto] items-baseline gap-2 py-1.5 text-left", on ? "text-text" : "text-dim hover:text-text")} aria-current={on ? "page" : undefined}>
          <span className={cn("mono text-[.68rem]", on ? "text-acc" : "text-muted")}>{t.n}</span>
          <span className={cn("serif text-[1.02rem] leading-snug", on && "italic")}>{t.title}</span>
          <span className="font-mono text-[.6rem] text-muted">{tp?.completed ? "read ✓" : read > 0 ? `${Math.round(read * 100)}%` : ""}</span>
        </button>
        {on && (
          <ul className="m-0 mb-2 ml-8 list-none border-l border-line-soft p-0">
            {t.sections.map((s, i) => (
              <li key={s.id}><button onClick={() => { onClose(); scrollToId(s.id); history.replaceState(null, "", `#/${t.id}/${s.id}`); }} className={cn("-ml-px flex w-full gap-2 border-l py-0.5 pl-3 text-left text-[.8rem]", activeSec === s.id ? "border-acc text-text" : "border-transparent text-muted hover:text-text")}><span className="mono w-4 text-[.6rem] opacity-70">{i + 1}</span>{s.nav}</button></li>
            ))}
          </ul>
        )}
      </li>
    );
  };
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div key="scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-[70] bg-[color-mix(in_srgb,var(--rule)_28%,transparent)]" />
          <motion.aside key="drawer" ref={panel} initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ duration: .32, ease: [.16, 1, .3, 1] }} className="thin fixed inset-y-0 left-0 z-[80] flex w-[min(460px,100vw)] flex-col overflow-y-auto border-r border-rule bg-ink" role="dialog" aria-modal="true" aria-label="Contents">
            <div className="flex items-center justify-between border-b border-rule px-6 py-4">
              <span className="kicker">Contents · this edition</span>
              <button onClick={onClose} className="font-mono text-[.64rem] uppercase tracking-[.12em] text-muted hover:text-text" aria-label="Close contents">Close ✕</button>
            </div>
            <div className="px-6 pb-8">
              <div className="cols mt-5 grid-cols-3 !border-0 text-center">
                {([["Front page", () => go(null), !topic && !page], ["Prep lab", () => go("prep"), page === "prep"], ["The index", () => go("glossary"), page === "glossary"]] as const).map(([l, fn, on]) => (
                  <button key={l} onClick={fn} className={cn("px-2 py-3 font-mono text-[.64rem] uppercase tracking-[.1em]", on ? "!bg-text text-ink" : "text-dim hover:text-text")}>{l}</button>
                ))}
              </div>
              <button onClick={openSearch} className="mt-3 flex w-full items-center gap-3 border-b border-line py-2.5 text-left text-[.9rem] text-muted hover:text-text"><SearchGlyph /><span className="flex-1">Search {STATS.terms + STATS.fw}+ terms, steps and cases</span><kbd>/</kbd></button>

              <PathRail go={go} />

              {STAGES.map((st) => {
                const list = CORE.filter((t) => t.stage === st.id);
                if (!list.length) return null;
                return (
                  <section key={st.id} className="mt-6">
                    <h3 className="flex items-baseline gap-3 border-b border-rule pb-1.5"><span className="serif text-[1.3rem] italic text-acc">{st.roman}</span><span className="font-mono text-[.66rem] font-medium uppercase tracking-[.14em]">{st.label}</span><span className="ml-auto font-mono text-[.6rem] font-normal normal-case tracking-normal text-muted">{st.note}</span></h3>
                    <ul className="m-0 mt-1 list-none p-0">{list.map((t) => <Row key={t.id} t={t} />)}</ul>
                  </section>
                );
              })}
              <section className="mt-8">
                <h3 className="flex items-baseline gap-3 border-b border-rule pb-1.5"><span className="serif text-[1.3rem] italic text-acc">¶</span><span className="font-mono text-[.66rem] font-medium uppercase tracking-[.14em]">The reference shelf</span><span className="ml-auto font-mono text-[.6rem] font-normal normal-case tracking-normal text-muted">{STATS.fw} frameworks</span></h3>
                <ul className="m-0 mt-1 list-none p-0">{LIBRARY.map((t) => <Row key={t.id} t={t} />)}</ul>
              </section>
              <button onClick={toggle} className="mt-8 flex w-full items-center justify-between border border-line-soft px-3 py-2.5 font-mono text-[.64rem] uppercase tracking-[.1em] text-dim hover:border-rule hover:text-text">Switch to the {theme === "night" ? "day" : "night"} edition<span aria-hidden>→</span></button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

/* ============================================================
   COLOPHON
   ============================================================ */
function Colophon({ go }: { go: Go }) {
  return (
    <footer className="relative z-10 mt-8 no-print">
      <div className="mx-auto max-w-[1320px] px-5 sm:px-8">
        <div className="rule-2 grid gap-10 pt-10 pb-12 md:grid-cols-[1.5fr_1fr_1fr_1.2fr]">
          <div>
            <b className="serif block text-[1.6rem] font-semibold tracking-[-.02em]">The PM Playbook</b>
            <p className="mt-3 max-w-md text-[.86rem] text-dim">A self-contained reference for people learning product management and people doing it: {STATS.topics} topics, {GLOSSARY.length} index entries, {STATS.fw} frameworks, {STATS.viz} diagrams and {STATS.quiz} quiz questions. Every worked example is a composite, built so the arithmetic holds together and can be checked.</p>
            <p className="text-[.78rem] text-muted">Not professional advice. The thresholds are conventions, not laws, and every judgement here should lose to evidence from your own product.</p>
          </div>
          <div>
            <h4 className="kicker">Sections</h4>
            <ul className="m-0 mt-3 list-none space-y-1.5 p-0 text-[.88rem]">
              <li><button onClick={() => go(null)} className="link">Front page</button></li>
              <li><button onClick={() => go(null, "curriculum")} className="link">The curriculum</button></li>
              <li><button onClick={() => go(null, "paths")} className="link">Learning paths</button></li>
              <li><button onClick={() => go("glossary")} className="link">The index, A–Z</button></li>
              <li><button onClick={() => go("prep")} className="link">Interview prep lab</button></li>
            </ul>
          </div>
          <div>
            <h4 className="kicker">Keyboard</h4>
            <ul className="m-0 mt-3 list-none space-y-2 p-0 text-[.82rem] text-dim">
              <li className="flex gap-3"><span className="flex gap-1"><kbd>/</kbd><kbd>⌘K</kbd></span>Search</li>
              <li className="flex gap-3"><span className="flex gap-1"><kbd>[</kbd><kbd>]</kbd></span>Previous / next topic</li>
              <li className="flex gap-3"><kbd>esc</kbd>Close anything</li>
            </ul>
          </div>
          <div>
            <h4 className="kicker">Credits</h4>
            <p className="mt-3 text-[.78rem] text-muted">Frameworks belong to the people who created them: Rumelt, Martin &amp; Lafley, Fitzpatrick, Torres, Christensen, Ulwick, Kano, Porter, McClure, Rodden et al., Lin, Kotter, Lewin, Prosci, Bain, Atlassian, Scaled Agile, Intercom, Ishikawa, Amazon. Any errors in the retelling are ours.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-soft py-5 font-mono text-[.62rem] uppercase tracking-[.08em] text-muted">
          <span>© {new Date().getFullYear()} The PM Playbook · Set in Fraunces, Geist &amp; Geist Mono</span>
          <span>Your progress is kept in this browser only</span>
          <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="hover:text-text">Back to top ↑</button>
        </div>
      </div>
    </footer>
  );
}
