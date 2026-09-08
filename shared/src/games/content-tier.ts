/**
 * Content intensity for the text games (Zap!, Lorota!, Sabe-Tudo, FDP).
 *
 * - `leve`  — the tamer subset. Crude at most; nothing explicit. Safe-ish for a
 *   mixed crowd / a work party you'll only mildly regret.
 * - `pesado` — everything: the `leve` set plus the +18 packs (explicit sex,
 *   scatology, gallows humour, drugs, taboo, archetype satire).
 *
 * A room-level setting the host flips in the lobby (`SET_CONTENT_TIER`), carried
 * in `GAME_CATALOG`, and passed to a game engine through `GameContext.contentTier`.
 * Games that have no `leve`/`pesado` split (UNO, Coup) ignore it.
 */
export type ContentTier = 'leve' | 'pesado';

export const CONTENT_TIERS: readonly ContentTier[] = ['leve', 'pesado'];

/** The default when a room/client says nothing — everything on, matching the
 * behaviour before the toggle existed. */
export const DEFAULT_CONTENT_TIER: ContentTier = 'pesado';
