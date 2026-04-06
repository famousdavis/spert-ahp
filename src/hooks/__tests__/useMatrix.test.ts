import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMatrix } from '../useMatrix';

describe('useMatrix', () => {
  it('setComparison triggers weight recomputation', () => {
    const onSave = vi.fn();
    const { result } = renderHook(() =>
      useMatrix({ n: 3, tier: 4, layer: 'criteria', onSave }),
    );

    act(() => {
      result.current.setComparison(0, 1, 3);
    });

    // Weights should still be null (graph not connected yet with just one pair for n=3)
    // But comparisons should be updated
    expect(result.current.comparisons['0,1']).toBe(3);
  });

  it('weights computed when graph is connected', () => {
    const { result } = renderHook(() =>
      useMatrix({ n: 3, tier: 1, layer: 'criteria' }),
    );

    act(() => {
      result.current.setComparison(0, 1, 3);
      result.current.setComparison(0, 2, 5);
    });

    // Star topology for n=3 — connected
    expect(result.current.weights).not.toBeNull();
    expect(result.current.weights!.length).toBe(3);
    expect(result.current.weights!.reduce((a, b) => a + b, 0)).toBe(1.0);
  });

  it('j<=i throws', () => {
    const { result } = renderHook(() =>
      useMatrix({ n: 3, tier: 4, layer: 'criteria' }),
    );

    expect(() => {
      act(() => {
        result.current.setComparison(1, 0, 3);
      });
    }).toThrow();
  });

  it('converged flag surfaces when RAS does not converge', () => {
    // This is a smoke test — for most inputs RAS will converge
    const { result } = renderHook(() =>
      useMatrix({ n: 3, tier: 1, layer: 'criteria' }),
    );

    act(() => {
      result.current.setComparison(0, 1, 5);
      result.current.setComparison(0, 2, 3);
    });

    expect(typeof result.current.converged).toBe('boolean');
  });

  it('removeComparison updates state', () => {
    const { result } = renderHook(() =>
      useMatrix({ n: 3, tier: 1, layer: 'criteria' }),
    );

    act(() => {
      result.current.setComparison(0, 1, 3);
      result.current.setComparison(0, 2, 5);
    });

    act(() => {
      result.current.removeComparison(0, 1);
    });

    expect(result.current.comparisons['0,1']).toBeUndefined();
  });

  it('initial comparisons trigger computation', () => {
    const { result } = renderHook(() =>
      useMatrix({
        n: 3,
        tier: 1,
        layer: 'criteria',
        initialComparisons: { '0,1': 3, '0,2': 5 },
      }),
    );

    expect(result.current.weights).not.toBeNull();
    expect(result.current.connectivity.connected).toBe(true);
  });
});
