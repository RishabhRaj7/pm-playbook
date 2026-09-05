import { useEffect, useMemo, useRef, useState } from "react";
import type { Chart } from "@/data";
import { useInView } from "@/lib/hooks";

/* ---------- shared slider ---------- */
function Slider({ label, value, min, max, step = 1, fmt, onChange }: { label: string; value: number; min: number; max: number; step?: number; fmt?: (v: number) => string; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between mb-1.5"><span className="text-[.82rem] text-dim">{label}</span><b className="mono text-[.82rem] text-acc">{fmt ? fmt(value) : value}</b></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} />
    </label>
  );
}
const Read = ({ l, v, win, sub }: { l: string; v: string; win?: boolean; sub?: string }) => (
  <div className="bg-ink-1 px-4 py-3"><span className="block font-mono text-[.58rem] uppercase tracking-[.14em] text-muted">{l}</span><b className={"font-mono text-xl font-bold " + (win ? "text-acc" : "text-text")}>{v}</b>{sub && <span className="block text-[.72rem] text-muted">{sub}</span>}</div>
);

/* ---------- stats helpers ---------- */
const z = (p: number) => { // inverse normal (Acklam)
  const a = [-39.6968302866538, 220.946098424521, -275.928510446969, 138.357751867269, -30.6647980661472, 2.50662827745924];
  const b = [-54.4760987982241, 161.585836858041, -155.698979859887, 66.8013118877197, -13.2806815528857];
  const c = [-0.00778489400243029, -0.322396458041136, -2.40075827716184, -2.54973253934373, 4.37466414146497, 2.93816398269878];
  const d = [0.00778469570904146, 0.32246712907004, 2.445134137143, 3.75440866190742];
  const pl = 0.02425, ph = 1 - pl; let q, r;
  if (p < pl) { q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  if (p <= ph) { q = p - 0.5; r = q * q; return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1); }
  q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
};

/* ============ 1. Randomiser: watch the interval narrow ============ */
export function Randomiser() {
  const [n, setN] = useState(0); const [ca, setCa] = useState(0); const [cb, setCb] = useState(0);
  const [run, setRun] = useState(true); const pA = 0.032, pB = 0.0352;
  const { ref, inView } = useInView<HTMLDivElement>(0.2);
  useEffect(() => {
    if (!run || !inView) return;
    const id = setInterval(() => {
      let a = 0, b = 0; const batch = n < 2000 ? 40 : n < 20000 ? 400 : 1500;
      for (let i = 0; i < batch; i++) { if (Math.random() < pA) a++; if (Math.random() < pB) b++; }
      setN((x) => Math.min(150000, x + batch)); setCa((x) => x + a); setCb((x) => x + b);
    }, 60);
    return () => clearInterval(id);
  }, [run, n, inView]);
  useEffect(() => { if (n >= 150000) setRun(false); }, [n]);
  const ra = n ? ca / n : 0, rb = n ? cb / n : 0;
  const se = n ? Math.sqrt((ra * (1 - ra)) / n + (rb * (1 - rb)) / n) : 0;
  const diff = rb - ra, lo = diff - 1.96 * se, hi = diff + 1.96 * se;
  const rel = ra ? (diff / ra) * 100 : 0, relLo = ra ? (lo / ra) * 100 : 0, relHi = ra ? (hi / ra) * 100 : 0;
  const sig = n > 500 && lo > 0;
  const span = 40; const px = (v: number) => Math.max(0, Math.min(100, ((v + span / 2) / span) * 100));
  return (
    <div ref={ref} className="panel p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="font-mono text-[.62rem] uppercase tracking-[.2em] text-muted">Live · the two-door café</span>
        <span className="flex items-center gap-2 font-mono text-[.66rem] text-dim"><i className={"h-1.5 w-1.5 rounded-full " + (run ? "bg-acc blip" : "bg-muted")} />{run ? "traffic arriving" : "stopped"}</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[["Door A · control", ra, "var(--a)"], ["Door B · variant", rb, "var(--b)"]].map(([l, r, c]) => (
          <div key={String(l)} className="rounded-xl border border-line-soft bg-ink-1 p-3">
            <span className="font-mono text-[.6rem] uppercase tracking-[.14em]" style={{ color: c as string }}>{l as string}</span>
            <b className="block font-mono text-2xl mt-1">{((r as number) * 100).toFixed(2)}%</b>
            <div className="mt-2 h-1.5 rounded bg-ink-3 overflow-hidden"><div className="h-full transition-all" style={{ width: `${(r as number) * 100 * 15}%`, background: c as string }} /></div>
          </div>
        ))}
      </div>
      <div className="mt-4">
        <div className="flex justify-between font-mono text-[.6rem] text-muted mb-1"><span>−20%</span><span>relative lift · 95% CI</span><span>+20%</span></div>
        <div className="relative h-8 rounded-lg bg-ink-1 border border-line-soft overflow-hidden">
          <div className="absolute inset-y-0 w-px bg-line left-1/2" />
          {n > 200 && <>
            <div className="absolute inset-y-2 rounded transition-all duration-300" style={{ left: `${px(relLo)}%`, width: `${Math.max(0.5, px(relHi) - px(relLo))}%`, background: sig ? "color-mix(in srgb,var(--acc) 40%,transparent)" : "color-mix(in srgb,var(--text) 15%,transparent)" }} />
            <div className="absolute inset-y-1 w-0.5 transition-all duration-300" style={{ left: `${px(rel)}%`, background: sig ? "var(--acc)" : "var(--text)" }} />
          </>}
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-px bg-line-soft rounded-xl overflow-hidden border border-line-soft">
        <Read l="Visitors / arm" v={n.toLocaleString()} />
        <Read l="Observed lift" v={n > 200 ? (rel >= 0 ? "+" : "") + rel.toFixed(1) + "%" : "—"} />
        <Read l="Verdict" v={n < 500 ? "too early" : sig ? "SHIP" : "keep waiting"} win={sig} />
      </div>
      <div className="mt-3 flex gap-2">
        <button className="pill" onClick={() => setRun((r) => !r)}>{run ? "❚❚ Pause" : "▶ Resume"}</button>
        <button className="pill" onClick={() => { setN(0); setCa(0); setCb(0); setRun(true); }}>↻ Reset</button>
      </div>
      <p className="mt-3 text-[.76rem] text-muted">True effect is +10% relative. Notice how long the interval straddles zero — and how tempting it is to call it early.</p>
    </div>
  );
}

/* ============ 2. Sample-size calculator ============ */
export function SizingTool() {
  const [base, setBase] = useState(3.2); const [mde, setMde] = useState(8); const [traffic, setTraffic] = useState(20000); const [power, setPower] = useState(80); const [alpha, setAlpha] = useState(5);
  const r = useMemo(() => {
    const p1 = base / 100, p2 = p1 * (1 + mde / 100); const za = z(1 - alpha / 200), zb = z(power / 100);
    const n = Math.ceil(Math.pow(za * Math.sqrt(2 * ((p1 + p2) / 2) * (1 - (p1 + p2) / 2)) + zb * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2)), 2) / Math.pow(p2 - p1, 2));
    const days = Math.ceil((2 * n) / traffic);
    return { n, days, p2 };
  }, [base, mde, traffic, power, alpha]);
  const verdict = r.days <= 14 ? ["Run it", "Two weeks or less: cheap enough to just find out."] : r.days <= 42 ? ["Feasible", "A month or so. Worth it for a real decision; not for a tweak."] : r.days <= 120 ? ["Expensive", "A quarter of traffic for one answer. Consider a bolder change or a bigger surface."] : ["Not an experiment", "This will never reach significance. Use judgement, research and a rollout with guardrails."];
  const mdes = [2, 5, 10, 20];
  return (
    <div className="panel p-5 grid gap-6 lg:grid-cols-[1fr_1.1fr]">
      <div className="space-y-4">
        <Slider label="Baseline conversion" value={base} min={0.2} max={40} step={0.1} fmt={(v) => v.toFixed(1) + "%"} onChange={setBase} />
        <Slider label="Smallest lift worth detecting (relative)" value={mde} min={1} max={50} fmt={(v) => "+" + v + "%"} onChange={setMde} />
        <Slider label="Eligible traffic per day" value={traffic} min={200} max={200000} step={200} fmt={(v) => v.toLocaleString()} onChange={setTraffic} />
        <div className="grid grid-cols-2 gap-4">
          <Slider label="Power" value={power} min={70} max={95} fmt={(v) => v + "%"} onChange={setPower} />
          <Slider label="Significance α" value={alpha} min={1} max={10} fmt={(v) => v + "%"} onChange={setAlpha} />
        </div>
      </div>
      <div>
        <div className="grid grid-cols-3 gap-px bg-line-soft rounded-xl overflow-hidden border border-line-soft">
          <Read l="Per arm" v={r.n.toLocaleString()} />
          <Read l="Total" v={(r.n * 2).toLocaleString()} />
          <Read l="Run time" v={r.days > 365 ? ">1 yr" : r.days + " d"} win={r.days <= 14} />
        </div>
        <div className="mt-3 rounded-xl border border-line-soft bg-ink-1 p-4">
          <b className={"font-display text-lg " + (r.days <= 42 ? "text-acc" : "text-bad")}>{verdict[0]}</b>
          <p className="mt-1 text-[.86rem] text-dim mb-0">{verdict[1]} Detecting {base.toFixed(1)}% → {(r.p2 * 100).toFixed(2)}%.</p>
        </div>
        <div className="mt-3">
          <span className="font-mono text-[.58rem] uppercase tracking-[.14em] text-muted">Why small effects are so expensive · per arm at this baseline</span>
          <div className="mt-2 space-y-1.5">
            {mdes.map((m) => { const p1 = base / 100, p2 = p1 * (1 + m / 100); const n = Math.ceil(Math.pow(z(1 - alpha / 200) * Math.sqrt(2 * ((p1 + p2) / 2) * (1 - (p1 + p2) / 2)) + z(power / 100) * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2)), 2) / Math.pow(p2 - p1, 2)); const mx = Math.ceil(Math.pow(z(1 - alpha / 200) * Math.sqrt(2 * ((p1 + p1 * 1.02) / 2) * (1 - (p1 + p1 * 1.02) / 2)) + z(power / 100) * Math.sqrt(p1 * (1 - p1) + p1 * 1.02 * (1 - p1 * 1.02)), 2) / Math.pow(p1 * 0.02, 2)); return (
              <div key={m} className="grid grid-cols-[64px_1fr_80px] items-center gap-2 text-[.78rem]"><span className="text-dim">+{m}%</span><div className="h-3 rounded bg-ink-2 overflow-hidden"><div className="h-full rounded transition-all duration-500" style={{ width: `${Math.max(1.5, (n / mx) * 100)}%`, background: m === mde ? "var(--acc)" : "var(--a)" }} /></div><span className="mono text-right">{n.toLocaleString()}</span></div>); })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============ 3. AARRR funnel ============ */
export function FunnelTool() {
  const [v, setV] = useState({ acq: 10000, act: 40, ret: 35, rev: 12, ref: 8 });
  const s = (k: keyof typeof v) => (x: number) => setV((o) => ({ ...o, [k]: x }));
  const act = Math.round(v.acq * v.act / 100), ret = Math.round(act * v.ret / 100), rev = Math.round(ret * v.rev / 100), ref = Math.round(rev * v.ref / 100);
  const rows = [["Acquisition", v.acq, 100], ["Activation", act, v.act], ["Retention", ret, v.ret], ["Revenue", rev, v.rev], ["Referral", ref, v.ref]] as const;
  const rates = [v.act, v.ret, v.rev, v.ref]; const leak = rates.indexOf(Math.min(...rates)) + 1;
  return (
    <div className="panel p-5 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      <div className="space-y-4">
        <Slider label="Visitors / month" value={v.acq} min={1000} max={100000} step={1000} fmt={(x) => x.toLocaleString()} onChange={s("acq")} />
        <Slider label="Activation rate" value={v.act} min={5} max={90} fmt={(x) => x + "%"} onChange={s("act")} />
        <Slider label="Retained at day 30" value={v.ret} min={5} max={90} fmt={(x) => x + "%"} onChange={s("ret")} />
        <Slider label="Convert to paying" value={v.rev} min={1} max={60} fmt={(x) => x + "%"} onChange={s("rev")} />
        <Slider label="Refer someone" value={v.ref} min={1} max={60} fmt={(x) => x + "%"} onChange={s("ref")} />
      </div>
      <div>
        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={r[0]} className="grid grid-cols-[92px_1fr_80px] items-center gap-3 text-[.82rem]">
              <span className={i === leak ? "text-bad font-semibold" : "text-dim"}>{r[0]}</span>
              <div className="h-7 rounded-md bg-ink-2 overflow-hidden relative"><div className="h-full rounded-md transition-all duration-500" style={{ width: `${Math.max(1, (r[1] / v.acq) * 100)}%`, background: i === leak ? "var(--bad)" : i === 0 ? "var(--text)" : "var(--a)", opacity: i === 0 ? .5 : 1 }} />{i > 0 && <span className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[.62rem] text-muted">{r[2]}% of previous</span>}</div>
              <b className="mono text-right">{r[1].toLocaleString()}</b>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-xl border border-bad/40 bg-bad/5 p-4">
          <span className="font-mono text-[.6rem] uppercase tracking-[.14em] text-bad">The leak</span>
          <p className="mt-1 mb-0 text-[.86rem] text-dim">Your weakest step is <b className="text-text">{rows[leak][0].toLowerCase()}</b> at {rows[leak][2]}%. Lifting it by 10 points adds <b className="text-text">{Math.round((rows[leak - 1][1] * 0.10) * (leak < 4 ? rates.slice(leak).reduce((a, b) => a * b / 100, 1) : 1)).toLocaleString()}</b> more people to the bottom — more than doubling acquisition would, at this shape.</p>
        </div>
      </div>
    </div>
  );
}

/* ============ 4. RICE scorer ============ */
export function RiceTool() {
  const [items, setItems] = useState([
    { n: "Guest checkout", r: 8000, i: 2, c: 80, e: 4 }, { n: "Dark mode", r: 12000, i: 0.5, c: 100, e: 2 }, { n: "SSO for enterprise", r: 400, i: 3, c: 50, e: 8 }, { n: "Faster search", r: 6000, i: 1, c: 80, e: 3 },
  ]);
  const [sel, setSel] = useState(0);
  const score = (x: typeof items[0]) => (x.r * x.i * (x.c / 100)) / x.e;
  const ranked = items.map((x, idx) => ({ ...x, idx, s: score(x) })).sort((a, b) => b.s - a.s);
  const max = Math.max(...ranked.map((x) => x.s));
  const up = (k: "r" | "i" | "c" | "e") => (v: number) => setItems((o) => o.map((x, idx) => idx === sel ? { ...x, [k]: v } : x));
  const cur = items[sel];
  return (
    <div className="panel p-5 grid gap-6 lg:grid-cols-[1fr_1fr]">
      <div>
        <span className="font-mono text-[.58rem] uppercase tracking-[.14em] text-muted">Ranked · reach × impact × confidence ÷ effort</span>
        <div className="mt-2 space-y-2">
          {ranked.map((x, pos) => (
            <button key={x.idx} onClick={() => setSel(x.idx)} className={"w-full text-left rounded-xl border p-3 transition-all " + (sel === x.idx ? "border-acc bg-ink-3" : "border-line-soft bg-ink-1 hover:border-line")}>
              <div className="flex items-center justify-between text-[.86rem]"><span><span className="mono text-[.62rem] text-acc mr-2">{String(pos + 1).padStart(2, "0")}</span><b>{x.n}</b></span><b className="mono">{Math.round(x.s).toLocaleString()}</b></div>
              <div className="mt-2 h-1.5 rounded bg-ink-2 overflow-hidden"><div className="h-full rounded transition-all duration-500" style={{ width: `${(x.s / max) * 100}%`, background: pos === 0 ? "var(--acc)" : "var(--a)" }} /></div>
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-4">
        <b className="font-display text-lg">Editing: {cur.n}</b>
        <Slider label="Reach · people per quarter" value={cur.r} min={100} max={20000} step={100} fmt={(v) => v.toLocaleString()} onChange={up("r")} />
        <Slider label="Impact · 0.25 minimal → 3 massive" value={cur.i} min={0.25} max={3} step={0.25} onChange={up("i")} />
        <Slider label="Confidence" value={cur.c} min={20} max={100} step={10} fmt={(v) => v + "%"} onChange={up("c")} />
        <Slider label="Effort · person-months" value={cur.e} min={0.5} max={12} step={0.5} onChange={up("e")} />
        <p className="text-[.78rem] text-muted mb-0">Drag effort down on anything and watch it climb — that is the model's blind spot: it systematically prefers cheap and certain.</p>
      </div>
    </div>
  );
}

/* ============ 5. OKR checker ============ */
export function OkrTool() {
  const [o, setO] = useState("Become the default tool for finance teams at mid-market companies");
  const [krs, setKrs] = useState(["Increase weekly active finance seats from 1,200 to 2,000", "Ship the approvals feature", "Raise 30-day retention of new finance workspaces from 41% to 55%"]);
  const check = (kr: string) => {
    const hasNum = /\d/.test(kr); const fromTo = /from\s+[\d.,%$]+\s+to\s+[\d.,%$]+/i.test(kr); const isOutput = /\b(ship|launch|build|release|deliver|complete|implement)\b/i.test(kr);
    return { hasNum, fromTo, isOutput, ok: hasNum && !isOutput };
  };
  return (
    <div className="panel p-5 grid gap-6 lg:grid-cols-2">
      <div className="space-y-3">
        <label className="block"><span className="font-mono text-[.58rem] uppercase tracking-[.14em] text-muted">Objective · qualitative, memorable</span>
          <textarea value={o} onChange={(e) => setO(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-line-soft bg-ink-1 p-3 text-[.9rem] outline-none focus:border-acc" /></label>
        {krs.map((k, i) => (
          <label key={i} className="block"><span className="font-mono text-[.58rem] uppercase tracking-[.14em] text-muted">Key result {i + 1}</span>
            <input value={k} onChange={(e) => setKrs((a) => a.map((x, j) => j === i ? e.target.value : x))} className="mt-1 w-full rounded-lg border border-line-soft bg-ink-1 p-3 text-[.9rem] outline-none focus:border-acc" /></label>
        ))}
      </div>
      <div className="space-y-2">
        <span className="font-mono text-[.58rem] uppercase tracking-[.14em] text-muted">Linter</span>
        <div className={"rounded-xl border p-3 text-[.84rem] " + (o.length > 20 && o.length < 110 ? "border-acc/50" : "border-bad/50")}><b className="text-text">Objective</b><p className="mb-0 text-dim">{o.length < 20 ? "Too short to inspire anyone." : o.length > 110 ? "Too long to remember — if it does not fit on a sticky note it is a strategy doc." : "Memorable length. Does it say what you will not do?"}</p></div>
        {krs.map((k, i) => { const c = check(k); return (
          <div key={i} className={"rounded-xl border p-3 text-[.84rem] " + (c.ok ? "border-acc/50" : "border-bad/50")}>
            <b className="text-text">KR {i + 1} · {c.ok ? "measures an outcome" : c.isOutput ? "this is an output" : "no number"}</b>
            <ul className="mb-0 mt-1 space-y-.5 text-dim list-none p-0">
              <li>{c.hasNum ? "✓" : "✗"} Has a number</li>
              <li>{c.fromTo ? "✓" : "○"} States a from → to baseline</li>
              <li>{!c.isOutput ? "✓" : "✗"} Describes a change in the world, not a thing you shipped</li>
            </ul>
          </div>); })}
      </div>
    </div>
  );
}

export function ToolFor({ id }: { id: string }) {
  if (id === "sizing") return <SizingTool />;
  if (id === "funnel") return <FunnelTool />;
  if (id === "rice") return <RiceTool />;
  if (id === "okr") return <OkrTool />;
  if (id === "randomiser") return <Randomiser />;
  return null;
}

/* ============ case-study charts ============ */
export function CaseChart({ c }: { c: Chart }) {
  const ref = useRef<HTMLDivElement>(null);
  const { ref: ivRef, inView } = useInView<HTMLDivElement>(0.2);
  const [shown, setShown] = useState(false);
  useEffect(() => { if (inView) setShown(true); }, [inView]);
  return (
    <div ref={(el) => { (ref as any).current = el; (ivRef as any).current = el; }} className="rounded-xl border border-line-soft bg-ink-1 p-4">
      <b className="block text-[.84rem] text-text">{c.title}</b>
      {c.sub && <span className="block text-[.72rem] text-muted mb-3">{c.sub}</span>}
      {c.type === "bars" && (
        <div className="space-y-2">
          {c.rows!.map((r, i) => (
            <div key={i} className="grid grid-cols-[120px_1fr] gap-3 items-center text-[.78rem]">
              <span className="text-dim truncate">{r.label}</span>
              <div className="space-y-1">
                {r.a != null && <div className="flex items-center gap-2"><div className="h-3 rounded bg-a/90 transition-all duration-1000" style={{ width: shown ? `${(r.a / (c.max ?? 100)) * 100}%` : 0 }} /><span className="mono text-[.7rem]">{r.a}{c.unit}</span></div>}
                {r.b != null && <div className="flex items-center gap-2"><div className="h-3 rounded bg-b/90 transition-all duration-1000 delay-150" style={{ width: shown ? `${(r.b / (c.max ?? 100)) * 100}%` : 0 }} /><span className="mono text-[.7rem]">{r.b}{c.unit}</span></div>}
              </div>
            </div>
          ))}
          <div className="flex gap-4 pt-1 font-mono text-[.6rem] uppercase tracking-[.12em] text-muted"><span><i className="inline-block h-2 w-2 rounded-sm bg-a mr-1" />A · control</span><span><i className="inline-block h-2 w-2 rounded-sm bg-b mr-1" />B · variant</span></div>
        </div>
      )}
      {c.type === "ci" && (
        <div className="space-y-3">
          {c.items!.map((it, i) => { const mn = c.min ?? -10, mx = c.max ?? 20; const px = (v: number) => ((v - mn) / (mx - mn)) * 100; return (
            <div key={i}>
              <div className="flex justify-between text-[.76rem] text-dim mb-1"><span>{it.label}</span><b className={"mono " + (it.sig ? "text-acc" : "text-text")}>{it.lo}% … <span className="text-text">{it.mid}%</span> … {it.hi}%</b></div>
              <div className="relative h-8 rounded-lg bg-ink-2 overflow-hidden">
                <div className="absolute inset-y-0 w-px bg-line" style={{ left: `${px(0)}%` }} />
                <div className="absolute inset-y-2.5 rounded transition-all duration-1000" style={{ left: `${px(it.lo)}%`, width: shown ? `${px(it.hi) - px(it.lo)}%` : 0, background: it.sig ? "color-mix(in srgb,var(--acc) 45%,transparent)" : "color-mix(in srgb,var(--text) 18%,transparent)" }} />
                <div className="absolute inset-y-1 w-0.5" style={{ left: `${px(it.mid)}%`, background: it.sig ? "var(--acc)" : "var(--text)" }} />
              </div>
              <div className="flex justify-between font-mono text-[.6rem] text-muted"><span>{mn}%</span><span>0</span><span>+{mx}%</span></div>
            </div>); })}
        </div>
      )}
      {c.type === "line" && (() => { const W = 400, H = 140, p = 20; const mn = c.min ?? Math.min(...c.points!), mx = c.max ?? Math.max(...c.points!); const pts = c.points!.map((v, i) => [p + (i / (c.points!.length - 1)) * (W - 2 * p), H - p - ((v - mn) / (mx - mn)) * (H - 2 * p)]); const d = pts.map((q, i) => (i ? "L" : "M") + q[0] + " " + q[1]).join(" "); const y0 = H - p - ((0 - mn) / (mx - mn)) * (H - 2 * p); return (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
          <line x1={p} x2={W - p} y1={y0} y2={y0} stroke="var(--line)" strokeDasharray="3 4" />
          <path d={d} fill="none" stroke="var(--b)" strokeWidth={2.2} pathLength={1} style={{ strokeDasharray: 1, strokeDashoffset: shown ? 0 : 1, transition: "stroke-dashoffset 1.8s var(--ease-out)" }} />
          {pts.map((q, i) => <circle key={i} cx={q[0]} cy={q[1]} r={2.5} fill="var(--b)" style={{ opacity: shown ? 1 : 0, transition: `opacity .3s ${i * 0.1}s` }} />)}
          <text x={p} y={H - 4} fill="var(--muted)" fontFamily="var(--f-mono)" fontSize="9">day 1</text>
          <text x={W - p} y={H - 4} textAnchor="end" fill="var(--muted)" fontFamily="var(--f-mono)" fontSize="9">day {c.points!.length}</text>
          <text x={W - p} y={y0 - 4} textAnchor="end" fill="var(--muted)" fontFamily="var(--f-mono)" fontSize="9">0%</text>
        </svg>); })()}
    </div>
  );
}
