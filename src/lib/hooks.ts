import { useCallback, useEffect, useRef, useState } from "react";
import { ACCENTS } from "@/data";

/* ---------- storage that never throws ----------
   Safari private mode, blocked cookies and sandboxed iframes all make
   `localStorage` throw on access. Preferences are nice-to-have, so a
   failure here must never take the page down with it. */
export const store = {
  get(k: string): string | null { try { return window.localStorage.getItem(k); } catch { return null; } },
  set(k: string, v: string) { try { window.localStorage.setItem(k, v); } catch { /* preference not saved */ } },
};

/* ---------- routing: #/topic-id/section ---------- */
export interface Route { topic: string | null; anchor: string | null }

export function parseHash(h = window.location.hash): Route {
  const m = h.replace(/^#\/?/, "").split("/").filter(Boolean).map((x) => { try { return decodeURIComponent(x); } catch { return x; } });
  if (!m.length || m[0] === "home") return { topic: null, anchor: m[1] ?? null };
  return { topic: m[0], anchor: m[1] ?? null };
}

export function useRoute() {
  const [route, setRoute] = useState<Route>(() => parseHash());
  useEffect(() => {
    const on = () => setRoute(parseHash());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  const go = useCallback((topic: string | null, anchor?: string | null) => {
    const h = topic ? `#/${topic}${anchor ? "/" + anchor : ""}` : `#/${anchor ? "home/" + anchor : ""}`;
    if (h === window.location.hash) {
      // already here: scroll to the anchor if it is a real element, otherwise to the top
      if (anchor && document.getElementById(anchor)) scrollToId(anchor);
      else window.scrollTo({ top: 0, behavior: "smooth" });
      // make sure React state agrees with the URL even if a replaceHash left it stale
      setRoute((r) => { const n = parseHash(h); return r.topic === n.topic && r.anchor === n.anchor ? r : n; });
      return;
    }
    window.location.hash = h;
  }, []);
  return { route, go };
}

/* Update the hash without adding a history entry, but still let `useRoute`
   (and anything else listening) know — `history.replaceState` alone fires no event. */
export function replaceHash(h: string) {
  if (window.location.hash === h) return;
  const oldURL = window.location.href;
  history.replaceState(null, "", h);
  try { window.dispatchEvent(new HashChangeEvent("hashchange", { oldURL, newURL: window.location.href })); }
  catch { window.dispatchEvent(new Event("hashchange")); }
}

export function scrollToId(id: string, offset = 72) {
  const el = document.getElementById(id);
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY - offset;
  window.scrollTo({ top, behavior: REDUCED ? "auto" : "smooth" });
}

/* ---------- theme + accent ---------- */
export type Theme = "day" | "night";
function applyAccent(id: string) {
  const a = ACCENTS.find((x) => x.id === id) ?? ACCENTS[0];
  const night = document.documentElement.getAttribute("data-theme") === "night";
  const acc = night ? a.n : a.d;
  const root = document.documentElement.style;
  root.setProperty("--acc", acc);
  // the "ink only" accent is the text colour itself, so text set on it must flip to paper
  root.setProperty("--acc-ink", night ? "#0e0e0d" : "#f7f4ee");
  setFavicon(acc, night ? "#0e0e0d" : "#f3f0e9");
}

/* favicon + theme-color follow the accent and the edition */
function setFavicon(acc: string, paper: string) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' fill='${acc}'/><circle cx='16' cy='16' r='8' fill='none' stroke='${paper}' stroke-width='3'/><rect x='21' y='7' width='5' height='5' fill='${paper}'/></svg>`;
  let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
  if (!link) { link = document.createElement("link"); link.rel = "icon"; document.head.appendChild(link); }
  link.type = "image/svg+xml";
  link.href = `data:image/svg+xml,${encodeURIComponent(svg)}`;
  let meta = document.querySelector<HTMLMetaElement>("meta[name='theme-color']");
  if (!meta) { meta = document.createElement("meta"); meta.name = "theme-color"; document.head.appendChild(meta); }
  meta.content = paper;
}
export function useTheme() {
  // index.html has already resolved saved choice vs. system preference before first paint
  const [theme, setTheme] = useState<Theme>(() => (document.documentElement.getAttribute("data-theme") === "night" ? "night" : "day"));
  const [accent, setAccent] = useState<string>(() => { const a = store.get("pm:accent"); return ACCENTS.some((x) => x.id === a) ? a! : ACCENTS[0].id; });
  const chosen = useRef(store.get("pm:theme") != null);
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    if (chosen.current) store.set("pm:theme", theme);
    applyAccent(accent);
  }, [theme, accent]);
  useEffect(() => { store.set("pm:accent", accent); }, [accent]);
  // until the reader picks an edition, follow the system as it changes (e.g. at sunset)
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mq) return;
    const on = () => { if (!chosen.current) setTheme(mq.matches ? "night" : "day"); };
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  const toggle = () => { chosen.current = true; setTheme((t) => (t === "night" ? "day" : "night")); };
  return { theme, toggle, accent, setAccent };
}

/* ---------- scroll reveal ----------
   `.rv` elements start invisible and get `.in` once they scroll into view.
   Content is frequently mounted *after* the owning component's effect has
   run (AnimatePresence `mode="wait"` delays the new tree until the old one
   has exited; tabs, drills and mock cards swap sub-trees on click), so a
   one-shot querySelectorAll misses those nodes and they stay at opacity 0.
   We therefore keep one IntersectionObserver alive and feed it every `.rv`
   node that appears, via a MutationObserver on the document. */
let revealIO: IntersectionObserver | null = null;
let revealMO: MutationObserver | null = null;
let revealSeen = new WeakSet<Element>();
let revealUsers = 0;

const revealNow = (el: HTMLElement) => el.classList.add("in");

function observeReveal(root: ParentNode | HTMLElement) {
  const list: HTMLElement[] = [];
  if (root instanceof HTMLElement && root.classList.contains("rv") && !root.classList.contains("in")) list.push(root);
  root.querySelectorAll?.<HTMLElement>(".rv:not(.in)").forEach((e) => list.push(e));
  if (!list.length) return;
  if (!revealIO) { list.forEach(revealNow); return; }
  for (const el of list) {
    if (revealSeen.has(el)) continue;
    revealSeen.add(el);
    revealIO.observe(el);
  }
}

function startReveal() {
  if (!("IntersectionObserver" in window) || !("MutationObserver" in window)) { observeReveal(document); return; }
  revealSeen = new WeakSet<Element>();
  revealIO = new IntersectionObserver((entries) => {
    for (const en of entries) if (en.isIntersecting) { revealNow(en.target as HTMLElement); revealIO?.unobserve(en.target); }
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
  revealMO = new MutationObserver((muts) => {
    for (const m of muts) m.addedNodes.forEach((n) => { if (n.nodeType === 1) observeReveal(n as HTMLElement); });
  });
  revealMO.observe(document.body, { childList: true, subtree: true });
  observeReveal(document);
}

function stopReveal() {
  revealIO?.disconnect(); revealMO?.disconnect();
  revealIO = null; revealMO = null;
}

/* safety net: anything still hidden after the entrance window is shown outright,
   so a missed intersection can never leave a screen blank */
function flushStaleReveals() {
  document.querySelectorAll<HTMLElement>(".rv:not(.in)").forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.bottom >= 0 && r.top <= window.innerHeight * 1.05) revealNow(el);
  });
}

export function useReveal(dep?: unknown) {
  useEffect(() => {
    if (revealUsers++ === 0) startReveal();
    else observeReveal(document);
    return () => { if (--revealUsers === 0) stopReveal(); };
  }, []);
  useEffect(() => {
    // re-scan on dependency change and again after the swap animation has settled
    observeReveal(document);
    const t1 = window.setTimeout(() => { observeReveal(document); flushStaleReveals(); }, 450);
    const t2 = window.setTimeout(flushStaleReveals, 1200);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); };
  }, [dep]);
}

/* ---------- scroll spy ---------- */
export function useScrollSpy(ids: string[]) {
  const [active, setActive] = useState<string | null>(ids[0] ?? null);
  useEffect(() => {
    if (!ids.length) return;
    let raf = 0;
    const on = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        let cur = ids[0];
        for (const id of ids) {
          const el = document.getElementById(id);
          if (el && el.getBoundingClientRect().top <= 140) cur = id;
        }
        const h = document.documentElement;
        if (window.innerHeight + window.scrollY >= h.scrollHeight - 4) cur = ids[ids.length - 1];
        setActive(cur);
      });
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => { window.removeEventListener("scroll", on); cancelAnimationFrame(raf); };
  }, [ids.join("|")]);
  return active;
}

/* ---------- reading progress ---------- */
export function useProgress() {
  const [p, setP] = useState(0);
  useEffect(() => {
    const on = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      setP(max > 0 ? Math.min(1, window.scrollY / max) : 0);
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => { window.removeEventListener("scroll", on); window.removeEventListener("resize", on); };
  }, []);
  return p;
}

export function useInView<T extends HTMLElement>(threshold = 0.3) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return { ref, inView };
}

export const REDUCED = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
