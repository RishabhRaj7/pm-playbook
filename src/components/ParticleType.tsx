import { useEffect, useRef } from "react";
import { cssVar, onInkChange, ParticleField, resolveFontFamily } from "@/lib/particles";

/* Type printed in a few thousand points. Move over it and the letters come
   apart around the pointer; press and they scatter harder. A click (or tap)
   re-forms the points into the next shape in `shapes`, then back round.
   On narrow screens a long single line is split in two so it stays big. */
function fitLines(lines: string[], width: number, breakAt: number): string[] {
  if (lines.length !== 1 || width >= breakAt) return lines;
  const words = lines[0].split(" ");
  if (words.length < 2) return lines;
  const imbalance = (i: number) => Math.abs(words.slice(0, i).join(" ").length - words.slice(i).join(" ").length);
  let best = 1;
  for (let i = 2; i < words.length; i++) if (imbalance(i) < imbalance(best)) best = i;
  return [words.slice(0, best).join(" "), words.slice(best).join(" ")];
}

interface Props {
  /** Shapes to cycle through on click; the first is the resting one. */
  shapes: string[][];
  /** Accessible name; the canvas itself is decorative. */
  label: string;
  className?: string;
  weight?: number;
  /** Below this canvas width a one-line shape is split onto two lines. */
  breakAt?: number;
  align?: "left" | "center";
  /** Grid density: [gap, dot] for narrow and wide screens. */
  density?: { narrow: [number, number]; wide: [number, number] };
}

export default function ParticleType({ shapes, label, className = "", weight = 800, breakAt = 560, align = "center", density = { narrow: [3, 1.9], wide: [4, 2.5] } }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fieldRef = useRef<ParticleField | null>(null);
  const indexRef = useRef(0);
  const shapesRef = useRef(shapes);
  const familyRef = useRef("");
  shapesRef.current = shapes;

  const spec = (lines: string[]) => ({ lines: fitLines(lines, canvasRef.current?.clientWidth ?? 1000, breakAt), family: familyRef.current, weight, align, leading: 0.06 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const narrow = window.innerWidth < 640;
    const [gap, dot] = narrow ? density.narrow : density.wide;
    let field: ParticleField;
    try {
      field = new ParticleField(canvas, { gap, dot, radius: narrow ? 60 : 110, accentShare: 0.045, onFirstForm: () => canvas.parentElement?.setAttribute("data-formed", "") });
    } catch {
      return;
    }
    fieldRef.current = field;
    const applyColors = () => field.setColors({ ink: cssVar("--text"), accent: cssVar("--acc") });

    let cancelled = false;
    familyRef.current = resolveFontFamily("font-display");
    // The display face must be loaded before we rasterise it, or the points
    // would trace the fallback font.
    const ready = document.fonts?.load ? document.fonts.load(`${weight} 120px ${familyRef.current}`) : Promise.resolve();
    ready.catch(() => undefined).then(() => {
      if (cancelled) return;
      applyColors();
      field.resize();
      field.setShape(spec(shapesRef.current[indexRef.current] ?? shapesRef.current[0]), false);
    });

    // A change of edition or spot colour recolours the points without re-forming them.
    const stopInk = onInkChange(applyColors);
    // Re-fit after a resize, re-splitting lines if the width crossed `breakAt`.
    let lastW = canvas.clientWidth;
    const ro = new ResizeObserver(() => {
      field.resize();
      const w = canvas.clientWidth;
      if ((lastW < breakAt) !== (w < breakAt) && familyRef.current) field.setShape(spec(shapesRef.current[indexRef.current]), false);
      lastW = w;
    });
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => field.setVisible(e.isIntersecting));
    io.observe(canvas);

    return () => { cancelled = true; stopInk(); ro.disconnect(); io.disconnect(); field.destroy(); fieldRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cycle = () => {
    const field = fieldRef.current, list = shapesRef.current;
    if (!field || list.length < 2 || !familyRef.current) return;
    indexRef.current = (indexRef.current + 1) % list.length;
    field.setShape(spec(list[indexRef.current]));
  };

  return (
    <div className={`relative ${className}`}>
      <canvas ref={canvasRef} onClick={cycle} aria-hidden="true" className="absolute inset-0 h-full w-full cursor-crosshair touch-pan-y" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
