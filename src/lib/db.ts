import { openDB, type DBSchema, type IDBPDatabase } from "idb";

/* ============================================================
   Local persistence — IndexedDB via `idb`, with an in-memory
   fallback for browsers that refuse to open a database.
   ============================================================ */

export interface TopicProgress {
  id: string;
  visits: number;
  firstSeen: number;
  updatedAt: number;
  lastSection: string | null;
  scrollY: number;
  seen: string[];        // section ids that have been scrolled through
  completed: boolean;
  completedAt?: number;
  quizBest?: number;     // best score on the topic quiz
  quizTotal?: number;
}

export interface PathState {
  id: string;
  startedAt: number;
  current: number;       // index into the path's topic list
  updatedAt: number;
}

export interface QuizAttempt {
  id?: number;
  kind: "topic" | "drill" | "mock";
  topic?: string;        // for topic quizzes
  topics?: string[];     // for drills
  score: number;
  total: number;
  at: number;
  missed?: string[];     // topic ids of missed questions (drills)
  durationMs?: number;
}

export interface KV { key: string; value: unknown }

interface PMDB extends DBSchema {
  topics: { key: string; value: TopicProgress };
  attempts: { key: number; value: QuizAttempt; indexes: { by_at: number } };
  kv: { key: string; value: KV };
}

let dbp: Promise<IDBPDatabase<PMDB> | null> | null = null;
const mem = { topics: new Map<string, TopicProgress>(), attempts: [] as QuizAttempt[], kv: new Map<string, unknown>(), nextId: 1 };

function open() {
  if (dbp) return dbp;
  dbp = (async () => {
    try {
      if (typeof indexedDB === "undefined") return null;
      return await openDB<PMDB>("pm-playbook", 1, {
        upgrade(db) {
          db.createObjectStore("topics", { keyPath: "id" });
          const a = db.createObjectStore("attempts", { keyPath: "id", autoIncrement: true });
          a.createIndex("by_at", "at");
          db.createObjectStore("kv", { keyPath: "key" });
        },
      });
    } catch {
      return null;
    }
  })();
  return dbp;
}

export const db = {
  async allTopics(): Promise<TopicProgress[]> {
    const d = await open();
    return d ? d.getAll("topics") : [...mem.topics.values()];
  },
  async putTopic(t: TopicProgress) {
    const d = await open();
    if (d) await d.put("topics", t); else mem.topics.set(t.id, t);
  },
  async allAttempts(): Promise<QuizAttempt[]> {
    const d = await open();
    return d ? d.getAllFromIndex("attempts", "by_at") : [...mem.attempts];
  },
  async addAttempt(a: QuizAttempt): Promise<QuizAttempt> {
    const d = await open();
    if (d) { const id = await d.add("attempts", a); return { ...a, id }; }
    const rec = { ...a, id: mem.nextId++ }; mem.attempts.push(rec); return rec;
  },
  async get<T = unknown>(key: string): Promise<T | undefined> {
    const d = await open();
    if (d) return (await d.get("kv", key))?.value as T | undefined;
    return mem.kv.get(key) as T | undefined;
  },
  async set(key: string, value: unknown) {
    const d = await open();
    if (d) await d.put("kv", { key, value }); else mem.kv.set(key, value);
  },
  async del(key: string) {
    const d = await open();
    if (d) await d.delete("kv", key); else mem.kv.delete(key);
  },
  async wipe() {
    const d = await open();
    if (d) { await Promise.all([d.clear("topics"), d.clear("attempts"), d.clear("kv")]); }
    mem.topics.clear(); mem.attempts = []; mem.kv.clear();
  },
};
