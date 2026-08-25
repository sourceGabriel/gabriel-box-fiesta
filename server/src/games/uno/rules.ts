import type { UnoCard } from '@party/shared';

export const canStackOnPending = (card: UnoCard, pendingType: 'draw_two' | 'wild_draw_four' | null): boolean => {
  if (!pendingType) {
    return false;
  }
  if (pendingType === 'draw_two') {
    return card.type === 'draw_two' || card.type === 'wild_draw_four';
  }
  return card.type === 'wild_draw_four';
};

export const isCardPlayable = (
  card: UnoCard,
  topDiscard: UnoCard,
  currentColor: 'red' | 'yellow' | 'green' | 'blue',
  pendingType: 'draw_two' | 'wild_draw_four' | null,
): boolean => {
  if (pendingType) {
    return canStackOnPending(card, pendingType);
  }
  if (card.type === 'wild' || card.type === 'wild_draw_four') {
    return true;
  }
  if (card.color === currentColor) {
    return true;
  }
  if (card.type === 'number' && topDiscard.type === 'number' && card.value === topDiscard.value) {
    return true;
  }
  return card.type === topDiscard.type;
};
