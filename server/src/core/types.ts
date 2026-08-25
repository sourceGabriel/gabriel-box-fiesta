import type { Player } from '@party/shared';

export type ConnectionRole = 'host' | 'player';

export type PlayerConnectionContext = {
  role: ConnectionRole;
  playerId?: string;
  sessionId?: string;
};

export type RoomConfig = {
  id: string;
  code: string;
  maxPlayers: number;
};

export type CreatePlayerInput = {
  name: string;
  now: number;
};

export type PlayerLike = Player;
