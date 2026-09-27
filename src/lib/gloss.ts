import { GLOSSARY, type Entry } from "@/data";

/* ============================================================
   Inline glossary. Distinctive terms that appear inside the
   running text (steps, cases, explanations) are wrapped so a hover
   or tap shows the definition in place — the reader never has to
   leave the sentence to find out what "cost of delay" means.
   Qualifying terms: multi-word phrases, acronyms, their aliases,
   and a short list of single-word jargon. Everyday words that
   happen to be headwords ("Strategy", "Event") are left alone,
   or half the page would be underlined.
   ============================================================ */

const JARGON = new Set(["activation", "anecdata", "backfill", "baseline", "cohort", "descoping", "enablement", "exposure", "grandfathering", "holdout", "interference", "laddering", "peeking", "randomisation", "reconciliation", "saturation", "screener", "seasonality", "segmentation", "slicing", "variance"]);

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const qualifies = (h: string) => h.length >= 3 && h.length <= 32 && !h.includes(",") && !/^(the|a|an) /i.test(h)
  && (/[\s-]/.test(h.trim()) || /[A-Z].*[A-Z]/.test(h) || JARGON.has(h.toLowerCase()));

export const GLOSS_BY_KEY = new Map<string, Entry>(GLOSSARY.map((e) => [e.key, e]));

const byText = new Map<string, Entry>();
for (const e of GLOSSARY) {
  const h = e.head.replace(/^the /i, ""); // "The Mom Test" is written "the Mom Test" mid-sentence
  if (qualifies(h)) byText.set(h.toLowerCase(), e);
}
// aliases ("NSM", "counter metric") point at the same entry, unless a headword already owns the text
for (const e of GLOSSARY) for (const s of e.senses)
  for (const a of (s.alias ?? "").split(/[,/;]| or /).map((x) => x.trim()))
    if (a && qualifies(a) && !byText.has(a.toLowerCase())) byText.set(a.toLowerCase(), e);

// longest first, so "North Star metric" wins over "North Star"; simple plurals count too
const heads = [...byText.keys()].sort((a, b) => b.length - a.length);
const RE = heads.length ? new RegExp(`(?<![\\w-])(${heads.map(esc).join("|")})(?:e?s)?(?![\\w-])`, "gi") : null;
const lookup = (m: string) => byText.get(m.toLowerCase()) ?? byText.get(m.toLowerCase().replace(/e?s$/, ""));

const cache = new Map<string, string>();
/** Wrap the first mention of each known term in `html` (text between tags only; tags are left alone). */
export function glossify(html: string): string {
  if (!RE || !html) return html;
  const hit = cache.get(html);
  if (hit != null) return hit;
  const seen = new Set<string>();
  const out = html.split(/(<[^>]+>)/).map((part) => part.startsWith("<") ? part : part.replace(RE, (m) => {
    const e = lookup(m);
    if (!e || seen.has(e.key)) return m;
    seen.add(e.key);
    return `<span class="gl" data-gl="${e.key}" tabindex="0">${m}</span>`;
  })).join("");
  cache.set(html, out);
  return out;
}
