// src/lib/motion-studio/types.ts

export type StudioErrorCode =
  | 'SVG_INVALID_XML'
  | 'SVG_UNSUPPORTED_FEATURE'
  | 'SVG_EXTERNAL_REFERENCE_BLOCKED'
  | 'SVG_LIMIT_EXCEEDED'
  | 'COMPOSITION_REFERENCE_MISSING'
  | 'EXPORT_RENDER_FAILED'
  | 'EXPORT_ZIP_FAILED'
  | 'MOTION_PREVIEW_FAILED'
  | 'MOTION_RENDER_FAILED'
  | 'MOTION_VALIDATION_FAILED';

export type GlobalStudioState =
  | 'loading'
  | 'ready'
  | 'saving'
  | 'unsaved'
  | 'import-warning'
  | 'import-failed'
  | 'export-queued'
  | 'export-running'
  | 'export-partial'
  | 'export-completed'
  | 'export-failed'
  | 'render-queued'
  | 'render-running'
  | 'render-validation'
  | 'render-completed'
  | 'render-failed';

export type MotionRole =
  | 'symbol'
  | 'wordmark'
  | 'descriptor'
  | 'detail'
  | 'background'
  | 'generic';

export type NodeGraphicType =
  | 'group'
  | 'path'
  | 'rect'
  | 'circle'
  | 'ellipse'
  | 'line'
  | 'polyline'
  | 'polygon'
  | 'text'
  | 'image'
  | 'use'
  | 'unknown';

export type WarningSeverity = 'info' | 'warning' | 'error';

export interface CompatibilityIssue {
  id: string;
  code: StudioErrorCode;
  severity: WarningSeverity;
  feature: string;
  description: string;
  suggestedAction: string;
  affectedNodeIds?: string[];
  recoverable: boolean;
}

export interface CompatibilityReport {
  schemaVersion: number;
  status: 'complete' | 'partial' | 'failed';
  correlationId: string;
  parsedAt: string;
  executionTimeMs: number;
  summary: {
    totalNodes: number;
    groupCount: number;
    graphicObjectCount: number;
    defsCount: number;
    uniqueIdsCount: number;
    embeddedImagesCount: number;
    externalReferencesBlocked: number;
    scriptsRemoved: number;
    internalDependenciesCount: number;
    looseElementsCount: number;
    strokeCompatiblePathsCount: number;
    filledPathsCount: number;
  };
  issues: CompatibilityIssue[];
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DefDependencyInfo {
  id: string;
  tag: string; // linearGradient, radialGradient, clipPath, mask, filter, pattern, symbol
  rawXml: string;
  referencedIds: string[];
}

export interface DesignNode {
  id: string; // UUID interno estável
  documentId: string;
  parentId: string | null;
  sourceNodeId: string | null; // id original no SVG
  type: NodeGraphicType;
  tagName: string;
  displayName: string;
  nameOrigin: 'inkscape:label' | 'aria-label' | 'data-name' | 'id' | 'title' | 'synthetic';
  sourceOrder: number;
  depth: number;
  isSyntheticLooseGroup?: boolean;
  childrenIds: string[];
  originalAttributes: Record<string, string>;
  normalizedProperties: {
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    opacity?: number;
    fillOpacity?: number;
    strokeOpacity?: number;
    transform?: string;
    d?: string;
    hasStrokePath?: boolean;
    estimatedPathLength?: number;
  };
  sourceVisibility: boolean;
  computedBounds: BoundingBox | null;
  motionRole: MotionRole;
  motionRoleReason?: string;
  referencedDefIds: string[]; // IDs em <defs> necessários para renderizar este nó
  compatibilityFlags: {
    hasUnsupportedFilter?: boolean;
    hasFontDependency?: boolean;
    hasEmbeddedImage?: boolean;
    hadBlockedExternalRef?: boolean;
    hadStrippedScriptOrEvent?: boolean;
    traceCompatible?: boolean;
  };
  rawElementXml: string;
}

export type ArtboardDetectionStrategy =
  | 'auto'
  | 'top-groups'
  | 'spatial-clusters'
  | 'background-rects'
  | 'subgroups';

export interface ArtboardItem {
  id: string;
  index: number;
  name: string;
  origin:
    | 'inkscape-page'
    | 'named-artboard'
    | 'background-rect'
    | 'spatial-cluster'
    | 'top-group'
    | 'subgroup'
    | 'full-canvas';
  bounds: BoundingBox;
  nodeIds: string[];
  backgroundNodeId?: string;
  hasOwnBackground: boolean;
  detectedBackgroundFill?: string;
  previewSvgString: string;
}

export interface SourceDocument {
  id: string;
  projectId: string;
  originalFilename: string;
  originalSvgBytes: string; // Imutável!
  normalizedSvgString: string;
  checksumSha256: string;
  fileSize: number;
  importStatus: 'queued' | 'processing' | 'complete' | 'partial' | 'failed';
  parserVersion: string;
  normalizerVersion: string;
  sourceMetadata: {
    viewBox: BoundingBox;
    rawViewBoxString: string;
    width: string | number;
    height: string | number;
    preserveAspectRatio: string;
    namespace: string;
    detectedEditorLabels: string[];
    derivedViewport: boolean;
  };
  defsMap: Record<string, DefDependencyInfo>;
  rootCssStyles: string;
  nodes: DesignNode[];
  artboards: ArtboardItem[];
  artboardStrategy: ArtboardDetectionStrategy;
  compatibilityReport: CompatibilityReport;
  createdAt: string;
}

export interface ExportPreferences {
  defaultFormats: ('svg' | 'png')[];
  svgProfile: 'preserve-structure' | 'optimized';
  pngScalePx: number;
  backgroundMode: 'transparent' | 'white' | 'black' | 'brand' | 'custom';
  customBackgroundColor: string;
  framingMode: 'original-viewbox' | 'fit-to-content';
}

export interface Composition {
  schemaVersion: number;
  id: string;
  projectId: string;
  documentId: string;
  name: string;
  description: string;
  status: 'draft' | 'approved' | 'archived';
  orderIndex: number;
  /**
   * Mapeado por design_node_id.
   * Regra 7.3: Ocultar um grupo oculta visualmente todos os descendentes,
   * mas não apaga a escolha individual dos filhos. Ao reexibir o grupo,
   * os overrides dos filhos voltam a valer.
   */
  visibilityOverrides: Record<string, boolean>;
  roleOverrides: Record<string, MotionRole>;
  nameOverrides: Record<string, string>;
  lockedNodeIds: string[];
  exportPreferences: ExportPreferences;
  isMotionSource?: boolean;
  version: number;
  sourceSnapshotHash: string;
  createdAt: string;
  updatedAt: string;
}

export type MotionPresetFamilyId =
  | 'assemble'
  | 'mask_reveal'
  | 'trace'
  | 'cinematic'
  | 'kinetic'
  | 'signature';

export type EntryDirection = 'left' | 'right' | 'top' | 'bottom' | 'center' | 'preset';

export type EasingCurveId =
  | 'editorial_smooth'
  | 'crisp_out'
  | 'cinematic_quart'
  | 'soft_overshoot'
  | 'linear';

export type CanvasAspectRatioProfile = 'landscape' | 'square' | 'portrait';

export interface MotionSpec {
  schemaVersion: number;
  presetId: MotionPresetFamilyId;
  durationMs: 5000; // Fixo em 5,000 segundos no MVP
  fps: 30; // 150 frames (0..149)
  canvasProfile: CanvasAspectRatioProfile;
  entryDirection: EntryDirection;
  displacementDistancePct: number; // 5 a 60% da composição
  initialScale: number; // ex: 0.85 a 1.15
  finalScale: number; // 1.0
  initialRotationDeg: number; // -25 a +25
  finalRotationDeg: number; // 0
  initialOpacity: number; // 0 a 1
  finalOpacity: number; // 1
  staggerDelayMs: number; // atraso entre grupos/papéis (ex: 120ms)
  easing: EasingCurveId;
  blurStrengthPx: number; // 0 a 16px
  accentLightIntensity: number; // 0 a 1 (passagem de luz na janela 3.55s–4.35s)
  maskShape: 'linear-horizontal' | 'linear-vertical' | 'radial' | 'diamond';
  backgroundMode: 'dark' | 'light' | 'brand' | 'custom' | 'transparent-preview';
  backgroundColor: string;
  phaseTimingAdjust: {
    prepEndSec: number; // default 0.35
    actionStartSec: number; // default 0.35
    revealEndSec: number; // default 2.60
    lockEndSec: number; // default 3.55
    finishEndSec: number; // default 4.35
    // 4.35s -> 5.00s é sempre assinatura final estável (hold >= 0.65s)
  };
}

export interface MotionProject {
  id: string;
  projectId: string;
  compositionId: string;
  compositionVersion: number;
  compositionSnapshot: Composition;
  name: string;
  presetId: MotionPresetFamilyId;
  config: MotionSpec;
  durationMs: 5000;
  fps: 30;
  canvasProfile: CanvasAspectRatioProfile;
  status: 'draft' | 'ready' | 'rendering' | 'completed' | 'failed';
  version: number;
  lastRenderedArtifactId?: string;
  createdAt: string;
  updatedAt: string;
}

export type CompositionExportMode =
  | 'artboards'
  | 'saved-variants'
  | 'current-complete'
  | 'individual-groups';

export interface ExportJobItem {
  id: string;
  jobId: string;
  compositionId: string;
  compositionName: string;
  compositionVersion: number;
  groupId?: string;
  format: 'svg' | 'png';
  profile: 'preserve-structure' | 'optimized';
  dimensionsLabel: string;
  targetPx?: number;
  backgroundMode: string;
  backgroundColor: string;
  framingMode: 'original-viewbox' | 'fit-to-content';
  outputFilename: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'skipped';
  artifactUrl?: string;
  artifactBlob?: Blob;
  artifactText?: string;
  fileSize?: number;
  checksumSha256?: string;
  errorCode?: StudioErrorCode;
  errorMessageSafe?: string;
}

export interface ExportJob {
  id: string;
  correlationId: string;
  projectId: string;
  projectName: string;
  requestedBy: string;
  exportMode: CompositionExportMode;
  status: 'queued' | 'running' | 'partial' | 'completed' | 'failed' | 'canceled';
  totalItems: number;
  completedItems: number;
  failedItems: number;
  includeZip: boolean;
  zipArtifactUrl?: string;
  zipFilename?: string;
  manifestJson?: string;
  items: ExportJobItem[];
  startedAt: string;
  finishedAt?: string;
  errorSummary?: string;
}

export interface MotionValidationReport {
  valid: boolean;
  checkedAt: string;
  rendererVersion: string;
  checks: {
    durationExact5000ms: boolean;
    fpsExact30: boolean;
    totalFrames150: boolean;
    resolutionMatchesProfile: boolean;
    codecValid: boolean;
    finalHoldStableMin650ms: boolean;
    safeAreaBoundsRespected: boolean;
    playbackVerified: boolean;
  };
  metrics: {
    durationMs: number;
    fps: number;
    frameCount: number;
    width: number;
    height: number;
    finalHoldDurationMs: number;
    maxSafeAreaOverflowPct: number;
    renderDurationMs: number;
  };
  warnings: string[];
}

export interface RenderArtifact {
  id: string;
  renderJobId: string;
  motionProjectId: string;
  format: 'mp4' | 'webm';
  codec: string;
  width: number;
  height: number;
  fps: 30;
  durationMs: 5000;
  checksumSha256: string;
  videoUrl: string;
  thumbnailDataUrl: string;
  fileSize: number;
  validationReport: MotionValidationReport;
  motionSpecSnapshot: MotionSpec;
  createdAt: string;
}

export interface RenderJob {
  id: string;
  correlationId: string;
  projectId: string;
  projectName: string;
  motionProjectId: string;
  motionProjectName: string;
  motionVersion: number;
  status: 'queued' | 'running' | 'validation' | 'completed' | 'failed' | 'canceled';
  progress: number; // 0..100
  currentFrame: number; // 0..150
  attempt: number;
  startedAt: string;
  finishedAt?: string;
  errorCode?: StudioErrorCode;
  errorMessageSafe?: string;
  artifact?: RenderArtifact;
}

export interface AuditEvent {
  id: string;
  correlationId: string;
  projectId: string;
  action:
    | 'PROJECT_CREATED'
    | 'PROJECT_ARCHIVED'
    | 'PROJECT_RESTORED'
    | 'PROJECT_DUPLICATED'
    | 'SVG_IMPORTED'
    | 'COMPOSITION_CREATED'
    | 'COMPOSITION_UPDATED'
    | 'COMPOSITION_APPROVED'
    | 'EXPORT_JOB_STARTED'
    | 'EXPORT_JOB_COMPLETED'
    | 'EXPORT_JOB_FAILED'
    | 'MOTION_CREATED'
    | 'MOTION_RENDER_STARTED'
    | 'MOTION_RENDER_COMPLETED'
    | 'MOTION_RENDER_FAILED';
  actor: string;
  summary: string;
  metadata: Record<string, string | number | boolean>;
  createdAt: string;
}

export interface MotionStudioProject {
  id: string;
  name: string;
  clientName?: string;
  status: 'active' | 'archived';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  sources: SourceDocument[];
  activeSourceId: string | null;
  compositions: Composition[];
  activeCompositionId: string | null;
  motions: MotionProject[];
  activeMotionId: string | null;
}

export interface ExportProfilePreset {
  id: string;
  name: string;
  description: string;
  formats: ('svg' | 'png')[];
  svgProfile: 'preserve-structure' | 'optimized';
  pngScalesPx: number[];
  backgrounds: ('transparent' | 'white' | 'black' | 'brand')[];
  framingMode: 'original-viewbox' | 'fit-to-content';
  isDefaultAgencyPreset?: boolean;
}
