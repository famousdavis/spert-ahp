// ─── Enumerations ─────────────────────────────────────────────

export type ModelStatus = 'setup' | 'open' | 'closed' | 'synthesized' | 'reopened';
export type CompletionTier = 1 | 2 | 3 | 4;
export type CRConfidence = 'none' | 'low' | 'moderate' | 'full';
export type CollaboratorRole = 'owner' | 'editor' | 'viewer';
export type ResponseStatus = 'in_progress' | 'submitted';
export type SynthesisStatus = 'current' | 'out_of_date' | 'computing';
export type DisagreementPresetName = 'strict' | 'standard' | 'exploratory';
export type DisagreementBand = 'agreement' | 'mild' | 'disagreement';
export type ConfidenceLevel = 'RED' | 'AMBER' | 'GREEN';
export type ConcordanceInterpretation = 'strong' | 'moderate' | 'weak';
export type PairCoverageDiagnostic = 'full' | 'partial' | 'low';

// ─── Core Data Structures ────────────────────────────────────

export interface StructuredItem {
  id: string;
  label: string;
  description: string;
}

/** Upper-triangle comparison map. Keys are "i,j" where i < j. */
export type ComparisonMap = Record<string, number>;

/** Pair coordinates [i, j] with i < j */
export type ComparisonPair = [number, number];

// ─── Disagreement Config ──────────────────────────────────────

export interface DisagreementThresholds {
  agreement: number;
  mild: number;
}

export interface DisagreementConfig {
  preset: DisagreementPresetName | 'custom';
  thresholds: DisagreementThresholds;
  configuredBy?: string;
  configuredAt?: number;
}

// ─── Document Types (storage layer) ──────────────────────────

export interface ModelDoc {
  title: string;
  goal: string;
  createdBy: string;
  createdAt: number;
  status: ModelStatus;
  completionTier: CompletionTier;
  synthesisStatus: SynthesisStatus | null;
  disagreementConfig: DisagreementConfig;
  publishedSynthesisId: string | null;
}

export interface StructureDoc {
  criteria: StructuredItem[];
  alternatives: StructuredItem[];
  structureVersion: number;
}

export interface CollaboratorDoc {
  userId: string;
  role: CollaboratorRole;
  isVoting: boolean;
}

export interface ResponseDoc {
  userId: string;
  status: ResponseStatus;
  criteriaMatrix: ComparisonMap;
  alternativeMatrices: Record<string, ComparisonMap>;
  cr: Record<string, unknown>;
  lastModifiedAt: number;
  structureVersionAtSubmission: number;
}

export interface ModelIndexEntry {
  modelId: string;
  title: string;
  status: ModelStatus;
  createdAt: number;
}

// ─── Math Results ────────────────────────────────────────────

export interface ConnectivityResult {
  connected: boolean;
  missingLinks: ComparisonPair[];
}

export interface LLSMResult {
  weights: number[];
  converged: boolean;
}

export interface ConsistencyResult {
  cr: number | null;
  isAcceptable: boolean | null;
  lambdaMax: number | null;
  ci: number | null;
  confidenceLabel: string;
}

export interface RepairSuggestion {
  i: number;
  j: number;
  currentValue: number;
  suggestedValue: number;
  expectedCRImprovement: number;
}

// ─── Aggregation ─────────────────────────────────────────────

export interface VoterComparisons {
  userId: string;
  comparisons: ComparisonMap;
}

export interface VotingMember {
  userId: string;
  isVoting: boolean;
}

export interface AIJResult {
  consensusComparisons: ComparisonMap;
  pairCoveragePercent: number;
  pairCoverageDiagnostic: PairCoverageDiagnostic;
}

export interface AIPResult {
  consensusWeights: number[];
  individualWeights: Record<string, number[]>;
}

export interface DisagreementItem {
  mean: number;
  sd: number;
  cv: number;
  normalizedMAD: number;
  cvReliable: boolean;
  band: DisagreementBand;
}

export interface DisagreementResult {
  items: DisagreementItem[];
}

export interface ConfidenceSignals {
  voterCount: number;
  avgCR: number;
  kendallW: number;
  maxCV: number;
  pairCoverage: number;
}

export interface ConfidenceResult {
  level: ConfidenceLevel;
  signals: ConfidenceSignals;
}

// ─── Synthesis ───────────────────────────────────────────────

export interface SynthesisSummary {
  method: 'AIJ' | 'AIP';
  aggregatedWeights: number[];
  localPriorities: number[][];
  globalScores: number[];
  concordance: {
    kendallW: number;
    interpretation: ConcordanceInterpretation;
  };
  votersIncluded: string[];
  votersExcluded: Array<{ userId: string; reason: string }>;
  synthesizedAt: number;
  synthesisId: string;
  isVotingSnapshot: Record<string, boolean>;
  pairCoveragePercent: number;
  pairCoverageDiagnostic: PairCoverageDiagnostic;
  confidence: ConfidenceResult;
}

export interface SynthesisIndividual {
  individualPriorities: Record<string, number[]>;
  individualCR: Record<string, { criteria: ConsistencyResult }>;
}

export interface SynthesisDiagnostics {
  disagreement: DisagreementResult;
  pairwiseAgreement: Record<string, number>;
}

export interface SynthesisBundle {
  summary: SynthesisSummary;
  individual: SynthesisIndividual;
  diagnostics: SynthesisDiagnostics;
}

// ─── Sensitivity ─────────────────────────────────────────────

export interface SweepPoint {
  t: number;
  weights: number[];
  scores: number[];
}

export interface CrossoverPoint {
  t: number;
  altA: number;
  altB: number;
  score: number;
}

// ─── Comparison Tier Config ──────────────────────────────────

export interface TierConfig {
  label: string;
  comparisonsFor: (n: number) => number;
  crConfidence: CRConfidence;
}

export interface SaatyScaleEntry {
  value: number;
  label: string;
}

export interface SynthesisConfidenceThreshold {
  maxVoters: number;
  maxAvgCR: number;
  minW: number;
  maxCV: number;
  minCoverage: number;
}

// ─── Storage Interface ───────────────────────────────────────

export interface StorageAdapter {
  createModel(modelId: string, metaDoc: ModelDoc, structureDoc: StructureDoc): void;
  getModel(modelId: string): { meta: ModelDoc; structure: StructureDoc } | null;
  updateModel(modelId: string, partialMeta: Partial<ModelDoc>): void;
  deleteModel(modelId: string): void;
  listModels(): ModelIndexEntry[];
  getStructure(modelId: string): StructureDoc | null;
  updateStructure(modelId: string, structureDoc: StructureDoc): void;
  addCollaborator(modelId: string, collaboratorDoc: CollaboratorDoc): void;
  getCollaborators(modelId: string): CollaboratorDoc[];
  updateCollaborator(modelId: string, userId: string, partial: Partial<CollaboratorDoc>): void;
  getResponse(modelId: string, userId: string): ResponseDoc | null;
  createResponse(modelId: string, responseDoc: ResponseDoc): void;
  updateResponse(modelId: string, userId: string, partial: Partial<ResponseDoc>): void;
  saveComparisons(modelId: string, userId: string, layer: string, comparisons: ComparisonMap): void;
  getComparisons(modelId: string, userId: string, layer: string): ComparisonMap;
  saveSynthesis(modelId: string, synthesisId: string, docs: Partial<SynthesisBundle>): void;
  getSynthesis(modelId: string, synthesisId: string): SynthesisBundle | null;
  subscribeModel(modelId: string, callback: (data: unknown) => void): () => void;
  subscribeResponses(modelId: string, callback: (data: unknown) => void): () => void;
}

// ─── useAHP State ────────────────────────────────────────────

export interface AHPState {
  modelId: string | null;
  model: ModelDoc | null;
  structure: StructureDoc | null;
  collaborators: CollaboratorDoc[];
  responses: Record<string, ResponseDoc>;
  synthesis: SynthesisBundle | null;
  loading: boolean;
  error: string | null;
}

export interface AHPActions {
  createModel: (title: string, goal: string) => string;
  loadModel: (modelId: string) => void;
  updateModel: (partialMeta: Partial<ModelDoc>) => void;
  updateStructure: (newStructure: StructureDoc) => void;
  saveComparisons: (layer: string, comparisons: ComparisonMap) => void;
  runSynthesis: () => Promise<void>;
  closeModel: () => void;
  deleteModel: () => void;
  storage: StorageAdapter;
}

export type UseAHPReturn = AHPState & AHPActions;

// ─── Reducer Actions ─────────────────────────────────────────

export type AHPAction =
  | { type: 'SET_MODEL'; payload: { modelId: string; meta: ModelDoc; structure: StructureDoc } }
  | { type: 'SET_STRUCTURE'; payload: StructureDoc }
  | { type: 'SET_COLLABORATORS'; payload: CollaboratorDoc[] }
  | { type: 'SET_RESPONSE'; payload: { userId: string; response: ResponseDoc } }
  | { type: 'SET_SYNTHESIS'; payload: SynthesisBundle }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'UPDATE_MODEL'; payload: Partial<ModelDoc> }
  | { type: 'RESET' };

// ─── Validation ──────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}
