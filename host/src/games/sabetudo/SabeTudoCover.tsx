import coverUrl from './cover.webp';

/** Sabe-Tudo catalog cover — owner-supplied key art (see cover.CREDITS.md). */
export function SabeTudoCover() {
  return <img src={coverUrl} alt="Sabe-Tudo" className="game-cover-svg" />;
}
