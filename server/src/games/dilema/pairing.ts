/**
 * Pure round planner for Dilema nos Trilhos. No engine state, no clock, no RNG
 * of its own — the seeded `random` is injected so a match is reproducible.
 *
 * Each round:
 *  - the Maquinista rotates through players by join order (`roundIndex % n`), so
 *    over a full match everyone conducts a near-equal number of times;
 *  - the remaining players are re-shuffled and dealt alternately to the two
 *    tracks, so alliances churn round to round. With an odd remainder one track
 *    is one player larger — that is fine, and matches how sides fill up in the
 *    tabletop game.
 */

export type DilemaAssignment = {
  conductorId: string;
  left: string[];
  right: string[];
};

/** `roundIndex` is 0-based. `players` is in stable join order. */
export function planRound(
  players: readonly { id: string }[],
  roundIndex: number,
  random: () => number,
): DilemaAssignment {
  const n = players.length;
  if (n < 3) {
    throw new Error('planRound needs at least 3 players');
  }

  const conductorIdx = ((roundIndex % n) + n) % n;
  const conductorId = players[conductorIdx].id;

  const rest = players.filter((_, i) => i !== conductorIdx).map((p) => p.id);
  // Fisher–Yates with the injected RNG.
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }

  const left: string[] = [];
  const right: string[] = [];
  rest.forEach((id, i) => (i % 2 === 0 ? left : right).push(id));

  return { conductorId, left, right };
}
