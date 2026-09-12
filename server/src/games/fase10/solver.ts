import type { Fase10Card, Fase10Color, Fase10GroupReq, Fase10LaidGroup } from '@party/shared';

/**
 * Pure Fase 10 grouping logic — validating a lay-down against a phase spec and
 * validating a hit onto a laid group. No engine state, no RNG. Kept isolated so
 * the fiddly run/wild cases are unit-testable in one place.
 */

export type BuiltGroup = {
  req: Fase10GroupReq;
  /** For a `run`, ordered ascending by resolved value. */
  cards: Fase10Card[];
  /** Parallel to `cards`; the value each slot represents. `null` for a `color` group. */
  values: (number | null)[];
  /** A `color` group's colour. `null` otherwise. */
  color: Fase10Color | null;
};

export type SolveResult =
  | { ok: true; groups: BuiltGroup[] }
  | { ok: false; reason: string };

/** Optional per-wild placement hints from the controller (`value` for runs, `color` for the colour phase). */
export type WildHint = { value?: number; color?: Fase10Color };

type NumberCard = Extract<Fase10Card, { kind: 'number' }>;

const isNumber = (c: Fase10Card): c is NumberCard => c.kind === 'number';

/** All k-sized subsets of `items`, preserving order. */
const combinations = <T>(items: T[], k: number): T[][] => {
  if (k === 0) return [[]];
  if (k > items.length) return [];
  const result: T[][] = [];
  const rec = (start: number, combo: T[]): void => {
    if (combo.length === k) {
      result.push([...combo]);
      return;
    }
    for (let i = start; i < items.length; i += 1) {
      combo.push(items[i]);
      rec(i + 1, combo);
      combo.pop();
    }
  };
  rec(0, []);
  return result;
};

/** Try to build one group from `naturals` + `wildCount` wilds against `req`. */
function buildGroup(
  naturals: NumberCard[],
  wilds: Fase10Card[],
  req: Fase10GroupReq,
  hints: Map<string, WildHint>,
): BuiltGroup | null {
  const total = naturals.length + wilds.length;
  if (total !== req.size) return null;
  if (naturals.length === 0) return null; // every group needs at least one natural card

  if (req.type === 'set') {
    const v = naturals[0].value;
    if (!naturals.every((c) => c.value === v)) return null;
    return {
      req,
      cards: [...naturals, ...wilds],
      values: Array.from({ length: req.size }, () => v),
      color: null,
    };
  }

  if (req.type === 'color') {
    const col = naturals[0].color;
    if (!naturals.every((c) => c.color === col)) return null;
    return {
      req,
      cards: [...naturals, ...wilds],
      values: Array.from({ length: req.size }, () => null),
      color: col,
    };
  }

  // run: distinct consecutive values inside [1, 12].
  const values = naturals.map((c) => c.value);
  if (new Set(values).size !== values.length) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const size = req.size;
  if (max - min > size - 1) return null;

  const loMin = Math.max(1, max - size + 1);
  const loMax = Math.min(min, 12 - size + 1);
  if (loMin > loMax) return null;

  // Canonical window keeps the naturals as low as they can sit (wilds pad the
  // high end); a wild `value` hint overrides that pick.
  const hinted = wilds
    .map((w) => hints.get(w.id)?.value)
    .filter((n): n is number => typeof n === 'number');
  let lo = loMax;
  for (let candidate = loMax; candidate >= loMin; candidate -= 1) {
    const window = Array.from({ length: size }, (_, i) => candidate + i);
    const gaps = window.filter((v) => !values.includes(v));
    if (hinted.every((h) => gaps.includes(h))) {
      lo = candidate;
      break;
    }
  }

  const slotValues = Array.from({ length: size }, (_, i) => lo + i);
  const byValue = new Map(naturals.map((c) => [c.value, c] as const));
  const spareWilds = [...wilds];
  const cards: Fase10Card[] = slotValues.map((val) => {
    const nat = byValue.get(val);
    if (nat) return nat;
    return spareWilds.shift()!;
  });
  return { req, cards, values: slotValues, color: null };
}

/**
 * Can the exact multiset `selected` be laid down as `groups` (the current
 * phase)? Requires an exact count — extras are added later via hits.
 */
export function solvePhase(
  selected: Fase10Card[],
  groups: Fase10GroupReq[],
  hints: Map<string, WildHint> = new Map(),
): SolveResult {
  if (selected.some((c) => c.kind === 'skip')) {
    return { ok: false, reason: 'Cartas Pula não entram numa fase' };
  }
  const need = groups.reduce((n, g) => n + g.size, 0);
  if (selected.length !== need) {
    return { ok: false, reason: `Selecione exatamente ${need} cartas` };
  }

  const naturals = selected.filter(isNumber);
  const wilds = selected.filter((c) => c.kind === 'wild');

  // Recurse group by group: choose this group's naturals + wild count, validate, recurse on the rest.
  const solve = (
    gs: Fase10GroupReq[],
    natPool: NumberCard[],
    wildPool: Fase10Card[],
  ): BuiltGroup[] | null => {
    if (gs.length === 0) {
      return natPool.length === 0 && wildPool.length === 0 ? [] : null;
    }
    const [req, ...restGroups] = gs;
    for (let wc = 0; wc <= Math.min(wildPool.length, req.size - 1); wc += 1) {
      const natCount = req.size - wc;
      if (natCount > natPool.length) continue;
      for (const chosenNats of combinations(natPool, natCount)) {
        const chosenSet = new Set(chosenNats);
        const chosenWilds = wildPool.slice(0, wc);
        const built = buildGroup(chosenNats, chosenWilds, req, hints);
        if (!built) continue;
        const restNats = natPool.filter((c) => !chosenSet.has(c));
        const restWilds = wildPool.slice(wc);
        const rest = solve(restGroups, restNats, restWilds);
        if (rest) return [built, ...rest];
      }
    }
    return null;
  };

  const built = solve(groups, naturals, wilds);
  if (!built) return { ok: false, reason: 'Essas cartas não fecham a fase' };
  return { ok: true, groups: built };
}

/**
 * Try to extend a laid group with one card. `end` disambiguates a wild on a run
 * (a natural card's value picks the end on its own). Returns the new group or null.
 */
export function hitInto(
  group: Fase10LaidGroup,
  card: Fase10Card,
  end?: 'low' | 'high',
): Fase10LaidGroup | null {
  if (card.kind === 'skip') return null;

  if (group.req.type === 'set') {
    const v = group.values.find((n): n is number => n !== null) ?? null;
    if (v === null) return null;
    if (card.kind === 'number' && card.value !== v) return null;
    return {
      ...group,
      cards: [...group.cards, card],
      values: [...group.values, v],
    };
  }

  if (group.req.type === 'color') {
    if (card.kind === 'number' && card.color !== group.color) return null;
    return {
      ...group,
      cards: [...group.cards, card],
      values: [...group.values, null],
    };
  }

  // run
  const lo = group.values[0];
  const hi = group.values[group.values.length - 1];
  if (typeof lo !== 'number' || typeof hi !== 'number') return null;

  const tryLow = (): Fase10LaidGroup | null => {
    const val = lo - 1;
    if (val < 1) return null;
    if (card.kind === 'number' && card.value !== val) return null;
    return { ...group, cards: [card, ...group.cards], values: [val, ...group.values] };
  };
  const tryHigh = (): Fase10LaidGroup | null => {
    const val = hi + 1;
    if (val > 12) return null;
    if (card.kind === 'number' && card.value !== val) return null;
    return { ...group, cards: [...group.cards, card], values: [...group.values, val] };
  };

  if (card.kind === 'number') {
    return card.value === lo - 1 ? tryLow() : card.value === hi + 1 ? tryHigh() : null;
  }
  // wild: honour the hint, else prefer the high end.
  if (end === 'low') return tryLow();
  if (end === 'high') return tryHigh();
  return tryHigh() ?? tryLow();
}
