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

  // Regression: v0.8.2 — when a collaborator opens a shared model and finds
  // no response slot for themselves (legacy data created before
  // addCollaborator initialized the slot), loadModel must self-heal by
  // creating one. Without this, their first saveComparisons throws.
  // See PR #20.
  it('loadModel self-heals a missing response slot for a current-user collaborator', async () => {
    // Owner creates the model and adds a second collaborator
    const { result: owner } = renderHook(() => useAHP('owner-user'), { wrapper: TestProviders });
    let modelId: string | undefined;
    await act(async () => {
      modelId = await owner.current.createModel('Shared Decision', 'Goal');
    });
    await act(async () => {
      await owner.current.storage.addCollaborator(modelId!, {
        userId: 'student-user',
        role: 'editor',
        isVoting: true,
      });
    });

    // Simulate legacy data: remove the student's response slot, leaving
    // them in the collaborator list but with no response storage.
    localStorage.removeItem(`ahp/models/${modelId}/responses/student-user`);
    const responseListKey = `ahp/models/${modelId}/responseList`;
    const list: string[] = JSON.parse(localStorage.getItem(responseListKey) ?? '[]');
    localStorage.setItem(
      responseListKey,
      JSON.stringify(list.filter((u) => u !== 'student-user')),
    );

    // Sanity: the slot really is gone.
    expect(await owner.current.storage.getResponse(modelId!, 'student-user')).toBeNull();

    // Student opens the model — loadModel should self-heal.
    const { result: student } = renderHook(() => useAHP('student-user'), { wrapper: TestProviders });
    await act(async () => {
      await student.current.loadModel(modelId!);
    });

    const healedResponse = await student.current.storage.getResponse(modelId!, 'student-user');
    expect(healedResponse).not.toBeNull();
    expect(healedResponse!.userId).toBe('student-user');

    // And saveComparisons now works for them.
    await act(async () => {
      await student.current.saveComparisons('criteria', { '0,1': 4 });
    });
    const result = await student.current.storage.getComparisons(modelId!, 'student-user', 'criteria');
    expect(result['0,1']).toBe(4);
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
