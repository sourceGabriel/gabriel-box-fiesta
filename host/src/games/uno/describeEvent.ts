import type { GameEvent, UnoCard } from '@party/shared';

export const COLOR_LABEL: Record<string, string> = {
  red: 'vermelho',
  yellow: 'amarelo',
  green: 'verde',
  blue: 'azul',
  wild: 'coringa',
};

export const cardText = (card: UnoCard): string => {
  const color = COLOR_LABEL[card.color] ?? card.color;
  if (card.type === 'number') return `${color} ${card.value}`;
  if (card.type === 'draw_two') return `${color} +2`;
  if (card.type === 'skip') return `${color} bloqueio`;
  if (card.type === 'reverse') return `${color} inverte`;
  if (card.type === 'wild_draw_four') return 'coringa +4';
  return 'coringa';
};

/** A human line for the host event feed, or null for events not worth showing. */
export const describeEvent = (event: GameEvent, nameOf: (id: string) => string): string | null => {
  switch (event.type) {
    case 'round_started': return `Rodada ${event.round} começou`;
    case 'card_played': return `${nameOf(event.playerId)} jogou ${cardText(event.card)}`;
    case 'card_drawn': return `${nameOf(event.playerId)} comprou ${event.count} carta${event.count === 1 ? '' : 's'}`;
    case 'color_changed': return `Cor mudou para ${COLOR_LABEL[event.color] ?? event.color}`;
    case 'direction_changed': return 'Sentido invertido';
    case 'player_skipped': return `${nameOf(event.playerId)} perdeu a vez`;
    case 'uno_called': return `🔥 ${nameOf(event.playerId)} gritou UNO!`;
    case 'uno_penalty_applied': return `${nameOf(event.playerId)} pagou +${event.count} por não dizer UNO`;
    case 'round_finished': return `🏁 ${nameOf(event.winnerPlayerId)} venceu a rodada (+${event.roundScore})`;
    case 'game_finished': return `🏆 ${nameOf(event.gameWinnerPlayerId)} venceu a partida!`;
    case 'game_paused': return '⏸ Partida pausada';
    case 'game_resumed': return '▶ Partida retomada';
    default: return null;
  }
};
