import { describe, it, expect } from 'vitest';
import { consistencyRatio, suggestRepair } from '../math/consistency';

describe('consistencyRatio', () => {
  it('perfect consistency 3x3 tier=4 → CR ≈ 0', () => {
    // a12=2, a13=4, a23=2 → consistent: 2*2=4
    const comp = { '0,1': 2, '0,2': 4, '1,2': 2 };
    const result = consistencyRatio(3, comp, 4);
    expect(result.cr).toBeCloseTo(0, 4);
    expect(result.isAcceptable).toBe(true);
    expect(result.lambdaMax).toBeCloseTo(3.0, 4);
  });

  it('highly inconsistent 3x3 tier=4 → CR > 0.10', () => {
    // a12=9, a23=9, a13=1 → highly inconsistent
    const comp = { '0,1': 9, '0,2': 1, '1,2': 9 };
    const result = consistencyRatio(3, comp, 4);
    expect(result.cr).toBeGreaterThan(0.10);
    expect(result.isAcceptable).toBe(false);
  });

  it('tier=1 → CR=null, isAcceptable=null', () => {
    const comp = { '0,1': 3, '0,2': 5 };
    const result = consistencyRatio(3, comp, 1);
    expect(result.cr).toBeNull();
    expect(result.isAcceptable).toBeNull();
    expect(result.confidenceLabel).toContain('no redundant');
  });

  it('n=2 → CR=0, always acceptable', () => {
    const result = consistencyRatio(2, { '0,1': 5 }, 4);
    expect(result.cr).toBe(0);
    expect(result.isAcceptable).toBe(true);
  });

  it('n=1 → CR=0, always acceptable', () => {
    const result = consistencyRatio(1, {}, 4);
    expect(result.cr).toBe(0);
    expect(result.isAcceptable).toBe(true);
  });

  it('tier=2 Harker with incomplete matrix computes CR', () => {
    // 4 items, tier 2 = ceil(1.5*4)=6 pairs. Provide a star + some extras.
    const comp = { '0,1': 3, '0,2': 5, '0,3': 2, '1,2': 2, '1,3': 4, '2,3': 1 };
    const result = consistencyRatio(4, comp, 2);
    // Should produce a numeric CR (not null)
    expect(typeof result.cr).toBe('number');
    expect(typeof result.isAcceptable).toBe('boolean');
    expect(result.confidenceLabel).toContain('Harker');
  });

  it('tier=2 with truly incomplete matrix uses Harker diagonal adjustment', () => {
    // Only star pairs for n=4 (3 pairs, but tier 2 expects 6)
    const comp = { '0,1': 3, '0,2': 5, '0,3': 7 };
    const result = consistencyRatio(4, comp, 2);
    expect(typeof result.cr).toBe('number');
    expect(result.confidenceLabel).toContain('Harker');
  });
});

describe('suggestRepair', () => {
  it('returns repair for inconsistent matrix', () => {
    const comp = { '0,1': 9, '0,2': 1, '1,2': 9 };
    const repair = suggestRepair(3, comp, 4);
    expect(repair).not.toBeNull();
    expect(typeof repair!.i).toBe('number');
    expect(typeof repair!.j).toBe('number');
    expect(typeof repair!.suggestedValue).toBe('number');
    expect(repair!.suggestedValue).toBeGreaterThan(0);
    expect(repair!.expectedCRImprovement).toBeGreaterThan(0);
  });

  it('returns null for consistent matrix', () => {
    const comp = { '0,1': 2, '0,2': 4, '1,2': 2 };
    const repair = suggestRepair(3, comp, 4);
    expect(repair).toBeNull();
  });

  it('returns null for n=2', () => {
    const repair = suggestRepair(2, { '0,1': 5 }, 4);
    expect(repair).toBeNull();
  });

  it('returns null for tier=1 (CR not computable)', () => {
    const comp = { '0,1': 9, '0,2': 1 };
    const repair = suggestRepair(3, comp, 1);
    expect(repair).toBeNull();
  });
});
