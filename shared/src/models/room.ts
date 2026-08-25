import type { PlayerId, RoomId, SessionId } from './common';

export type Player = {
  id: PlayerId;
  name: string;
  connected: boolean;
  sessionId: SessionId;
  joinedAt: number;
  lastSeenAt: number;
};

export type Session = {
  id: SessionId;
  playerId: PlayerId;
  token: string;
  issuedAt: number;
  lastSeenAt: number;
};

export type RoomSummary = {
  id: RoomId;
  code: string;
  ownerPlayerId: PlayerId | null;
  playerCount: number;
  maxPlayers: number;
};
