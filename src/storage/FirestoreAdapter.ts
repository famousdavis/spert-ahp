import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  writeBatch,
} from 'firebase/firestore';
import { db, getRevokeInvite, getResendInvite, getUpdateInvite } from '../lib/firebase';
import {
  serializeSynthesisForFirestore,
  deserializeSynthesisFromFirestore,
  type FirestoreSynthesis,
} from './firestoreSynthesisCodec';
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
  PendingInvite,
  InvitationStatus,
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

  // Latest published synthesis (only the current bundle, not history).
  // Stored shape matches FirestoreSynthesis: nested-array fields encoded as
  // JSON strings by the codec; see firestoreSynthesisCodec.ts.
  synthesis: FirestoreSynthesis | null;

  // Visibility controls
  resultsVisibility?: ModelDoc['resultsVisibility'];

  // Display order in the saved-decisions list (0-indexed). Optional for v0.9.x
  // legacy docs that predate the field; absent rows sort to the bottom.
  order?: number;

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
    const nextOrder = await this.computeNextOrder();
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
      order: nextOrder,
      _originRef: metaDoc._originRef,
      _changeLog: metaDoc._changeLog ?? [],
      schemaVersion: CURRENT_SCHEMA_VERSION,
    };
    await setDoc(docRef(modelId), payload);
  }

  private async computeNextOrder(): Promise<number> {
    const q = query(
      collection(requireDb(), `${NAMESPACE}_projects`),
      where(`members.${this.uid}`, 'in', ['owner', 'editor', 'viewer']),
    );
    const snap = await getDocs(q);
    let maxOrder = -1;
    snap.forEach((s) => {
      const d = s.data() as FirestoreModelDoc;
      if (typeof d.order === 'number' && d.order > maxOrder) maxOrder = d.order;
    });
    return maxOrder + 1;
  }

  /**
   * Single-shot creation from a bundle. Used by migration (local→cloud) and
   * by import (JSON file → storage). Inlines embedded collaborators,
   * responses, and — if present — synthesis into the monolithic document.
   */
  async createModelFromBundle(modelId: string, bundle: AHPExportBundle): Promise<void> {
    const now = Date.now();
    const nextOrder = await this.computeNextOrder();
    // Build members map from the collaborators array
    const members: Record<string, CollaboratorRole> = {};
    for (const c of bundle.collaborators) {
      members[c.userId] = c.role;
    }
    // Ensure creator is owner
    if (!members[this.uid]) members[this.uid] = 'owner';

    const synthesisField: FirestoreModelDoc['synthesis'] =
      bundle.synthesis && bundle.meta.publishedSynthesisId
        ? (serializeSynthesisForFirestore(
            bundle.meta.publishedSynthesisId,
            bundle.synthesis,
          ) as unknown as FirestoreSynthesis)
        : null;

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
      order: nextOrder,
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
        order: typeof d.order === 'number' ? d.order : undefined,
      });
    });
    // Sort: rows with `order` first (ascending), then rows without by createdAt asc
    entries.sort((a, b) => {
      const ao = a.order ?? Number.MAX_SAFE_INTEGER;
      const bo = b.order ?? Number.MAX_SAFE_INTEGER;
      if (ao !== bo) return ao - bo;
      return a.createdAt - b.createdAt;
    });
    return entries;
  }

  async reorderModels(orderedIds: string[]): Promise<void> {
    const batch = writeBatch(requireDb());
    orderedIds.forEach((id, idx) => {
      batch.update(docRef(id), { order: idx, updatedAt: Date.now() });
    });
    await batch.commit();
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

    // Create an empty response slot for the new collaborator. Without this,
    // saveComparisons throws "Response for {userId} not found" the first time
    // the collaborator submits a judgment. Preserve any existing slot (e.g.,
    // re-adding a previously-removed collaborator who already has responses).
    const update: Record<string, unknown> = {
      collaborators: filtered,
      [`members.${collaboratorDoc.userId}`]: collaboratorDoc.role,
      updatedAt: Date.now(),
    };
    if (!d.responses?.[collaboratorDoc.userId]) {
      update[`responses.${collaboratorDoc.userId}`] = {
        userId: collaboratorDoc.userId,
        status: 'in_progress',
        criteriaMatrix: {},
        alternativeMatrices: {},
        cr: {},
        lastModifiedAt: Date.now(),
        structureVersionAtSubmission: 0,
      };
    }
    await updateDoc(docRef(modelId), update);
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

  async removeCollaborator(modelId: string, userId: string): Promise<void> {
    // Replaces the direct updateDoc bypass that previously lived in
    // SharingSection.handleRemove. Updates both the embedded collaborators
    // array and the members map; leaves the response slot intact so a
    // re-added collaborator's prior judgments are preserved.
    const snap = await getDoc(docRef(modelId));
    if (!snap.exists()) throw new Error(`Model ${modelId} not found`);
    const d = snap.data() as FirestoreModelDoc;
    const remaining = (d.collaborators ?? []).filter((c) => c.userId !== userId);
    await updateDoc(docRef(modelId), {
      collaborators: remaining,
      [`members.${userId}`]: deleteField(),
      updatedAt: Date.now(),
    });
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
    const snap = await getDoc(docRef(modelId));
    if (!snap.exists()) throw new Error(`Model ${modelId} not found`);
    const d = snap.data() as FirestoreModelDoc;

    await updateDoc(docRef(modelId), {
      synthesis: serializeSynthesisForFirestore(synthesisId, docs, d.synthesis),
      updatedAt: Date.now(),
    });
  }

  async getSynthesis(modelId: string, synthesisId: string): Promise<SynthesisBundle | null> {
    const snap = await getDoc(docRef(modelId));
    if (!snap.exists()) return null;
    const d = snap.data() as FirestoreModelDoc;
    if (!d.synthesis || d.synthesis.synthesisId !== synthesisId) return null;
    return deserializeSynthesisFromFirestore(d.synthesis);
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

  // ─── Pending invitations (suite-wide) ──────────────────────

  /**
   * List pending invitations for a model. Reads spertsuite_invitations
   * directly via the owner-branch security rule:
   *   inviterUid == request.auth.uid
   * Uses the deployed (inviterUid, modelId, createdAt) composite index.
   */
  async listPendingInvites(modelId: string): Promise<PendingInvite[]> {
    if (!db) return [];
    const q = query(
      collection(requireDb(), 'spertsuite_invitations'),
      where('inviterUid', '==', this.uid),
      where('modelId', '==', modelId),
    );
    const snap = await getDocs(q);
    const out: PendingInvite[] = [];
    snap.forEach((s) => {
      const d = s.data() as Record<string, unknown>;
      if (d['status'] !== 'pending') return;
      out.push({
        tokenId: s.id,
        appId: (d['appId'] as string) ?? 'spertahp',
        modelId: (d['modelId'] as string) ?? modelId,
        modelName: (d['modelName'] as string) ?? '',
        inviteeEmail: (d['inviteeEmail'] as string) ?? '',
        role: (d['role'] as PendingInvite['role']) ?? 'editor',
        isVoting: Boolean(d['isVoting']),
        inviterUid: (d['inviterUid'] as string) ?? this.uid,
        inviterName: (d['inviterName'] as string) ?? '',
        inviterEmail: (d['inviterEmail'] as string) ?? '',
        status: (d['status'] as InvitationStatus) ?? 'pending',
        createdAt: tsToMillis(d['createdAt']),
        expiresAt: tsToMillis(d['expiresAt']),
        lastEmailSentAt: tsToMillis(d['lastEmailSentAt']),
        emailSendCount: typeof d['emailSendCount'] === 'number' ? (d['emailSendCount'] as number) : 0,
        updatedAt: tsToMillis(d['updatedAt']),
        ...(d['acceptedAt'] !== undefined ? { acceptedAt: tsToMillis(d['acceptedAt']) } : {}),
        ...(d['acceptedByUid'] !== undefined
          ? { acceptedByUid: d['acceptedByUid'] as string }
          : {}),
      });
    });
    out.sort((a, b) => b.createdAt - a.createdAt);
    return out;
  }

  // ─── Invitation actions (Phase 3.5) ────────────────────────

  /**
   * Soft-revoke a pending invitation via the revokeInvite Cloud Function.
   * Server flips status='revoked' (no delete). Errors propagate as
   * Firebase HttpsError; SharingSection's mapInvitationError translates
   * them to user-facing copy.
   */
  async revokeInvite(tokenId: string): Promise<void> {
    const callable = getRevokeInvite();
    if (!callable) throw new Error('Cloud invitations are not configured.');
    await callable({ tokenId });
  }

  /**
   * Re-send a pending invitation via the resendInvite Cloud Function.
   * Server enforces emailSendCount <= 5; HttpsError 'resource-exhausted'
   * is mapped to cap copy by SharingSection.mapInvitationError.
   */
  async resendInvite(tokenId: string): Promise<void> {
    const callable = getResendInvite();
    if (!callable) throw new Error('Cloud invitations are not configured.');
    await callable({ tokenId });
  }

  /**
   * Update the isVoting flag on a pending invitation via the
   * updateInvite Cloud Function. Caller must be the inviter; server
   * rejects non-pending invitations with failed-precondition. Lets the
   * owner correct voting rights before the invitee accepts, so the
   * resulting CollaboratorDoc has the right isVoting from the start.
   */
  async updateInvite(tokenId: string, isVoting: boolean): Promise<void> {
    const callable = getUpdateInvite();
    if (!callable) throw new Error('Cloud invitations are not configured.');
    await callable({ tokenId, isVoting });
  }
}

/**
 * Coerce a Firestore Timestamp (or number, or undefined) into millis.
 * Server-written `createdAt`/`expiresAt` fields land as Timestamp objects;
 * the SDK exposes `.toMillis()` for conversion.
 */
function tsToMillis(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'object' && value !== null && 'toMillis' in value) {
    const fn = (value as { toMillis: () => number }).toMillis;
    if (typeof fn === 'function') return fn.call(value);
  }
  return 0;
}

