import { z } from 'zod';

const color = z.enum(['red', 'yellow', 'green', 'blue']);

/**
 * Raw `GAME_ACTION` payload for Fase 10 — player intents WITHOUT `playerId`
 * (the server injects the trusted socket identity). `timeout` is internal only.
 * Coarse guard; the engine enforces turn order, phase legality and the solver.
 */
export const fase10ActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('draw'), source: z.enum(['pile', 'discard']) }),
  z.object({
    type: z.literal('layPhase'),
    cardIds: z.array(z.string().min(1)).min(2).max(11),
    wildHints: z
      .array(
        z.object({
          cardId: z.string().min(1),
          value: z.number().int().min(1).max(12).optional(),
          color: color.optional(),
        }),
      )
      .max(8)
      .optional(),
  }),
  z.object({
    type: z.literal('hit'),
    cardId: z.string().min(1),
    groupId: z.string().min(1),
    end: z.enum(['low', 'high']).optional(),
  }),
  z.object({
    type: z.literal('discard'),
    cardId: z.string().min(1),
    skipTargetId: z.string().min(1).optional(),
  }),
]);

export type Fase10ActionInput = z.infer<typeof fase10ActionSchema>;

export const parseFase10Action = (raw: unknown): Fase10ActionInput => {
  const result = fase10ActionSchema.safeParse(raw);
  if (!result.success) {
    throw new Error('INVALID_ACTION:Malformed Fase 10 action payload');
  }
  return result.data;
};
