import { z } from 'zod';

const character = z.enum(['Duke', 'Assassin', 'Captain', 'Ambassador', 'Contessa']);
const actionType = z.enum(['Income', 'ForeignAid', 'Coup', 'Tax', 'Assassinate', 'Steal', 'Exchange']);

/**
 * A raw `GAME_ACTION` payload for Coup — the player intents, WITHOUT `playerId`
 * (the server injects the trusted socket identity).
 */
export const coupActionSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('declare_action'), action: actionType, targetId: z.string().min(1).optional() }),
  z.object({ kind: z.literal('challenge') }),
  z.object({ kind: z.literal('pass_challenge') }),
  z.object({ kind: z.literal('block'), character }),
  z.object({ kind: z.literal('pass_block') }),
  z.object({ kind: z.literal('challenge_block') }),
  z.object({ kind: z.literal('pass_challenge_block') }),
  z.object({ kind: z.literal('lose_influence'), influenceIndex: z.number().int().nonnegative() }),
  z.object({ kind: z.literal('exchange'), keepIndices: z.array(z.number().int().nonnegative()).max(4) }),
]);

export type CoupActionInput = z.infer<typeof coupActionSchema>;

export const parseCoupAction = (raw: unknown): CoupActionInput => {
  const result = coupActionSchema.safeParse(raw);
  if (!result.success) {
    throw new Error('INVALID_ACTION:Malformed Coup action payload');
  }
  return result.data;
};
