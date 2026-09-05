import { useCallback, useEffect, useRef, useState } from "react";
import { ACCENTS } from "@/data";

/* ---------- routing: #/topic-id/section ---------- */
export interface Route { topic: string | null; anchor: string | null }

export function parseHash(h = window.location.hash): Route {
  const m = h.replace(/^#\/?/, "").split("/").filter(Boolean);
  if (!m.length || m[0] === "home") return { topic: null, anchor: m[1] ?? null };
  return { topic: m[0], anchor: m[1] ?? null };
}

export function useRoute() {
  const [route, setRoute] = useState<Route>(() => {
    if (!window.location.hash) {
      const last = localStorage.getItem("pm:last-route");
      if (last) history.replaceState(null, "", last);
    }
    return parseHash();
  });
  useEffect(() => {
    const on = () => {
      const r = parseHash();
      setRoute(r);
      localStorage.setItem("pm:last-route", window.location.hash || "#/");
    };
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

export function scrollToId(id: string, offset = 84) {
  const el = document.getElementById(id);
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY - offset;
  window.scrollTo({ top, behavior: "smooth" });
}

/* ---------- theme + accent ---------- */
function applyAccent(id: string) {
  const a = ACCENTS.find((x) => x.id === id) ?? ACCENTS[0];
  const day = document.documentElement.getAttribute("data-theme") === "day";
  const acc = day ? a.d : a.n;
  document.documentElement.style.setProperty("--acc", acc);
  setFavicon(acc, day ? "#ffffff" : "#07080f");
}

/* favicon + theme-color follow the accent */
export function setFavicon(acc: string, ink: string) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='7' fill='${acc}'/><rect x='3' y='3' width='26' height='26' rx='5' fill='${ink}'/><rect x='15' y='6' width='2' height='20' rx='1' fill='${acc}'/></svg>`;
  const href = `data:image/svg+xml,${encodeURIComponent(svg)}`;
  let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
  if (!link) { link = document.createElement("link"); link.rel = "icon"; document.head.appendChild(link); }
  link.type = "image/svg+xml";
  link.href = href;
  let meta = document.querySelector<HTMLMetaElement>("meta[name='theme-color']");
  if (!meta) { meta = document.createElement("meta"); meta.name = "theme-color"; document.head.appendChild(meta); }
  meta.content = ink;
}
export function useTheme() {
  const [theme, setTheme] = useState<"night" | "day">(() => (localStorage.getItem("pm:theme") as any) || "night");
  const [accent, setAccent] = useState<string>(() => localStorage.getItem("pm:accent") || "lime");
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("pm:theme", theme);
    applyAccent(accent);
  }, [theme, accent]);
  useEffect(() => { localStorage.setItem("pm:accent", accent); }, [accent]);
  return { theme, setTheme, toggle: () => setTheme((t) => (t === "night" ? "day" : "night")), accent, setAccent };
}

/* ---------- scroll reveal (.rv -> .in) ---------- */
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
        const y = window.scrollY + 140;
        let cur = ids[0];
        for (const id of ids) {
          const el = document.getElementById(id);
          if (el && el.offsetTop <= y) cur = id;
        }
        if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 4) cur = ids[ids.length - 1];
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

/* ---------- count-up ---------- */
export function useCountUp(target: number, duration = 1200, start = true) {
  const [v, setV] = useState(0);
  const ref = useRef<number>(0);
  useEffect(() => {
    if (!start) return;
    const t0 = performance.now();
    const from = ref.current;
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / duration);
      const e = 1 - Math.pow(1 - k, 3);
      const val = Math.round(from + (target - from) * e);
      setV(val); ref.current = val;
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, start]);
  return v;
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
