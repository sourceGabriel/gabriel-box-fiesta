import coverUrl from './cover.webp';

/** Sintonia catalog cover — owner-supplied key art (see cover.CREDITS.md). */
export function SintoniaCover() {
  return <img src={coverUrl} alt="Sintonia" className="game-cover" />;
}
