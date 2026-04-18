import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type {
  StorageAdapter,
  ModelDoc,
  StructureDoc,
  CollaboratorDoc,
  CollaboratorRole,
  ResponseDoc,
  ModelIndexEntry,
  ComparisonMap,
  SynthesisBundle,
  AHPExportBundle,
} from '../types/ahp';

const CURRENT_SCHEMA_VERSION = 1;
const NAMESPACE = 'spertahp';

/**
 * Monolithic Firestore document shape at spertahp_projects/{modelId}.
 *
 * All model data — meta, structure, collaborators, responses, synthesis —
 * lives in a single document. AHP data is dense-but-small (under 200KB
 * even at extreme scale), well within Firestore's 1MB limit. This avoids
 * subcollections, 2-phase batch commits, and get()-based security rules.
 */
interface FirestoreModelDoc {
  // Security rule fields
  owner: string;
  members: Record<string, CollaboratorRole>;

  // ModelDoc fields (inlined)
  title: string;
  goal: string;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
  status: ModelDoc['status'];
  completionTier: ModelDoc['completionTier'];
  synthesisStatus: ModelDoc['synthesisStatus'];
  disagreementConfig: ModelDoc['disagreementConfig'];
  publishedSynthesisId: string | null;

  // StructureDoc fields (inlined)
  criteria: StructureDoc['criteria'];
  alternatives: StructureDoc['alternatives'];
  structureVersion: number;

  // Embedded collaborators array with isVoting
  collaborators: CollaboratorDoc[];

  // Embedded responses map keyed by uid
  responses: Record<string, ResponseDoc>;

  // Latest published synthesis (only the current bundle, not history)
  synthesis: {
    synthesisId: string;
    summary: SynthesisBundle['summary'];
    individual: SynthesisBundle['individual'];
    diagnostics: SynthesisBundle['diagnostics'];
  } | null;

  // Visibility controls
  resultsVisibility?: ModelDoc['resultsVisibility'];

  // Fingerprinting
  _originRef: string;
  _changeLog: ModelDoc['_changeLog'];

  // Schema
  schemaVersion: number;
}

function requireDb() {
  if (!db) throw new Error('FirestoreAdapter: Firestore is not initialized (missing VITE_FIREBASE_* env vars)');
  return db;
}

function docRef(modelId: string) {
  return doc(requireDb(), `${NAMESPACE}_projects`, modelId);
}

function unwrapMeta(d: FirestoreModelDoc): ModelDoc {
  return {
    title: d.title,
    goal: d.goal,
    createdBy: d.createdBy,
    createdAt: d.createdAt,
    status: d.status,
    completionTier: d.completionTier,
    synthesisStatus: d.synthesisStatus,
    disagreementConfig: d.disagreementConfig,
    publishedSynthesisId: d.publishedSynthesisId,
    _originRef: d._originRef,
    _changeLog: d._changeLog ?? [],
    resultsVisibility: d.resultsVisibility ?? {
      showAggregatedToVoters: false,
      showOwnRankingsToVoters: true,
    },
  };
}

function unwrapStructure(d: FirestoreModelDoc): StructureDoc {
  return {
    criteria: d.criteria ?? [],
    alternatives: d.alternatives ?? [],
    structureVersion: d.structureVersion ?? 0,
  };
}

/**
 * Bundle type for single-shot creation (used by migration and import).
 * Alias to AHPExportBundle so migration.ts's existing import keeps working.
 */
export type ModelBundle = AHPExportBundle;

export class FirestoreAdapter implements StorageAdapter {
  constructor(private uid: string) {}

  // ─── Model CRUD ──────────────────────────────────────────────

  async createModel(modelId: string, metaDoc: ModelDoc, structureDoc: StructureDoc): Promise<void> {
    const now = Date.now();
    const payload: FirestoreModelDoc = {
      owner: this.uid,
      members: { [this.uid]: 'owner' },
      title: metaDoc.title,
      goal: metaDoc.goal,
      createdBy: this.uid,
      createdAt: metaDoc.createdAt ?? now,
      updatedAt: now,
      status: metaDoc.status,
      completionTier: metaDoc.completionTier,
      synthesisStatus: metaDoc.synthesisStatus,
      disagreementConfig: metaDoc.disagreementConfig,
      publishedSynthesisId: metaDoc.publishedSynthesisId,
      criteria: structureDoc.criteria,
      alternatives: structureDoc.alternatives,
      structureVersion: structureDoc.structureVersion,
      collaborators: [],
      responses: {},
      synthesis: null,
      _originRef: metaDoc._originRef,
      _changeLog: metaDoc._changeLog ?? [],
      schemaVersion: CURRENT_SCHEMA_VERSION,
    };
    await setDoc(docRef(modelId), payload);
  }

  /**
   * Single-shot creation from a bundle. Used by migration (local→cloud) and
   * by import (JSON file → storage). Inlines embedded collaborators,
   * responses, and — if present — synthesis into the monolithic document.
   */
  async createModelFromBundle(modelId: string, bundle: AHPExportBundle): Promise<void> {
    const now = Date.now();
    // Build members map from the collaborators array
    const members: Record<string, CollaboratorRole> = {};
    for (const c of bundle.collaborators) {
      members[c.userId] = c.role;
    }
    // Ensure creator is owner
    if (!members[this.uid]) members[this.uid] = 'owner';

    // Inline synthesis with nested-array JSON-string serialization
    // (mirrors saveSynthesis; Firestore does not support nested arrays).
    let synthesisField: FirestoreModelDoc['synthesis'] = null;
    if (bundle.synthesis && bundle.meta.publishedSynthesisId) {
      const summary = { ...bundle.synthesis.summary } as SynthesisBundle['summary'];
      const individual = { ...bundle.synthesis.individual } as SynthesisBundle['individual'];
      const serializedSummary = JSON.parse(JSON.stringify(summary)) as Record<string, unknown>;
      if (summary.localPriorities) {
        serializedSummary['localPriorities'] = JSON.stringify(summary.localPriorities);
      }
      const serializedIndividual = JSON.parse(JSON.stringify(individual)) as Record<string, unknown>;
      if (individual.individualLocalPriorities) {
        serializedIndividual['individualLocalPriorities'] =
          JSON.stringify(individual.individualLocalPriorities);
      }
      synthesisField = {
        synthesisId: bundle.meta.publishedSynthesisId,
        summary: serializedSummary as unknown as SynthesisBundle['summary'],
        individual: serializedIndividual as unknown as SynthesisBundle['individual'],
        diagnostics: bundle.synthesis.diagnostics,
      };
    }

    const payload: FirestoreModelDoc = {
      owner: this.uid,
      members,
      title: bundle.meta.title,
      goal: bundle.meta.goal,
      createdBy: bundle.meta.createdBy,
      createdAt: bundle.meta.createdAt ?? now,
      updatedAt: now,
      status: bundle.meta.status,
      completionTier: bundle.meta.completionTier,
      synthesisStatus: bundle.meta.synthesisStatus,
      disagreementConfig: bundle.meta.disagreementConfig,
      publishedSynthesisId: bundle.meta.publishedSynthesisId,
      criteria: bundle.structure.criteria,
      alternatives: bundle.structure.alternatives,
      structureVersion: bundle.structure.structureVersion,
      collaborators: bundle.collaborators,
      responses: bundle.responses,
      synthesis: synthesisField,
      _originRef: bundle.meta._originRef,
      _changeLog: bundle.meta._changeLog ?? [],
      schemaVersion: CURRENT_SCHEMA_VERSION,
    };
    await setDoc(docRef(modelId), payload);
  }

  async getModel(modelId: string): Promise<{ meta: ModelDoc; structure: StructureDoc } | null> {
    const snap = await getDoc(docRef(modelId));
    if (!snap.exists()) return null;
    const d = snap.data() as FirestoreModelDoc;
    return { meta: unwrapMeta(d), structure: unwrapStructure(d) };
  }

  async updateModel(modelId: string, partialMeta: Partial<ModelDoc>): Promise<void> {
    // Build update payload — only include defined fields (Firestore rejects undefined)
    const update: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [k, v] of Object.entries(partialMeta)) {
      if (v !== undefined) update[k] = v;
    }
    await updateDoc(docRef(modelId), update);
  }

  async deleteModel(modelId: string): Promise<void> {
    await deleteDoc(docRef(modelId));
  }

  async listModels(): Promise<ModelIndexEntry[]> {
    const q = query(
      collection(requireDb(), `${NAMESPACE}_projects`),
      where(`members.${this.uid}`, 'in', ['owner', 'editor', 'viewer']),
    );
    const snap = await getDocs(q);
    const entries: ModelIndexEntry[] = [];
    snap.forEach((s) => {
      const d = s.data() as FirestoreModelDoc;
      entries.push({
        modelId: s.id,
        title: d.title,
        status: d.status,
        createdAt: d.createdAt,
      });
    });
    return entries;
  }

  // ─── Structure ───────────────────────────────────────────────

  async getStructure(modelId: string): Promise<StructureDoc | null> {
    const snap = await getDoc(docRef(modelId));
    if (!snap.exists()) return null;
    return unwrapStructure(snap.data() as FirestoreModelDoc);
  }

  async updateStructure(modelId: string, structureDoc: StructureDoc): Promise<void> {
    await updateDoc(docRef(modelId), {
      criteria: structureDoc.criteria,
      alternatives: structureDoc.alternatives,
      structureVersion: structureDoc.structureVersion,
      updatedAt: Date.now(),
    });
  }

  // ─── Collaborators ──────────────────────────────────────────

  async addCollaborator(modelId: string, collaboratorDoc: CollaboratorDoc): Promise<void> {
    // Read, append, write back (arrayUnion would dedupe by deep-equality which
    // is fragile for our shape).
    const snap = await getDoc(docRef(modelId));
    if (!snap.exists()) throw new Error(`Model ${modelId} not found`);
    const d = snap.data() as FirestoreModelDoc;
    const existing = d.collaborators ?? [];
    const filtered = existing.filter((c) => c.userId !== collaboratorDoc.userId);
    filtered.push(collaboratorDoc);
    await updateDoc(docRef(modelId), {
      collaborators: filtered,
      [`members.${collaboratorDoc.userId}`]: collaboratorDoc.role,
      updatedAt: Date.now(),
    });
  }

  async getCollaborators(modelId: string): Promise<CollaboratorDoc[]> {
    const snap = await getDoc(docRef(modelId));
    if (!snap.exists()) return [];
    const d = snap.data() as FirestoreModelDoc;
    return d.collaborators ?? [];
  }

  async updateCollaborator(modelId: string, userId: string, partial: Partial<CollaboratorDoc>): Promise<void> {
    const snap = await getDoc(docRef(modelId));
    if (!snap.exists()) throw new Error(`Model ${modelId} not found`);
    const d = snap.data() as FirestoreModelDoc;
    const collabs = (d.collaborators ?? []).map((c) =>
      c.userId === userId ? { ...c, ...partial } : c,
    );
    const update: Record<string, unknown> = {
      collaborators: collabs,
      updatedAt: Date.now(),
    };
    // If role changed, mirror it into the members map
    if (partial.role) {
      update[`members.${userId}`] = partial.role;
    }
    await updateDoc(docRef(modelId), update);
  }

  // ─── Responses ──────────────────────────────────────────────

  async getResponse(modelId: string, userId: string): Promise<ResponseDoc | null> {
    const snap = await getDoc(docRef(modelId));
    if (!snap.exists()) return null;
    const d = snap.data() as FirestoreModelDoc;
    return d.responses?.[userId] ?? null;
  }

  async createResponse(modelId: string, responseDoc: ResponseDoc): Promise<void> {
    await updateDoc(docRef(modelId), {
      [`responses.${responseDoc.userId}`]: responseDoc,
      updatedAt: Date.now(),
    });
  }

  async updateResponse(modelId: string, userId: string, partial: Partial<ResponseDoc>): Promise<void> {
    const snap = await getDoc(docRef(modelId));
    if (!snap.exists()) throw new Error(`Model ${modelId} not found`);
    const d = snap.data() as FirestoreModelDoc;
    const existing = d.responses?.[userId];
    if (!existing) throw new Error(`Response for ${userId} not found`);
    const merged: ResponseDoc = { ...existing, ...partial, lastModifiedAt: Date.now() };
    await updateDoc(docRef(modelId), {
      [`responses.${userId}`]: merged,
      updatedAt: Date.now(),
    });
  }

  // ─── Comparisons ───────────────────────────────────────────

  async saveComparisons(
    modelId: string,
    userId: string,
    layer: string,
    comparisons: ComparisonMap,
  ): Promise<void> {
    // Validate upper-triangle (defensive — also enforced by useMatrix)
    for (const ck of Object.keys(comparisons)) {
      const [i, j] = ck.split(',').map(Number) as [number, number];
      if (j <= i) {
        throw new Error(`saveComparisons: invalid key '${ck}' — j must be > i (upper-triangle only)`);
      }
    }

    // Read existing response to merge comparisons in (Firestore dot-path
    // updates replace whole map fields, so we need to merge client-side)
    const snap = await getDoc(docRef(modelId));
    if (!snap.exists()) throw new Error(`Model ${modelId} not found`);
    const d = snap.data() as FirestoreModelDoc;
    const existing = d.responses?.[userId];
    if (!existing) throw new Error(`Response for ${userId} not found`);

    const nextResponse: ResponseDoc = { ...existing, lastModifiedAt: Date.now() };
    if (layer === 'criteria') {
      nextResponse.criteriaMatrix = { ...existing.criteriaMatrix, ...comparisons };
    } else {
      nextResponse.alternativeMatrices = {
        ...(existing.alternativeMatrices ?? {}),
        [layer]: { ...(existing.alternativeMatrices?.[layer] ?? {}), ...comparisons },
      };
    }

    await updateDoc(docRef(modelId), {
      [`responses.${userId}`]: nextResponse,
      updatedAt: Date.now(),
    });
  }

  async getComparisons(modelId: string, userId: string, layer: string): Promise<ComparisonMap> {
    const snap = await getDoc(docRef(modelId));
    if (!snap.exists()) return {};
    const d = snap.data() as FirestoreModelDoc;
    const response = d.responses?.[userId];
    if (!response) return {};

    const raw = layer === 'criteria'
      ? response.criteriaMatrix ?? {}
      : response.alternativeMatrices?.[layer] ?? {};

    // Filter to upper-triangle only
    const result: ComparisonMap = {};
    for (const [ck, value] of Object.entries(raw)) {
      const [i, j] = ck.split(',').map(Number) as [number, number];
      if (i < j) result[ck] = value;
    }
    return result;
  }

  // ─── Synthesis ─────────────────────────────────────────────

  async saveSynthesis(
    modelId: string,
    synthesisId: string,
    docs: Partial<SynthesisBundle>,
  ): Promise<void> {
    // Only one bundle stored at a time — top-level `synthesis` field
    const snap = await getDoc(docRef(modelId));
    if (!snap.exists()) throw new Error(`Model ${modelId} not found`);
    const d = snap.data() as FirestoreModelDoc;

    // Preserve fields that weren't included in this call
    const existing = d.synthesis;
    const merged = {
      synthesisId,
      summary: docs.summary ?? (existing?.summary as SynthesisBundle['summary']),
      individual: docs.individual ?? (existing?.individual as SynthesisBundle['individual']),
      diagnostics: docs.diagnostics ?? (existing?.diagnostics as SynthesisBundle['diagnostics']),
    };

    // Firestore does not support nested arrays. Serialize number[][] fields
    // as JSON strings before writing, and deserialize on read in getSynthesis.
    const toWrite = JSON.parse(JSON.stringify(merged)) as Record<string, unknown>;
    if (merged.summary?.localPriorities) {
      (toWrite['summary'] as Record<string, unknown>)['localPriorities'] =
        JSON.stringify(merged.summary.localPriorities);
    }
    if (merged.individual?.individualLocalPriorities) {
      (toWrite['individual'] as Record<string, unknown>)['individualLocalPriorities'] =
        JSON.stringify(merged.individual.individualLocalPriorities);
    }

    await updateDoc(docRef(modelId), {
      synthesis: toWrite,
      updatedAt: Date.now(),
    });
  }

  async getSynthesis(modelId: string, synthesisId: string): Promise<SynthesisBundle | null> {
    const snap = await getDoc(docRef(modelId));
    if (!snap.exists()) return null;
    const d = snap.data() as FirestoreModelDoc;
    if (!d.synthesis || d.synthesis.synthesisId !== synthesisId) return null;
    const summary = { ...d.synthesis.summary };
    // Deserialize nested arrays stored as JSON strings
    if (typeof summary.localPriorities === 'string') {
      summary.localPriorities = JSON.parse(summary.localPriorities as string) as number[][];
    }
    const individual = {
      individualPriorities: d.synthesis.individual?.individualPriorities ?? {},
      individualCR: d.synthesis.individual?.individualCR ?? {},
      individualAlternativeScores: d.synthesis.individual?.individualAlternativeScores ?? {},
      individualLocalPriorities: typeof d.synthesis.individual?.individualLocalPriorities === 'string'
        ? JSON.parse(d.synthesis.individual.individualLocalPriorities as unknown as string) as Record<string, number[][]>
        : d.synthesis.individual?.individualLocalPriorities ?? {},
      individualIncompleteCriteria: d.synthesis.individual?.individualIncompleteCriteria ?? {},
    };
    return {
      summary,
      individual,
      diagnostics: d.synthesis.diagnostics,
    };
  }

  // ─── Subscriptions ─────────────────────────────────────────

  subscribeModel(modelId: string, callback: (data: unknown) => void): () => void {
    if (!db) return () => {};
    return onSnapshot(docRef(modelId), (snap) => {
      // Echo prevention — don't fire on our own unflushed writes (GanttApp lesson 14)
      if (snap.metadata.hasPendingWrites) return;
      if (!snap.exists()) return;
      callback(snap.data());
    });
  }
}

// Suppress unused import
void serverTimestamp;
