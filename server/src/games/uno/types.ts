import type { UnoColor } from '@party/shared';

export type UnoAction =
  | { type: 'play_card'; playerId: string; cardId: string; chosenColor?: Exclude<UnoColor, 'wild'> }
  | { type: 'draw_card'; playerId: string; playDrawnCardId?: string; chosenColor?: Exclude<UnoColor, 'wild'> }
  | { type: 'choose_color'; playerId: string; color: Exclude<UnoColor, 'wild'> }
  | { type: 'uno_call'; playerId: string }
  | { type: 'uno_challenge'; playerId: string; targetPlayerId: string }
  | { type: 'timeout' };
