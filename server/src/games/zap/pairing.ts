/**
 * Pure round planning for Zap!. No RNG, no engine state — just "given these seats
 * and prompts, who answers what and which answers meet in a duel".
 *
 * Normal round: players sit on a circle. Prompt `k` is answered by seat `k` and
 * seat `k+1` (mod N) and those two answers form duel `k` — so N players ⇒ N
 * prompts ⇒ N duels, and every player owes exactly 2 answers.
 *
 * Final round ("Última Chance"): one shared prompt, every player answers it once,
 * and all answers meet in a single duel.
 */

export type Assignment = { slot: number; prompt: string };

export type DuelPlan = {
  prompt: string;
  /** The (player, assignment-slot) pairs whose answers compete in this duel. */
  contestants: { playerId: string; slot: number }[];
};

export type RoundPlan = {
  /** playerId → the prompts that player must answer this round, by assignment slot. */
  assignments: Map<string, Assignment[]>;
  duels: DuelPlan[];
};

export function planNormalRound(seatIds: string[], prompts: string[]): RoundPlan {
  const n = seatIds.length;
  if (prompts.length < n) {
    throw new Error(`planNormalRound: need ${n} prompts, got ${prompts.length}`);
  }

  const assignments = new Map<string, Assignment[]>();
  for (let i = 0; i < n; i++) {
    const ownPrompt = prompts[i];
    const prevPrompt = prompts[(i - 1 + n) % n];
    assignments.set(seatIds[i], [
      { slot: 0, prompt: ownPrompt },
      { slot: 1, prompt: prevPrompt },
    ]);
  }

  const duels: DuelPlan[] = [];
  for (let k = 0; k < n; k++) {
    duels.push({
      prompt: prompts[k],
      contestants: [
        { playerId: seatIds[k], slot: 0 },
        { playerId: seatIds[(k + 1) % n], slot: 1 },
      ],
    });
  }

  return { assignments, duels };
}

export function planFinalRound(seatIds: string[], prompt: string): RoundPlan {
  const assignments = new Map<string, Assignment[]>();
  for (const id of seatIds) {
    assignments.set(id, [{ slot: 0, prompt }]);
  }
  const duels: DuelPlan[] = [
    { prompt, contestants: seatIds.map((playerId) => ({ playerId, slot: 0 })) },
  ];
  return { assignments, duels };
}
