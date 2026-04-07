import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAHP } from '../useAHP';
import { TestProviders } from '../../__tests__/test-utils';

describe('useAHP', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('creates a model with correct defaults', async () => {
    const { result } = renderHook(() => useAHP('test-user'), { wrapper: TestProviders });

    await act(async () => {
      await result.current.createModel('Test Decision', 'Find the best option');
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

  it('updates structure', async () => {
    const { result } = renderHook(() => useAHP('test-user'), { wrapper: TestProviders });

    await act(async () => {
      await result.current.createModel('Test', 'Goal');
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

    await act(async () => {
      await result.current.updateStructure(newStructure);
    });

    expect(result.current.structure!.criteria.length).toBe(2);
    expect(result.current.structure!.alternatives.length).toBe(2);
  });

  it('saves and retrieves comparisons', async () => {
    const { result } = renderHook(() => useAHP('test-user'), { wrapper: TestProviders });

    await act(async () => {
      await result.current.createModel('Test', 'Goal');
    });

    await act(async () => {
      await result.current.saveComparisons('criteria', { '0,1': 3 });
    });

    // Verify through storage
    const comp = await result.current.storage.getComparisons(
      result.current.modelId!,
      'test-user',
      'criteria',
    );
    expect(comp['0,1']).toBe(3);
  });

  it('loads a previously created model', async () => {
    const { result: r1 } = renderHook(() => useAHP('test-user'), { wrapper: TestProviders });
    let modelId: string | undefined;

    await act(async () => {
      modelId = await r1.current.createModel('Saved Model', 'Test persistence');
    });

    // New hook instance loading existing model
    const { result: r2 } = renderHook(() => useAHP('test-user'), { wrapper: TestProviders });

    await act(async () => {
      await r2.current.loadModel(modelId!);
    });

    expect(r2.current.model!.title).toBe('Saved Model');
    expect(r2.current.collaborators.length).toBe(1);
  });

  it('deletes a model', async () => {
    const { result } = renderHook(() => useAHP('test-user'), { wrapper: TestProviders });

    await act(async () => {
      await result.current.createModel('To Delete', 'Goal');
    });

    await act(async () => {
      await result.current.deleteModel();
    });

    expect(result.current.modelId).toBeNull();
    expect(result.current.model).toBeNull();
  });

  it('marks synthesis out_of_date when comparisons change after current', async () => {
    const { result } = renderHook(() => useAHP('test-user'), { wrapper: TestProviders });

    await act(async () => {
      await result.current.createModel('Test', 'Goal');
    });

    // Simulate synthesisStatus = 'current'
    await act(async () => {
      await result.current.updateModel({ synthesisStatus: 'current' });
    });

    expect(result.current.model!.synthesisStatus).toBe('current');

    await act(async () => {
      await result.current.saveComparisons('criteria', { '0,1': 5 });
    });

    expect(result.current.model!.synthesisStatus).toBe('out_of_date');
  });
});
