export interface Path { id: string; k: string; h: string; p: string; ids: string[]; weeks: string }

export const PATHS: Path[] = [
  { id: "start-here", k: "Start here", weeks: "~2 weeks", h: "New to product management", p: "The five things a PM does every week, in the order you will meet them: find the problem, pick a number, choose what goes first, write it down, get it out of the door.", ids: ["discovery", "metrics", "prioritisation", "specs", "launch"] },
  { id: "interview", k: "Interview prep", weeks: "~10 days", h: "The order an interviewer thinks in", p: "Metrics first, then prioritisation and strategy — the three that show up in every PM loop — then the frameworks that give an answer its structure. Pair it with the prep lab.", ids: ["metrics", "prioritisation", "strategy", "discovery", "fw-decide", "ab-testing"] },
  { id: "first-90", k: "First 90 days", weeks: "~3 weeks", h: "What a new PM actually gets asked to do", p: "Write a spec, read the analytics, size a test, ship it. Then the frameworks for the meetings you will be pulled into.", ids: ["specs", "analytics", "ab-testing", "launch", "fw-diagnosis", "fw-deliver"] },
  { id: "full-loop", k: "The full loop", weeks: "~6 weeks", h: "All twelve, in order", p: "One lap of the loop, discover to land, then the three framework libraries. The long way round, for people who want the whole shape rather than a shortcut through it.", ids: ["discovery", "strategy", "pricing", "prioritisation", "specs", "analytics", "metrics", "ab-testing", "launch", "fw-diagnosis", "fw-decide", "fw-deliver"] },
];

export const pathById = (id: string | null | undefined) => PATHS.find((p) => p.id === id);
