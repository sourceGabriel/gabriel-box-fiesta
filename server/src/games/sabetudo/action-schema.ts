import { z } from 'zod';
import { OPTION_COUNT } from './constants';

/**
 * Raw `GAME_ACTION` payload for Sabe-Tudo — the player intent WITHOUT `playerId`
 * (the server injects the trusted socket identity). Mirrors `parseLorotaAction`.
 */
export const sabeTudoActionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('submitAnswer'),
    optionIndex: z.number().int().min(0).max(OPTION_COUNT - 1),
  }),
]);

export type SabeTudoActionInput = z.infer<typeof sabeTudoActionSchema>;

export const parseSabeTudoAction = (raw: unknown): SabeTudoActionInput => {
  const result = sabeTudoActionSchema.safeParse(raw);
  if (!result.success) {
    throw new Error('INVALID_ACTION:Malformed Sabe-Tudo action payload');
  }
  return result.data;
};
