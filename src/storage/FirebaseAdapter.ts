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

const STUB_MSG = 'FirebaseAdapter is not available in Phase 1. Use LocalStorageAdapter.';

function stubThrow(method: string): never {
  throw new Error(`${method}: ${STUB_MSG}`);
}

function validateUpperTriangle(comparisons: ComparisonMap): void {
  for (const ck of Object.keys(comparisons)) {
    const [i, j] = ck.split(',').map(Number) as [number, number];
    if (j <= i) {
      throw new Error(`saveComparisons: invalid key '${ck}' — j must be > i (upper-triangle only)`);
    }
  }
}

export class FirebaseAdapter implements StorageAdapter {
  createModel(_modelId: string, _metaDoc: ModelDoc, _structureDoc: StructureDoc): void { stubThrow('createModel'); }
  getModel(_modelId: string): { meta: ModelDoc; structure: StructureDoc } | null { stubThrow('getModel'); }
  updateModel(_modelId: string, _partialMeta: Partial<ModelDoc>): void { stubThrow('updateModel'); }
  deleteModel(_modelId: string): void { stubThrow('deleteModel'); }
  listModels(): ModelIndexEntry[] { stubThrow('listModels'); }
  getStructure(_modelId: string): StructureDoc | null { stubThrow('getStructure'); }
  updateStructure(_modelId: string, _structureDoc: StructureDoc): void { stubThrow('updateStructure'); }
  addCollaborator(_modelId: string, _collaboratorDoc: CollaboratorDoc): void { stubThrow('addCollaborator'); }
  getCollaborators(_modelId: string): CollaboratorDoc[] { stubThrow('getCollaborators'); }
  updateCollaborator(_modelId: string, _userId: string, _partial: Partial<CollaboratorDoc>): void { stubThrow('updateCollaborator'); }
  getResponse(_modelId: string, _userId: string): ResponseDoc | null { stubThrow('getResponse'); }
  createResponse(_modelId: string, _responseDoc: ResponseDoc): void { stubThrow('createResponse'); }
  updateResponse(_modelId: string, _userId: string, _partial: Partial<ResponseDoc>): void { stubThrow('updateResponse'); }

  saveComparisons(_modelId: string, _userId: string, _layer: string, comparisons: ComparisonMap): void {
    validateUpperTriangle(comparisons);
    stubThrow('saveComparisons');
  }

  getComparisons(_modelId: string, _userId: string, _layer: string): ComparisonMap { stubThrow('getComparisons'); }
  saveSynthesis(_modelId: string, _synthesisId: string, _docs: Partial<SynthesisBundle>): void { stubThrow('saveSynthesis'); }
  getSynthesis(_modelId: string, _synthesisId: string): SynthesisBundle | null { stubThrow('getSynthesis'); }
  subscribeModel(_modelId: string, _callback: (data: unknown) => void): () => void { stubThrow('subscribeModel'); }
  subscribeResponses(_modelId: string, _callback: (data: unknown) => void): () => void { stubThrow('subscribeResponses'); }
}
