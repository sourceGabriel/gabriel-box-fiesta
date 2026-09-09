/**
 * Pure round planner for Sintonia. No teams anymore — every round just rotates
 * the **médium** through the players by join order (`roundIndex % n`), so over a
 * full match everyone is the médium a near-equal number of times. Everyone else
 * is a guesser.
 *
 * `random` is accepted for signature parity with the other games' planners but is
 * unused (nothing to shuffle).
 */

export type SintoniaPlan = {
  mediumId: string;
};

/** `roundIndex` is 0-based. `players` is in stable join order. */
export function planRound(
  players: readonly { id: string }[],
  roundIndex: number,
  _random?: () => number,
): SintoniaPlan {
  const n = players.length;
  if (n < 3) {
    throw new Error('planRound needs at least 3 players');
  }
  const mediumId = players[((roundIndex % n) + n) % n].id;
  return { mediumId };
}
