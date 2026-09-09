import { useCallback, useEffect, useRef, useState } from 'react';
import type { EvoceDrawing, EvoceStroke } from '@party/shared';

/**
 * A finger/mouse paint pad for phone controllers (É Você!'s rabisco / final
 * rounds). Captures the drawing as a light **stroke list** in a 0…1000 square —
 * not a bitmap — so it travels tiny over the wire and renders crisp at any size
 * on the TV (see `DrawingView`).
 *
 * `onSubmit` fires with the current `{ strokes }`. Give it a fresh `key` per round
 * so it resets.
 */

const SPACE = 1000;
const COLORS = ['#111827', '#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#ffffff'];
const WIDTHS = [6, 14, 28];
const MIN_STEP = SPACE / 110; // drop points closer than this to keep strokes light
const MAX_STROKES = 240;
/** Keep the submitted stroke list comfortably under the socket frame cap. */
const MAX_PAYLOAD_CHARS = 60_000;

/** Decimate points (keeping endpoints) until the serialized drawing fits the wire. */
function fitDrawing(strokes: EvoceStroke[]): EvoceStroke[] {
  let out = strokes.slice(0, MAX_STROKES).map((s) => ({
    color: s.color,
    width: s.width,
    points: s.points.map((n) => Math.round(n)),
  }));
  for (let pass = 0; pass < 6 && JSON.stringify({ strokes: out }).length > MAX_PAYLOAD_CHARS; pass += 1) {
    out = out.map((s) => {
      if (s.points.length <= 6) return s;
      const kept: number[] = [];
      for (let i = 0; i < s.points.length - 2; i += 4) kept.push(s.points[i], s.points[i + 1]);
      kept.push(s.points[s.points.length - 2], s.points[s.points.length - 1]);
      return { ...s, points: kept };
    });
  }
  return out;
}

export function DrawingCanvas({
  prompt,
  submitted = false,
  disabled = false,
  onSubmit,
}: {
  prompt?: string;
  submitted?: boolean;
  disabled?: boolean;
  onSubmit: (drawing: EvoceDrawing) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const strokesRef = useRef<EvoceStroke[]>([]);
  const currentRef = useRef<number[] | null>(null);
  const drawingRef = useRef(false);
  const [color, setColor] = useState(COLORS[0]);
  const [width, setWidth] = useState(WIDTHS[1]);
  const [, force] = useState(0);
  const rerender = () => force((n) => n + 1);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { width: w, height: h } = canvas;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0f1826';
    ctx.fillRect(0, 0, w, h);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const paint = (s: EvoceStroke) => {
      if (s.points.length < 2) return;
      ctx.strokeStyle = s.color;
      ctx.lineWidth = (s.width / SPACE) * w;
      ctx.beginPath();
      ctx.moveTo((s.points[0] / SPACE) * w, (s.points[1] / SPACE) * h);
      for (let i = 2; i < s.points.length; i += 2) {
        ctx.lineTo((s.points[i] / SPACE) * w, (s.points[i + 1] / SPACE) * h);
      }
      if (s.points.length === 2) ctx.lineTo((s.points[0] / SPACE) * w + 0.1, (s.points[1] / SPACE) * h + 0.1);
      ctx.stroke();
    };
    strokesRef.current.forEach(paint);
    if (currentRef.current) paint({ color, width, points: currentRef.current });
  }, [color, width]);

  // Size the backing store to the wrapper (square, capped).
  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const resize = () => {
      const side = Math.min(wrap.clientWidth, 420);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = side * dpr;
      canvas.height = side * dpr;
      canvas.style.width = `${side}px`;
      canvas.style.height = `${side}px`;
      redraw();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [redraw]);

  useEffect(redraw, [redraw]);

  const toSpace = (e: React.PointerEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * SPACE;
    const y = ((e.clientY - rect.top) / rect.height) * SPACE;
    return [
      Math.round(Math.max(0, Math.min(SPACE, x))),
      Math.round(Math.max(0, Math.min(SPACE, y))),
    ];
  };

  const start = (e: React.PointerEvent) => {
    if (disabled || submitted || strokesRef.current.length >= MAX_STROKES) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drawingRef.current = true;
    currentRef.current = toSpace(e);
    redraw();
  };
  const move = (e: React.PointerEvent) => {
    if (!drawingRef.current || !currentRef.current) return;
    const [x, y] = toSpace(e);
    const pts = currentRef.current;
    const dx = x - pts[pts.length - 2];
    const dy = y - pts[pts.length - 1];
    if (dx * dx + dy * dy >= MIN_STEP * MIN_STEP) {
      pts.push(x, y);
      redraw();
    }
  };
  const end = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    if (currentRef.current && currentRef.current.length >= 2) {
      strokesRef.current.push({ color, width, points: currentRef.current });
    }
    currentRef.current = null;
    redraw();
    rerender();
  };

  const undo = () => {
    strokesRef.current.pop();
    redraw();
    rerender();
  };
  const clear = () => {
    strokesRef.current = [];
    currentRef.current = null;
    redraw();
    rerender();
  };

  const hasInk = strokesRef.current.length > 0;

  return (
    <div className="ui-draw" ref={wrapRef}>
      {prompt ? <p className="ui-draw-prompt">{prompt}</p> : null}
      <canvas
        ref={canvasRef}
        className="ui-draw-canvas"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
        onPointerCancel={end}
      />
      <div className="ui-draw-tools">
        <div className="ui-draw-colors">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={`ui-draw-color ${color === c ? 'is-on' : ''}`}
              style={{ background: c }}
              aria-label={`cor ${c}`}
              onClick={() => setColor(c)}
            />
          ))}
        </div>
        <div className="ui-draw-widths">
          {WIDTHS.map((w) => (
            <button
              key={w}
              type="button"
              className={`ui-draw-width ${width === w ? 'is-on' : ''}`}
              aria-label={`espessura ${w}`}
              onClick={() => setWidth(w)}
            >
              <span style={{ width: w / 1.6, height: w / 1.6 }} />
            </button>
          ))}
        </div>
        <button type="button" className="ui-draw-act" onClick={undo} disabled={!hasInk || submitted}>
          ↶
        </button>
        <button type="button" className="ui-draw-act" onClick={clear} disabled={!hasInk || submitted}>
          🗑
        </button>
      </div>
      <button
        type="button"
        className="ui-btn ui-btn--primary ui-draw-send"
        disabled={disabled || submitted || !hasInk}
        onClick={() => onSubmit({ strokes: fitDrawing(strokesRef.current) })}
      >
        {submitted ? '✓ enviado' : 'Enviar desenho'}
      </button>
    </div>
  );
}
