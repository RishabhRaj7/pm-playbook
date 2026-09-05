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
      if (anchor) scrollToId(anchor);
      else window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    window.location.hash = h;
  }, []);
  return { route, go };
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
export function useReveal(dep?: unknown) {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>(".rv:not(.in)"));
    if (!("IntersectionObserver" in window)) { els.forEach((e) => e.classList.add("in")); return; }
    const io = new IntersectionObserver((entries) => {
      for (const en of entries) if (en.isIntersecting) { (en.target as HTMLElement).classList.add("in"); io.unobserve(en.target); }
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
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
