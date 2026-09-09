import { useEffect, useRef } from 'react';
import type { AvatarSpec } from '@party/shared';
import { bgHex, getAvatarPreset, sanitizeAvatar } from '../avatar';
import {
  BODY_URL,
  EYES_URL,
  HAIR_BASE,
  HAIR_RAMPS,
  HAIR_URL,
  HAT_URL,
  SHIRT_URL,
} from '../avatar-assets';

/**
 * Layered pixel avatar ("3x4 photo"). Composes LPC sprite parts
 * (background · hair-back · body+head · eyes · shirt · hair-front · hat) onto a
 * 46×46 canvas; the hair is recoloured at runtime from a base ramp. Loaded
 * images and recoloured hair are cached module-wide, so past the first render
 * this is effectively synchronous.
 */

const SPRITE = 46; // canvas is 46×46; sprite parts are 40×46 drawn at x=3
const OFFSET_X = 3;

const imgCache = new Map<string, Promise<HTMLImageElement>>();
const hairCache = new Map<string, HTMLCanvasElement>();

function loadImage(url: string): Promise<HTMLImageElement> {
  let p = imgCache.get(url);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
    imgCache.set(url, p);
  }
  return p;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** Recolour a hair sprite from the LPC base ramp to a named ramp (cached). */
function recolorHair(img: HTMLImageElement, url: string, colorId: string): HTMLCanvasElement {
  const key = `${url}|${colorId}`;
  const cached = hairCache.get(key);
  if (cached) return cached;

  const ramp = HAIR_RAMPS[colorId];
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx || !ramp) return canvas;

  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const px = data.data;
  const from = HAIR_BASE.map(hexToRgb);
  const to = ramp.map(hexToRgb);
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] === 0) continue;
    for (let c = 0; c < from.length; c += 1) {
      if (px[i] === from[c][0] && px[i + 1] === from[c][1] && px[i + 2] === from[c][2]) {
        px[i] = to[c][0];
        px[i + 1] = to[c][1];
        px[i + 2] = to[c][2];
        break;
      }
    }
  }
  ctx.putImageData(data, 0, 0);
  hairCache.set(key, canvas);
  return canvas;
}

export function Avatar({
  spec,
  size = 48,
  className = '',
  title,
}: {
  spec: AvatarSpec;
  size?: number;
  className?: string;
  title?: string;
}) {
  const a = sanitizeAvatar(spec);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bg = bgHex(a.bg);
  const preset = getAvatarPreset(a.preset);
  const key = `${a.preset ?? ''}|${a.gender}|${a.skin}|${a.hair}|${a.hairColor}|${a.eyes}|${a.shirt}|${a.hat}|${a.bg}`;

  useEffect(() => {
    if (preset) return;
    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const hair = HAIR_URL[a.hair];
    const layers: { url: string; recolor?: boolean }[] = [];
    if (hair?.back) layers.push({ url: hair.back, recolor: true });
    layers.push({ url: BODY_URL[a.gender]?.[a.skin] });
    layers.push({ url: EYES_URL[a.eyes] });
    layers.push({ url: SHIRT_URL[a.shirt]?.[a.gender] });
    if (hair?.front) layers.push({ url: hair.front, recolor: true });
    if (a.hat !== 'none' && HAT_URL[a.hat]) layers.push({ url: HAT_URL[a.hat] });

    const paint = (images: (HTMLImageElement | null)[]): void => {
      if (cancelled) return;
      ctx.clearRect(0, 0, SPRITE, SPRITE);
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, SPRITE, SPRITE);
      ctx.imageSmoothingEnabled = false;
      images.forEach((img, idx) => {
        if (!img) return;
        const layer = layers[idx];
        const src = layer.recolor ? recolorHair(img, layer.url, a.hairColor) : img;
        ctx.drawImage(src, OFFSET_X, 0);
      });
    };

    // Paint the background immediately so there is never a blank frame.
    paint(layers.map(() => null));

    Promise.all(
      layers.map((l) => (l.url ? loadImage(l.url).catch(() => null) : Promise.resolve(null))),
    ).then(paint);

    return () => {
      cancelled = true;
    };
    // `key` encodes every field of the sanitized spec that affects the paint.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (preset) {
    return (
      <img
        src={preset.face}
        alt={title ?? preset.label}
        className={`ui-avatar ui-avatar-preset ${className}`.trim()}
        style={{ width: size, height: size, background: bg }}
        draggable={false}
      />
    );
  }

  return (
    <canvas
      ref={canvasRef}
      width={SPRITE}
      height={SPRITE}
      className={`ui-avatar ${className}`.trim()}
      style={{ width: size, height: size, background: bg }}
      role="img"
      aria-label={title ?? 'Avatar'}
    />
  );
}
