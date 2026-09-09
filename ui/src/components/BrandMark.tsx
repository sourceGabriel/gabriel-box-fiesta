export type BrandVariant = 'game' | 'platform';
export type BrandSize = 'sm' | 'md' | 'lg' | 'xl';

/**
 * The wordmark. `variant="game"` is the amber→red game logo (default, e.g. "UNO");
 * `variant="platform"` is the multicolour "Box Fiesta" mark. The game text is a
 * prop so the name can change without touching every screen.
 */
export function BrandMark({
  text,
  variant = 'game',
  size = 'md',
}: {
  text: string;
  variant?: BrandVariant;
  size?: BrandSize;
}) {
  return <span className={`ui-brand ui-brand--${variant} ui-brand--${size}`}>{text}</span>;
}
