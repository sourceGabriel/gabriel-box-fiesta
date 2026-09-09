import coverUrl from './cover.webp';

/** Lorota! catalog cover — owner-supplied key art (see cover.CREDITS.md). */
export function LorotaCover() {
  return <img src={coverUrl} alt="Lorota!" className="game-cover" />;
}
