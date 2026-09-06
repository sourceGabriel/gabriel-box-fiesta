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

const clientSchema = z.discriminatedUnion('type', [
  base.extend({ type: z.literal('JOIN_ROOM'), payload: z.object({ roomCode: z.string().min(1), playerName: z.string().min(1).max(40), role: z.enum(['player', 'host']) }) }),
  base.extend({ type: z.literal('RECONNECT_SESSION'), payload: z.object({ roomCode: z.string().min(1), sessionToken: z.string().min(1), role: z.enum(['player', 'host']) }) }),
  base.extend({ type: z.literal('SELECT_GAME'), payload: z.object({ gameId: z.string().min(1) }) }),
  base.extend({ type: z.literal('START_GAME'), payload: z.object({ gameId: z.string().min(1).optional() }) }),
  base.extend({ type: z.literal('END_GAME'), payload: z.object({}) }),
  base.extend({ type: z.literal('NEXT_ROUND'), payload: z.object({}) }),
  // Generic per-game action. Only the envelope is validated here; the active game plugin validates `action`.
  base.extend({ type: z.literal('GAME_ACTION'), payload: z.object({ action: z.unknown() }) }),
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
