import { useState, type ReactNode } from "react";
import type { Viz as VizT } from "@/data";
import { cn } from "@/utils/cn";

/* Hover / tap any part → explanation appears underneath. */
export default function Viz({ viz, className }: { viz: VizT; className?: string }) {
  const [note, setNote] = useState<{ t: string; n?: string } | null>(null);
  const bind = (t: string, n?: string | null) => ({
    onMouseEnter: () => setNote({ t, n: n ?? undefined }),
    onFocus: () => setNote({ t, n: n ?? undefined }),
    onClick: () => setNote({ t, n: n ?? undefined }),
    tabIndex: 0,
  });
  const body = render(viz, bind, note?.t ?? null);
  return (
    <div className={cn("viz", className)} onMouseLeave={() => setNote(null)}>
      <div className="min-h-[120px]">{body}</div>
      <div className="mt-3 min-h-[3.2em] rounded-lg border border-dashed border-line-soft bg-ink-2/60 px-3 py-2 text-[.82rem] leading-snug text-dim transition-colors">
        {note ? (<span className="rise block"><b className="text-text">{note.t}</b>{note.n ? <> — {note.n}</> : null}</span>) : <span className="text-muted font-mono text-[.66rem] uppercase tracking-[.14em]">Hover or tap a part of the diagram</span>}
      </div>
      {viz.cap && <p className="mt-2 text-[.78rem] italic text-muted">{viz.cap}</p>}
    </div>
  );
}

type Bind = (t: string, n?: string | null) => Record<string, unknown>;
const hot = "cursor-pointer outline-none transition-all duration-200";
const Box = ({ on, children, className, ...rest }: { on: boolean; children: ReactNode; className?: string } & Record<string, unknown>) => (
  <div {...rest} className={cn("rounded-lg border px-3 py-2 text-[.8rem] leading-snug", hot, on ? "border-acc bg-ink-3 text-text shadow-[0_0_0_1px_var(--acc)]" : "border-line-soft bg-ink-1 text-dim hover:border-line hover:text-text", className)}>{children}</div>
);
const Lbl = ({ children }: { children: ReactNode }) => <span className="font-mono text-[.58rem] uppercase tracking-[.16em] text-muted">{children}</span>;

function render(v: VizT, bind: Bind, act: string | null): ReactNode {
  switch (v.t) {
    case "matrix": {
      const cells: [string, string][] = v.cells;
      return (
        <div className="grid grid-cols-[auto_1fr] gap-2">
          <div className="flex items-center"><span className="[writing-mode:vertical-rl] rotate-180 font-mono text-[.58rem] uppercase tracking-[.16em] text-muted">{v.yl}</span></div>
          <div>
            <div className="grid grid-cols-2 gap-2">
              {cells.map((c, i) => {
                const yi = 1 - Math.floor(i / 2), xi = i % 2;
                return (
                  <Box key={i} on={act === c[0]} {...bind(c[0], c[1])} className={cn("min-h-[70px]", v.hi === i && act !== c[0] && "border-signal/60")}>
                    <Lbl>{v.y?.[yi]} × {v.x?.[xi]}</Lbl>
                    <div className="mt-1 font-semibold text-[.82rem]">{c[0]}</div>
                  </Box>
                );
              })}
            </div>
            <div className="mt-2 flex justify-between px-1"><Lbl>{v.x?.[0]}</Lbl><Lbl>{v.xl}</Lbl><Lbl>{v.x?.[1]}</Lbl></div>
          </div>
        </div>
      );
    }
    case "curve": {
      const W = 420, H = 180, pad = 24;
      const max = v.max ?? 100;
      return (
        <div>
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto overflow-visible">
            {[0, .25, .5, .75, 1].map((k) => <line key={k} x1={pad} x2={W - pad} y1={pad + (H - 2 * pad) * k} y2={pad + (H - 2 * pad) * k} stroke="var(--line-soft)" strokeDasharray="2 4" />)}
            {v.curves.map((c: any, ci: number) => {
              const pts = c.pts.map((p: number, i: number) => [pad + (i / (c.pts.length - 1)) * (W - 2 * pad), H - pad - (p / max) * (H - 2 * pad)]);
              const d = pts.map((p: number[], i: number) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
              const col = c.cls === "ln" ? "var(--muted)" : ci === 0 ? "var(--a)" : "var(--b)";
              const on = act === c.label;
              return (
                <g key={ci} {...bind(c.label, c.note)} className={hot}>
                  <path d={d} fill="none" stroke="transparent" strokeWidth={18} />
                  <path d={d} fill="none" stroke={col} strokeWidth={on ? 3.5 : 2.2} strokeDasharray={c.dash ? "6 5" : undefined} pathLength={1} style={{ strokeDasharray: c.dash ? "0.02 0.015" : undefined, animation: "drawIn 1.6s var(--ease-out) both" }} strokeLinecap="round" />
                  {!c.dash && pts.map((p: number[], i: number) => <circle key={i} cx={p[0]} cy={p[1]} r={on ? 4 : 3} fill={col} />)}
                  <text x={pts[pts.length - 1][0]} y={pts[pts.length - 1][1] - 8} textAnchor="end" fill={col} fontFamily="var(--f-mono)" fontSize="10" fontWeight={600}>{c.label} · {c.pts[c.pts.length - 1]}%</text>
                </g>
              );
            })}
            <text x={pad} y={H - 4} fill="var(--muted)" fontFamily="var(--f-mono)" fontSize="9">{v.xl?.[0]}</text>
            <text x={W - pad} y={H - 4} textAnchor="end" fill="var(--muted)" fontFamily="var(--f-mono)" fontSize="9">{v.xl?.[1]}</text>
          </svg>
        </div>
      );
    }
    case "bars": {
      const items: [string, number, string | null][] = v.items;
      const max = Math.max(...items.map((i) => i[1]));
      return (
        <div className="space-y-2">
          {items.map((it, i) => (
            <div key={i} {...bind(it[0], it[2])} className={cn("grid grid-cols-[130px_1fr_auto] items-center gap-3", hot)}>
              <span className={cn("text-[.8rem] truncate", act === it[0] ? "text-text" : "text-dim")}>{it[0]}</span>
              <div className="h-5 rounded bg-ink-2 overflow-hidden"><div className="h-full rounded transition-all duration-700" style={{ width: `${Math.max(2, (it[1] / max) * 100)}%`, background: v.key === i ? "var(--acc)" : act === it[0] ? "var(--text)" : "var(--a)", opacity: v.key === i || act === it[0] ? 1 : .55 }} /></div>
              <span className="mono text-[.78rem] text-text w-16 text-right">{it[1].toLocaleString()}{v.unit}</span>
            </div>
          ))}
        </div>
      );
    }
    case "stack": {
      const items: [string, string][] = v.items;
      return <div className="flex flex-col gap-1.5">{items.map((it, i) => <Box key={i} on={act === it[0]} {...bind(it[0], it[1])} className="flex items-center gap-3" style={{ marginLeft: i * 14 }}><span className="mono text-[.62rem] text-acc">{String(i + 1).padStart(2, "0")}</span><span className="font-semibold">{it[0]}</span></Box>)}</div>;
    }
    case "boxes": {
      const items: [string, string, string][] = v.items;
      return <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(v.cols ?? 3, items.length)}, minmax(0,1fr))` }}>{items.map((it, i) => <Box key={i} on={act === it[0]} {...bind(it[0], it[2])}><div className="font-semibold text-text">{it[0]}</div><Lbl>{it[1]}</Lbl></Box>)}</div>;
    }
    case "formula": {
      const parts: [string, string, string | null][] = v.parts;
      return (
        <div>
          <div className="flex flex-wrap items-center gap-2">
            {parts.map((p, i) => (<span key={i} className="contents"><Box on={act === p[0]} {...bind(p[0], p[2] ?? undefined)} className="font-semibold">{p[0]}</Box>{p[1] && <span className="mono text-muted">{p[1]}</span>}</span>))}
            <span className="mono text-muted">=</span>
            <Box on={act === v.out} {...bind(v.out, v.foot)} className="border-acc/60 font-bold text-acc">{v.out}</Box>
          </div>
          {v.foot && <p className="mt-2 text-[.76rem] text-muted italic">{v.foot}</p>}
        </div>
      );
    }
    case "funnel": {
      const items: [string, number, string | null][] = v.items;
      const max = items[0][1];
      return (
        <div className="space-y-1.5">
          {items.map((it, i) => (
            <div key={i} {...bind(it[0], it[2])} className={cn("mx-auto", hot)} style={{ width: `${Math.max(28, (it[1] / max) * 100)}%` }}>
              <div className={cn("rounded-md px-3 py-2 flex items-center justify-between text-[.8rem] border transition-colors", act === it[0] ? "border-acc bg-ink-3 text-text" : v.leak === i ? "border-bad/50 bg-bad/10 text-text" : "border-line-soft bg-ink-1 text-dim")}>
                <span className="truncate">{it[0]}</span><b className="mono text-text ml-2">{it[1]}{v.unit}</b>
              </div>
            </div>
          ))}
        </div>
      );
    }
    case "chain": case "flow": {
      const items: [string, string][] = v.items;
      const horiz = v.t === "chain";
      return (
        <div className={cn("flex gap-2", horiz ? "flex-col sm:flex-row sm:items-stretch" : "flex-col")}>
          {items.map((it, i) => (
            <div key={i} className={cn("flex items-center gap-2", horiz ? "sm:flex-1" : "")}>
              <Box on={act === it[0]} {...bind(it[0], it[1])} className={cn("flex-1", v.hi === i && act !== it[0] && "border-signal/60")}><Lbl>{String(i + 1).padStart(2, "0")}</Lbl><div className="font-semibold text-[.82rem] mt-.5">{it[0]}</div></Box>
              {i < items.length - 1 && <span className={cn("text-muted mono", horiz ? "hidden sm:inline" : "hidden")}>→</span>}
            </div>
          ))}
        </div>
      );
    }
    case "scale": {
      const zones: [string, number, string, string?][] = v.zones;
      return (
        <div>
          <div className="flex justify-between mb-1"><Lbl>{v.ends?.[0]}</Lbl><Lbl>{v.ends?.[1]}</Lbl></div>
          <div className="relative flex h-14 gap-1">
            {zones.map((z, i) => <div key={i} {...bind(z[0], z[2])} className={cn("rounded-md border flex items-center justify-center text-[.8rem] font-semibold", hot, act === z[0] ? "border-acc bg-ink-3 text-text" : "border-line-soft bg-ink-1 text-dim hover:text-text")} style={{ flex: z[1] }}>{z[0]}</div>)}
            {v.marker != null && <div className="absolute -bottom-5 flex flex-col items-center" style={{ left: `${v.marker * 100}%` }}><span className="h-3 w-px bg-acc" /><Lbl>{v.mlabel}</Lbl></div>}
          </div>
          <div className="h-5" />
        </div>
      );
    }
    case "forces": {
      const L: [string, string][] = v.left, Rr: [string, string][] = v.right;
      return (
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <div className="space-y-1.5">{L.map((it, i) => <Box key={i} on={act === it[0]} {...bind(it[0], it[1])} className="text-right border-b/40">{it[0]} <span className="text-b">→</span></Box>)}</div>
          <div className="rounded-full border border-acc px-3 py-6 text-center font-display font-bold text-[.9rem] text-acc [writing-mode:vertical-rl] rotate-180">{v.center}</div>
          <div className="space-y-1.5">{Rr.map((it, i) => <Box key={i} on={act === it[0]} {...bind(it[0], it[1])} className="border-a/40"><span className="text-a">←</span> {it[0]}</Box>)}</div>
        </div>
      );
    }
    case "grid": {
      return (
        <div className="overflow-x-auto thin">
          <table className="tbl text-[.8rem]"><thead><tr><th></th>{v.cols.map((c: string) => <th key={c}>{c}</th>)}</tr></thead>
            <tbody>{v.rows.map((r: string[], i: number) => <tr key={i} {...bind(r[0], r.slice(1).join(" · "))} className={cn(hot, act === r[0] && "bg-ink-3")}>{r.map((c, j) => <td key={j} className={j ? "mono text-[.76rem]" : ""}>{c}</td>)}</tr>)}</tbody></table>
          {v.foot && <p className="mt-2 text-[.76rem] italic text-muted">{v.foot}</p>}
        </div>
      );
    }
    case "gap": {
      const a = v.a, b = v.b; const max = Math.max(a[1], b[1], 100);
      return (
        <div>
          <Lbl>{v.top}</Lbl>
          <div className="mt-2 space-y-2">
            {[a, b].map((x, i) => (
              <div key={i} {...bind(x[0], i ? v.note : undefined)} className={cn("grid grid-cols-[70px_1fr_auto] items-center gap-3", hot)}>
                <span className="text-[.8rem] text-dim">{x[0]}</span>
                <div className="h-6 rounded bg-ink-2 overflow-hidden"><div className="h-full rounded transition-all duration-700" style={{ width: `${(x[1] / max) * 100}%`, background: i ? "var(--acc)" : "var(--muted)" }} /></div>
                <b className="mono text-text">{x[1]}%</b>
              </div>
            ))}
          </div>
        </div>
      );
    }
    case "fishbone": {
      const cats: [string, string][] = v.cats; const top = cats.filter((_, i) => i % 2 === 0), bot = cats.filter((_, i) => i % 2 === 1);
      const row = (arr: [string, string][], up: boolean) => (
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${arr.length},1fr)` }}>
          {arr.map((c, i) => <div key={i} className="flex flex-col items-center">{!up && <span className="h-4 w-px bg-line" />}<Box on={act === c[0]} {...bind(c[0], c[1])} className="w-full text-center font-semibold">{c[0]}</Box>{up && <span className="h-4 w-px bg-line" />}</div>)}
        </div>
      );
      return (
        <div>
          {row(top, true)}
          <div className="my-1 flex items-center gap-2"><div className="h-[2px] flex-1 bg-gradient-to-r from-transparent via-line to-acc" /><div {...bind(v.head, v.cap)} className={cn("rounded-lg border border-acc bg-ink-3 px-3 py-2 text-[.82rem] font-bold text-acc", hot)}>{v.head}</div></div>
          {row(bot, false)}
        </div>
      );
    }
    case "tree": {
      const kids: [string, string][] = v.kids;
      return (
        <div className="flex flex-col items-center">
          <Box on={act === v.root[0]} {...bind(v.root[0], v.root[1])} className="font-bold text-text border-acc/60">{v.root[0]}</Box>
          <span className="h-4 w-px bg-line" />
          <span className="rounded-full border border-signal px-2 py-.5 font-mono text-[.6rem] text-signal">{v.gate}</span>
          <span className="h-4 w-px bg-line" />
          <div className="grid w-full gap-2" style={{ gridTemplateColumns: `repeat(${kids.length},1fr)` }}>{kids.map((k, i) => <Box key={i} on={act === k[0]} {...bind(k[0], k[1])} className="text-center font-semibold">{k[0]}</Box>)}</div>
        </div>
      );
    }
    case "lanes": {
      const lanes: string[] = v.lanes; const steps: [number, string, string][] = v.steps;
      return (
        <div className="grid gap-1" style={{ gridTemplateColumns: `90px repeat(${steps.length},1fr)` }}>
          {lanes.map((l, li) => (<span key={l} className="contents">
            <Lbl><span className="flex h-full items-center">{l}</span></Lbl>
            {steps.map((s, si) => s[0] === li ? <Box key={si} on={act === s[1]} {...bind(s[1], s[2])} className="text-center font-semibold text-[.76rem]">{s[1]}</Box> : <div key={si} className="border-b border-dashed border-line-soft" />)}
          </span>))}
        </div>
      );
    }
    case "diamond": {
      const labels: [string, string][] = v.labels;
      return (
        <div>
          <svg viewBox="0 0 400 110" className="w-full h-auto">
            {[0, 1].map((d) => { const x0 = d * 200; const on = act === labels[d * 2][0] || act === labels[d * 2 + 1][0]; return (
              <g key={d}>
                <polygon points={`${x0 + 10},55 ${x0 + 100},8 ${x0 + 100},102`} fill={act === labels[d * 2][0] ? "color-mix(in srgb,var(--acc) 30%,transparent)" : "var(--ink-2)"} stroke={on ? "var(--acc)" : "var(--line)"} className={hot} {...bind(labels[d * 2][0], labels[d * 2][1])} />
                <polygon points={`${x0 + 100},8 ${x0 + 190},55 ${x0 + 100},102`} fill={act === labels[d * 2 + 1][0] ? "color-mix(in srgb,var(--acc) 30%,transparent)" : "var(--ink-2)"} stroke={on ? "var(--acc)" : "var(--line)"} className={hot} {...bind(labels[d * 2 + 1][0], labels[d * 2 + 1][1])} />
              </g>); })}
            {labels.map((l, i) => <text key={i} x={55 + i * 90 + (i > 1 ? 20 : 0)} y={60} textAnchor="middle" fill="var(--text)" fontFamily="var(--f-mono)" fontSize="9" fontWeight={600} pointerEvents="none">{l[0].toUpperCase()}</text>)}
          </svg>
        </div>
      );
    }
    case "venn": {
      const items: [string, string][] = v.items;
      const pos = [[130, 90], [200, 90], [165, 150]];
      return (
        <svg viewBox="0 0 330 230" className="mx-auto max-w-[340px] w-full h-auto">
          {items.map((it, i) => <circle key={i} cx={pos[i][0]} cy={pos[i][1]} r={62} fill={["var(--a)", "var(--b)", "var(--signal)"][i]} fillOpacity={act === it[0] ? .45 : .18} stroke={["var(--a)", "var(--b)", "var(--signal)"][i]} className={hot} {...bind(it[0], it[1])} />)}
          {items.map((it, i) => <text key={i} x={[80, 250, 165][i]} y={[50, 50, 222][i]} textAnchor="middle" fill="var(--text)" fontFamily="var(--f-mono)" fontSize="10" fontWeight={600} pointerEvents="none">{it[0]}</text>)}
          <text x={165} y={112} textAnchor="middle" fill="var(--text)" fontFamily="var(--f-mono)" fontSize="8" pointerEvents="none">{v.center}</text>
        </svg>
      );
    }
    case "ring": {
      const items: [string, string][] = v.items; const n = items.length;
      return (
        <div className="relative mx-auto aspect-square w-full max-w-[300px]">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-acc bg-ink-3 px-3 py-3 text-center text-[.74rem] font-bold text-acc w-24 h-24 grid place-content-center">{v.center}</div>
          {items.map((it, i) => { const a = (i / n) * Math.PI * 2 - Math.PI / 2; const x = 50 + Math.cos(a) * 42, y = 50 + Math.sin(a) * 42; return <div key={i} style={{ left: `${x}%`, top: `${y}%` }} className="absolute -translate-x-1/2 -translate-y-1/2"><Box on={act === it[0]} {...bind(it[0], it[1])} className="whitespace-nowrap font-semibold text-[.74rem] px-2 py-1">{it[0]}</Box></div>; })}
        </div>
      );
    }
    default:
      return <pre className="text-xs text-muted">{JSON.stringify(v).slice(0, 200)}</pre>;
  }
}
