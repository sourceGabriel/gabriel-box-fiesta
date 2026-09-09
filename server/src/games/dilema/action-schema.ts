import { z } from 'zod';

/**
 * Raw `GAME_ACTION` payload for Dilema nos Trilhos — the player intents WITHOUT
 * `playerId` (the server injects the trusted socket identity). Coarse guard only;
 * the engine enforces step/track/type legality + team membership.
 */
const trackSchema = z.enum(['left', 'right']);

export const dilemaActionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('propose'),
    cardId: z.string().min(1).max(64),
    targetCardId: z.string().min(1).max(64).optional(),
  }),
  z.object({ type: z.literal('confirm') }),
  z.object({ type: z.literal('unconfirm') }),
  z.object({ type: z.literal('castVerdict'), killedTrack: trackSchema }),
]);

export type DilemaActionInput = z.infer<typeof dilemaActionSchema>;

export const parseDilemaAction = (raw: unknown): DilemaActionInput => {
  const result = dilemaActionSchema.safeParse(raw);
  if (!result.success) {
    throw new Error('INVALID_ACTION:Malformed Dilema action payload');
  }
  return result.data;
};
