import coverUrl from './cover.webp';

/** É Você! catalog cover — owner-supplied key art (see cover.CREDITS.md). */
export function EvoceCover() {
  return <img src={coverUrl} alt="É Você!" className="game-cover-svg" />;
}
