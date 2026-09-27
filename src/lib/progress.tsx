import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { db, isSnapshot, type PathState, type QuizAttempt, type Snapshot, type TopicProgress } from "./db";
import { pathById } from "@/data/paths";
import { TOPICS } from "@/data";

/* ============================================================
   Progress store — one context, hydrated from IndexedDB once,
   written back on every mutation. Everything the site remembers
   about you lives here: your path, where you are in it, which
   sections you have read, quiz history, flashcard piles.
   ============================================================ */

export interface FlashState { again: string[]; known: string[] }

interface Store {
  ready: boolean;
  topics: Record<string, TopicProgress>;
  path: PathState | null;
  attempts: QuizAttempt[];
  flash: FlashState;
  notes: Record<string, string>;
  // derived
  pathDef: ReturnType<typeof pathById>;
  pathDone: number;
  pathNext: string | null;      // first incomplete topic in the path
  lastTopic: TopicProgress | null;
  // actions
  visit: (topic: string) => void;
  position: (topic: string, section: string | null, scrollY: number) => void;
  complete: (topic: string, on?: boolean) => void;
  startPath: (id: string) => void;
  quitPath: () => void;
  setPathCurrent: (idx: number) => void;
  recordAttempt: (a: Omit<QuizAttempt, "at" | "id">) => void;
  setFlash: (f: FlashState) => void;
  setNote: (key: string, text: string) => void;
  reset: () => Promise<void>;
  exportData: () => Snapshot;
  importData: (raw: unknown) => Promise<boolean>;
}

const Ctx = createContext<Store | null>(null);

const blank = (id: string): TopicProgress => ({ id, visits: 0, firstSeen: Date.now(), updatedAt: Date.now(), lastSection: null, scrollY: 0, seen: [], completed: false });

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [topics, setTopics] = useState<Record<string, TopicProgress>>({});
  const [path, setPath] = useState<PathState | null>(null);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [flash, setFlashState] = useState<FlashState>({ again: [], known: [] });
  const [notes, setNotes] = useState<Record<string, string>>({});
  const topicsRef = useRef(topics); topicsRef.current = topics;
  const pathRef = useRef(path); pathRef.current = path;
  // mutations issued before hydration finishes are queued, so a page that
  // mounts instantly (e.g. a hard reload on a topic URL) cannot clobber saved state
  const readyRef = useRef(false);
  const pending = useRef<(() => void)[]>([]);
  const run = useCallback((fn: () => void) => { if (readyRef.current) fn(); else pending.current.push(fn); }, []);

  const load = useCallback(async () => {
    const [ts, p, at, fl, no] = await Promise.all([
      db.allTopics(), db.get<PathState>("path"), db.allAttempts(), db.get<FlashState>("flash"), db.get<Record<string, string>>("notes"),
    ]);
    return { ts, p, at, fl, no };
  }, []);
  const apply = useCallback(({ ts, p, at, fl, no }: Awaited<ReturnType<typeof load>>) => {
    topicsRef.current = Object.fromEntries(ts.map((t) => [t.id, t]));
    pathRef.current = p && pathById(p.id) ? p : null;
    setTopics(topicsRef.current);
    setPath(pathRef.current);
    setAttempts(at);
    setFlashState(fl ?? { again: [], known: [] });
    setNotes(no ?? {});
  }, []);

  // hydrate
  useEffect(() => {
    let live = true;
    void load().then((data) => {
      if (!live) return;
      apply(data);
      readyRef.current = true;
      const q = pending.current; pending.current = []; q.forEach((fn) => fn());
      setReady(true);
    });
    return () => { live = false; };
  }, [load, apply]);

  const writeTopic = useCallback((id: string, fn: (t: TopicProgress) => TopicProgress) => run(() => {
    const cur = topicsRef.current[id] ?? blank(id);
    const next = { ...fn(cur), updatedAt: Date.now() };
    topicsRef.current = { ...topicsRef.current, [id]: next };
    setTopics(topicsRef.current);
    void db.putTopic(next);
  }), [run]);

  const writePath = useCallback((p: PathState | null) => run(() => {
    pathRef.current = p; setPath(p);
    if (p) void db.set("path", p); else void db.del("path");
  }), [run]);

  const visit = useCallback((topic: string) => {
    writeTopic(topic, (t) => ({ ...t, visits: t.visits + 1 }));
    const p = pathRef.current; const def = pathById(p?.id);
    if (p && def) { const i = def.ids.indexOf(topic); if (i >= 0 && i !== p.current) writePath({ ...p, current: i, updatedAt: Date.now() }); }
  }, [writeTopic, writePath]);

  // debounced position writes (scroll fires a lot) — one timer per topic, so leaving a
  // page mid-debounce still saves where you were on it
  const posTimers = useRef<Record<string, number>>({});
  const position = useCallback((topic: string, section: string | null, scrollY: number) => {
    window.clearTimeout(posTimers.current[topic]);
    posTimers.current[topic] = window.setTimeout(() => {
      writeTopic(topic, (t) => {
        const seen = section && !t.seen.includes(section) ? [...t.seen, section] : t.seen;
        return { ...t, lastSection: section, scrollY: Math.round(scrollY), seen };
      });
    }, 400);
  }, [writeTopic]);

  const complete = useCallback((topic: string, on = true) => {
    writeTopic(topic, (t) => ({ ...t, completed: on, completedAt: on ? Date.now() : undefined }));
  }, [writeTopic]);

  const startPath = useCallback((id: string) => {
    const def = pathById(id); if (!def) return;
    // resume position if we already have progress inside this path
    const firstOpen = def.ids.findIndex((tid) => !topicsRef.current[tid]?.completed);
    writePath({ id, startedAt: Date.now(), current: Math.max(0, firstOpen), updatedAt: Date.now() });
  }, [writePath]);
  const quitPath = useCallback(() => writePath(null), [writePath]);
  const setPathCurrent = useCallback((idx: number) => { const p = pathRef.current; if (p) writePath({ ...p, current: idx, updatedAt: Date.now() }); }, [writePath]);

  const recordAttempt = useCallback((a: Omit<QuizAttempt, "at" | "id">) => run(() => {
    const rec: QuizAttempt = { ...a, at: Date.now() };
    void db.addAttempt(rec).then((saved) => setAttempts((xs) => [...xs, saved]));
    if (a.kind === "topic" && a.topic) writeTopic(a.topic, (t) => ({ ...t, quizBest: Math.max(t.quizBest ?? 0, a.score), quizTotal: a.total }));
  }), [writeTopic, run]);

  const setFlash = useCallback((f: FlashState) => run(() => { setFlashState(f); void db.set("flash", f); }), [run]);
  const setNote = useCallback((key: string, text: string) => run(() => {
    setNotes((n) => { const next = { ...n, [key]: text }; void db.set("notes", next); return next; });
  }), [run]);

  const reset = useCallback(async () => {
    await db.wipe();
    topicsRef.current = {}; setTopics({}); writePath(null); setAttempts([]); setFlashState({ again: [], known: [] }); setNotes({});
  }, [writePath]);

  const exportData = useCallback((): Snapshot => ({
    app: "pm-playbook", version: 1, exportedAt: Date.now(),
    topics: Object.values(topicsRef.current), attempts,
    kv: { ...(pathRef.current ? { path: pathRef.current } : {}), flash, notes },
  }), [attempts, flash, notes]);

  const importData = useCallback(async (raw: unknown) => {
    if (!isSnapshot(raw)) return false;
    await db.restore(raw);
    apply(await load());
    return true;
  }, [apply, load]);

  const value = useMemo<Store>(() => {
    const pathDef = pathById(path?.id);
    const pathDone = pathDef ? pathDef.ids.filter((id) => topics[id]?.completed).length : 0;
    const pathNext = pathDef ? (pathDef.ids.find((id) => !topics[id]?.completed) ?? null) : null;
    const lastTopic = Object.values(topics).filter((t) => t.visits > 0 && TOPICS.some((x) => x.id === t.id)).sort((a, b) => b.updatedAt - a.updatedAt)[0] ?? null;
    return { ready, topics, path, attempts, flash, notes, pathDef, pathDone, pathNext, lastTopic, visit, position, complete, startPath, quitPath, setPathCurrent, recordAttempt, setFlash, setNote, reset, exportData, importData };
  }, [ready, topics, path, attempts, flash, notes, visit, position, complete, startPath, quitPath, setPathCurrent, recordAttempt, setFlash, setNote, reset, exportData, importData]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore outside ProgressProvider");
  return s;
}

