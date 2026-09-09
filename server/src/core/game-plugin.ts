import type { ContentTier, GameMeta, GameStatus, TurnTimer } from '@party/shared';

/**
 * Everything a game engine gets from the platform. No `pushCallback` here on
 * purpose — the server owns publish cadence and ordering (`stateVersion`).
 */
export interface GameContext {
  readonly players: ReadonlyArray<{ id: string; name: string }>;
  readonly roomCode: string;
  /** Injected clock — engines must not call `Date.now()` directly. */
  readonly now: () => number;
  /** Injected RNG in [0, 1) — engines must not call `Math.random()` directly. */
  readonly random: () => number;
  /**
   * Room content-intensity setting. Text games filter their prompt/question bank
   * by this; games with no `leve`/`pesado` split ignore it. Absent → `'pesado'`
   * (everything), matching the behaviour before the toggle existed.
   */
  readonly contentTier?: ContentTier;
  /**
   * Lobby-chosen match length (rounds / questions) for games that declare
   * `meta.lengthOptions`. Absent → the game uses its own default.
   */
  readonly matchLength?: number;
}

/**
 * The ONLY view the core (`Room`, `PartyServer`) has of a running game.
 * State and events are opaque (`unknown`); the core never inspects them.
 */
export interface GameInstance {
  start(): void;
  /** `playerId` is the trusted socket identity; `action` is the wire payload. Throws `Error('CODE:message')`. */
  handleAction(playerId: string, action: unknown): void;
  getPublicState(): unknown;
  getPrivateState(playerId: string): unknown;
  /** Drains and returns the events produced since the last call. */
  consumeEvents(): unknown[];
  /** Room-facing lifecycle projection used to drive NEXT_ROUND / results / return-to-lobby. */
  getStatus(): GameStatus;
  /** Optional: keep the engine's per-player connection flags in sync with the room. */
  setPlayerConnected?(playerId: string, connected: boolean): void;
}

/** Game runs an authoritative per-turn timer the server ticks. */
export interface TurnTimedGame extends GameInstance {
  onTurnTimeout(): void;
  getTimer(): TurnTimer | null;
}

/** Game supports multiple rounds with an intermission between them. */
export interface RoundedGame extends GameInstance {
  startNextRound(): void;
}

/** Game can be paused and resumed by the owner. */
export interface PausableGame extends GameInstance {
  pause(now: number): void;
  resume(now: number): void;
  isPaused(): boolean;
}

/** Game drives its own phase transitions off wall-clock time (e.g. simultaneous-submit rounds). */
export interface TickingGame extends GameInstance {
  tick(now: number): void;
}

export interface GamePlugin {
  readonly meta: GameMeta;
  create(ctx: GameContext): GameInstance;
  /** Optional boundary validation of a raw `GAME_ACTION` payload before it reaches the engine. */
  parseAction?(raw: unknown): unknown;
}

export const isTurnTimed = (g: GameInstance): g is TurnTimedGame =>
  typeof (g as Partial<TurnTimedGame>).onTurnTimeout === 'function';
export const isRounded = (g: GameInstance): g is RoundedGame =>
  typeof (g as Partial<RoundedGame>).startNextRound === 'function';
export const isPausable = (g: GameInstance): g is PausableGame =>
  typeof (g as Partial<PausableGame>).pause === 'function';
export const isTicking = (g: GameInstance): g is TickingGame =>
  typeof (g as Partial<TickingGame>).tick === 'function';
