import coverUrl from './cover.webp';

/** UNO catalog cover — owner-supplied key art (see cover.CREDITS.md). */
export function UnoCover() {
  return <img src={coverUrl} alt="UNO" className="game-cover" />;
}
