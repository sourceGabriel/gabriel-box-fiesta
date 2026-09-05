import { nanoid } from 'nanoid';
import type { Player } from '@party/shared';
import { SessionService } from './session-service';
import { UnoGame } from '../games/uno/uno-game';
import type { UnoAction } from '../games/uno/types';

export type RoomState = 'accepting_players' | 'in_game' | 'paused' | 'ended';

export class Room {
  readonly id: string;
  readonly code: string;
  readonly maxPlayers: number;

  ownerPlayerId: string | null = null;
  state: RoomState = 'accepting_players';
  game: UnoGame | null = null;
  stateVersion = 0;

  private readonly sessionService = new SessionService();
  private readonly players = new Map<string, Player>();
  private readonly playersByName = new Map<string, string>();

  constructor(code: string, maxPlayers = 8) {
    this.id = nanoid(12);
    this.code = code;
    this.maxPlayers = maxPlayers;
  }

  getPlayers(): Player[] {
    return [...this.players.values()];
  }

  getPlayer(playerId: string): Player | undefined {
    return this.players.get(playerId);
  }

  joinPlayer(name: string, now: number): { player: Player; sessionToken: string } {
    const normalized = name.trim().toLowerCase();
    if (!normalized) {
      throw new Error('INVALID_NAME:Player name is required');
    }
    if (this.players.size >= this.maxPlayers) {
      throw new Error('ROOM_FULL:Room is full');
    }
    if (this.playersByName.has(normalized)) {
      throw new Error('DUPLICATE_NAME:Name already exists in room');
    }

    const playerId = nanoid(10);
    const { session, token } = this.sessionService.issue(playerId, now);
    const player: Player = {
      id: playerId,
      name: name.trim(),
      connected: true,
      sessionId: session.id,
      joinedAt: now,
      lastSeenAt: now,
    };

    this.players.set(playerId, player);
    this.playersByName.set(normalized, playerId);

    if (!this.ownerPlayerId) {
      this.ownerPlayerId = playerId;
    }

    return { player, sessionToken: token };
  }

  reconnect(sessionToken: string, now: number): Player {
    const session = this.sessionService.validate(sessionToken, now);
    if (!session) {
      throw new Error('INVALID_SESSION:Session token is invalid or expired');
    }

    const player = this.players.get(session.playerId);
    if (!player) {
      throw new Error('PLAYER_NOT_FOUND:Player does not exist anymore');
    }

    player.connected = true;
    player.lastSeenAt = now;
    return player;
  }

  disconnectPlayer(playerId: string, now: number): void {
    const player = this.players.get(playerId);
    if (!player) {
      return;
    }
    player.connected = false;
    player.lastSeenAt = now;

    if (this.ownerPlayerId === playerId) {
      const replacement = [...this.players.values()].find((candidate) => candidate.connected && candidate.id !== playerId);
      this.ownerPlayerId = replacement?.id ?? null;
    }
  }

  startGame(requestedBy: string | null): void {
    if (!requestedBy) {
      throw new Error('NOT_ALLOWED:Player context required');
    }
    if (requestedBy !== this.ownerPlayerId) {
      throw new Error('NOT_ALLOWED:Only owner can start game');
    }
    const connectedPlayers = [...this.players.values()].filter((player) => player.connected);
    if (connectedPlayers.length < 2) {
      throw new Error('NOT_ENOUGH_PLAYERS:At least two players required');
    }

    this.game = new UnoGame(connectedPlayers.map((player) => ({ id: player.id, name: player.name })), this.code);
    this.game.start();
    this.state = 'in_game';
    this.bumpStateVersion();
  }

  // Host UI triggers starting the timer for the current turn.
  startTurnTimer(): void {
    if (!this.game) {
      throw new Error('GAME_NOT_STARTED:Game is not started');
    }
    this.game.startTurnTimer(Date.now());
    this.bumpStateVersion();
  }

  applyGameAction(action: UnoAction): void {
    if (!this.game) {
      throw new Error('GAME_NOT_STARTED:Game is not started');
    }
    this.game.handleAction(action);
    this.bumpStateVersion();
  }

  applyTimeout(): void {
    if (!this.game) {
      return;
    }
    this.game.onTurnTimeout();
    this.bumpStateVersion();
  }

  bumpStateVersion(): void {
    this.stateVersion += 1;
  }
}
