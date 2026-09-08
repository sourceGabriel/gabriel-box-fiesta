import { describe, expect, it } from 'vitest';
import { zapPrompts, ZAP_PROMPTS_LEVE, ZAP_PROMPTS_PESADO } from '../games/zap/prompts';
import { lorotaQuestions } from '../games/lorota/questions';
import { sabeTudoQuestions } from '../games/sabetudo/questions';
import { fdpPrompts, FDP_PROMPTS_LEVE, FDP_PROMPTS_PESADO } from '../games/fdp/prompts';

describe('content tier — bank filtering', () => {
  it('Zap!: leve is a strict subset, pesado is leve + the +18 pack', () => {
    const leve = zapPrompts('leve');
    const pesado = zapPrompts('pesado');
    expect(leve).toEqual([...ZAP_PROMPTS_LEVE]);
    expect(pesado).toEqual([...ZAP_PROMPTS_LEVE, ...ZAP_PROMPTS_PESADO]);
    expect(pesado.length).toBeGreaterThan(leve.length);
    expect(new Set(leve).size).toBe(leve.length); // no dupes
  });

  it('Zap!: undefined tier deals everything (pre-toggle behaviour)', () => {
    expect(zapPrompts(undefined)).toEqual(zapPrompts('pesado'));
  });

  it('Lorota!: leve drops every pesado-tagged question', () => {
    const leve = lorotaQuestions('leve');
    const pesado = lorotaQuestions('pesado');
    expect(leve.every((q) => q.tier !== 'pesado')).toBe(true);
    expect(pesado.some((q) => q.tier === 'pesado')).toBe(true);
    expect(pesado.length).toBeGreaterThan(leve.length);
  });

  it('Sabe-Tudo: leve drops every pesado-tagged question and keeps 4 options each', () => {
    const leve = sabeTudoQuestions('leve');
    const pesado = sabeTudoQuestions('pesado');
    expect(leve.every((q) => q.tier !== 'pesado')).toBe(true);
    expect(pesado.length).toBeGreaterThan(leve.length);
    expect(leve.every((q) => q.options.length === 4 && q.correct >= 0 && q.correct < 4)).toBe(true);
  });

  it('FDP: leve is a strict subset, pesado is leve + the full deck', () => {
    const leve = fdpPrompts('leve');
    const pesado = fdpPrompts('pesado');
    expect(leve).toEqual([...FDP_PROMPTS_LEVE]);
    expect(pesado).toEqual([...FDP_PROMPTS_LEVE, ...FDP_PROMPTS_PESADO]);
    expect(pesado.length).toBeGreaterThan(leve.length);
  });
});
