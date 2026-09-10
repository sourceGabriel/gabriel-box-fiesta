import type { CoupGameEvent } from '@party/shared';
import type { BroadcastItem } from '@party/ui';
import { ACTION_LABEL, CHARACTER_META } from './coupCards';

const charLabel = (c: keyof typeof CHARACTER_META): string => CHARACTER_META[c]?.label ?? c;

/**
 * Coup events → broadcast lower-thirds. The loud beats (a challenge, a card
 * reveal, an elimination) are `<Moment>`s fired from the view; here we narrate
 * the table's rhythm.
 */
export const broadcastFor = (event: CoupGameEvent, nameOf: (id: string) => string): BroadcastItem | null => {
  switch (event.type) {
    case 'turn_started':
      return { tier: 'ambient', graphic: 'lower-third', eyebrow: 'Vez de', title: nameOf(event.playerId), playerId: event.playerId };
    case 'action_declared': {
      const action = ACTION_LABEL[event.action] ?? event.action;
      const target = event.targetId ? ` → ${nameOf(event.targetId)}` : '';
      const claim = event.claimedCharacter ? ` · alega ${charLabel(event.claimedCharacter)}` : '';
      return { tier: 'important', graphic: 'lower-third', eyebrow: nameOf(event.actorId), title: `${action}${target}${claim}`, playerId: event.actorId };
    }
    case 'block_declared':
      return { tier: 'important', graphic: 'lower-third', eyebrow: 'Bloqueio', title: `${nameOf(event.blockerId)} — ${charLabel(event.claimedCharacter)}`, playerId: event.blockerId };
    case 'block_succeeded':
      return { tier: 'important', graphic: 'lower-third', eyebrow: 'Bloqueio', title: `${nameOf(event.blockerId)} prevaleceu`, playerId: event.blockerId };
    case 'coins_transferred':
      return { tier: 'ambient', graphic: 'lower-third', eyebrow: 'Moedas', title: `${nameOf(event.fromId)} → ${nameOf(event.toId)}: ${event.amount}` };
    case 'exchange_started':
      return { tier: 'important', graphic: 'lower-third', eyebrow: 'Embaixador', title: `${nameOf(event.playerId)} troca cartas`, playerId: event.playerId };
    case 'game_paused':
      return { tier: 'critical', graphic: 'headline', title: 'Partida pausada' };
    default:
      return null;
  }
};
