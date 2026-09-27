// A small particle engine for the nameplate and the topic numerals.
// (Ported from The Daily Index masthead.)
//
// Every particle has a home. Text is rasterised off-screen, sampled on a
// grid, and each lit sample becomes a home. Particles spring towards their
// homes, get pushed aside by the pointer, and print in the spot colour while
// they are moving — so a disturbance reads as a flash of signal that settles
// back into ink. Changing the text just hands out new homes; spare particles
// drift as dust.
//
// Pure canvas 2D, no dependencies. Rendering stops when the canvas is off
// screen, the tab is hidden, or everything has settled; reduced-motion
// readers get one static frame.

export interface ShapeSpec {
  /** One string per line. */
  lines: string[];
  /** CSS font-family stack to draw with. */
  family: string;
  weight?: number;
  /** Fraction of the canvas width the widest line may fill. */
  fill?: number;
  /** Gap between lines as a multiple of the font size. */
  leading?: number;
  align?: "left" | "center";
}

interface Particle {
  x: number; y: number; vx: number; vy: number;
  hx: number; hy: number;
  /** Has a home in the current shape (false = dust). */
  bound: boolean;
  /** Seconds before this particle starts heading home. */
  delay: number;
  seed: number;
  /** A few particles are permanently spot-coloured. */
  accent: boolean;
}

export interface FieldOptions {
  /** Grid step in CSS px when sampling shapes. Smaller = denser. */
  gap?: number;
  /** Dot size in CSS px. */
  dot?: number;
  /** Pointer influence radius in CSS px. */
  radius?: number;
  /** Share of particles that are always spot-coloured. */
  accentShare?: number;
  /** Share of extra particles that drift as dust. */
  dust?: number;
  onFirstForm?: () => void;
}

const SPRING = 0.055;
const DAMPING = 0.84;
const LIT = 1.1; // speed above which a particle prints in the spot colour

export class ParticleField {
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private width = 0;
  private height = 0;
  private dpr = 1;
  private raf = 0;
  private idle = 0;
  private running = false;
  private visible = true;
  private pointer = { x: -9999, y: -9999, active: false, down: false };
  private formedAt = performance.now();
  private shape: ShapeSpec | null = null;
  private colors = { ink: "#151411", accent: "#2437d0" };
  private reduced: boolean;
  private opts: Required<Omit<FieldOptions, "onFirstForm">> & Pick<FieldOptions, "onFirstForm">;
  private cleanup: Array<() => void> = [];
  private firstFormFired = false;
  private destroyed = false;

  constructor(private canvas: HTMLCanvasElement, options: FieldOptions = {}) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas 2d unavailable");
    this.ctx = ctx;
    this.opts = {
      gap: options.gap ?? 4,
      dot: options.dot ?? 2.2,
      radius: options.radius ?? 90,
      accentShare: options.accentShare ?? 0.05,
      dust: options.dust ?? 0.04,
      onFirstForm: options.onFirstForm,
    };
    this.reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    this.bindEvents();
  }

  // ---- public API --------------------------------------------------------

  setColors(colors: Partial<{ ink: string; accent: string }>) {
    this.colors = { ...this.colors, ...colors };
    if (!this.running) this.draw(performance.now());
  }

  /** Resize to the canvas's CSS box and re-home particles on the current shape. */
  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (w === this.width && h === this.height && dpr === this.dpr) return;
    this.width = w; this.height = h; this.dpr = dpr;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // A page opened in a background tab lays the canvas out at ~0×0 first; when the
    // real size arrives the shape is re-sampled here, so the loop must be restarted too.
    if (this.shape) { this.applyShape(this.shape, false); this.wake(); }
  }

  setShape(shape: ShapeSpec, burst = true) {
    this.shape = shape;
    this.applyShape(shape, burst);
    this.wake();
  }

  /** Throw every particle outwards; they spring back on their own. */
  burst(cx = this.width / 2, cy = this.height / 2, power = 14) {
    for (const p of this.particles) {
      const dx = p.x - cx, dy = p.y - cy;
      const d = Math.hypot(dx, dy) || 1;
      const f = power * (0.4 + Math.random() * 0.9);
      p.vx += (dx / d) * f + (Math.random() - 0.5) * 4;
      p.vy += (dy / d) * f + (Math.random() - 0.5) * 4;
    }
    this.wake();
  }

  setVisible(visible: boolean) {
    this.visible = visible;
    if (visible) this.wake();
  }

  destroy() {
    this.destroyed = true;
    this.running = false;
    cancelAnimationFrame(this.raf);
    window.clearTimeout(this.idle);
    for (const fn of this.cleanup) fn();
    this.cleanup = [];
  }

  // ---- shape sampling ----------------------------------------------------

  private sample(shape: ShapeSpec): Array<[number, number]> {
    const w = this.width, h = this.height;
    if (w < 8 || h < 8) return []; // not laid out yet; resize() will sample again
    const off = document.createElement("canvas");
    off.width = w; off.height = h;
    const c = off.getContext("2d", { willReadFrequently: true });
    if (!c) return [];

    const weight = shape.weight ?? 800;
    const leading = shape.leading ?? 0.08;
    const fill = shape.fill ?? 0.98;
    // Measure real ink extents (ascenders, descenders) at 100px, then scale so
    // the widest line fits the width and the whole block fits the height.
    c.font = `${weight} 100px ${shape.family}`;
    const m = shape.lines.map((l) => {
      const mm = c.measureText(l);
      return { w: mm.width, up: mm.actualBoundingBoxAscent || 72, down: mm.actualBoundingBoxDescent || 0 };
    });
    const widest = Math.max(...m.map((x) => x.w), 1);
    const block100 = m.reduce((s, x) => s + x.up + x.down, 0) + leading * 100 * (m.length - 1);
    const size = Math.min((w * fill * 100) / widest, (h * 0.94 * 100) / block100);
    const k = size / 100;

    c.font = `${weight} ${size}px ${shape.family}`;
    c.fillStyle = "#000";
    c.textBaseline = "alphabetic";
    let y = (h - block100 * k) / 2;
    shape.lines.forEach((line, i) => {
      y += m[i].up * k;
      const x = shape.align === "left" ? 0 : (w - m[i].w * k) / 2;
      c.fillText(line, x, y);
      y += m[i].down * k + leading * size;
    });

    const data = c.getImageData(0, 0, w, h).data;
    const gap = this.opts.gap;
    const pts: Array<[number, number]> = [];
    for (let yy = 0; yy < h; yy += gap) {
      for (let xx = 0; xx < w; xx += gap) {
        if (data[(yy * w + xx) * 4 + 3] > 140) pts.push([xx, yy]);
      }
    }
    return pts;
  }

  private applyShape(shape: ShapeSpec, burst: boolean) {
    const pts = this.sample(shape);
    // Shuffle so re-homing mixes particles across the whole word, which is
    // what makes a morph look like liquid rather than a slide.
    for (let i = pts.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pts[i], pts[j]] = [pts[j], pts[i]];
    }
    const needed = pts.length + Math.round(pts.length * this.opts.dust);
    const fresh = this.particles.length === 0;

    while (this.particles.length < needed) {
      const [sx, sy] = this.spawnPoint();
      this.particles.push({ x: sx, y: sy, vx: 0, vy: 0, hx: sx, hy: sy, bound: false, delay: 0, seed: Math.random() * 1000, accent: Math.random() < this.opts.accentShare });
    }
    if (this.particles.length > needed) this.particles.length = needed;

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (i < pts.length) { p.hx = pts[i][0]; p.hy = pts[i][1]; p.bound = true; }
      else { p.hx = Math.random() * this.width; p.hy = Math.random() * this.height; p.bound = false; }
      // The first formation sweeps left to right, like type being set; later morphs start together.
      p.delay = fresh ? (p.hx / this.width) * 0.55 + Math.random() * 0.25 : Math.random() * 0.12;
    }

    this.formedAt = performance.now();
    if (burst && !fresh) this.burst(this.width / 2, this.height / 2, 6);
    if (this.reduced) {
      for (const p of this.particles) { p.x = p.hx; p.y = p.hy; p.vx = 0; p.vy = 0; }
      this.draw(performance.now());
      this.fireFirstForm();
    }
  }

  private spawnPoint(): [number, number] {
    // Scatter wide — some start outside the box and fly in.
    return [(Math.random() * 1.6 - 0.3) * this.width, (Math.random() * 2.2 - 0.6) * this.height];
  }

  // ---- loop --------------------------------------------------------------

  private wake() {
    if (this.destroyed || this.reduced || this.running || !this.visible || document.hidden) return;
    window.clearTimeout(this.idle);
    this.running = true;
    this.raf = requestAnimationFrame(this.tick);
  }

  private tick = (now: number) => {
    if (this.destroyed || !this.visible || document.hidden) { this.running = false; return; }
    const moving = this.step(now);
    this.draw(now);
    if (moving || this.pointer.active) {
      this.raf = requestAnimationFrame(this.tick);
    } else {
      this.running = false;
      this.fireFirstForm();
      // Breathe: a gentle nudge every few seconds so the nameplate never
      // looks frozen, without burning frames in between.
      this.idle = window.setTimeout(() => {
        if (!this.running && this.visible && !this.destroyed) { this.breathe(); this.wake(); }
      }, 4200);
    }
  };

  private breathe() {
    // A soft wave travelling down one column of the type.
    const band = Math.random() * this.width;
    for (const p of this.particles) {
      const d = Math.abs(p.hx - band);
      if (d < 60) p.vy += (Math.random() - 0.5) * 1.6 * (1 - d / 60);
    }
  }

  private fireFirstForm() {
    if (this.firstFormFired) return;
    this.firstFormFired = true;
    this.opts.onFirstForm?.();
  }

  private step(now: number): boolean {
    const t = (now - this.formedAt) / 1000;
    const { x: mx, y: my, active } = this.pointer;
    const R = this.opts.radius, R2 = R * R;
    let energy = 0;

    for (const p of this.particles) {
      if (t > p.delay) {
        const k = p.bound ? SPRING : SPRING * 0.05;
        p.vx += (p.hx - p.x) * k;
        p.vy += (p.hy - p.y) * k;
        if (!p.bound) {
          p.vx += Math.sin(now * 0.0006 + p.seed) * 0.02;
          p.vy += Math.cos(now * 0.0005 + p.seed) * 0.02;
        }
      }
      if (active) {
        const dx = p.x - mx, dy = p.y - my;
        const d2 = dx * dx + dy * dy;
        if (d2 < R2) {
          const d = Math.sqrt(d2) || 1;
          const f = (1 - d / R) ** 2 * (this.pointer.down ? 9 : 4.2);
          // Push out, with a swirl so the hole looks like a vortex, not a dent.
          p.vx += (dx / d) * f + (-dy / d) * f * 0.45;
          p.vy += (dy / d) * f + (dx / d) * f * 0.45;
        }
      }
      p.vx *= DAMPING; p.vy *= DAMPING;
      p.x += p.vx; p.y += p.vy;
      energy += Math.abs(p.vx) + Math.abs(p.vy) + (p.bound ? Math.abs(p.hx - p.x) + Math.abs(p.hy - p.y) : 0);
    }
    return energy / Math.max(1, this.particles.length) > 0.05;
  }

  private draw(now: number) {
    const { ctx } = this;
    ctx.clearRect(0, 0, this.width, this.height);
    const s = this.opts.dot, half = s / 2;

    // Batch by colour: settled ink, dust, then the lit (moving) particles.
    ctx.fillStyle = this.colors.ink;
    ctx.beginPath();
    for (const p of this.particles) {
      if (!p.bound || p.accent || Math.abs(p.vx) + Math.abs(p.vy) > LIT) continue;
      ctx.rect(p.x - half, p.y - half, s, s);
    }
    ctx.fill();

    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    for (const p of this.particles) {
      if (p.bound) continue;
      const tw = 0.6 + 0.4 * Math.sin(now * 0.002 + p.seed);
      ctx.rect(p.x - half * tw, p.y - half * tw, s * tw, s * tw);
    }
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.fillStyle = this.colors.accent;
    ctx.beginPath();
    for (const p of this.particles) {
      if (!p.bound) continue;
      if (!p.accent && Math.abs(p.vx) + Math.abs(p.vy) <= LIT) continue;
      ctx.rect(p.x - half, p.y - half, s, s);
    }
    ctx.fill();
  }

  // ---- input -------------------------------------------------------------

  private bindEvents() {
    const c = this.canvas;
    const toLocal = (e: PointerEvent) => {
      const r = c.getBoundingClientRect();
      this.pointer.x = e.clientX - r.left;
      this.pointer.y = e.clientY - r.top;
    };
    const move = (e: PointerEvent) => { toLocal(e); this.pointer.active = true; this.wake(); };
    const leave = () => { this.pointer.active = false; this.pointer.down = false; };
    const down = (e: PointerEvent) => { toLocal(e); this.pointer.down = true; this.pointer.active = true; this.wake(); };
    const up = (e: PointerEvent) => {
      this.pointer.down = false;
      // Touch has no hover: let go and the hole closes.
      if (e.pointerType !== "mouse") this.pointer.active = false;
    };
    const vis = () => { if (!document.hidden) this.wake(); };
    c.addEventListener("pointermove", move);
    c.addEventListener("pointerleave", leave);
    c.addEventListener("pointerdown", down);
    c.addEventListener("pointerup", up);
    c.addEventListener("pointercancel", leave);
    document.addEventListener("visibilitychange", vis);
    this.cleanup.push(() => {
      c.removeEventListener("pointermove", move);
      c.removeEventListener("pointerleave", leave);
      c.removeEventListener("pointerdown", down);
      c.removeEventListener("pointerup", up);
      c.removeEventListener("pointercancel", leave);
      document.removeEventListener("visibilitychange", vis);
    });
  }
}

/** The resolved font stack of an element carrying `className`, for canvas. */
export function resolveFontFamily(className: string): string {
  const probe = document.createElement("span");
  probe.className = className;
  probe.style.position = "absolute";
  probe.style.visibility = "hidden";
  document.body.appendChild(probe);
  const family = getComputedStyle(probe).fontFamily;
  probe.remove();
  return family;
}

/** Current value of a CSS custom property on <html>. */
export function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/** Call `fn` whenever the edition (data-theme) or the spot colour (inline --acc) changes. */
export function onInkChange(fn: () => void): () => void {
  const mo = new MutationObserver(fn);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "style"] });
  return () => mo.disconnect();
}
