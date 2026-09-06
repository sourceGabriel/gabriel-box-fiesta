import { z } from 'zod';

const color = z.enum(['red', 'yellow', 'green', 'blue']);

/**
 * A raw `GAME_ACTION` payload for UNO — the 5 player verbs, WITHOUT `playerId`
 * (the server injects the trusted socket identity). `timeout` is internal only.
 */
export const unoActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('play_card'), cardId: z.string().min(1), chosenColor: color.optional() }),
  z.object({ type: z.literal('draw_card'), playDrawnCardId: z.string().min(1).optional(), chosenColor: color.optional() }),
  z.object({ type: z.literal('choose_color'), color }),
  z.object({ type: z.literal('uno_call') }),
  z.object({ type: z.literal('uno_challenge'), targetPlayerId: z.string().min(1) }),
]);

export type UnoActionInput = z.infer<typeof unoActionSchema>;

export const parseUnoAction = (raw: unknown): UnoActionInput => {
  const result = unoActionSchema.safeParse(raw);
  if (!result.success) {
    throw new Error('INVALID_ACTION:Malformed UNO action payload');
  }
  return result.data;
};
