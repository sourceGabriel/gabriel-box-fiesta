import { z } from 'zod';

/**
 * Raw `GAME_ACTION` payload for Sintonia — the player intents WITHOUT `playerId`
 * (the server injects the trusted socket identity). Mirrors `parseDilemaAction`.
 * Coarse guard only; the engine enforces role + clue legality (length, digits).
 */
export const sintoniaActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('submitClue'), clue: z.string().min(1).max(200) }),
  z.object({ type: z.literal('moveDial'), value: z.number().min(0).max(100) }),
  z.object({ type: z.literal('betSide'), side: z.enum(['left', 'right']) }),
]);

export type SintoniaActionInput = z.infer<typeof sintoniaActionSchema>;

export const parseSintoniaAction = (raw: unknown): SintoniaActionInput => {
  const result = sintoniaActionSchema.safeParse(raw);
  if (!result.success) {
    throw new Error('INVALID_ACTION:Malformed Sintonia action payload');
  }
  return result.data;
};
