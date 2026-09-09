/**
 * @party/ui — the "atiçada": a one-liner the TV drops between rounds to roast
 * whoever's last and hype whoever's leading. PT-BR, acid, deterministic per
 * `seed` (pass the round number) so it doesn't flicker on re-render.
 */

export interface TauntStanding {
  name: string;
  score: number;
}

/** Templates: `{L}` = current leader, `{U}` = current last place. */
const LINES: string[] = [
  '{L} na frente. Alguém avisa o {U} que isso aqui é competição.',
  '{U} em último — mas tá aqui pela companhia, e isso é lindo, {U}.',
  '{L} tá jogando um jogo. {U} tá jogando outro, bem mais tranquilo.',
  '{L} lidera. Guarda esse pico, {U}: a vida real vem logo depois.',
  'Se o {U} fosse a Taylor Swift, essa aqui era a era da regravação.',
  '{L} disparou. {U}, o placar ligou — quer deixar recado?',
  'Entre {L} e {U} tem uma pontuação e um abismo existencial.',
  '{L} no topo, {U} no fundo. Ninguém lembra do segundo lugar mesmo.',
  '{U} por último. Talento a gente não compra — e o {L} tá aí provando.',
  '{L} brilhando, {U} segurando a vela. Bonito de ver.',
  '{U}, calma: alguém tem que fazer o {L} se sentir especial.',
  '{L} lidera com folga. Suspeito, {U}, mas seguimos.',
  '{L} sabe das coisas. {U} sabe que a rodada acabou, e olhe lá.',
  '{U} em último de novo. A consistência é admirável, {U}. O {L} que se cuide.',
];

/** A roast/hype line for the current standings, or null if there's nobody to compare. */
export function roundTaunt(standings: TauntStanding[], seed = 0): string | null {
  const ranked = [...standings].sort((a, b) => b.score - a.score);
  if (ranked.length < 2) return null;
  const leader = ranked[0];
  const last = ranked[ranked.length - 1];
  if (leader.score === last.score) {
    return 'Empate geral. Ninguém aqui presta o suficiente pra desempatar.';
  }
  const tpl = LINES[Math.abs(Math.trunc(seed)) % LINES.length];
  return tpl.replaceAll('{L}', leader.name).replaceAll('{U}', last.name);
}
