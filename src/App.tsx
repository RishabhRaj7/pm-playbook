import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ACCENTS, STAGES, STATS, TOPICS, stageOf, topicById, topicIndex } from "@/data";
import { scrollToId, useProgress, useRoute, useScrollSpy, useTheme } from "@/lib/hooks";
import { ProgressProvider, useStore } from "@/lib/progress";
import Home from "@/components/Home";
import TopicPage from "@/components/TopicPage";
import Prep from "@/components/Prep";
import Search from "@/components/Search";
import { PathRail } from "@/components/Paths";
import { cn } from "@/utils/cn";

const Mark = () => <span className="grid h-7 w-7 shrink-0 place-content-center rounded-md bg-acc"><span className="block h-4 w-[3px] rounded-full bg-acc-ink" /></span>;

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
  const isPrep = route.topic === "prep";
  const topic = route.topic && !isPrep ? topicById(route.topic) : undefined;
  const progress = useProgress();
  const sectionIds = useMemo(() => topic?.sections.map((s) => s.id) ?? [], [topic]);
  const activeSec = useScrollSpy(sectionIds);
  const idx = topic ? topicIndex(topic.id) : -1;

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA";
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) { e.preventDefault(); setSearchOpen(true); }
      if (e.key === "Escape") { setSearchOpen(false); setNavOpen(false); setPalOpen(false); }
      if (typing) return;
      if (e.key === "[" && idx > 0) go(TOPICS[idx - 1].id);
      if (e.key === "]" && idx >= 0 && idx < TOPICS.length - 1) go(TOPICS[idx + 1].id);
      if (e.key === "]" && idx === -1) go(TOPICS[0].id);
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [idx, go]);
  useEffect(() => { setNavOpen(false); document.title = topic ? `${topic.title} — The PM Playbook` : isPrep ? "Interview prep lab — The PM Playbook" : "The PM Playbook — product management, end to end"; }, [route.topic, isPrep, topic]);

  const nav = (t: string | null, a?: string | null) => { go(t, a); setNavOpen(false); };
  const crumb = topic ? `${topic.n} · ${topic.title}` : isPrep ? "Interview prep lab" : "The loop";

  return (
    <div className="relative min-h-screen">
      <div className="ambient" aria-hidden />
      <div className="fixed left-0 top-0 z-[60] h-[2px] w-full bg-transparent"><div className="h-full bg-acc transition-[width] duration-150" style={{ width: `${progress * 100}%` }} /></div>

      <div className="relative z-10 lg:grid lg:grid-cols-[280px_1fr]">
        {/* ================= RAIL ================= */}
        <AnimatePresence>{navOpen && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setNavOpen(false)} className="fixed inset-0 z-40 bg-ink/70 backdrop-blur-sm lg:hidden" />}</AnimatePresence>
        <aside className={cn("fixed inset-y-0 left-0 z-50 flex w-[290px] flex-col border-r border-line-soft bg-ink-1/95 backdrop-blur-xl transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:w-auto lg:translate-x-0 lg:bg-ink-1/60", navOpen ? "translate-x-0" : "-translate-x-full")} aria-label="Playbook navigation">
          <div className="flex items-center justify-between gap-3 border-b border-line-soft px-4 py-4">
            <button onClick={() => nav(null)} className="flex items-center gap-3 text-left"><Mark /><span className="leading-tight"><b className="block font-display text-[.98rem] font-extrabold tracking-tight">The PM Playbook</b><span className="block font-mono text-[.58rem] uppercase tracking-[.16em] text-muted">twelve topics · one shape</span></span></button>
            <button onClick={() => setNavOpen(false)} className="text-muted hover:text-text lg:hidden" aria-label="Close navigation">✕</button>
          </div>
          <div className="thin flex-1 overflow-y-auto px-3 py-3">
            <button onClick={() => nav(null)} className={cn("flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors", !topic && !isPrep ? "border-line bg-ink-3 text-text" : "border-transparent text-dim hover:bg-ink-2 hover:text-text")}><span className="mono text-[.62rem] text-acc">00</span><span className="text-[.86rem] font-semibold">The loop<em className="block text-[.68rem] font-normal not-italic text-muted">home · all twelve</em></span></button>
            <button onClick={() => nav("prep")} className={cn("mt-1 flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors", isPrep ? "border-line bg-ink-3 text-text" : "border-transparent text-dim hover:bg-ink-2 hover:text-text")}><span className="mono text-[.62rem] text-acc">◎</span><span className="text-[.86rem] font-semibold">Interview prep lab<em className="block text-[.68rem] font-normal not-italic text-muted">drills · mock cards · flashcards</em></span>{store.attempts.length > 0 && <span className="ml-auto font-mono text-[.6rem] text-muted">{store.attempts.length}</span>}</button>
            <button onClick={() => setSearchOpen(true)} className="mt-1 flex w-full items-center gap-3 rounded-lg border border-dashed border-line-soft px-3 py-2 text-left text-[.82rem] text-dim hover:border-line hover:text-text"><span className="text-acc">⌕</span><span className="flex-1">Search the playbook</span><kbd>/</kbd></button>

            <PathRail go={nav} />

            {STAGES.map((st) => {
              const list = TOPICS.filter((t) => t.stage === st.id);
              return (
                <div key={st.id} className="mt-4">
                  <p className="mb-1 flex items-center gap-2 px-2 font-mono text-[.56rem] uppercase tracking-[.2em] text-muted"><i className="h-1.5 w-1.5 rounded-full" style={{ background: `hsl(${st.hue} 80% 62%)` }} />{st.label}<span className="ml-auto normal-case tracking-normal opacity-70">{st.note}</span></p>
                  {list.map((t) => {
                    const on = topic?.id === t.id; const tp = store.topics[t.id];
                    return (
                      <div key={t.id}>
                        <button onClick={() => nav(t.id)} className={cn("group flex w-full items-start gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors", on ? "bg-ink-3 text-text" : "text-dim hover:bg-ink-2 hover:text-text")}>
                          <span className={cn("mono mt-[3px] text-[.6rem]", on ? "text-acc" : "text-muted")}>{t.n}</span>
                          <span className="text-[.84rem] leading-snug">{t.title}</span>
                          {tp?.completed ? <span className="ml-auto mt-[2px] text-[.7rem] text-acc" title="Completed">✓</span> : tp && tp.seen.length > 0 ? <span className="ml-auto mt-[7px] h-1 w-6 shrink-0 overflow-hidden rounded-full bg-line-soft" title={`${tp.seen.length}/${t.sections.length} sections`}><span className="block h-full bg-acc" style={{ width: `${(tp.seen.length / t.sections.length) * 100}%` }} /></span> : null}
                        </button>
                        <AnimatePresence initial={false}>
                          {on && (
                            <motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="m-0 ml-[19px] list-none overflow-hidden border-l border-line-soft p-0">
                              {t.sections.map((s) => (
                                <li key={s.id}><button onClick={() => { scrollToId(s.id); setNavOpen(false); history.replaceState(null, "", `#/${t.id}/${s.id}`); }} className={cn("relative -ml-px flex w-full items-center gap-2 border-l py-1 pl-3 text-left text-[.78rem] transition-colors", activeSec === s.id ? "border-acc text-text" : "border-transparent text-muted hover:text-text")}>{s.nav}{tp?.seen.includes(s.id) && activeSec !== s.id && <span className="ml-auto text-[.6rem] text-muted">·</span>}</button></li>
                              ))}
                            </motion.ul>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
          <div className="border-t border-line-soft p-3">
            <button onClick={toggle} className="flex w-full items-center justify-between rounded-lg border border-line-soft px-3 py-2 text-[.8rem] text-dim hover:border-line hover:text-text" aria-pressed={theme === "day"}><span>{theme === "night" ? "Night lab" : "Day desk"}</span><span className="text-acc">{theme === "night" ? "◐" : "◑"}</span></button>
          </div>
        </aside>

        {/* ================= MAIN ================= */}
        <main id="content" className="min-w-0">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line-soft bg-ink/80 px-4 backdrop-blur-xl sm:px-6">
            <button onClick={() => setNavOpen(true)} className="flex flex-col gap-[5px] p-1 lg:hidden" aria-label="Open navigation"><i className="block h-[2px] w-5 bg-text" /><i className="block h-[2px] w-5 bg-text" /><i className="block h-[2px] w-3 bg-text" /></button>
            <nav className="flex min-w-0 items-center gap-2 font-mono text-[.7rem] text-muted" aria-label="Breadcrumb">
              <button onClick={() => nav(null)} className="hover:text-text">Playbook</button><span>/</span>
              <span className="hidden sm:inline">{topic ? stageOf(topic.stage).label : isPrep ? "Prep" : "Home"}</span><span className="hidden sm:inline">/</span>
              <b className="truncate text-text">{crumb}</b>
              {topic && activeSec && <span className="hidden truncate text-dim md:inline">/ {topic.sections.find((s) => s.id === activeSec)?.nav}</span>}
            </nav>
            <div className="ml-auto flex items-center gap-1">
              {store.pathDef && store.path && <button onClick={() => nav(store.pathNext ?? store.pathDef!.ids[store.path!.current], "~resume")} className="mr-1 hidden items-center gap-2 rounded-full border border-line-soft px-2.5 py-1 font-mono text-[.6rem] uppercase tracking-[.12em] text-dim hover:border-acc hover:text-text md:inline-flex" title="Continue your path"><i className="h-1.5 w-1.5 rounded-full" style={{ background: `hsl(${store.pathDef.hue} 80% 62%)` }} />{store.pathDef.k} · {store.pathDone}/{store.pathDef.ids.length}</button>}
              <span className="mr-2 hidden font-mono text-[.66rem] text-muted sm:inline">{topic ? topic.n : "00"}<span className="opacity-50"> / 12</span></span>
              <button className="grid h-8 w-8 place-content-center rounded-lg border border-line-soft text-dim hover:border-line hover:text-text disabled:opacity-30" disabled={idx <= 0} onClick={() => go(TOPICS[idx - 1].id)} title="Previous topic  [">‹</button>
              <button className="grid h-8 w-8 place-content-center rounded-lg border border-line-soft text-dim hover:border-line hover:text-text disabled:opacity-30" disabled={idx >= TOPICS.length - 1} onClick={() => go(TOPICS[idx + 1].id)} title="Next topic  ]">›</button>
              <button className="grid h-8 w-8 place-content-center rounded-lg border border-line-soft text-acc hover:border-line" onClick={() => setSearchOpen(true)} title="Search  /">⌕</button>
              <div className="relative">
                <button className="grid h-8 w-8 place-content-center rounded-lg border border-line-soft hover:border-line" onClick={() => setPalOpen((p) => !p)} title="Accent colour" aria-expanded={palOpen}><i className="block h-3.5 w-3.5 rounded-full bg-acc shadow-[0_0_10px_-2px_var(--acc)]" /></button>
                <AnimatePresence>{palOpen && (
                  <motion.div initial={{ opacity: 0, y: -6, scale: .96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: .96 }} className="absolute right-0 top-10 z-50 w-48 rounded-xl border border-line bg-ink-1 p-3 shadow-[var(--shadow)]">
                    <span className="flex justify-between font-mono text-[.58rem] uppercase tracking-[.16em] text-muted">Accent<b className="text-text">{ACCENTS.find((a) => a.id === accent)?.name}</b></span>
                    <div className="mt-2 flex gap-2">{ACCENTS.map((a) => <button key={a.id} onClick={() => { setAccent(a.id); setPalOpen(false); }} className={cn("h-6 w-6 rounded-full border-2 transition-transform hover:scale-110", accent === a.id ? "border-text" : "border-transparent")} style={{ background: theme === "day" ? a.d : a.n }} aria-label={a.name} />)}</div>
                    <p className="mb-0 mt-2 text-[.64rem] text-muted">The tab icon follows along.</p>
                  </motion.div>)}</AnimatePresence>
              </div>
              <button className="grid h-8 w-8 place-content-center rounded-lg border border-line-soft text-dim hover:border-line hover:text-text" onClick={toggle} title="Switch theme">{theme === "night" ? "◐" : "◑"}</button>
            </div>
          </header>

          <AnimatePresence mode="wait">
            {topic ? <TopicPage key={topic.id} t={topic} anchor={route.anchor} activeSec={activeSec} go={nav} />
              : isPrep ? <Prep key="prep" go={nav} tab={route.anchor} />
              : <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><Home go={nav} openSearch={() => setSearchOpen(true)} anchor={route.anchor} /></motion.div>}
          </AnimatePresence>

          {/* ================= FOOTER ================= */}
          <footer className="border-t border-line-soft bg-ink-1/40">
            <div className="mx-auto max-w-[1280px] px-5 py-14 sm:px-8">
              <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
                <div>
                  <div className="flex items-center gap-3"><Mark /><b className="font-display text-lg font-extrabold">The PM Playbook</b></div>
                  <p className="mt-4 max-w-md text-[.88rem] text-dim">A self-contained reference for product managers: {STATS.topics} topics, {STATS.terms} terms, {STATS.fw} frameworks, {STATS.viz} diagrams and {STATS.quiz} quiz questions. Every worked example is a composite built so the arithmetic holds together and can be checked.</p>
                  <p className="text-[.78rem] text-muted">Not professional advice. The thresholds are conventions, not laws, and every judgement here should lose to evidence from your own product. Your progress is stored only in this browser.</p>
                </div>
                <div>
                  <h4 className="font-mono text-[.6rem] uppercase tracking-[.2em] text-muted">Browse</h4>
                  <ul className="m-0 mt-3 list-none space-y-1.5 p-0 text-[.86rem]">
                    <li><button onClick={() => nav(null)} className="text-dim hover:text-text">All topics</button></li>
                    <li><button onClick={() => nav("prep")} className="text-dim hover:text-text"><span className="mono mr-2 text-[.66rem] text-acc">◎</span>Interview prep lab</button></li>
                    {["ab-testing", "metrics", "fw-diagnosis", "fw-decide", "fw-deliver"].map((id) => { const t = topicById(id)!; return <li key={id}><button onClick={() => nav(id)} className="text-dim hover:text-text"><span className="mono mr-2 text-[.66rem] text-acc">{t.n}</span>{t.title}</button></li>; })}
                  </ul>
                </div>
                <div>
                  <h4 className="font-mono text-[.6rem] uppercase tracking-[.2em] text-muted">Keyboard</h4>
                  <ul className="m-0 mt-3 list-none space-y-2 p-0 text-[.82rem] text-dim">
                    <li className="flex gap-3"><span className="flex gap-1"><kbd>/</kbd><kbd>⌘K</kbd></span>Search everything</li>
                    <li className="flex gap-3"><span className="flex gap-1"><kbd>[</kbd><kbd>]</kbd></span>Previous / next topic</li>
                    <li className="flex gap-3"><kbd>esc</kbd>Close anything</li>
                  </ul>
                  <h4 className="mt-6 font-mono text-[.6rem] uppercase tracking-[.2em] text-muted">Credits</h4>
                  <p className="mt-2 text-[.76rem] text-muted">Frameworks belong to the people who created them: Rumelt, Martin &amp; Lafley, Fitzpatrick, Torres, Christensen, Kano, Porter, McClure, Rodden et al., Lin, Kotter, Lewin, Prosci, Bain, Atlassian, Scaled Agile, Intercom, Ishikawa, Amazon. Any errors in the retelling are ours.</p>
                </div>
              </div>
              <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-line-soft pt-6 font-mono text-[.64rem] text-muted">
                <span>© 2026 · The PM Playbook</span><span>Version 5.0 · React build</span>
                <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="hover:text-text">Back to top ↑</button>
              </div>
            </div>
          </footer>
        </main>
      </div>

      <Search open={searchOpen} onClose={() => setSearchOpen(false)} go={nav} />
    </div>
  );
}
