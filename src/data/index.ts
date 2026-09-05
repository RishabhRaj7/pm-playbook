import raw from "./topics.json";

/* ---------- types ---------- */
export type StageId = "discover" | "define" | "decide" | "build" | "measure" | "land";

export interface Term { g: string; t: string; a?: string; d: string; c?: string }
export interface Step { t: string; out?: string; b: string; do?: string; no?: string; snip?: string }
export interface Chart {
  type: "bars" | "ci" | "line";
  title: string; sub?: string; unit?: string; max?: number; min?: number;
  rows?: { label: string; a?: number; b?: number }[];
  items?: { label: string; lo: number; mid: number; hi: number; sig?: boolean }[];
  points?: number[];
}
export interface Case {
  k: string; kind: string; cls?: string; badge?: string; title: string; sub?: string;
  facts?: [string, string][]; steps?: [string, string][]; charts?: Chart[];
  verdict?: { stamp: string; cls?: string; h: string; p: string; lesson?: string };
}
export interface Quiz { q: string; o: string[]; a: number; e: string }
export interface Viz { t: string; [k: string]: any }
export interface Framework {
  name: string; alias?: string; stage: string; viz?: Viz; one: string; when?: string;
  how?: string[]; time?: string; who?: string; with?: string; out?: string; trap?: string;
  ex?: { h: string; viz?: Viz; p?: string; [k: string]: any };
}
export interface Section {
  type: string; id: string; nav: string; eyebrow?: string; h?: string; lede?: string;
  tag?: string; chips?: string[]; panel?: any; statement?: string;
  cards?: { k: string; h: string; p: string }[];
  items?: { k: string; h: string; viz?: Viz; cap?: string; p?: string }[];
  cols?: string[]; rows?: string[][]; col3?: string; tool?: string;
}
export interface Topic {
  id: string; n: string; stage: StageId; title: string; one: string;
  groups?: { id: string; label: string }[];
  terms?: Term[]; steps?: Step[]; cases?: Case[]; quiz?: Quiz[];
  frameworks?: Framework[]; sections: Section[];
}

export const TOPICS = raw as unknown as Topic[];

export const STAGES: { id: StageId; label: string; note: string; hue: number }[] = [
  { id: "discover", label: "Discover", note: "find what is true", hue: 172 },
  { id: "define", label: "Define", note: "choose the bet", hue: 262 },
  { id: "decide", label: "Prioritise", note: "pick the order", hue: 38 },
  { id: "build", label: "Build", note: "make it real", hue: 200 },
  { id: "measure", label: "Measure", note: "learn honestly", hue: 330 },
  { id: "land", label: "Land", note: "make it stick", hue: 92 },
];

export const stageOf = (id: StageId) => STAGES.find((s) => s.id === id)!;
export const topicById = (id: string) => TOPICS.find((t) => t.id === id);
export const topicIndex = (id: string) => TOPICS.findIndex((t) => t.id === id);

export const ACCENTS = [
  { id: "lime", name: "Lime", n: "#C6FF3C", d: "#3F6B00" },
  { id: "ice", name: "Ice", n: "#3DE1FF", d: "#00647F" },
  { id: "amber", name: "Amber", n: "#FFB627", d: "#7F4C00" },
  { id: "coral", name: "Coral", n: "#FF5C9E", d: "#B00058" },
  { id: "violet", name: "Violet", n: "#B98CFF", d: "#5628C4" },
  { id: "mint", name: "Mint", n: "#3FE0B0", d: "#007056" },
];

/* ---------- aggregate stats ---------- */
export const STATS = (() => {
  let terms = 0, fw = 0, viz = 0, quiz = 0, steps = 0, cases = 0;
  for (const t of TOPICS) {
    terms += t.terms?.length ?? 0;
    fw += t.frameworks?.length ?? 0;
    quiz += t.quiz?.length ?? 0;
    steps += t.steps?.length ?? 0;
    cases += t.cases?.length ?? 0;
    viz += (t.frameworks ?? []).reduce((b, f) => b + (f.viz ? 1 : 0) + (f.ex?.viz ? 1 : 0), 0);
    viz += t.sections.filter((s) => s.type === "visual").reduce((b, s) => b + (s.items?.length ?? 0), 0);
  }
  return { topics: TOPICS.length, terms, fw, viz, quiz, steps, cases };
})();

/* ---------- search index ---------- */
export interface SearchHit {
  kind: "Topic" | "Term" | "Framework" | "Step" | "Section" | "Case";
  title: string; sub: string; topic: string; topicTitle: string; anchor: string; hay: string;
}
export const SEARCH_INDEX: SearchHit[] = (() => {
  const out: SearchHit[] = [];
  const strip = (s?: string) => (s ?? "").replace(/<[^>]+>/g, "");
  for (const t of TOPICS) {
    out.push({ kind: "Topic", title: `${t.n} · ${t.title}`, sub: t.one, topic: t.id, topicTitle: t.title, anchor: "start", hay: `${t.title} ${t.one}`.toLowerCase() });
    for (const s of t.sections) if (s.type !== "hero")
      out.push({ kind: "Section", title: s.nav, sub: strip(s.h), topic: t.id, topicTitle: t.title, anchor: s.id, hay: `${s.nav} ${strip(s.h)} ${strip(s.lede)}`.toLowerCase() });
    for (const x of t.terms ?? [])
      out.push({ kind: "Term", title: x.t, sub: strip(x.d), topic: t.id, topicTitle: t.title, anchor: "terms", hay: `${x.t} ${x.a ?? ""} ${strip(x.d)}`.toLowerCase() });
    for (const f of t.frameworks ?? [])
      out.push({ kind: "Framework", title: f.name + (f.alias ? ` (${f.alias})` : ""), sub: strip(f.one), topic: t.id, topicTitle: t.title, anchor: "frameworks", hay: `${f.name} ${f.alias ?? ""} ${strip(f.one)} ${f.stage}`.toLowerCase() });
    (t.steps ?? []).forEach((s, i) =>
      out.push({ kind: "Step", title: `Step ${i + 1} · ${s.t}`, sub: strip(s.out), topic: t.id, topicTitle: t.title, anchor: "process", hay: `${s.t} ${strip(s.out)} ${strip(s.b)}`.toLowerCase() }));
    for (const c of t.cases ?? [])
      out.push({ kind: "Case", title: c.title, sub: strip(c.sub), topic: t.id, topicTitle: t.title, anchor: "cases", hay: `${c.title} ${c.kind} ${strip(c.sub)}`.toLowerCase() });
  }
  return out;
})();

export function search(q: string, limit = 24): SearchHit[] {
  const s = q.trim().toLowerCase();
  if (!s) return [];
  const words = s.split(/\s+/);
  const scored = SEARCH_INDEX.map((h) => {
    let sc = 0;
    const title = h.title.toLowerCase();
    if (title === s) sc += 100;
    if (title.startsWith(s)) sc += 40;
    if (title.includes(s)) sc += 25;
    for (const w of words) { if (title.includes(w)) sc += 8; else if (h.hay.includes(w)) sc += 3; else return null; }
    if (h.kind === "Term" || h.kind === "Framework") sc += 4;
    if (h.kind === "Topic") sc += 6;
    return { h, sc };
  }).filter(Boolean) as { h: SearchHit; sc: number }[];
  scored.sort((a, b) => b.sc - a.sc);
  return scored.slice(0, limit).map((x) => x.h);
}
