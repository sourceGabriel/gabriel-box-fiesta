import { z } from 'zod';

/**
 * Raw `GAME_ACTION` payload for Zap! — the player intents WITHOUT `playerId`
 * (the server injects the trusted socket identity). Mirrors `parseCoupAction`.
 */
export const zapActionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('submitAnswer'),
    slot: z.number().int().nonnegative().max(8),
    // Coarse guard only — the engine trims whitespace and clamps to MAX_ANSWER_LEN.
    text: z.string().min(1).max(2000),
  }),
  z.object({
    type: z.literal('castVote'),
    duelIndex: z.number().int().nonnegative().max(64),
    slot: z.number().int().nonnegative().max(16),
  }),
]);

export type ZapActionInput = z.infer<typeof zapActionSchema>;

export const parseZapAction = (raw: unknown): ZapActionInput => {
  const result = zapActionSchema.safeParse(raw);
  if (!result.success) {
    throw new Error('INVALID_ACTION:Malformed Zap action payload');
  }
  return result.data;
};
