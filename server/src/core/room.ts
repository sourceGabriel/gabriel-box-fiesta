import { nanoid } from 'nanoid';
import type { Player } from '@party/shared';
import { SessionService } from './session-service';
import { isPausable, isRounded, isTurnTimed, type GameInstance } from './game-plugin';
import { DEFAULT_GAME_ID, GAMES } from '../games/registry';

export type RoomState = 'accepting_players' | 'in_game' | 'paused';

export class Room {
  readonly id: string;
  readonly code: string;
  readonly maxPlayers: number;

  ownerPlayerId: string | null = null;
  state: RoomState = 'accepting_players';
  game: GameInstance | null = null;
  selectedGameId: string = DEFAULT_GAME_ID;
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
    this.game?.setPlayerConnected?.(player.id, true);
    return player;
  }

  /** Marks a player as offline. Keeps their identity/hand; does NOT transfer ownership yet. */
  markDisconnected(playerId: string, now: number): void {
    const player = this.players.get(playerId);
    if (!player) {
      return;
    }
    player.connected = false;
    player.lastSeenAt = now;
    this.game?.setPlayerConnected?.(playerId, false);
  }

  /**
   * Called after the disconnect grace window. If the player is still offline and was the owner,
   * hands ownership to another connected player. Returns true when ownership actually changed.
   */
  finalizeDisconnect(playerId: string): boolean {
    const player = this.players.get(playerId);
    if (!player || player.connected || this.ownerPlayerId !== playerId) {
      return false;
    }
    const replacement = [...this.players.values()].find((candidate) => candidate.connected && candidate.id !== playerId);
    this.ownerPlayerId = replacement?.id ?? null;
    return true;
  }

  /** Owner picks which game the lobby will play. Only valid before a game starts. */
  selectGame(gameId: string): void {
    if (this.state !== 'accepting_players') {
      throw new Error('GAME_IN_PROGRESS:Cannot change the game after it started');
    }
    if (!GAMES[gameId]) {
      throw new Error('UNKNOWN_GAME:No such game');
    }
    this.selectedGameId = gameId;
  }

  startGame(requestedBy: string | null, gameId: string = this.selectedGameId): void {
    if (!requestedBy) {
      throw new Error('NOT_ALLOWED:Player context required');
    }
    const plugin = GAMES[gameId];
    if (!plugin) {
      throw new Error('UNKNOWN_GAME:No such game');
    }
    const connectedPlayers = [...this.players.values()].filter((player) => player.connected);
    if (connectedPlayers.length < plugin.meta.minPlayers) {
      throw new Error(`NOT_ENOUGH_PLAYERS:${plugin.meta.name} needs at least ${plugin.meta.minPlayers} players`);
    }
    if (connectedPlayers.length > plugin.meta.maxPlayers) {
      throw new Error(`TOO_MANY_PLAYERS:${plugin.meta.name} allows at most ${plugin.meta.maxPlayers} players`);
    }

    this.selectedGameId = gameId;
    this.game = plugin.create({
      players: connectedPlayers.map((player) => ({ id: player.id, name: player.name })),
      roomCode: this.code,
      now: () => Date.now(),
      random: Math.random,
    });
    this.game.start();
    this.state = 'in_game';
    this.bumpStateVersion();
  }

  startNextRound(): void {
    if (!this.game) {
      throw new Error('GAME_NOT_STARTED:Game is not started');
    }
    if (!isRounded(this.game)) {
      throw new Error('NOT_SUPPORTED:This game has no rounds');
    }
    this.game.startNextRound();
    this.bumpStateVersion();
  }

  applyGameAction(playerId: string, action: unknown): void {
    if (!this.game) {
      throw new Error('GAME_NOT_STARTED:Game is not started');
    }
    this.game.handleAction(playerId, action);
    this.bumpStateVersion();
  }

  pauseGame(): void {
    if (!this.game) {
      throw new Error('GAME_NOT_STARTED:Game is not started');
    }
    if (!isPausable(this.game)) {
      throw new Error('NOT_SUPPORTED:This game cannot be paused');
    }
    this.game.pause(Date.now());
    this.state = 'paused';
    this.bumpStateVersion();
  }

  resumeGame(): void {
    if (!this.game) {
      throw new Error('GAME_NOT_STARTED:Game is not started');
    }
    if (!isPausable(this.game)) {
      throw new Error('NOT_SUPPORTED:This game cannot be paused');
    }
    this.game.resume(Date.now());
    this.state = 'in_game';
    this.bumpStateVersion();
  }

  /** Ends the current game and returns the room to the lobby, keeping `selectedGameId`
   * so the host lands on that game's lobby (Fase B: "play again" / "change game"). */
  endGame(): void {
    this.game = null;
    this.state = 'accepting_players';
    this.bumpStateVersion();
  }

  kickPlayer(playerId: string): void {
    const player = this.players.get(playerId);
    if (!player) {
      return;
    }
    this.players.delete(playerId);
    this.playersByName.delete(player.name.trim().toLowerCase());
    if (this.ownerPlayerId === playerId) {
      const replacement = [...this.players.values()].find((candidate) => candidate.connected && candidate.id !== playerId);
      this.ownerPlayerId = replacement?.id ?? null;
    }
  }

  applyTimeout(): void {
    if (!this.game || !isTurnTimed(this.game)) {
      return;
    }
    this.game.onTurnTimeout();
    this.bumpStateVersion();
  }

  bumpStateVersion(): void {
    this.stateVersion += 1;
  }
}
