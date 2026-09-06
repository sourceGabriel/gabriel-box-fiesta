import type { CoupGameEvent } from '@party/shared';
import { ACTION_LABEL, CHARACTER_META } from './coupCards';

const charLabel = (c: keyof typeof CHARACTER_META): string => CHARACTER_META[c]?.label ?? c;

/** A human line for the host event feed, or null for events not worth showing. */
export const describeEvent = (event: CoupGameEvent, nameOf: (id: string) => string): string | null => {
  switch (event.type) {
    case 'turn_started':
      return `Vez de ${nameOf(event.playerId)}`;
    case 'action_declared': {
      const action = ACTION_LABEL[event.action] ?? event.action;
      const target = event.targetId ? ` → ${nameOf(event.targetId)}` : '';
      const claim = event.claimedCharacter ? ` (alega ${charLabel(event.claimedCharacter)})` : '';
      return `${nameOf(event.actorId)}: ${action}${target}${claim}`;
    }
    case 'challenge_made':
      return `⚔️ ${nameOf(event.challengerId)} desafia ${nameOf(event.challengedId)} (${charLabel(event.claimedCharacter)})`;
    case 'challenge_resolved':
      return event.challengedHeldCard
        ? `✅ ${nameOf(event.challengedId)} tinha ${charLabel(event.character)} — desafio falhou`
        : `❌ ${nameOf(event.challengedId)} blefou — desafio venceu`;
    case 'block_declared':
      return `🛡️ ${nameOf(event.blockerId)} bloqueia com ${charLabel(event.claimedCharacter)}`;
    case 'block_succeeded':
      return `🛡️ Bloqueio de ${nameOf(event.blockerId)} prevaleceu`;
    case 'coins_transferred':
      return `💰 ${nameOf(event.fromId)} → ${nameOf(event.toId)}: ${event.amount} moeda(s)`;
    case 'influence_revealed':
      return `💀 ${nameOf(event.playerId)} perdeu ${charLabel(event.character)}`;
    case 'player_eliminated':
      return `☠️ ${nameOf(event.playerId)} foi eliminado`;
    case 'exchange_started':
      return `🔄 ${nameOf(event.playerId)} está trocando cartas`;
    case 'game_finished':
      return `🏆 ${nameOf(event.winnerId)} venceu a partida!`;
    case 'game_paused':
      return '⏸ Partida pausada';
    case 'game_resumed':
      return '▶ Partida retomada';
    default:
      return null;
  }
};
