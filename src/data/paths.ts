export interface Path { id: string; k: string; h: string; p: string; ids: string[]; hue: number }

export const PATHS: Path[] = [
  { id: "interview", k: "Interview prep", hue: 262, h: "The order an interviewer thinks in", p: "Metrics first, then prioritisation and strategy — the three that show up in every PM loop — then frameworks to give your answers structure.", ids: ["metrics", "prioritisation", "strategy", "discovery", "fw-decide", "ab-testing"] },
  { id: "first-90", k: "First 90 days", hue: 172, h: "What a new PM actually gets asked to do", p: "Write a spec, size a test, read the analytics, ship it. Then the frameworks for the meetings you will be dragged into.", ids: ["specs", "analytics", "ab-testing", "launch", "fw-diagnosis", "fw-deliver"] },
  { id: "reference", k: "Quick reference", hue: 38, h: "Keep it open in a tab", p: "The three framework libraries plus pricing — the four topics most useful when someone asks “what is that model called again?”", ids: ["fw-diagnosis", "fw-decide", "fw-deliver", "pricing"] },
  { id: "full-loop", k: "The full loop", hue: 92, h: "All twelve, in order", p: "Start at 01 and finish at 12. The long way round, for people who want the whole shape rather than a shortcut through it.", ids: ["ab-testing", "discovery", "metrics", "prioritisation", "strategy", "specs", "pricing", "analytics", "launch", "fw-diagnosis", "fw-decide", "fw-deliver"] },
];

export const pathById = (id: string | null | undefined) => PATHS.find((p) => p.id === id);
