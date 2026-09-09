import { z } from 'zod';

/**
 * Raw `GAME_ACTION` payload for Dilema nos Trilhos — the player intents WITHOUT
 * `playerId` (the server injects the trusted socket identity). Mirrors
 * `parseFdpAction`. Coarse guard only; the engine enforces track/type legality.
 */
const trackSchema = z.enum(['left', 'right']);

export const dilemaActionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('playCard'),
    cardId: z.string().min(1).max(64),
    targetTrack: trackSchema,
    targetCardId: z.string().min(1).max(64).optional(),
  }),
  z.object({ type: z.literal('pass') }),
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
