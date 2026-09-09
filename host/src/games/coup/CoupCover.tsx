import coverUrl from './cover.webp';

/** Coup catalog cover — owner-supplied key art (see cover.CREDITS.md). */
export function CoupCover() {
  return <img src={coverUrl} alt="Coup" className="game-cover" />;
}
