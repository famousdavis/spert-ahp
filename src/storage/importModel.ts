import { DISAGREEMENT_PRESETS } from '../core/models/constants';
import { createResponseDoc, validateModelDoc } from '../core/models/AHPModel';
import { getOrCreateWorkspaceId } from '../hooks/useSession';
import type {
  AHPExportBundle,
  AHPExportEnvelope,
  ChangeLogEntry,
  CollaboratorDoc,
  ComparisonMap,
  CompletionTier,
  DisagreementConfig,
  ModelDoc,
  ModelStatus,
  ResponseDoc,
  ResponseStatus,
  StorageAdapter,
  StructureDoc,
  StructuredItem,
  SynthesisStatus,
} from '../types/ahp';

/** 2 MB cap on the raw JSON input. Blocks accidental-or-malicious huge
 *  imports that would hang the main thread during parse or exhaust
 *  localStorage quota. A legitimate AHP export at Complete tier with 50
 *  voters is well under 500 KB; 2 MB is generous headroom. */
const MAX_IMPORT_BYTES = 2 * 1024 * 1024;

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function generateModelId(): string {
  return `model-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function defaultDisagreementConfig(userId: string): DisagreementConfig {
  const now = Date.now();
  return {
    preset: 'standard',
    thresholds: { ...DISAGREEMENT_PRESETS['standard']! },
    configuredBy: userId,
    configuredAt: now,
  };
}

// ── Whitelist pickers ────────────────────────────────────────
// Every imported object goes through an explicit per-field pick so that
// unknown/rogue fields on the JSON payload never propagate into storage.
// Defense-in-depth against audit finding 1.3.

function pickString(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

function pickNumber(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function pickStatus(v: unknown): ModelStatus {
  return v === 'setup' || v === 'open' || v === 'closed' ||
    v === 'synthesized' || v === 'reopened'
    ? v
    : 'open';
}

function pickCompletionTier(v: unknown): CompletionTier {
  return v === 1 || v === 2 || v === 3 || v === 4 ? v : 4;
}

function pickDisagreementConfig(v: unknown, fallbackUserId: string): DisagreementConfig {
  if (!isObject(v)) return defaultDisagreementConfig(fallbackUserId);
  const thresholds = isObject(v['thresholds']) ? v['thresholds'] : {};
  return {
    preset: (v['preset'] as DisagreementConfig['preset']) ?? 'standard',
    thresholds: {
      agreement: pickNumber(thresholds['agreement'], 0.15),
      mild: pickNumber(thresholds['mild'], 0.35),
    },
    ...(typeof v['configuredBy'] === 'string' ? { configuredBy: v['configuredBy'] } : {}),
    ...(typeof v['configuredAt'] === 'number' ? { configuredAt: v['configuredAt'] } : {}),
  };
}

function pickResultsVisibility(v: unknown): ModelDoc['resultsVisibility'] {
  if (!isObject(v)) return undefined;
  return {
    showAggregatedToVoters:
      typeof v['showAggregatedToVoters'] === 'boolean' ? v['showAggregatedToVoters'] : false,
    showOwnRankingsToVoters:
      typeof v['showOwnRankingsToVoters'] === 'boolean' ? v['showOwnRankingsToVoters'] : true,
  };
}

function pickChangeLog(v: unknown): ChangeLogEntry[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter(isObject)
    .map((e) => ({
      action: pickString(e['action'], 'unknown'),
      timestamp: pickNumber(e['timestamp'], 0),
      ...(typeof e['actor'] === 'string' ? { actor: e['actor'] } : {}),
    }));
}

function pickStructuredItem(v: unknown): StructuredItem {
  const s = isObject(v) ? v : {};
  return {
    id: pickString(s['id']),
    label: pickString(s['label']),
    description: pickString(s['description']),
  };
}

function pickStructure(v: unknown): StructureDoc {
  const s = isObject(v) ? v : {};
  return {
    criteria: Array.isArray(s['criteria']) ? s['criteria'].map(pickStructuredItem) : [],
    alternatives: Array.isArray(s['alternatives']) ? s['alternatives'].map(pickStructuredItem) : [],
    structureVersion: pickNumber(s['structureVersion'], 0),
  };
}

/** Strip to upper-triangle numeric-keyed entries only. Non-numeric keys
 *  (e.g., "abc,def") and non-numeric values are dropped. */
function pickComparisonMap(v: unknown): ComparisonMap {
  if (!isObject(v)) return {};
  const result: ComparisonMap = {};
  for (const [k, val] of Object.entries(v)) {
    if (typeof val !== 'number' || !Number.isFinite(val)) continue;
    if (!/^\d+,\d+$/.test(k)) continue;
    const [i, j] = k.split(',').map(Number) as [number, number];
    if (i >= j) continue;
    result[k] = val;
  }
  return result;
}

function pickAlternativeMatrices(v: unknown): Record<string, ComparisonMap> {
  if (!isObject(v)) return {};
  const result: Record<string, ComparisonMap> = {};
  for (const [k, val] of Object.entries(v)) {
    result[k] = pickComparisonMap(val);
  }
  return result;
}

function pickResponse(v: unknown, userId: string): ResponseDoc {
  const s = isObject(v) ? v : {};
  const status: ResponseStatus = s['status'] === 'submitted' ? 'submitted' : 'in_progress';
  return {
    userId,
    status,
    criteriaMatrix: pickComparisonMap(s['criteriaMatrix']),
    alternativeMatrices: pickAlternativeMatrices(s['alternativeMatrices']),
    cr: isObject(s['cr']) ? s['cr'] : {},
    lastModifiedAt: pickNumber(s['lastModifiedAt'], Date.now()),
    structureVersionAtSubmission: pickNumber(s['structureVersionAtSubmission'], 0),
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
  if (rawJson.length > MAX_IMPORT_BYTES) {
    throw new Error(
      `Import too large: ${(rawJson.length / 1024 / 1024).toFixed(1)} MB exceeds the 2 MB limit.`,
    );
  }

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
  const metaSource = envelope.meta as unknown as Record<string, unknown>;
  const originalOwner =
    envelope.collaborators.find((c) => c && c.role === 'owner')?.userId
    ?? pickString(metaSource['createdBy']);

  const originalOwnerResponse = (envelope.responses as Record<string, unknown>)[originalOwner];

  const rewrittenChangeLog: ChangeLogEntry[] = pickChangeLog(metaSource['_changeLog']).map((e) =>
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
  const incomingStatus = pickStatus(metaSource['status']);

  // Whitelist-copy every known ModelDoc field. Unknown fields on the JSON
  // payload are dropped. Defense-in-depth for audit finding 1.3.
  const rewrittenMeta: ModelDoc = {
    title: pickString(metaSource['title']),
    goal: pickString(metaSource['goal']),
    createdBy: currentUserId,
    createdAt: pickNumber(metaSource['createdAt'], Date.now()),
    status: incomingStatus === 'synthesized' ? 'open' : incomingStatus,
    completionTier: pickCompletionTier(metaSource['completionTier']),
    synthesisStatus: null as SynthesisStatus | null,
    disagreementConfig: pickDisagreementConfig(metaSource['disagreementConfig'], currentUserId),
    publishedSynthesisId: null,
    _originRef: pickString(metaSource['_originRef'], '') || getOrCreateWorkspaceId(),
    _changeLog: rewrittenChangeLog,
    ...(pickResultsVisibility(metaSource['resultsVisibility'])
      ? { resultsVisibility: pickResultsVisibility(metaSource['resultsVisibility'])! }
      : {}),
  };

  const newCollaborators: CollaboratorDoc[] = [
    { userId: currentUserId, role: 'owner', isVoting: true },
  ];

  const newResponses: Record<string, ResponseDoc> = {
    [currentUserId]: originalOwnerResponse
      ? pickResponse(originalOwnerResponse, currentUserId)
      : createResponseDoc(currentUserId),
  };

  const bundle: AHPExportBundle = {
    meta: rewrittenMeta,
    structure: pickStructure(envelope.structure),
    collaborators: newCollaborators,
    responses: newResponses,
    synthesis: null,
  };

  // ── Phase C: write ───────────────────────────────────────────
  const newModelId = generateModelId();
  await storage.createModelFromBundle(newModelId, bundle);
  return newModelId;
}
