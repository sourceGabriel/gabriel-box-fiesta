import { z } from 'zod';

/**
 * Raw `GAME_ACTION` payload for Lorota! — the player intents WITHOUT `playerId`
 * (the server injects the trusted socket identity). Mirrors `parseZapAction`.
 */
export const lorotaActionSchema = z.discriminatedUnion('type', [
  // Coarse guard only — the engine trims whitespace and clamps to MAX_LIE_LEN.
  z.object({ type: z.literal('submitLie'), text: z.string().min(1).max(2000) }),
  z.object({ type: z.literal('submitGuess'), optionId: z.string().min(1).max(64) }),
]);

export type LorotaActionInput = z.infer<typeof lorotaActionSchema>;

export const parseLorotaAction = (raw: unknown): LorotaActionInput => {
  const result = lorotaActionSchema.safeParse(raw);
  if (!result.success) {
    throw new Error('INVALID_ACTION:Malformed Lorota action payload');
  }
  return result.data;
};
