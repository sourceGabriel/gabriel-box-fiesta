import coverUrl from './cover.webp';

/** FDP catalog cover — owner-supplied key art (see cover.CREDITS.md). */
export function FdpCover() {
  return <img src={coverUrl} alt="FDP — Foi De Propósito" className="game-cover-svg" />;
}
