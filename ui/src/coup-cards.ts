import type { CoupCharacter } from '@party/shared';
import ambassadorArt from '../../coup_card_art/ambassador.webp';
import assassinArt from '../../coup_card_art/assassin.webp';
import captainArt from '../../coup_card_art/captain.webp';
import contessaArt from '../../coup_card_art/contessa.webp';
import dukeArt from '../../coup_card_art/duke.webp';
import backArt from '../../coup_card_art/back.webp';

/**
 * Character presentation for Coup — label + emoji fallback + accent colour + portrait art.
 * Single source shared by host and mobile (mirrors `@party/ui/uno-cards`).
 */
export const CHARACTER_META: Record<
  CoupCharacter,
  { label: string; emoji: string; color: string; art: string }
> = {
  Duke: { label: 'Duque', emoji: '👑', color: '#9b59b6', art: dukeArt },
  Assassin: { label: 'Assassino', emoji: '🗡️', color: '#475569', art: assassinArt },
  Captain: { label: 'Capitão', emoji: '⚓', color: '#2980b9', art: captainArt },
  Ambassador: { label: 'Embaixador', emoji: '📜', color: '#27ae60', art: ambassadorArt },
  Contessa: { label: 'Condessa', emoji: '🌹', color: '#e74c3c', art: contessaArt },
};

/** Portrait for a claimed/revealed character; the card back when unknown. */
export const getCoupCardArt = (character: CoupCharacter | null | undefined): string =>
  character ? CHARACTER_META[character].art : backArt;

/** The face-down influence card back. */
export const getCoupCardBackArt = (): string => backArt;
