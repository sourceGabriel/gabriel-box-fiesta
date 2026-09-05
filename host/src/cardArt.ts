import blue0 from '../../uno_card_sheet_crops/Blue_0.png';
import blue1 from '../../uno_card_sheet_crops/Blue_1.png';
import blue2 from '../../uno_card_sheet_crops/Blue_2.png';
import blue3 from '../../uno_card_sheet_crops/Blue_3.png';
import blue4 from '../../uno_card_sheet_crops/Blue_4.png';
import blue5 from '../../uno_card_sheet_crops/Blue_5.png';
import blue6 from '../../uno_card_sheet_crops/Blue_6.png';
import blue7 from '../../uno_card_sheet_crops/Blue_7.png';
import blue8 from '../../uno_card_sheet_crops/Blue_8.png';
import blue9 from '../../uno_card_sheet_crops/Blue_9.png';
import blueDraw2 from '../../uno_card_sheet_crops/Blue_Draw_2.png';
import blueReverse from '../../uno_card_sheet_crops/Blue_Reverse.png';
import blueSkip from '../../uno_card_sheet_crops/Blue_Skip.png';
import green0 from '../../uno_card_sheet_crops/Green_0.png';
import green1 from '../../uno_card_sheet_crops/Green_1.png';
import green2 from '../../uno_card_sheet_crops/Green_2.png';
import green3 from '../../uno_card_sheet_crops/Green_3.png';
import green4 from '../../uno_card_sheet_crops/Green_4.png';
import green5 from '../../uno_card_sheet_crops/Green_5.png';
import green6 from '../../uno_card_sheet_crops/Green_6.png';
import green7 from '../../uno_card_sheet_crops/Green_7.png';
import green8 from '../../uno_card_sheet_crops/Green_8.png';
import green9 from '../../uno_card_sheet_crops/Green_9.png';
import greenDraw2 from '../../uno_card_sheet_crops/Green_Draw_2.png';
import greenReverse from '../../uno_card_sheet_crops/Green_Reverse.png';
import greenSkip from '../../uno_card_sheet_crops/Green_Skip.png';
import red0 from '../../uno_card_sheet_crops/Red_0.png';
import red1 from '../../uno_card_sheet_crops/Red_1.png';
import red2 from '../../uno_card_sheet_crops/Red_2.png';
import red3 from '../../uno_card_sheet_crops/Red_3.png';
import red4 from '../../uno_card_sheet_crops/Red_4.png';
import red5 from '../../uno_card_sheet_crops/Red_5.png';
import red6 from '../../uno_card_sheet_crops/Red_6.png';
import red7 from '../../uno_card_sheet_crops/Red_7.png';
import red8 from '../../uno_card_sheet_crops/Red_8.png';
import red9 from '../../uno_card_sheet_crops/Red_9.png';
import redDraw2 from '../../uno_card_sheet_crops/Red_Draw_2.png';
import redReverse from '../../uno_card_sheet_crops/Red_Reverse.png';
import redSkip from '../../uno_card_sheet_crops/Red_Skip.png';
import yellow0 from '../../uno_card_sheet_crops/Yellow_0.png';
import yellow1 from '../../uno_card_sheet_crops/Yellow_1.png';
import yellow2 from '../../uno_card_sheet_crops/Yellow_2.png';
import yellow3 from '../../uno_card_sheet_crops/Yellow_3.png';
import yellow4 from '../../uno_card_sheet_crops/Yellow_4.png';
import yellow5 from '../../uno_card_sheet_crops/Yellow_5.png';
import yellow6 from '../../uno_card_sheet_crops/Yellow_6.png';
import yellow7 from '../../uno_card_sheet_crops/Yellow_7.png';
import yellow8 from '../../uno_card_sheet_crops/Yellow_8.png';
import yellow9 from '../../uno_card_sheet_crops/Yellow_9.png';
import yellowDraw2 from '../../uno_card_sheet_crops/Yellow_Draw_2.png';
import yellowReverse from '../../uno_card_sheet_crops/Yellow_Reverse.png';
import yellowSkip from '../../uno_card_sheet_crops/Yellow_Skip.png';
import wildColor from '../../uno_card_sheet_crops/Wild_Card_Change_Colour.png';
import wildDraw4 from '../../uno_card_sheet_crops/Wild_Card_Draw_4.png';
import cardBack from '../../uno_card_sheet_crops/Wild_Card_Empty.png';
import type { UnoCard } from '@party/shared';

const numberMap = {
  red: [red0, red1, red2, red3, red4, red5, red6, red7, red8, red9],
  yellow: [yellow0, yellow1, yellow2, yellow3, yellow4, yellow5, yellow6, yellow7, yellow8, yellow9],
  green: [green0, green1, green2, green3, green4, green5, green6, green7, green8, green9],
  blue: [blue0, blue1, blue2, blue3, blue4, blue5, blue6, blue7, blue8, blue9],
} as const;

const specialMap = {
  red: { skip: redSkip, reverse: redReverse, draw_two: redDraw2 },
  yellow: { skip: yellowSkip, reverse: yellowReverse, draw_two: yellowDraw2 },
  green: { skip: greenSkip, reverse: greenReverse, draw_two: greenDraw2 },
  blue: { skip: blueSkip, reverse: blueReverse, draw_two: blueDraw2 },
} as const;

export const getCardArt = (card: Pick<UnoCard, 'color' | 'type' | 'value'> | null | undefined): string => {
  if (!card) {
    return cardBack;
  }

  if (card.color === 'wild') {
    return card.type === 'wild_draw_four' ? wildDraw4 : wildColor;
  }

  if (card.type === 'number' && card.value !== null) {
    return numberMap[card.color][card.value] ?? cardBack;
  }

  const specialCards = specialMap[card.color];
  if (card.type === 'skip' || card.type === 'reverse' || card.type === 'draw_two') {
    return specialCards[card.type] ?? cardBack;
  }

  return cardBack;
};

export const getCardBackArt = (): string => wildColor;
