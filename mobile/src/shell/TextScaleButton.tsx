import { useEffect, useState } from 'react';

/**
 * Accessibility: a small floating control that scales the whole UI's text.
 * Cycles 100% → 115% → 130% → 145% → 100% by bumping the root font-size (every
 * size in the app is in rem/em). The choice persists per device.
 */
const STEPS = [1, 1.15, 1.3, 1.45];
const KEY = 'party:textscale';

const read = (): number => {
  try {
    const v = Number(localStorage.getItem(KEY));
    return STEPS.includes(v) ? v : 1;
  } catch {
    return 1;
  }
};

export function TextScaleButton() {
  const [scale, setScale] = useState(read);

  useEffect(() => {
    document.documentElement.style.fontSize = scale === 1 ? '' : `${scale * 100}%`;
    try {
      localStorage.setItem(KEY, String(scale));
    } catch {
      // ignore storage errors
    }
  }, [scale]);

  const next = (): void => {
    const i = STEPS.indexOf(scale);
    setScale(STEPS[(i + 1) % STEPS.length]);
  };

  return (
    <button
      type="button"
      className="text-scale-btn"
      onClick={next}
      aria-label={`Tamanho do texto: ${Math.round(scale * 100)}%. Tocar para aumentar.`}
      title="Tamanho do texto"
    >
      <span aria-hidden="true">A</span>
      <span aria-hidden="true" className="text-scale-plus">＋</span>
      {scale !== 1 ? <span className="text-scale-pct">{Math.round(scale * 100)}%</span> : null}
    </button>
  );
}
