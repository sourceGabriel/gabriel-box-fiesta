/**
 * Pure round planner for Sintonia. No engine state, no clock, no RNG of its own —
 * the seeded `random` is injected so a match is reproducible. Mirrors
 * `dilema/pairing.ts`.
 *
 * Each round:
 *  - every player is re-shuffled and dealt alternately to the two teams, so
 *    alliances churn round to round (an odd count leaves one team one larger);
 *  - the **médium** rotates through players by join order (`roundIndex % n`), so
 *    over a full match everyone is the médium a near-equal number of times;
 *  - the active team is simply whichever team the médium landed on.
 */

export type SintoniaPlan = {
  /** `[team 0 ids, team 1 ids]`, in the order the shuffle produced. */
  teams: [string[], string[]];
  activeTeamId: 0 | 1;
  mediumId: string;
};

/** `roundIndex` is 0-based. `players` is in stable join order. */
export function planRound(
  players: readonly { id: string }[],
  roundIndex: number,
  random: () => number,
): SintoniaPlan {
  const n = players.length;
  if (n < 3) {
    throw new Error('planRound needs at least 3 players');
  }

  const ids = players.map((p) => p.id);
  // Fisher–Yates with the injected RNG.
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }

  const teams: [string[], string[]] = [[], []];
  ids.forEach((id, i) => teams[i % 2].push(id));

  const mediumId = players[((roundIndex % n) + n) % n].id;
  const activeTeamId: 0 | 1 = teams[0].includes(mediumId) ? 0 : 1;

  return { teams, activeTeamId, mediumId };
}
