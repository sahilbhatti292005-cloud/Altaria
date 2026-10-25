export type ScenePresetId =
  | 'bohemia_valley'
  | 'amazon_canopy'
  | 'bavaria_alpine'
  | 'rhine_delta'
  | 'deccan_watershed'
  | 'coastal_estuary';

export type DatasetSource = 'RICE1' | 'RICE2' | 'CUSTOM';

export type ActiveWorkspaceView =
  | 'dashboard'
  | 'restoration'
  | 'results'
  | 'profile'
  | 'pipeline';

export type RestorationSubTab = 'configure' | 'comparison' | 'heatmap';

export type ResultsSubTab = 'output' | 'history';

export type GroundTruthSource =
  | 'paired_benchmark'
  | 'user_uploaded'
  | 'radiometric_reference';

export type AugmentationMode = 'none' | 'horizontal_flip' | 'tta_enhance';

export interface UserProfile {
  id: string;
  fullName: string;
  username: string;
  email: string;
  contact: string;
  qualification: string;
  designation: string;
  department: string;
  organization: string;
  createdAt: string;
}

export interface SignupPayload {
  fullName: string;
  username: string;
  email: string;
  password: string;
  qualification: string;
  designation: string;
  department: string;
  contact: string;
  organization: string;
}

export interface StagedSatelliteImage {
  id: string;
  name: string;
  label: string;
  dataUrl: string;
  width: number;
  height: number;
  cloudPct: number;
  fogPct: number;
  totalObstructionPct: number;
  presetId?: ScenePresetId;
  datasetSource: DatasetSource;
  datasetSampleCode?: string;
  frameIndex: number;
  isCustomUpload: boolean;
}

export interface ProcessingOptions {
  generateHeatmap: boolean;
  enableComparison: boolean;
  sarStructuralGuidance: boolean;
  architecture:
    | 'spa_gan_epoch200'
    | 'temporal_resnet3d'
    | 'uncrtaints_attention'
    | 'dcp_guided';
  normalization: 'neg1_pos1' | 'zero_one';
  augmentation: AugmentationMode;
  radiometricBalance: boolean;
}

export interface PreprocessSummary {
  resizedDimensions: string;
  normalizationRange: string;
  augmentationApplied: string;
  channelMeanRgb: [number, number, number];
  channelStdRgb: [number, number, number];
  validated: boolean;
  validationMessage: string;
}

export interface SpectralAnalytics {
  vegetationPct: number;
  waterPct: number;
  soilUrbanPct: number;
  clearSurfaceBeforePct: number;
  clearSurfaceAfterPct: number;
  cloudReductionGainPct: number;
  peakAttentionWeight: number;
  highAttentionAreaPct: number;
  meanLuminance: number;
  edgeContrast: number;
  usabilityStatus: string;
}

export interface RecommendedScene {
  id: string;
  presetId: ScenePresetId;
  sampleCode: string;
  title: string;
  dataset: 'RICE1' | 'RICE2';
  region: string;
  sensor: string;
  cloudCoveragePct: number;
  fogCoveragePct: number;
  similarityPct: number;
  matchReason: string;
  previewUrl?: string;
}

export interface RelevantDataRecommendation {
  id: string;
  title: string;
  category: string;
  sourceDataset: string;
  relevanceScorePct: number;
  rationale: string;
  recommendedBands: string;
}

export interface ServerInferenceTrace {
  requestId: string;
  validatedAt: string;
  inputSource: DatasetSource;
  checkpointName: string;
  spatialAttentionRegionsPct: number;
  inferenceTimeMs: number;
  stages: Array<{
    step: string;
    actor: 'User' | 'Server';
    detail: string;
  }>;
}

export interface RestorationMetrics {
  psnrDb: number | null;
  ssim: number | null;
  mse: number | null;
  cloudCoveragePct: number;
  fogCoveragePct: number;
  totalObstructionPct: number;
  residualObstructionPct: number;
  hasGroundTruth: boolean;
  groundTruthSource?: GroundTruthSource;
}

export interface ActiveRestorationResult {
  id: string;
  imageName: string;
  dateLabel: string;
  frameCount: number;
  datasetSource: DatasetSource;
  datasetSampleCode?: string;
  presetId?: ScenePresetId;
  cloudyInputUrl: string;
  preprocessedInputUrl: string;
  allInputUrls: string[];
  restoredOutputUrl: string;
  groundTruthUrl: string;
  groundTruthSource: GroundTruthSource;
  heatmapUrl: string;
  attentionHighlightUrl: string;
  metrics: RestorationMetrics;
  preprocess: PreprocessSummary;
  analytics: SpectralAnalytics;
  recommendations: {
    similarImages: RecommendedScene[];
    relevantData: RelevantDataRecommendation[];
  };
  serverTrace: ServerInferenceTrace;
  options: ProcessingOptions;
}

export interface HistoryRecord {
  id: string;
  imageName: string;
  dateLabel: string;
  createdAt: string;
  frameCount: number;
  datasetSource?: DatasetSource;
  status: 'Completed';
  presetId?: ScenePresetId;
  metrics: RestorationMetrics;
  options: ProcessingOptions;
  cloudyThumbUrl?: string;
  restoredThumbUrl?: string;
  groundTruthThumbUrl?: string | null;
  heatmapThumbUrl?: string;
}
