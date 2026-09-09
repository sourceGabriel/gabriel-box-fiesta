import coverUrl from './cover.webp';

/** Zap! catalog cover — owner-supplied key art (see cover.CREDITS.md). */
export function ZapCover() {
  return <img src={coverUrl} alt="Zap!" className="game-cover" />;
}
