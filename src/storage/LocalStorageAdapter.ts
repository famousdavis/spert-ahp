import { CURRENT_SCHEMA_VERSION, ERROR_CODES } from '../core/models/constants';
import type {
  StorageAdapter,
  ModelDoc,
  StructureDoc,
  CollaboratorDoc,
  ResponseDoc,
  ModelIndexEntry,
  ComparisonMap,
  SynthesisBundle,
} from '../types/ahp';

const PREFIX = 'ahp';

function key(...parts: string[]): string {
  return `${PREFIX}/${parts.join('/')}`;
}

function getJSON<T>(k: string): T | null {
  const raw = localStorage.getItem(k);
  return raw ? (JSON.parse(raw) as T) : null;
}

function setJSON(k: string, value: unknown): void {
  localStorage.setItem(k, JSON.stringify(value));
}

function removeKey(k: string): void {
  localStorage.removeItem(k);
}

function validateUpperTriangle(comparisons: ComparisonMap): void {
  for (const ck of Object.keys(comparisons)) {
    const [i, j] = ck.split(',').map(Number) as [number, number];
    if (j <= i) {
      throw new Error(`saveComparisons: invalid key '${ck}' — j must be > i (upper-triangle only)`);
    }
  }
}

function deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
  const result = { ...target } as Record<string, unknown>;
  for (const k of Object.keys(source)) {
    const sv = source[k as keyof T];
    const tv = target[k as keyof T];
    if (
      sv !== null &&
      typeof sv === 'object' &&
      !Array.isArray(sv) &&
      tv !== null &&
      typeof tv === 'object' &&
      !Array.isArray(tv)
    ) {
      result[k] = deepMerge(tv as Record<string, unknown>, sv as Record<string, unknown>);
    } else {
      result[k] = sv;
    }
  }
  return result as T;
}

interface CodedError extends Error {
  code?: string;
}

export class LocalStorageAdapter implements StorageAdapter {
  constructor() {
    this._ensureSchemaVersion();
  }

  private _ensureSchemaVersion(): void {
    const version = localStorage.getItem(`${PREFIX}/schemaVersion`);
    if (!version) {
      localStorage.setItem(`${PREFIX}/schemaVersion`, String(CURRENT_SCHEMA_VERSION));
    }
  }

  // ─── Model CRUD ──────────────────────────────────────────────────

  createModel(modelId: string, metaDoc: ModelDoc, structureDoc: StructureDoc): void {
    setJSON(key('models', modelId, 'meta'), metaDoc);
    setJSON(key('models', modelId, 'structure'), structureDoc);

    const index = getJSON<ModelIndexEntry[]>(key('modelIndex')) ?? [];
    index.push({
      modelId,
      title: metaDoc.title,
      status: metaDoc.status,
      createdAt: metaDoc.createdAt,
    });
    setJSON(key('modelIndex'), index);
  }

  getModel(modelId: string): { meta: ModelDoc; structure: StructureDoc } | null {
    const meta = getJSON<ModelDoc>(key('models', modelId, 'meta'));
    if (!meta) return null;
    const structure = getJSON<StructureDoc>(key('models', modelId, 'structure'))!;
    return { meta, structure };
  }

  updateModel(modelId: string, partialMeta: Partial<ModelDoc>): void {
    const meta = getJSON<ModelDoc>(key('models', modelId, 'meta'));
    if (!meta) throw new Error(`Model ${modelId} not found`);

    if (
      'completionTier' in partialMeta &&
      partialMeta.completionTier !== meta.completionTier
    ) {
      const responsesExist = this._hasAnyResponses(modelId);
      if (responsesExist) {
        const err: CodedError = new Error('Cannot change completionTier after responses exist');
        err.code = ERROR_CODES.TIER_LOCKED;
        throw err;
      }
    }

    const merged = deepMerge(meta as unknown as Record<string, unknown>, partialMeta as unknown as Record<string, unknown>);
    setJSON(key('models', modelId, 'meta'), merged);

    const index = getJSON<ModelIndexEntry[]>(key('modelIndex')) ?? [];
    const entry = index.find((e) => e.modelId === modelId);
    if (entry) {
      if ('title' in partialMeta) entry.title = partialMeta.title!;
      if ('status' in partialMeta) entry.status = partialMeta.status!;
      setJSON(key('modelIndex'), index);
    }
  }

  deleteModel(modelId: string): void {
    const prefix = key('models', modelId);
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) {
        keysToRemove.push(k);
      }
    }
    for (const k of keysToRemove) removeKey(k);

    const index = getJSON<ModelIndexEntry[]>(key('modelIndex')) ?? [];
    const filtered = index.filter((e) => e.modelId !== modelId);
    setJSON(key('modelIndex'), filtered);
  }

  listModels(): ModelIndexEntry[] {
    return getJSON<ModelIndexEntry[]>(key('modelIndex')) ?? [];
  }

  // ─── Structure ───────────────────────────────────────────────────

  getStructure(modelId: string): StructureDoc | null {
    return getJSON<StructureDoc>(key('models', modelId, 'structure'));
  }

  updateStructure(modelId: string, structureDoc: StructureDoc): void {
    setJSON(key('models', modelId, 'structure'), structureDoc);
  }

  // ─── Collaborators ──────────────────────────────────────────────

  addCollaborator(modelId: string, collaboratorDoc: CollaboratorDoc): void {
    const k = key('models', modelId, 'collaborators', collaboratorDoc.userId);
    setJSON(k, collaboratorDoc);

    const listKey = key('models', modelId, 'collaboratorList');
    const list = getJSON<string[]>(listKey) ?? [];
    if (!list.includes(collaboratorDoc.userId)) {
      list.push(collaboratorDoc.userId);
      setJSON(listKey, list);
    }
  }

  getCollaborators(modelId: string): CollaboratorDoc[] {
    const listKey = key('models', modelId, 'collaboratorList');
    const list = getJSON<string[]>(listKey) ?? [];
    return list
      .map((userId) => getJSON<CollaboratorDoc>(key('models', modelId, 'collaborators', userId)))
      .filter((c): c is CollaboratorDoc => c !== null);
  }

  updateCollaborator(modelId: string, userId: string, partial: Partial<CollaboratorDoc>): void {
    const k = key('models', modelId, 'collaborators', userId);
    const current = getJSON<CollaboratorDoc>(k);
    if (!current) throw new Error(`Collaborator ${userId} not found`);
    setJSON(k, { ...current, ...partial });
  }

  // ─── Responses ──────────────────────────────────────────────────

  getResponse(modelId: string, userId: string): ResponseDoc | null {
    return getJSON<ResponseDoc>(key('models', modelId, 'responses', userId));
  }

  createResponse(modelId: string, responseDoc: ResponseDoc): void {
    const k = key('models', modelId, 'responses', responseDoc.userId);
    setJSON(k, responseDoc);

    const listKey = key('models', modelId, 'responseList');
    const list = getJSON<string[]>(listKey) ?? [];
    if (!list.includes(responseDoc.userId)) {
      list.push(responseDoc.userId);
      setJSON(listKey, list);
    }
  }

  updateResponse(modelId: string, userId: string, partial: Partial<ResponseDoc>): void {
    const k = key('models', modelId, 'responses', userId);
    const current = getJSON<ResponseDoc>(k);
    if (!current) throw new Error(`Response for ${userId} not found`);
    setJSON(k, { ...current, ...partial, lastModifiedAt: Date.now() });
  }

  // ─── Comparisons ───────────────────────────────────────────────

  saveComparisons(modelId: string, userId: string, layer: string, comparisons: ComparisonMap): void {
    validateUpperTriangle(comparisons);

    const response = this.getResponse(modelId, userId);
    if (!response) throw new Error(`Response for ${userId} not found`);

    if (layer === 'criteria') {
      response.criteriaMatrix = { ...response.criteriaMatrix, ...comparisons };
    } else {
      if (!response.alternativeMatrices) response.alternativeMatrices = {};
      response.alternativeMatrices[layer] = {
        ...(response.alternativeMatrices[layer] ?? {}),
        ...comparisons,
      };
    }

    response.lastModifiedAt = Date.now();
    setJSON(key('models', modelId, 'responses', userId), response);
  }

  getComparisons(modelId: string, userId: string, layer: string): ComparisonMap {
    const response = this.getResponse(modelId, userId);
    if (!response) return {};

    let comparisons: ComparisonMap;
    if (layer === 'criteria') {
      comparisons = response.criteriaMatrix ?? {};
    } else {
      comparisons = response.alternativeMatrices?.[layer] ?? {};
    }

    const result: ComparisonMap = {};
    for (const [ck, value] of Object.entries(comparisons)) {
      const [i, j] = ck.split(',').map(Number) as [number, number];
      if (i < j) {
        result[ck] = value;
      }
    }
    return result;
  }

  // ─── Synthesis ──────────────────────────────────────────────────

  saveSynthesis(modelId: string, synthesisId: string, docs: Partial<SynthesisBundle>): void {
    const base = key('models', modelId, 'syntheses', synthesisId);
    if (docs.summary) setJSON(`${base}/summary`, docs.summary);
    if (docs.individual) setJSON(`${base}/individual`, docs.individual);
    if (docs.diagnostics) setJSON(`${base}/diagnostics`, docs.diagnostics);
  }

  getSynthesis(modelId: string, synthesisId: string): SynthesisBundle | null {
    const base = key('models', modelId, 'syntheses', synthesisId);
    const summary = getJSON<SynthesisBundle['summary']>(`${base}/summary`);
    if (!summary) return null;
    return {
      summary,
      individual: getJSON<SynthesisBundle['individual']>(`${base}/individual`)!,
      diagnostics: getJSON<SynthesisBundle['diagnostics']>(`${base}/diagnostics`)!,
    };
  }

  // ─── Subscriptions (Phase 1 no-ops) ────────────────────────────

  subscribeModel(_modelId: string, _callback: (data: unknown) => void): () => void {
    return () => {};
  }

  subscribeResponses(_modelId: string, _callback: (data: unknown) => void): () => void {
    return () => {};
  }

  // ─── Internal helpers ──────────────────────────────────────────

  private _hasAnyResponses(modelId: string): boolean {
    const listKey = key('models', modelId, 'responseList');
    const list = getJSON<string[]>(listKey) ?? [];
    for (const userId of list) {
      const response = this.getResponse(modelId, userId);
      if (response && Object.keys(response.criteriaMatrix ?? {}).length > 0) {
        return true;
      }
    }
    return false;
  }
}
