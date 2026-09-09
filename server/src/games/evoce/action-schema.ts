import { z } from 'zod';
import { COORD_SPACE, MAX_POINTS_PER_STROKE, MAX_STROKES } from './constants';

const strokeSchema = z.object({
  color: z.string().min(1).max(24),
  width: z.number().min(0.5).max(64),
  // flat [x0,y0,x1,y1,…] in the 0…COORD_SPACE square; at least one point (2 numbers).
  points: z
    .array(z.number().min(-64).max(COORD_SPACE + 64))
    .min(2)
    .max(MAX_POINTS_PER_STROKE * 2),
});

const drawingSchema = z.object({
  strokes: z.array(strokeSchema).max(MAX_STROKES),
});

/**
 * Raw `GAME_ACTION` payload for É Você! — the player intents WITHOUT `playerId`
 * (the server injects the trusted socket identity). Mirrors `parseFdpAction`.
 */
export const evoceActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('votePlayer'), targetId: z.string().min(1).max(64) }),
  z.object({ type: z.literal('playJoker') }),
  z.object({ type: z.literal('submitCaption'), text: z.string().min(1).max(2000) }),
  z.object({ type: z.literal('submitDrawing'), drawing: drawingSchema }),
  z.object({ type: z.literal('castVote'), submissionId: z.string().min(1).max(64) }),
]);

export type EvoceActionInput = z.infer<typeof evoceActionSchema>;

export const parseEvoceAction = (raw: unknown): EvoceActionInput => {
  const result = evoceActionSchema.safeParse(raw);
  if (!result.success) {
    throw new Error('INVALID_ACTION:Malformed É Você! action payload');
  }
  return result.data;
};
