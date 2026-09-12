import type { Fase10Card, Fase10GameEvent } from '@party/shared';
import type { BroadcastItem } from '@party/ui';

const cardLabel = (c: Fase10Card): string => {
  if (c.kind === 'wild') return 'Curinga';
  if (c.kind === 'skip') return 'Pula';
  const color = { red: 'vermelho', yellow: 'amarelo', green: 'verde', blue: 'azul' }[c.color];
  return `${c.value} ${color}`;
};

/** A human line for the host event feed, or null for events not worth showing. */
export const describeEvent = (
  event: Fase10GameEvent,
  nameOf: (id: string) => string,
): string | null => {
  switch (event.type) {
    case 'game_started':
      return `🎴 Fase 10 — vence quem completar a fase ${event.targetPhase}`;
    case 'hand_started':
      return `Mão ${event.hand} · ${nameOf(event.startingPlayerId)} começa`;
    case 'card_drawn':
      return `${nameOf(event.playerId)} comprou ${event.source === 'discard' ? 'do descarte' : 'do monte'}`;
    case 'phase_laid':
      return `📥 ${nameOf(event.playerId)} baixou a fase ${event.phaseIndex}!`;
    case 'hit_made':
      return `➕ ${nameOf(event.playerId)} encaixou uma carta`;
    case 'card_discarded':
      return `${nameOf(event.playerId)} descartou ${cardLabel(event.card)}`;
    case 'player_skipped':
      return `⏭️ ${nameOf(event.playerId)} foi pulado por ${nameOf(event.byPlayerId)}`;
    case 'hand_over':
      return event.winnerId ? `🏁 ${nameOf(event.winnerId)} zerou a mão ${event.hand}` : `🏁 Mão ${event.hand} encerrada`;
    case 'game_over':
      return event.winnerId === null ? '🤝 Empate!' : `🏆 ${nameOf(event.winnerId)} venceu!`;
    case 'game_paused':
      return '⏸ Partida pausada';
    case 'game_resumed':
      return '▶ Partida retomada';
    default:
      return null;
  }
};

/**
 * Fase 10 events → broadcast lower-thirds for the host TV. `card_drawn` /
 * `card_discarded` already get a bespoke fly-card animation and `phase_laid`
 * a row glow (see the fly-card layer in `Fase10HostView.tsx`) — this only
 * adds the beats those don't cover.
 */
export const broadcastFor = (event: Fase10GameEvent, nameOf: (id: string) => string): BroadcastItem | null => {
  switch (event.type) {
    case 'hand_started':
      return { tier: 'important', graphic: 'headline', eyebrow: `Mão ${event.hand}`, title: `${nameOf(event.startingPlayerId)} começa` };
    case 'phase_laid':
      return { tier: 'important', graphic: 'lower-third', eyebrow: 'Baixou', title: `${nameOf(event.playerId)} completou a fase ${event.phaseIndex}!`, playerId: event.playerId };
    case 'game_paused':
      return { tier: 'critical', graphic: 'headline', title: 'Partida pausada' };
    default:
      return null;
  }
};
