import { DISAGREEMENT_PRESETS } from '../core/models/constants';
import { createResponseDoc, validateModelDoc } from '../core/models/AHPModel';
import { getOrCreateWorkspaceId } from '../hooks/useSession';
import type {
  AHPExportBundle,
  AHPExportEnvelope,
  ChangeLogEntry,
  CollaboratorDoc,
  ModelDoc,
  ResponseDoc,
  StorageAdapter,
} from '../types/ahp';

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function generateModelId(): string {
  return `model-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function defaultDisagreementConfig(userId: string): ModelDoc['disagreementConfig'] {
  const now = Date.now();
  return {
    preset: 'standard',
    thresholds: { ...DISAGREEMENT_PRESETS['standard']! },
    configuredBy: userId,
    configuredAt: now,
  };
}

/**
 * Parse, validate, and write an imported JSON export into the current
 * storage adapter. Drops non-owner collaborators and remaps all original
 * owner UIDs to currentUserId so the imported model is owned and editable
 * by the importer.
 *
 * Returns the newly-generated modelId the caller can pass to loadModel.
 */
export async function importModel(
  storage: StorageAdapter,
  rawJson: string,
  currentUserId: string,
): Promise<string> {
  // ── Phase A: parse and validate ──────────────────────────────
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    throw new Error('Invalid JSON: could not parse file contents.');
  }

  if (!isObject(parsed)) {
    throw new Error('Malformed export: expected a JSON object.');
  }

  if (!('spertAhpExportVersion' in parsed)) {
    throw new Error("Missing required field 'spertAhpExportVersion'.");
  }
  if (parsed['spertAhpExportVersion'] !== 1) {
    throw new Error(
      `Unsupported export version: expected 1, got ${String(parsed['spertAhpExportVersion'])}.`,
    );
  }

  for (const field of ['meta', 'structure', 'collaborators', 'responses'] as const) {
    if (!(field in parsed)) {
      throw new Error(`Malformed export: missing '${field}'.`);
    }
  }

  const envelope = parsed as unknown as AHPExportEnvelope;

  if (!Array.isArray(envelope.collaborators)) {
    throw new Error("Malformed export: 'collaborators' must be an array.");
  }
  if (!isObject(envelope.responses as unknown as Record<string, unknown>)) {
    throw new Error("Malformed export: 'responses' must be an object.");
  }

  const metaValidation = validateModelDoc(envelope.meta);
  if (!metaValidation.valid) {
    throw new Error(`Malformed export meta: ${metaValidation.errors.join('; ')}`);
  }

  // ── Phase B: UID remap ───────────────────────────────────────
  const originalOwner =
    envelope.collaborators.find((c) => c.role === 'owner')?.userId ?? envelope.meta.createdBy;

  const originalOwnerResponse: ResponseDoc | undefined = envelope.responses[originalOwner];

  const rewrittenChangeLog: ChangeLogEntry[] = (envelope.meta._changeLog ?? []).map((e) =>
    e.actor === originalOwner ? { ...e, actor: currentUserId } : e,
  );
  rewrittenChangeLog.push({
    action: 'imported',
    timestamp: Date.now(),
    actor: currentUserId,
  });

  // Synthesis is stripped on import — the collapsed single-user voter set
  // would render the stored votersIncluded / individualPriorities /
  // individualAlternativeScores inconsistent with collaborators.
  const hadSynthesized = envelope.meta.status === 'synthesized';

  const rewrittenMeta: ModelDoc = {
    ...envelope.meta,
    createdBy: currentUserId,
    _changeLog: rewrittenChangeLog,
    _originRef: envelope.meta._originRef ?? getOrCreateWorkspaceId(),
    disagreementConfig:
      envelope.meta.disagreementConfig ?? defaultDisagreementConfig(currentUserId),
    publishedSynthesisId: null,
    synthesisStatus: null,
    status: hadSynthesized ? 'open' : envelope.meta.status,
  };

  const newCollaborators: CollaboratorDoc[] = [
    { userId: currentUserId, role: 'owner', isVoting: true },
  ];

  const newResponses: Record<string, ResponseDoc> = {
    [currentUserId]: originalOwnerResponse
      ? { ...originalOwnerResponse, userId: currentUserId }
      : createResponseDoc(currentUserId),
  };

  const bundle: AHPExportBundle = {
    meta: rewrittenMeta,
    structure: envelope.structure,
    collaborators: newCollaborators,
    responses: newResponses,
    synthesis: null,
  };

  // ── Phase C: write ───────────────────────────────────────────
  const newModelId = generateModelId();
  await storage.createModelFromBundle(newModelId, bundle);
  return newModelId;
}
