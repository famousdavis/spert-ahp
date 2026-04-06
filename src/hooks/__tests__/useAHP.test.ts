import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAHP } from '../useAHP';

describe('useAHP', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('creates a model with correct defaults', () => {
    const { result } = renderHook(() => useAHP('test-user'));

    act(() => {
      result.current.createModel('Test Decision', 'Find the best option');
    });

    expect(result.current.modelId).toBeTruthy();
    expect(result.current.model!.title).toBe('Test Decision');
    expect(result.current.model!.status).toBe('setup');
    expect(result.current.model!.completionTier).toBe(4);
    expect(result.current.model!.synthesisStatus).toBeNull();
    expect(result.current.structure!.criteria).toEqual([]);
    expect(result.current.structure!.alternatives).toEqual([]);
    expect(result.current.collaborators.length).toBe(1);
    expect(result.current.collaborators[0]!.role).toBe('owner');
    expect(result.current.collaborators[0]!.isVoting).toBe(true);
  });

  it('updates structure', () => {
    const { result } = renderHook(() => useAHP('test-user'));

    act(() => {
      result.current.createModel('Test', 'Goal');
    });

    const newStructure = {
      criteria: [
        { id: 'c1', label: 'Cost', description: '' },
        { id: 'c2', label: 'Quality', description: '' },
      ],
      alternatives: [
        { id: 'a1', label: 'Option A', description: '' },
        { id: 'a2', label: 'Option B', description: '' },
      ],
      structureVersion: 1,
    };

    act(() => {
      result.current.updateStructure(newStructure);
    });

    expect(result.current.structure!.criteria.length).toBe(2);
    expect(result.current.structure!.alternatives.length).toBe(2);
  });

  it('saves and retrieves comparisons', () => {
    const { result } = renderHook(() => useAHP('test-user'));

    act(() => {
      result.current.createModel('Test', 'Goal');
    });

    act(() => {
      result.current.saveComparisons('criteria', { '0,1': 3 });
    });

    // Verify through storage
    const comp = result.current.storage.getComparisons(
      result.current.modelId!,
      'test-user',
      'criteria',
    );
    expect(comp['0,1']).toBe(3);
  });

  it('loads a previously created model', () => {
    const { result: r1 } = renderHook(() => useAHP('test-user'));
    let modelId: string | undefined;

    act(() => {
      modelId = r1.current.createModel('Saved Model', 'Test persistence');
    });

    // New hook instance loading existing model
    const { result: r2 } = renderHook(() => useAHP('test-user'));

    act(() => {
      r2.current.loadModel(modelId!);
    });

    expect(r2.current.model!.title).toBe('Saved Model');
    expect(r2.current.collaborators.length).toBe(1);
  });

  it('deletes a model', () => {
    const { result } = renderHook(() => useAHP('test-user'));

    act(() => {
      result.current.createModel('To Delete', 'Goal');
    });

    act(() => {
      result.current.deleteModel();
    });

    expect(result.current.modelId).toBeNull();
    expect(result.current.model).toBeNull();
  });

  it('marks synthesis out_of_date when comparisons change after current', () => {
    const { result } = renderHook(() => useAHP('test-user'));

    act(() => {
      result.current.createModel('Test', 'Goal');
    });

    // Simulate synthesisStatus = 'current'
    act(() => {
      result.current.updateModel({ synthesisStatus: 'current' });
    });

    expect(result.current.model!.synthesisStatus).toBe('current');

    act(() => {
      result.current.saveComparisons('criteria', { '0,1': 5 });
    });

    expect(result.current.model!.synthesisStatus).toBe('out_of_date');
  });
});
