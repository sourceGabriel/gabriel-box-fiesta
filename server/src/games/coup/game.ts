import { STARTING_COINS, STARTING_HAND_SIZE, TOTAL_COINS } from './constants';
import { Deck } from './deck';
import { Player } from './player';
import type { Character, GameStatus, LogEntry, LogEventType, TurnPhase } from './types';

/**
 * Authoritative Coup match state. Ported from the standalone repo's
 * `src/engine/Game.ts`, trimmed to classic (no factions / reserve) with an
 * injected RNG and clock instead of `crypto.randomInt` / `Date.now()`.
 */
export class Game {
  players: Player[] = [];
  deck: Deck;
  currentPlayerIndex = 0;
  turnPhase: TurnPhase = 'AwaitingAction';
  treasury: number = TOTAL_COINS;
  actionLog: LogEntry[] = [];
  turnNumber = 1;
  status: GameStatus = 'Lobby';
  winnerId: string | null = null;

  constructor(
    readonly roomCode: string,
    private readonly random: () => number,
    private readonly now: () => number,
  ) {
    this.deck = new Deck(random);
  }

  initialize(playerInfos: Array<{ id: string; name: string }>): void {
    this.deck.reset();
    this.deck.shuffle();

    this.players = playerInfos.map((p, index) => {
      const player = new Player(p.id, p.name, index);
      for (let i = 0; i < STARTING_HAND_SIZE; i += 1) {
        const card = this.deck.draw();
        if (card) {
          player.influences.push({ character: card, revealed: false });
        }
      }
      player.coins = STARTING_COINS;
      this.treasury -= STARTING_COINS;
      return player;
    });

    this.currentPlayerIndex = Math.floor(this.random() * this.players.length);
    this.turnPhase = 'AwaitingAction';
    this.status = 'InProgress';
    this.turnNumber = 1;
    this.winnerId = null;
    this.actionLog = [];

    this.log(`Game started! ${this.currentPlayer.name}'s turn.`, 'game_start', null, null, null);
  }

  get currentPlayer(): Player {
    return this.players[this.currentPlayerIndex];
  }

  getPlayer(id: string): Player | undefined {
    return this.players.find((p) => p.id === id);
  }

  getAlivePlayers(): Player[] {
    return this.players.filter((p) => p.isAlive);
  }

  /** Advance to the next alive player's turn, or finish the game. */
  advanceTurn(): void {
    const alivePlayers = this.getAlivePlayers();
    if (alivePlayers.length <= 1) {
      this.status = 'Finished';
      this.turnPhase = 'GameOver';
      this.winnerId = alivePlayers[0]?.id ?? null;
      if (this.winnerId) {
        const winner = this.getPlayer(this.winnerId);
        this.log(`${winner?.name} wins the game!`, 'win', null, this.winnerId, winner?.name ?? null);
      }
      return;
    }

    let nextIndex = (this.currentPlayerIndex + 1) % this.players.length;
    while (!this.players[nextIndex].isAlive) {
      nextIndex = (nextIndex + 1) % this.players.length;
    }
    this.currentPlayerIndex = nextIndex;
    this.turnPhase = 'AwaitingAction';
    this.turnNumber += 1;

    this.log(`${this.currentPlayer.name}'s turn.`, 'turn_start', null, this.currentPlayer.id, this.currentPlayer.name);
  }

  checkWinCondition(): boolean {
    const alive = this.getAlivePlayers();
    if (alive.length <= 1) {
      this.status = 'Finished';
      this.turnPhase = 'GameOver';
      this.winnerId = alive[0]?.id ?? null;
      return true;
    }
    return false;
  }

  eliminatePlayer(player: Player): void {
    this.treasury += player.coins;
    player.coins = 0;
    this.log(`${player.name} has been eliminated!`, 'elimination', null, player.id, player.name);
  }

  giveCoins(player: Player, amount: number): void {
    const actual = Math.min(amount, this.treasury);
    player.addCoins(actual);
    this.treasury -= actual;
  }

  takeCoins(player: Player, amount: number): void {
    const actual = Math.min(amount, player.coins);
    player.removeCoins(actual);
    this.treasury += actual;
  }

  log(
    message: string,
    eventType: LogEventType = 'game_start',
    character: Character | null = null,
    actorId: string | null = null,
    actorName: string | null = null,
    targetId?: string | null,
    wasBluff?: boolean,
  ): void {
    const entry: LogEntry = {
      message,
      timestamp: this.now(),
      eventType,
      character,
      turnNumber: this.turnNumber,
      actorId,
      actorName,
      targetId: targetId ?? null,
    };
    if (wasBluff !== undefined) {
      entry.wasBluff = wasBluff;
    }
    this.actionLog.push(entry);
  }
}
