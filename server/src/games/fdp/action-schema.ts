import { z } from 'zod';

/**
 * Raw `GAME_ACTION` payload for FDP — the player intents WITHOUT `playerId`
 * (the server injects the trusted socket identity). Mirrors `parseLorotaAction`.
 */
export const fdpActionSchema = z.discriminatedUnion('type', [
  // Coarse guard only — the engine trims whitespace and clamps to MAX_ANSWER_LEN.
  z.object({ type: z.literal('submitAnswer'), text: z.string().min(1).max(2000) }),
  z.object({ type: z.literal('castVote'), answerId: z.string().min(1).max(64) }),
]);

export type FdpActionInput = z.infer<typeof fdpActionSchema>;

export const parseFdpAction = (raw: unknown): FdpActionInput => {
  const result = fdpActionSchema.safeParse(raw);
  if (!result.success) {
    throw new Error('INVALID_ACTION:Malformed FDP action payload');
  }
  return result.data;
};
