import { z } from 'zod';
import type { ClientMessage, ServerMessage } from '@party/shared';
import { nanoid } from 'nanoid';

const base = z.object({
  messageId: z.string().min(1),
  protocolVersion: z.literal(1),
  sentAt: z.number(),
  clientSeq: z.number().int().nonnegative().optional(),
  type: z.string(),
  payload: z.unknown(),
});

const color = z.enum(['red', 'yellow', 'green', 'blue']);

const clientSchema = z.discriminatedUnion('type', [
  base.extend({ type: z.literal('JOIN_ROOM'), payload: z.object({ roomCode: z.string().min(1), playerName: z.string().min(1).max(40), role: z.enum(['player', 'host']) }) }),
  base.extend({ type: z.literal('RECONNECT_SESSION'), payload: z.object({ roomCode: z.string().min(1), sessionToken: z.string().min(1), role: z.enum(['player', 'host']) }) }),
  base.extend({ type: z.literal('START_GAME'), payload: z.object({}) }),
  base.extend({ type: z.literal('PLAY_CARD'), payload: z.object({ cardId: z.string().min(1), chosenColor: color.optional() }) }),
  base.extend({ type: z.literal('DRAW_CARD'), payload: z.object({ playDrawnCardId: z.string().optional(), chosenColor: color.optional() }) }),
  base.extend({ type: z.literal('CHOOSE_COLOR'), payload: z.object({ color }) }),
  base.extend({ type: z.literal('UNO_CALL'), payload: z.object({}) }),
  base.extend({ type: z.literal('UNO_CHALLENGE'), payload: z.object({ targetPlayerId: z.string().min(1) }) }),
  base.extend({ type: z.literal('PAUSE_GAME'), payload: z.object({}) }),
  base.extend({ type: z.literal('RESUME_GAME'), payload: z.object({}) }),
  base.extend({ type: z.literal('KICK_PLAYER'), payload: z.object({ targetPlayerId: z.string().min(1) }) }),
  base.extend({ type: z.literal('PING'), payload: z.object({}) }),
]);

export const parseClientMessage = (input: unknown): ClientMessage => clientSchema.parse(input) as ClientMessage;

export const makeServerMessage = <T extends ServerMessage['type']>(
  type: T,
  payload: Extract<ServerMessage, { type: T }>['payload'],
): Extract<ServerMessage, { type: T }> => ({
  messageId: nanoid(16),
  protocolVersion: 1,
  sentAt: Date.now(),
  type,
  payload,
} as Extract<ServerMessage, { type: T }>);
