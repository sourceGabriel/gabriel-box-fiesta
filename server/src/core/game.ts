export interface Game<TState, TAction, TEvent, TPublicState, TPrivateState> {
  start(): void;
  handleAction(action: TAction): TEvent[];
  onTurnTimeout(): TEvent[];
  getState(): TState;
  getPublicState(): TPublicState;
  getPrivateState(playerId: string): TPrivateState;
  consumeEvents(): TEvent[];
}
