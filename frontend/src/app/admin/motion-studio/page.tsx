"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Film,
  Layers,
  UploadCloud,
  FolderPlus,
  Download,
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  Search,
  ChevronRight,
  ChevronDown,
  Copy,
  Trash2,
  Archive,
  Sliders,
  ShieldCheck,
  FileCode2,
  Image as ImageIcon,
  Package,
  RefreshCw,
  Undo2,
  Redo2,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Columns,
  Lock,
  Unlock,
  Plus,
  Check,
  ArrowRight,
  Clock,
  Activity,
  Terminal,
  BookOpen,
  LayoutGrid,
  List as ListIcon,
  Wand2,
  Crosshair,
  Sun,
  Moon,
} from "lucide-react";

import {
  ArtboardDetectionStrategy,
  ArtboardItem,
  AuditEvent,
  CanvasAspectRatioProfile,
  CompatibilityReport,
  Composition,
  CompositionExportMode,
  DesignNode,
  EasingCurveId,
  EntryDirection,
  ExportJob,
  ExportJobItem,
  ExportProfilePreset,
  GlobalStudioState,
  MotionPresetFamilyId,
  MotionProject,
  MotionRole,
  MotionSpec,
  MotionStudioProject,
  RenderJob,
  SourceDocument,
} from "../../../lib/motion-studio/types";
import {
  createCompositionFromArtboard,
  detectAndExtractArtboards,
  getArtboardGraphicNodes,
  getGroupSelectionState,
  getOwnNodeVisibility,
  isNodeEffectivelyVisible,
  parseAndSanitizeSvgDocument,
  renderSvgStringToPngBlob,
  resolveNodeEffectiveColor,
  serializeArtboardToSvg,
  serializeCompositionToSvg,
} from "../../../lib/motion-studio/svgPipeline";
import {
  CHOREOGRAPHY_PHASES,
  executeDeterministicMotionRender,
  getCanvasDimensionsForProfile,
  MOTION_PRESET_LIBRARY,
  renderMotionFrameSvg,
} from "../../../lib/motion-studio/motionEngine";
import {
  DEFAULT_EXPORT_PRESETS,
  MOTION_STUDIO_FIXTURES,
  SvgFixtureDefinition,
  VERONNA_MAISON_MASTER_SVG,
  VERONNA_MULTI_PRANCHETAS_SVG,
} from "../../../lib/motion-studio/fixtures";
import { buildZipBlob, computeSha256Hex } from "../../../lib/motion-studio/zipBuilder";
import { useDynamicTitle } from "../../../hooks/useDynamicTitle";

const STORAGE_KEY_PROJECTS = "veronna_motion_studio_projects_v2";
const STORAGE_KEY_PRESETS = "veronna_motion_studio_presets_v1";
const STORAGE_KEY_AUDIT = "veronna_motion_studio_audit_v1";

type StudioTab =
  | "artboards"
  | "projects"
  | "import"
  | "studio"
  | "export"
  | "motion"
  | "jobs"
  | "presets";

type CanvasBgType = "checkerboard" | "dark" | "light" | "white" | "black" | "custom";

interface UndoAction {
  description: string;
  compositionId: string;
  prevOverrides: Record<string, boolean>;
  nextOverrides: Record<string, boolean>;
  prevRoles: Record<string, MotionRole>;
  nextRoles: Record<string, MotionRole>;
  prevNames: Record<string, string>;
  nextNames: Record<string, string>;
}

const ROLE_LABELS: Record<MotionRole, { label: string; color: string; bg: string }> = {
  symbol: { label: "Símbolo", color: "#142C48", bg: "rgba(20, 44, 72, 0.14)" },
  wordmark: { label: "Lettering", color: "#424242", bg: "rgba(20, 44, 72, 0.14)" },
  descriptor: { label: "Descritor", color: "#640606", bg: "rgba(100, 6, 6, 0.16)" },
  detail: { label: "Detalhe", color: "#640606", bg: "rgba(185, 209, 227, 0.22)" },
  background: { label: "Fundo", color: "#64748B", bg: "rgba(100, 116, 139, 0.12)" },
  generic: { label: "Genérico", color: "#640606", bg: "rgba(100, 6, 6, 0.10)" },
};

const GLOBAL_STATE_BADGES: Record<
  GlobalStudioState,
  { label: string; color: string; dot: string }
> = {
  loading: { label: "Carregando", color: "#640606", dot: "#640606" },
  ready: { label: "Salvo & Pronto", color: "#059669", dot: "#059669" },
  saving: { label: "Salvando...", color: "#142C48", dot: "#142C48" },
  unsaved: { label: "Alterações locais", color: "#D97706", dot: "#D97706" },
  "import-warning": { label: "Importado c/ Avisos", color: "#D97706", dot: "#D97706" },
  "import-failed": { label: "Falha na Importação", color: "#E11D48", dot: "#E11D48" },
  "export-queued": { label: "Lote na Fila", color: "#142C48", dot: "#142C48" },
  "export-running": { label: "Exportando Lote...", color: "#142C48", dot: "#142C48" },
  "export-partial": { label: "Exportação Parcial", color: "#D97706", dot: "#D97706" },
  "export-completed": { label: "Lote Concluído", color: "#059669", dot: "#059669" },
  "export-failed": { label: "Falha na Exportação", color: "#E11D48", dot: "#E11D48" },
  "render-queued": { label: "Render na Fila", color: "#142C48", dot: "#142C48" },
  "render-running": { label: "Renderizando 5.00s...", color: "#142C48", dot: "#142C48" },
  "render-validation": { label: "Validando MP4...", color: "#D97706", dot: "#D97706" },
  "render-completed": { label: "Motion Validado", color: "#059669", dot: "#059669" },
  "render-failed": { label: "Falha no Render", color: "#E11D48", dot: "#E11D48" },
};

const notifyToast = (msg: string) => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("showToast", { detail: msg }));
  }
};

export default function VeronnaMotionStudioPage() {
  useDynamicTitle({
    projectName: "Studio Veronna",
    tabName: "Veronna Motion Studio",
  });

  // ============================================================================
  // ESTADOS PRINCIPAIS DO WORKBENCH (LAYOUT INSPIRADO NO FIGMA)
  // ============================================================================
  const [activeTab, setActiveTab] = useState<StudioTab>("studio");
  const [leftSidebarTab, setLeftSidebarTab] = useState<"layers" | "artboards" | "variants">("layers");
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState<boolean>(true);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState<boolean>(true);
  const [isProjectMenuOpen, setIsProjectMenuOpen] = useState<boolean>(false);
  const [globalState, setGlobalState] = useState<GlobalStudioState>("loading");
  const [studioTheme, setStudioTheme] = useState<"dark" | "light">("light");
  const [isFullscreenWorkbench, setIsFullscreenWorkbench] = useState(false);

  const [projects, setProjects] = useState<MotionStudioProject[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  // Estado de Detecção, Seleção e Download Individual/Lote de Pranchetas (Multi-Artboard)
  const [selectedArtboardIds, setSelectedArtboardIds] = useState<string[]>([]);
  const [artboardStrategy, setArtboardStrategy] = useState<ArtboardDetectionStrategy>("auto");
  const [artboardKeepBg, setArtboardKeepBg] = useState<boolean>(true);
  const [artboardBgMode, setArtboardBgMode] = useState<
    "original" | "transparent" | "white" | "black" | "brand"
  >("original");
  const [artboardFramingMode, setArtboardFramingMode] = useState<
    "artboard-bounds" | "fit-to-content"
  >("artboard-bounds");
  const [artboardPngScale, setArtboardPngScale] = useState<number>(2048);
  const [artboardCustomNames, setArtboardCustomNames] = useState<Record<string, string>>({});
  const [expandedArtboardIds, setExpandedArtboardIds] = useState<Set<string>>(new Set());
  const [focusedArtboardId, setFocusedArtboardId] = useState<string | null>(null);
  const [isDownloadingArtboardZip, setIsDownloadingArtboardZip] = useState<boolean>(false);
  const [downloadingArtboardId, setDownloadingArtboardId] = useState<string | null>(null);

  // Filtros da tela de Projetos (Seção 7.1)
  const [projectSearch, setProjectSearch] = useState("");
  const [projectFilterStatus, setProjectFilterStatus] = useState<"active" | "archived" | "all">("active");
  const [projectsViewMode, setProjectsViewMode] = useState<"grid" | "list">("grid");
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectClient, setNewProjectClient] = useState("");

  // Estado da Árvore e Composição (Seção 7.3)
  const [layerSearch, setLayerSearch] = useState("");
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(new Set());
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [editingNodeNameId, setEditingNodeNameId] = useState<string | null>(null);
  const [editingNodeNameValue, setEditingNodeNameValue] = useState("");

  // Estado do Canvas Central (Seção 7.3)
  const [canvasZoom, setCanvasZoom] = useState<number>(1);
  const [canvasPan, setCanvasPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [canvasBg, setCanvasBg] = useState<CanvasBgType>("checkerboard");
  const [customCanvasBgColor, setCustomCanvasBgColor] = useState("#E8E3DD");
  const [showBoundsOverlay, setShowBoundsOverlay] = useState(true);

  // Comparação de Variantes (Seção 7.3 e 7.4)
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [compareCompositionId, setCompareCompositionId] = useState<string | null>(null);
  const [compareSplitPct, setCompareSplitPct] = useState(50);

  // Modal Nova Variante
  const [isNewVariantModalOpen, setIsNewVariantModalOpen] = useState(false);
  const [newVariantName, setNewVariantName] = useState("");
  const [newVariantDesc, setNewVariantDesc] = useState("");

  // Histórico de Undo/Redo por Ação (Seção 7.3 e 13)
  const [undoStack, setUndoStack] = useState<UndoAction[]>([]);
  const [redoStack, setRedoStack] = useState<UndoAction[]>([]);

  // Assistente de Exportação em Lote (Seção 7.5)
  const [exportStep, setExportStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [exportMode, setExportMode] = useState<CompositionExportMode>("artboards");
  const [selectedExportVariantIds, setSelectedExportVariantIds] = useState<string[]>([]);
  const [selectedExportFormats, setSelectedExportFormats] = useState<("svg" | "png")[]>([
    "svg",
    "png",
  ]);
  const [exportSvgProfile, setExportSvgProfile] = useState<"preserve-structure" | "optimized">(
    "preserve-structure"
  );
  const [exportPrefixIds, setExportPrefixIds] = useState(false);
  const [exportPngScales, setExportPngScales] = useState<number[]>([2048]);
  const [customPngScale, setCustomPngScale] = useState<number>(1080);
  const [exportBgMode, setExportBgMode] = useState<
    "transparent" | "white" | "black" | "brand" | "custom"
  >("transparent");
  const [exportCustomBgColor, setExportCustomBgColor] = useState("#E8E3DD");
  const [exportFramingMode, setExportFramingMode] = useState<
    "original-viewbox" | "fit-to-content"
  >("original-viewbox");
  const [exportSuffix, setExportSuffix] = useState("");
  const [exportIncludeZip, setExportIncludeZip] = useState(true);
  const [customOutputFilenames, setCustomOutputFilenames] = useState<Record<string, string>>({});

  // Jobs, Presets e Auditoria (Seção 7.7)
  const [exportJobs, setExportJobs] = useState<ExportJob[]>([]);
  const [renderJobs, setRenderJobs] = useState<RenderJob[]>([]);
  const [exportPresets, setExportPresets] = useState<ExportProfilePreset[]>(
    DEFAULT_EXPORT_PRESETS
  );
  const [auditLogs, setAuditLogs] = useState<AuditEvent[]>([]);
  const [jobsSubTab, setJobsSubTab] = useState<"exports" | "motions" | "failures" | "audit">(
    "exports"
  );

  // Motion Studio Player & Timeline (Seção 7.6)
  const [currentFrame, setCurrentFrame] = useState<number>(149); // Inicia mostrando o lockup ou 0
  const [isPlayingMotion, setIsPlayingMotion] = useState(false);
  const [isLoopEnabled, setIsLoopEnabled] = useState(false); // Desligado por padrão (Regra 7.6)
  const [showSafeAreaGuides, setShowSafeAreaGuides] = useState(true);
  const [showAdvancedMotionParams, setShowAdvancedMotionParams] = useState(false);

  // Suite de Testes QA (Seção 16)
  const [qaResults, setQaResults] = useState<
    Array<{
      fixture: SvgFixtureDefinition;
      report: CompatibilityReport;
      passed: boolean;
    }>
  >([]);
  const [isRunningQaSuite, setIsRunningQaSuite] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const panStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  // ============================================================================
  // INICIALIZAÇÃO COM PROJETO PADRÃO VERONNA MAISON (SE VAZIO)
  // ============================================================================
  const recordAudit = useCallback(
    (
      projectId: string,
      action: AuditEvent["action"],
      summary: string,
      metadata: Record<string, string | number | boolean> = {}
    ) => {
      const ev: AuditEvent = {
        id: `aud_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
        correlationId: `corr_${Date.now().toString(36)}`,
        projectId,
        action,
        actor: "Equipa Studio Veronna",
        summary,
        metadata,
        createdAt: new Date().toISOString(),
      };
      setAuditLogs((prev) => {
        const next = [ev, ...prev].slice(0, 150);
        try {
          localStorage.setItem(STORAGE_KEY_AUDIT, JSON.stringify(next));
        } catch {}
        return next;
      });
    },
    []
  );

  const buildDefaultVariantsForSource = (
    projectId: string,
    sourceDoc: SourceDocument
  ): Composition[] => {
    const basePrefs = {
      defaultFormats: ["svg", "png"] as ("svg" | "png")[],
      svgProfile: "preserve-structure" as const,
      pngScalePx: 2048,
      backgroundMode: "transparent" as const,
      customBackgroundColor: "#111318",
      framingMode: "original-viewbox" as const,
    };

    const now = new Date().toISOString();

    // Se o SVG possuir múltiplas pranchetas (2 ou mais), iniciar com uma composição completa (todos os caminhos visíveis)
    // seguida das variantes por prancheta
    if (sourceDoc.artboards && sourceDoc.artboards.length >= 2) {
      const masterFullComp: Composition = {
        schemaVersion: 1,
        id: `comp_${sourceDoc.id}_todas_pranchetas`,
        projectId,
        documentId: sourceDoc.id,
        name: "Todas_as_Pranchetas",
        description: "Visão completa com todos os caminhos de todas as pranchetas ativos.",
        status: "approved",
        orderIndex: 0,
        visibilityOverrides: {},
        roleOverrides: {},
        nameOverrides: {},
        lockedNodeIds: [],
        exportPreferences: { ...basePrefs },
        isMotionSource: true,
        version: 1,
        sourceSnapshotHash: sourceDoc.checksumSha256,
        createdAt: now,
        updatedAt: now,
      };
      return [
        masterFullComp,
        ...sourceDoc.artboards.map((art, idx) =>
          createCompositionFromArtboard({
            sourceDoc,
            artboard: art,
            orderIndex: idx + 1,
            keepBackground: true,
          })
        ),
      ];
    }

    const findNodeIdsByRole = (roles: MotionRole[]) =>
      sourceDoc.nodes.filter((n) => roles.includes(n.motionRole)).map((n) => n.id);

    const bgIds = findNodeIdsByRole(["background"]);
    const descIds = findNodeIdsByRole(["descriptor"]);
    const detailIds = findNodeIdsByRole(["detail"]);
    const wordmarkIds = findNodeIdsByRole(["wordmark"]);

    const makeOverrides = (hiddenIds: string[]) => {
      const map: Record<string, boolean> = {};
      hiddenIds.forEach((id) => {
        map[id] = false;
      });
      return map;
    };

    return [
      {
        schemaVersion: 1,
        id: `comp_${sourceDoc.id}_principal`,
        projectId,
        documentId: sourceDoc.id,
        name: "Logo_Principal",
        description: "Composição completa aprovada com símbolo, lettering, descritor e detalhes.",
        status: "approved",
        orderIndex: 0,
        visibilityOverrides: {},
        roleOverrides: {},
        nameOverrides: {},
        lockedNodeIds: [],
        exportPreferences: { ...basePrefs },
        isMotionSource: true,
        version: 1,
        sourceSnapshotHash: sourceDoc.checksumSha256,
        createdAt: now,
        updatedAt: now,
      },
      {
        schemaVersion: 1,
        id: `comp_${sourceDoc.id}_simbolo`,
        projectId,
        documentId: sourceDoc.id,
        name: "Logo_Simbolo",
        description: "Símbolo isolado sem lettering e sem descritor para avatares e selos.",
        status: "approved",
        orderIndex: 1,
        visibilityOverrides: makeOverrides([...wordmarkIds, ...descIds, ...detailIds, ...bgIds]),
        roleOverrides: {},
        nameOverrides: {},
        lockedNodeIds: [],
        exportPreferences: { ...basePrefs, framingMode: "fit-to-content" },
        isMotionSource: false,
        version: 1,
        sourceSnapshotHash: sourceDoc.checksumSha256,
        createdAt: now,
        updatedAt: now,
      },
      {
        schemaVersion: 1,
        id: `comp_${sourceDoc.id}_sem_descritor`,
        projectId,
        documentId: sourceDoc.id,
        name: "Logo_Sem_Descritor",
        description: "Versão enxuta contendo Símbolo + Lettering para tamanhos reduzidos.",
        status: "approved",
        orderIndex: 2,
        visibilityOverrides: makeOverrides([...descIds, ...detailIds]),
        roleOverrides: {},
        nameOverrides: {},
        lockedNodeIds: [],
        exportPreferences: { ...basePrefs },
        isMotionSource: false,
        version: 1,
        sourceSnapshotHash: sourceDoc.checksumSha256,
        createdAt: now,
        updatedAt: now,
      },
      {
        schemaVersion: 1,
        id: `comp_${sourceDoc.id}_transparente`,
        projectId,
        documentId: sourceDoc.id,
        name: "Logo_Fundo_Transparente",
        description: "Marca principal sem a placa de fundo original para aplicação livre.",
        status: "approved",
        orderIndex: 3,
        visibilityOverrides: makeOverrides([...bgIds]),
        roleOverrides: {},
        nameOverrides: {},
        lockedNodeIds: [],
        exportPreferences: { ...basePrefs },
        isMotionSource: false,
        version: 1,
        sourceSnapshotHash: sourceDoc.checksumSha256,
        createdAt: now,
        updatedAt: now,
      },
    ];
  };

  useEffect(() => {
    const initWorkspace = async () => {
      try {
        const savedPresets = localStorage.getItem(STORAGE_KEY_PRESETS);
        if (savedPresets) {
          const parsedP = JSON.parse(savedPresets);
          if (Array.isArray(parsedP) && parsedP.length > 0) setExportPresets(parsedP);
        }
        const savedAudit = localStorage.getItem(STORAGE_KEY_AUDIT);
        if (savedAudit) {
          const parsedA = JSON.parse(savedAudit);
          if (Array.isArray(parsedA)) setAuditLogs(parsedA);
        }

        const savedProjectsStr = localStorage.getItem(STORAGE_KEY_PROJECTS);
        if (savedProjectsStr) {
          const rawProjects: MotionStudioProject[] = JSON.parse(savedProjectsStr);
          // Filtrar projetos fake antigos gerados automaticamente para iniciar do zero
          const parsedProjects = Array.isArray(rawProjects)
            ? rawProjects.filter(
                (p) =>
                  p.id !== "proj_veronna_multi_pranchetas" &&
                  p.id !== "proj_veronna_demo_01"
              )
            : [];

          if (parsedProjects.length !== (Array.isArray(rawProjects) ? rawProjects.length : 0)) {
            try {
              localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(parsedProjects));
            } catch {}
          }

          if (parsedProjects.length > 0) {
            for (const prj of parsedProjects) {
              for (const src of prj.sources) {
                if (!src.artboards || src.artboards.length === 0) {
                  src.artboardStrategy = src.artboardStrategy || "auto";
                  src.artboards = detectAndExtractArtboards(src, src.artboardStrategy);
                }
                if (
                  src.artboards.length >= 2 &&
                  !prj.compositions.some(
                    (c) =>
                      c.id.endsWith("_todas_pranchetas") ||
                      Object.keys(c.visibilityOverrides || {}).length === 0
                  )
                ) {
                  const fullComp: Composition = {
                    schemaVersion: 1,
                    id: `comp_${src.id}_todas_pranchetas`,
                    projectId: prj.id,
                    documentId: src.id,
                    name: "Todas_as_Pranchetas",
                    description: "Visão completa com todos os caminhos de todas as pranchetas ativos.",
                    status: "approved",
                    orderIndex: 0,
                    visibilityOverrides: {},
                    roleOverrides: {},
                    nameOverrides: {},
                    lockedNodeIds: [],
                    exportPreferences: {
                      defaultFormats: ["svg", "png"],
                      svgProfile: "preserve-structure",
                      pngScalePx: 2048,
                      backgroundMode: "transparent",
                      customBackgroundColor: "#111318",
                      framingMode: "original-viewbox",
                    },
                    isMotionSource: true,
                    version: 1,
                    sourceSnapshotHash: src.checksumSha256,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  };
                  prj.compositions = [fullComp, ...prj.compositions];
                  prj.activeCompositionId = fullComp.id;
                }
              }
            }
            setProjects(parsedProjects);
            const firstActive =
              parsedProjects.find((p) => p.status === "active") || parsedProjects[0];
            setActiveProjectId(firstActive.id);
            const activeSrc = firstActive.sources.find(
              (s) => s.id === firstActive.activeSourceId
            );
            if (activeSrc) {
              setExpandedGroupIds(
                new Set(activeSrc.nodes.filter((n) => n.type === "group").map((n) => n.id))
              );
              setSelectedArtboardIds(activeSrc.artboards.map((a) => a.id));
              setExpandedArtboardIds(
                new Set(activeSrc.artboards.slice(0, 3).map((a) => a.id))
              );
              setArtboardStrategy(activeSrc.artboardStrategy || "auto");
              if (activeSrc.artboards.length > 1) {
                setLeftSidebarTab("artboards");
              }
            }
            setGlobalState("ready");
            return;
          }
        }
      } catch (e) {
        console.warn("Inicializando estado limpo do Veronna Motion Studio:", e);
      }

      // Começar do zero (sem projeto fake pré-carregado)
      setProjects([]);
      setActiveProjectId(null);
      setGlobalState("ready");
    };

    initWorkspace();
  }, []);

  // ============================================================================
  // SELETORES DERIVADOS DO PROJETO ATIVO
  // ============================================================================
  const activeProject = useMemo(
    () => projects.find((p) => p.id === activeProjectId) || null,
    [projects, activeProjectId]
  );

  const activeSource = useMemo(() => {
    if (!activeProject) return null;
    return (
      activeProject.sources.find((s) => s.id === activeProject.activeSourceId) ||
      activeProject.sources[0] ||
      null
    );
  }, [activeProject]);

  const activeComposition = useMemo(() => {
    if (!activeProject) return null;
    return (
      activeProject.compositions.find((c) => c.id === activeProject.activeCompositionId) ||
      activeProject.compositions[0] ||
      null
    );
  }, [activeProject]);

  const activeMotion = useMemo(() => {
    if (!activeProject) return null;
    return (
      activeProject.motions.find((m) => m.id === activeProject.activeMotionId) ||
      activeProject.motions[0] ||
      null
    );
  }, [activeProject]);

  const nodesMap = useMemo(() => {
    const map = new Map<string, DesignNode>();
    if (activeSource) {
      for (const n of activeSource.nodes) {
        map.set(n.id, n);
      }
    }
    return map;
  }, [activeSource]);

  const primarySelectedNode = useMemo(() => {
    if (selectedNodeIds.length === 0) return null;
    return nodesMap.get(selectedNodeIds[0]) || null;
  }, [selectedNodeIds, nodesMap]);

  // Persistência com Autosave de 650ms (Regra Seção 7.3: 600–800ms)
  const persistProjectsWithAutosave = useCallback(
    (updatedProjects: MotionStudioProject[]) => {
      setProjects(updatedProjects);
      setGlobalState("unsaved");
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = setTimeout(() => {
        setGlobalState("saving");
        try {
          localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(updatedProjects));
          setTimeout(() => {
            setGlobalState("ready");
          }, 220);
        } catch {
          setGlobalState("unsaved");
        }
      }, 650);
    },
    []
  );

  // Sincronizar seleção do lote e pranchetas ao trocar de projeto ou fonte
  useEffect(() => {
    if (activeProject && selectedExportVariantIds.length === 0) {
      setSelectedExportVariantIds(activeProject.compositions.map((c) => c.id));
    }
  }, [activeProject, selectedExportVariantIds.length]);

  useEffect(() => {
    if (activeSource && activeSource.artboards) {
      setSelectedArtboardIds(activeSource.artboards.map((a) => a.id));
      setExpandedArtboardIds(new Set(activeSource.artboards.slice(0, 3).map((a) => a.id)));
      setFocusedArtboardId(null);
      setArtboardStrategy(activeSource.artboardStrategy || "auto");
    }
  }, [activeSource?.id]);

  // ============================================================================
  // AÇÕES DE PRANCHETAS E CAMINHOS ESPECÍFICOS (DETECÇÃO, VISIBILIDADE E EXPORT)
  // ============================================================================
  const triggerBrowserFileDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };

  const getEffectiveArtboardName = useCallback(
    (art: ArtboardItem) => {
      return (artboardCustomNames[art.id] ?? art.name).trim() || `Prancheta_${art.index}`;
    },
    [artboardCustomNames]
  );

  const getSafeArtboardFilename = useCallback(
    (art: ArtboardItem, ext: "svg" | "png", suffix = "") => {
      const rawName = getEffectiveArtboardName(art);
      const safe = rawName
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9_-]+/g, "_")
        .replace(/^_+|_+$/g, "");
      return `${safe || `Prancheta_${art.index}`}${suffix}.${ext}`;
    },
    [getEffectiveArtboardName]
  );

  const handleChangeArtboardStrategy = (nextStrategy: ArtboardDetectionStrategy) => {
    if (!activeProject || !activeSource) return;
    setArtboardStrategy(nextStrategy);
    const redetected = detectAndExtractArtboards(activeSource, nextStrategy);
    setSelectedArtboardIds(redetected.map((a) => a.id));
    setExpandedArtboardIds(new Set(redetected.slice(0, 3).map((a) => a.id)));
    setFocusedArtboardId(null);

    const updated = projects.map((p) => {
      if (p.id !== activeProject.id) return p;
      return {
        ...p,
        sources: p.sources.map((s) =>
          s.id === activeSource.id
            ? { ...s, artboardStrategy: nextStrategy, artboards: redetected }
            : s
        ),
      };
    });
    persistProjectsWithAutosave(updated);
    notifyToast(
      `${redetected.length} prancheta(s) identificada(s) pelo modo "${nextStrategy}".`
    );
  };

  const handleDownloadSingleArtboardSvg = (
    art: ArtboardItem,
    onlyIncludeNodeIds?: string[],
    customSuffixLabel?: string
  ) => {
    if (!activeSource) return;
    const isSubset = Boolean(onlyIncludeNodeIds && onlyIncludeNodeIds.length > 0);
    const { svgString, includedNodeCount } = serializeArtboardToSvg({
      sourceDoc: activeSource,
      artboard: art,
      keepArtboardBackground: isSubset
        ? false
        : artboardKeepBg && artboardBgMode === "original",
      backgroundMode: isSubset
        ? "transparent"
        : artboardKeepBg
        ? artboardBgMode
        : "transparent",
      framingMode: isSubset ? "fit-to-content" : artboardFramingMode,
      profile: "preserve-structure",
      visibilityOverrides: isSubset ? undefined : activeComposition?.visibilityOverrides,
      onlyIncludeNodeIds,
      nameOverrides: activeComposition?.nameOverrides,
    });
    if (includedNodeCount === 0) {
      notifyToast("Nenhum caminho visível selecionado nesta prancheta para exportar.");
      return;
    }
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const cleanSuffix = customSuffixLabel
      ? `_${customSuffixLabel
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-zA-Z0-9_-]+/g, "_")}`
      : "";
    const filename = getSafeArtboardFilename(art, "svg", cleanSuffix);
    triggerBrowserFileDownload(blob, filename);
    notifyToast(`SVG exportado (${includedNodeCount} caminho(s)): ${filename}`);
  };

  const handleDownloadSingleArtboardPng = async (
    art: ArtboardItem,
    onlyIncludeNodeIds?: string[],
    customSuffixLabel?: string
  ) => {
    if (!activeSource) return;
    setDownloadingArtboardId(art.id);
    try {
      const isSubset = Boolean(onlyIncludeNodeIds && onlyIncludeNodeIds.length > 0);
      const { svgString, viewBox, includedNodeCount } = serializeArtboardToSvg({
        sourceDoc: activeSource,
        artboard: art,
        keepArtboardBackground: isSubset
          ? false
          : artboardKeepBg && artboardBgMode === "original",
        backgroundMode: isSubset
          ? "transparent"
          : artboardKeepBg
          ? artboardBgMode
          : "transparent",
        framingMode: isSubset ? "fit-to-content" : artboardFramingMode,
        profile: "preserve-structure",
        visibilityOverrides: isSubset ? undefined : activeComposition?.visibilityOverrides,
        onlyIncludeNodeIds,
        nameOverrides: activeComposition?.nameOverrides,
      });
      if (includedNodeCount === 0) {
        notifyToast("Nenhum caminho visível selecionado nesta prancheta para exportar.");
        return;
      }
      const { blob } = await renderSvgStringToPngBlob({
        svgString,
        viewBox,
        targetLongestSidePx: artboardPngScale,
      });
      const cleanSuffix = customSuffixLabel
        ? `_${customSuffixLabel
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-zA-Z0-9_-]+/g, "_")}_${artboardPngScale}px`
        : `_${artboardPngScale}px`;
      const filename = getSafeArtboardFilename(art, "png", cleanSuffix);
      triggerBrowserFileDownload(blob, filename);
      notifyToast(`PNG exportado (${includedNodeCount} caminho(s)): ${filename}`);
    } catch (err: any) {
      notifyToast(err?.message || "Erro ao exportar PNG da prancheta.");
    } finally {
      setDownloadingArtboardId(null);
    }
  };

  const handleDownloadSelectedArtboardsBatch = async (
    mode: "zip-both" | "zip-svg" | "zip-png" | "individual-svg" | "individual-png"
  ) => {
    if (!activeProject || !activeSource) return;
    const selectedArts = activeSource.artboards.filter((a) =>
      selectedArtboardIds.includes(a.id)
    );
    if (selectedArts.length === 0) {
      notifyToast("Selecione pelo menos uma prancheta para baixar.");
      return;
    }

    setIsDownloadingArtboardZip(true);
    try {
      if (mode === "individual-svg") {
        for (const art of selectedArts) {
          handleDownloadSingleArtboardSvg(art);
          await new Promise((r) => setTimeout(r, 140));
        }
        notifyToast(`${selectedArts.length} arquivo(s) SVG baixado(s) individualmente!`);
        return;
      }

      if (mode === "individual-png") {
        for (const art of selectedArts) {
          await handleDownloadSingleArtboardPng(art);
          await new Promise((r) => setTimeout(r, 160));
        }
        notifyToast(`${selectedArts.length} arquivo(s) PNG baixado(s) individualmente!`);
        return;
      }

      // Geração de pacote .ZIP organizado com todas as pranchetas selecionadas (respeitando caminhos ocultos/ativos)
      const zipEntries: Array<{ filename: string; data: Uint8Array | string }> = [];
      const includeSvg = mode === "zip-both" || mode === "zip-svg";
      const includePng = mode === "zip-both" || mode === "zip-png";

      for (const art of selectedArts) {
        const { svgString, viewBox, includedNodeCount } = serializeArtboardToSvg({
          sourceDoc: activeSource,
          artboard: art,
          keepArtboardBackground: artboardKeepBg && artboardBgMode === "original",
          backgroundMode: artboardKeepBg ? artboardBgMode : "transparent",
          framingMode: artboardFramingMode,
          profile: "preserve-structure",
          visibilityOverrides: activeComposition?.visibilityOverrides,
          nameOverrides: activeComposition?.nameOverrides,
        });
        if (includedNodeCount === 0) continue;

        if (includeSvg) {
          const svgName = getSafeArtboardFilename(art, "svg");
          zipEntries.push({
            filename: includePng ? `SVG/${svgName}` : svgName,
            data: new TextEncoder().encode(svgString),
          });
        }

        if (includePng) {
          const { blob } = await renderSvgStringToPngBlob({
            svgString,
            viewBox,
            targetLongestSidePx: artboardPngScale,
          });
          const pngBytes = new Uint8Array(await blob.arrayBuffer());
          const pngName = getSafeArtboardFilename(art, "png", `_${artboardPngScale}px`);
          zipEntries.push({
            filename: includeSvg ? `PNG_${artboardPngScale}px/${pngName}` : pngName,
            data: pngBytes,
          });
        }
      }

      if (zipEntries.length === 0) {
        notifyToast("Nenhum caminho visível nas pranchetas selecionadas.");
        return;
      }

      const zipBlob = buildZipBlob(zipEntries);
      const safeProj = activeProject.name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9_-]+/g, "_");
      const zipFilename = `${safeProj}_${selectedArts.length}_Pranchetas.zip`;
      triggerBrowserFileDownload(zipBlob, zipFilename);
      notifyToast(
        `Pacote "${zipFilename}" com ${selectedArts.length} prancheta(s) baixado!`
      );
    } catch (err: any) {
      notifyToast(err?.message || "Falha ao empacotar pranchetas selecionadas.");
    } finally {
      setIsDownloadingArtboardZip(false);
    }
  };

  const handleOpenArtboardInStudioOrMotion = (
    art: ArtboardItem,
    destination: "studio" | "motion"
  ) => {
    if (!activeProject || !activeSource) return;
    const desiredName = getEffectiveArtboardName(art);

    if (destination === "studio") {
      setFocusedArtboardId((prev) => (prev === art.id ? null : art.id));
      setExpandedArtboardIds((prev) => {
        const next = new Set(prev);
        next.add(art.id);
        return next;
      });
      setActiveTab("studio");
      setLeftSidebarTab("artboards");
      setCanvasZoom(1);
      setCanvasPan({ x: 0, y: 0 });
      notifyToast(`Prancheta "${desiredName}" focada no Canvas com seus caminhos.`);
      return;
    }

    let targetComp = activeProject.compositions.find(
      (c) => c.documentId === activeSource.id && c.name === desiredName
    );

    let nextCompositions = [...activeProject.compositions];
    const baseArtComp = createCompositionFromArtboard({
      sourceDoc: activeSource,
      artboard: { ...art, name: desiredName },
      orderIndex: nextCompositions.length,
      keepBackground: artboardKeepBg && artboardBgMode === "original",
    });

    // Preservar caminhos que o usuário tenha ocultado na prancheta
    if (activeComposition?.visibilityOverrides) {
      for (const [nid, vis] of Object.entries(activeComposition.visibilityOverrides)) {
        if (vis === false) {
          baseArtComp.visibilityOverrides[nid] = false;
        }
      }
    }

    if (!targetComp) {
      targetComp = baseArtComp;
      nextCompositions.push(targetComp);
    } else {
      targetComp = {
        ...targetComp,
        visibilityOverrides: baseArtComp.visibilityOverrides,
        version: targetComp.version + 1,
        updatedAt: new Date().toISOString(),
      };
      nextCompositions = nextCompositions.map((c) =>
        c.id === targetComp!.id ? targetComp! : c
      );
    }

    let nextMotions = [...activeProject.motions];
    let existingMot = nextMotions.find((m) => m.compositionId === targetComp!.id);
    if (!existingMot) {
      existingMot = {
        id: `mot_${Date.now().toString(36)}`,
        projectId: activeProject.id,
        compositionId: targetComp.id,
        compositionVersion: targetComp.version,
        compositionSnapshot: JSON.parse(JSON.stringify(targetComp)),
        name: `Motion 5s — ${desiredName}`,
        presetId: "signature",
        config: {
          ...JSON.parse(
            JSON.stringify(
              MOTION_PRESET_LIBRARY.find((p) => p.id === "signature")!.defaultSpec
            )
          ),
          backgroundColor: art.detectedBackgroundFill || "#111318",
          backgroundMode: "dark",
        },
        durationMs: 5000,
        fps: 30,
        canvasProfile: "landscape",
        status: "ready",
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      nextMotions = [existingMot, ...nextMotions];
    } else {
      existingMot = {
        ...existingMot,
        compositionVersion: targetComp.version,
        compositionSnapshot: JSON.parse(JSON.stringify(targetComp)),
        updatedAt: new Date().toISOString(),
      };
      nextMotions = nextMotions.map((m) => (m.id === existingMot!.id ? existingMot! : m));
    }

    const updated = projects.map((p) =>
      p.id === activeProject.id
        ? {
            ...p,
            compositions: nextCompositions,
            motions: nextMotions,
            activeMotionId: existingMot!.id,
          }
        : p
    );
    persistProjectsWithAutosave(updated);
    setActiveTab("motion");
    setCurrentFrame(0);
    setIsPlayingMotion(true);
    notifyToast(`Animando "${desiredName}" em 5,000 segundos!`);
  };

  // ============================================================================
  // AÇÕES DE COMPOSIÇÃO E HISTÓRICO UNDO/REDO (SEÇÃO 7.3 & 13)
  // ============================================================================
  const applyCompositionMutation = useCallback(
    (
      description: string,
      mutator: (comp: Composition) => {
        visibilityOverrides?: Record<string, boolean>;
        roleOverrides?: Record<string, MotionRole>;
        nameOverrides?: Record<string, string>;
      },
      recordInHistory = true
    ) => {
      if (!activeProject || !activeComposition) return;

      const prevVis = { ...activeComposition.visibilityOverrides };
      const prevRoles = { ...activeComposition.roleOverrides };
      const prevNames = { ...activeComposition.nameOverrides };

      const changes = mutator(activeComposition);
      const nextVis = changes.visibilityOverrides ?? prevVis;
      const nextRoles = changes.roleOverrides ?? prevRoles;
      const nextNames = changes.nameOverrides ?? prevNames;

      if (recordInHistory) {
        setUndoStack((prev) => [
          ...prev.slice(-39),
          {
            description,
            compositionId: activeComposition.id,
            prevOverrides: prevVis,
            nextOverrides: nextVis,
            prevRoles,
            nextRoles,
            prevNames,
            nextNames,
          },
        ]);
        setRedoStack([]);
      }

      const updatedProjects = projects.map((proj) => {
        if (proj.id !== activeProject.id) return proj;
        return {
          ...proj,
          updatedAt: new Date().toISOString(),
          compositions: proj.compositions.map((c) =>
            c.id === activeComposition.id
              ? {
                  ...c,
                  visibilityOverrides: nextVis,
                  roleOverrides: nextRoles,
                  nameOverrides: nextNames,
                  version: c.version + 1,
                  updatedAt: new Date().toISOString(),
                }
              : c
          ),
        };
      });

      persistProjectsWithAutosave(updatedProjects);
    },
    [activeProject, activeComposition, projects, persistProjectsWithAutosave]
  );

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0 || !activeProject) return;
    const last = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, last]);

    const updatedProjects = projects.map((proj) => {
      if (proj.id !== activeProject.id) return proj;
      return {
        ...proj,
        compositions: proj.compositions.map((c) =>
          c.id === last.compositionId
            ? {
                ...c,
                visibilityOverrides: last.prevOverrides,
                roleOverrides: last.prevRoles,
                nameOverrides: last.prevNames,
                version: c.version + 1,
                updatedAt: new Date().toISOString(),
              }
            : c
        ),
      };
    });
    persistProjectsWithAutosave(updatedProjects);
    notifyToast(`Desfeito: ${last.description}`);
  }, [undoStack, activeProject, projects, persistProjectsWithAutosave]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0 || !activeProject) return;
    const nextAct = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setUndoStack((prev) => [...prev, nextAct]);

    const updatedProjects = projects.map((proj) => {
      if (proj.id !== activeProject.id) return proj;
      return {
        ...proj,
        compositions: proj.compositions.map((c) =>
          c.id === nextAct.compositionId
            ? {
                ...c,
                visibilityOverrides: nextAct.nextOverrides,
                roleOverrides: nextAct.nextRoles,
                nameOverrides: nextAct.nextNames,
                version: c.version + 1,
                updatedAt: new Date().toISOString(),
              }
            : c
        ),
      };
    });
    persistProjectsWithAutosave(updatedProjects);
    notifyToast(`Refeito: ${nextAct.description}`);
  }, [redoStack, activeProject, projects, persistProjectsWithAutosave]);

  /**
   * Alterna visibilidade de um nó ou caminho respeitando a cadeia de grupos pais.
   * Ao ativar um caminho cujo grupo pai estava oculto, ativa também seus ancestrais.
   */
  const toggleNodeVisibility = useCallback(
    (nodeId: string) => {
      if (!activeComposition) return;
      if (activeComposition.lockedNodeIds.includes(nodeId)) {
        notifyToast("Esta camada está bloqueada na variante atual.");
        return;
      }
      const node = nodesMap.get(nodeId);
      if (!node) return;
      const effVisible = isNodeEffectivelyVisible(
        nodeId,
        nodesMap,
        activeComposition.visibilityOverrides
      );
      const nextVisState = !effVisible;

      applyCompositionMutation(
        `${nextVisState ? "Mostrar" : "Ocultar"} ${
          activeComposition.nameOverrides?.[nodeId] || node.displayName
        }`,
        (comp) => {
          const nextMap: Record<string, boolean> = {
            ...comp.visibilityOverrides,
            [nodeId]: nextVisState,
          };
          if (nextVisState) {
            let curr = node.parentId ? nodesMap.get(node.parentId) : undefined;
            while (curr) {
              nextMap[curr.id] = true;
              curr = curr.parentId ? nodesMap.get(curr.parentId) : undefined;
            }
          }
          return { visibilityOverrides: nextMap };
        }
      );
    },
    [activeComposition, nodesMap, applyCompositionMutation]
  );

  /**
   * Mostra ou oculta todos os caminhos específicos de uma Prancheta de uma só vez.
   */
  const handleSetAllArtboardPathsVisibility = useCallback(
    (art: ArtboardItem, visible: boolean) => {
      if (!activeSource || !activeComposition) return;
      const leaves = getArtboardGraphicNodes(activeSource, art);
      if (leaves.length === 0) return;

      applyCompositionMutation(
        `${visible ? "Mostrar" : "Ocultar"} todos os caminhos de ${getEffectiveArtboardName(art)}`,
        (comp) => {
          const nextMap: Record<string, boolean> = { ...comp.visibilityOverrides };
          for (const leaf of leaves) {
            nextMap[leaf.id] = visible;
            if (visible) {
              let curr = leaf.parentId ? nodesMap.get(leaf.parentId) : undefined;
              while (curr) {
                nextMap[curr.id] = true;
                curr = curr.parentId ? nodesMap.get(curr.parentId) : undefined;
              }
            }
          }
          return { visibilityOverrides: nextMap };
        }
      );
    },
    [activeSource, activeComposition, nodesMap, applyCompositionMutation, getEffectiveArtboardName]
  );

  /**
   * Isola ("Solo / Apenas este") um único caminho dentro da Prancheta para visualização e exportação,
   * ou restaura todos os caminhos da Prancheta se ele já estiver isolado.
   */
  const handleSoloArtboardPath = useCallback(
    (art: ArtboardItem, targetNodeId: string) => {
      if (!activeSource || !activeComposition) return;
      const leaves = getArtboardGraphicNodes(activeSource, art);
      if (leaves.length === 0) return;

      const visibleLeaves = leaves.filter((l) =>
        isNodeEffectivelyVisible(l.id, nodesMap, activeComposition.visibilityOverrides)
      );
      const isAlreadySolo =
        visibleLeaves.length === 1 && visibleLeaves[0].id === targetNodeId;

      applyCompositionMutation(
        isAlreadySolo
          ? `Restaurar caminhos de ${getEffectiveArtboardName(art)}`
          : `Isolar caminho em ${getEffectiveArtboardName(art)}`,
        (comp) => {
          const nextMap: Record<string, boolean> = { ...comp.visibilityOverrides };
          if (isAlreadySolo) {
            for (const leaf of leaves) {
              nextMap[leaf.id] = true;
              let curr = leaf.parentId ? nodesMap.get(leaf.parentId) : undefined;
              while (curr) {
                nextMap[curr.id] = true;
                curr = curr.parentId ? nodesMap.get(curr.parentId) : undefined;
              }
            }
          } else {
            for (const leaf of leaves) {
              nextMap[leaf.id] = leaf.id === targetNodeId;
            }
            const targetNode = nodesMap.get(targetNodeId);
            let curr = targetNode?.parentId ? nodesMap.get(targetNode.parentId) : undefined;
            while (curr) {
              nextMap[curr.id] = true;
              curr = curr.parentId ? nodesMap.get(curr.parentId) : undefined;
            }
          }
          return { visibilityOverrides: nextMap };
        }
      );

      notifyToast(
        isAlreadySolo
          ? "Todos os caminhos da prancheta foram reexibidos."
          : "Caminho isolado! Apenas este caminho está ativo na prancheta."
      );
    },
    [activeSource, activeComposition, nodesMap, applyCompositionMutation, getEffectiveArtboardName]
  );

  /**
   * Mantém visíveis na Prancheta apenas os caminhos que estão atualmente selecionados (selectedNodeIds).
   */
  const handleKeepOnlySelectedPathsInArtboard = useCallback(
    (art: ArtboardItem) => {
      if (!activeSource || !activeComposition) return;
      const leaves = getArtboardGraphicNodes(activeSource, art);
      const selectedSet = new Set(selectedNodeIds);
      const matchingLeaves = leaves.filter((l) => selectedSet.has(l.id));
      if (matchingLeaves.length === 0) {
        notifyToast("Selecione um ou mais caminhos desta prancheta primeiro.");
        return;
      }

      applyCompositionMutation(
        `Manter apenas ${matchingLeaves.length} caminho(s) selecionado(s) em ${getEffectiveArtboardName(art)}`,
        (comp) => {
          const nextMap: Record<string, boolean> = { ...comp.visibilityOverrides };
          for (const leaf of leaves) {
            const keep = selectedSet.has(leaf.id);
            nextMap[leaf.id] = keep;
            if (keep) {
              let curr = leaf.parentId ? nodesMap.get(leaf.parentId) : undefined;
              while (curr) {
                nextMap[curr.id] = true;
                curr = curr.parentId ? nodesMap.get(curr.parentId) : undefined;
              }
            }
          }
          return { visibilityOverrides: nextMap };
        }
      );
      notifyToast(
        `Apenas os ${matchingLeaves.length} caminho(s) selecionado(s) permaneceram visíveis na prancheta.`
      );
    },
    [
      activeSource,
      activeComposition,
      selectedNodeIds,
      nodesMap,
      applyCompositionMutation,
      getEffectiveArtboardName,
    ]
  );

  // ============================================================================
  // LOOP DE ANIMAÇÃO DO PLAYER DE MOTION (30 FPS DETERMINÍSTICO)
  // ============================================================================
  useEffect(() => {
    if (!isPlayingMotion) return;
    const interval = setInterval(() => {
      setCurrentFrame((prev) => {
        if (prev >= 149) {
          if (isLoopEnabled) return 0;
          setIsPlayingMotion(false);
          return 149;
        }
        return prev + 1;
      });
    }, 1000 / 30);
    return () => clearInterval(interval);
  }, [isPlayingMotion, isLoopEnabled]);

  // ============================================================================
  // ATALHOS GLOBAIS DE TECLADO (SEÇÃO 13)
  // ============================================================================
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);

      if (e.code === "Space" && !isInput) {
        if (activeTab === "motion") {
          e.preventDefault();
          setIsPlayingMotion((p) => {
            if (!p && currentFrame >= 149) setCurrentFrame(0);
            return !p;
          });
        } else if (activeTab === "studio") {
          setIsSpacePressed(true);
        }
      }

      if (isInput) return;

      // Undo / Redo (Ctrl/Cmd + Z / Ctrl/Cmd + Shift + Z)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
        return;
      }

      if (activeTab === "studio") {
        if (e.key.toLowerCase() === "f") {
          e.preventDefault();
          setCanvasZoom(1);
          setCanvasPan({ x: 0, y: 0 });
        } else if (e.key === "+" || e.key === "=") {
          e.preventDefault();
          setCanvasZoom((z) => Math.min(4, Number((z + 0.15).toFixed(2))));
        } else if (e.key === "-") {
          e.preventDefault();
          setCanvasZoom((z) => Math.max(0.25, Number((z - 0.15).toFixed(2))));
        }
      } else if (activeTab === "motion") {
        if (e.key === "Home") {
          e.preventDefault();
          setIsPlayingMotion(false);
          setCurrentFrame(0);
        } else if (e.key === "End") {
          e.preventDefault();
          setIsPlayingMotion(false);
          setCurrentFrame(149);
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          setIsPlayingMotion(false);
          setCurrentFrame((f) => Math.min(149, f + (e.shiftKey ? 10 : 1)));
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          setIsPlayingMotion(false);
          setCurrentFrame((f) => Math.max(0, f - (e.shiftKey ? 10 : 1)));
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setIsSpacePressed(false);
        setIsPanning(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [activeTab, currentFrame, handleUndo, handleRedo]);

  // ============================================================================
  // IMPORTAÇÃO DE ARQUIVO SVG OU FIXTURE (SEÇÃO 7.2 & 8)
  // ============================================================================
  const handleImportSvgContent = async (
    filename: string,
    rawSvg: string,
    targetProjectName?: string,
    targetClientName?: string
  ) => {
    setGlobalState("loading");
    const targetProjId = activeProject?.id || `proj_${Date.now().toString(36)}`;

    const parsedDoc = await parseAndSanitizeSvgDocument({
      projectId: targetProjId,
      filename,
      rawSvgContent: rawSvg,
    });

    if (parsedDoc.importStatus === "failed") {
      setGlobalState("import-failed");
      notifyToast(`Falha ao importar "${filename}": verifique o diagnóstico.`);
    } else if (parsedDoc.importStatus === "partial") {
      setGlobalState("import-warning");
      notifyToast(`SVG importado com ${parsedDoc.compatibilityReport.issues.length} aviso(s).`);
    } else {
      setGlobalState("ready");
      notifyToast(`SVG "${filename}" validado e normalizado com sucesso!`);
    }

    const newCompositions =
      parsedDoc.importStatus !== "failed"
        ? buildDefaultVariantsForSource(targetProjId, parsedDoc)
        : [];

    if (targetProjectName || !activeProject) {
      const newProjId = `proj_${Date.now().toString(36)}`;
      parsedDoc.projectId = newProjId;
      const comps =
        parsedDoc.importStatus !== "failed"
          ? buildDefaultVariantsForSource(newProjId, parsedDoc)
          : [];
      const firstComp = comps[0] || null;
      const defaultMot: MotionProject | null = firstComp
        ? {
            id: `mot_${Date.now().toString(36)}`,
            projectId: newProjId,
            compositionId: firstComp.id,
            compositionVersion: firstComp.version,
            compositionSnapshot: JSON.parse(JSON.stringify(firstComp)),
            name: "Motion 5s — Assemble",
            presetId: "assemble",
            config: JSON.parse(
              JSON.stringify(MOTION_PRESET_LIBRARY[0].defaultSpec)
            ),
            durationMs: 5000,
            fps: 30,
            canvasProfile: "landscape",
            status: "ready",
            version: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
        : null;

      const createdProj: MotionStudioProject = {
        id: newProjId,
        name: targetProjectName || filename.replace(/\.svg$/i, ""),
        clientName: targetClientName || "Studio Veronna",
        status: "active",
        createdBy: "Studio Veronna",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sources: [parsedDoc],
        activeSourceId: parsedDoc.id,
        compositions: comps,
        activeCompositionId: firstComp?.id || null,
        motions: defaultMot ? [defaultMot] : [],
        activeMotionId: defaultMot?.id || null,
      };

      const nextList = [createdProj, ...projects];
      persistProjectsWithAutosave(nextList);
      setActiveProjectId(createdProj.id);
      setSelectedExportVariantIds(comps.map((c) => c.id));
      setSelectedArtboardIds(parsedDoc.artboards.map((a) => a.id));
      setArtboardStrategy(parsedDoc.artboardStrategy || "auto");
      setExpandedGroupIds(
        new Set(parsedDoc.nodes.filter((n) => n.type === "group").map((n) => n.id))
      );
      recordAudit(newProjId, "SVG_IMPORTED", `Importado ${filename} (${parsedDoc.artboards.length} pranchetas)`, {
        status: parsedDoc.importStatus,
        nodes: parsedDoc.nodes.length,
        artboards: parsedDoc.artboards.length,
        checksum: parsedDoc.checksumSha256.slice(0, 12),
      });
    } else {
      const updated = projects.map((p) => {
        if (p.id !== activeProject.id) return p;
        const mergedComps =
          newCompositions.length > 0 ? [...newCompositions, ...p.compositions] : p.compositions;
        const firstNewComp = newCompositions[0] || null;
        const defaultMot: MotionProject | null =
          p.motions.length === 0 && firstNewComp
            ? {
                id: `mot_${Date.now().toString(36)}`,
                projectId: p.id,
                compositionId: firstNewComp.id,
                compositionVersion: firstNewComp.version,
                compositionSnapshot: JSON.parse(JSON.stringify(firstNewComp)),
                name: "Motion 5s — Assemble",
                presetId: "assemble",
                config: JSON.parse(
                  JSON.stringify(MOTION_PRESET_LIBRARY[0].defaultSpec)
                ),
                durationMs: 5000,
                fps: 30,
                canvasProfile: "landscape",
                status: "ready",
                version: 1,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }
            : null;
        return {
          ...p,
          updatedAt: new Date().toISOString(),
          sources: [parsedDoc, ...p.sources],
          activeSourceId: parsedDoc.id,
          compositions: mergedComps,
          activeCompositionId: newCompositions[0]?.id || p.activeCompositionId,
          motions: defaultMot ? [defaultMot] : p.motions,
          activeMotionId: defaultMot ? defaultMot.id : p.activeMotionId,
        };
      });
      persistProjectsWithAutosave(updated);
      if (newCompositions.length > 0) {
        setSelectedExportVariantIds(newCompositions.map((c) => c.id));
      }
      setSelectedArtboardIds(parsedDoc.artboards.map((a) => a.id));
      setArtboardStrategy(parsedDoc.artboardStrategy || "auto");
      setExpandedGroupIds(
        new Set(parsedDoc.nodes.filter((n) => n.type === "group").map((n) => n.id))
      );
      recordAudit(activeProject.id, "SVG_IMPORTED", `Fonte adicionada: ${filename} (${parsedDoc.artboards.length} pranchetas)`, {
        status: parsedDoc.importStatus,
        nodes: parsedDoc.nodes.length,
        artboards: parsedDoc.artboards.length,
      });
    }

    if (parsedDoc.importStatus !== "failed") {
      setExpandedArtboardIds(
        new Set(parsedDoc.artboards.slice(0, 3).map((a) => a.id))
      );
      setFocusedArtboardId(null);
      setLeftSidebarTab(parsedDoc.artboards.length >= 1 ? "artboards" : "layers");
      notifyToast(
        `${parsedDoc.artboards.length} prancheta(s) e ${parsedDoc.nodes.length} camadas carregadas.`
      );
    }
  };

  const handleFileUpload = async (file: File) => {
    const text = await file.text();
    await handleImportSvgContent(file.name, text);
    setActiveTab("studio");
  };

  const focusedArtboard = useMemo(() => {
    if (!activeSource || !focusedArtboardId) return null;
    return activeSource.artboards.find((a) => a.id === focusedArtboardId) || null;
  }, [activeSource, focusedArtboardId]);

  // ============================================================================
  // RENDERIZAÇÃO DETERMINÍSTICA DO CANVAS DE COMPOSIÇÃO E COMPARE VIEW
  // ============================================================================
  const currentCanvasSvgResult = useMemo(() => {
    if (!activeSource || !activeComposition || activeSource.importStatus === "failed") {
      return null;
    }
    if (focusedArtboard) {
      const res = serializeArtboardToSvg({
        sourceDoc: activeSource,
        artboard: focusedArtboard,
        keepArtboardBackground: artboardKeepBg && artboardBgMode === "original",
        backgroundMode: artboardKeepBg ? artboardBgMode : "transparent",
        framingMode: artboardFramingMode,
        profile: "preserve-structure",
        visibilityOverrides: activeComposition.visibilityOverrides,
        nameOverrides: activeComposition.nameOverrides,
      });
      return {
        svgString: res.svgString,
        viewBox: res.viewBox,
        includedNodeCount: res.includedNodeCount,
        includedDefCount: 0,
      };
    }
    return serializeCompositionToSvg({
      sourceDoc: activeSource,
      composition: activeComposition,
      profile: "preserve-structure",
      framingMode: "original-viewbox",
      backgroundMode: "transparent",
    });
  }, [
    activeSource,
    activeComposition,
    focusedArtboard,
    artboardKeepBg,
    artboardBgMode,
    artboardFramingMode,
  ]);

  const compareCanvasSvgResult = useMemo(() => {
    if (!isCompareMode || !activeSource || !activeProject) return null;
    const compToCompare =
      activeProject.compositions.find((c) => c.id === compareCompositionId) ||
      activeProject.compositions.find((c) => c.id !== activeComposition?.id) ||
      activeComposition;
    if (!compToCompare) return null;
    return {
      composition: compToCompare,
      serialized: serializeCompositionToSvg({
        sourceDoc: activeSource,
        composition: compToCompare,
        profile: "preserve-structure",
        framingMode: "original-viewbox",
        backgroundMode: "transparent",
      }),
    };
  }, [isCompareMode, activeSource, activeProject, compareCompositionId, activeComposition]);

  // Hit-testing seguro no Canvas Central (clique seleciona o elemento na árvore e expande sua prancheta)
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isSpacePressed || isPanning) return;
    let el = e.target as Element | null;
    while (el && el !== e.currentTarget) {
      const vId = el.getAttribute("data-veronna-id");
      if (vId && nodesMap.has(vId)) {
        if (e.ctrlKey || e.metaKey) {
          setSelectedNodeIds((prev) =>
            prev.includes(vId) ? prev.filter((id) => id !== vId) : [...prev, vId]
          );
        } else {
          setSelectedNodeIds([vId]);
        }
        if (activeSource) {
          const ownerArt = activeSource.artboards.find((a) =>
            getArtboardGraphicNodes(activeSource, a).some((n) => n.id === vId)
          );
          if (ownerArt) {
            setExpandedArtboardIds((prev) => {
              const next = new Set(prev);
              next.add(ownerArt.id);
              return next;
            });
          }
        }
        return;
      }
      el = el.parentElement;
    }
  };

  // ============================================================================
  // GESTÃO DE VARIANTES (SEÇÃO 7.4)
  // ============================================================================
  const handleCreateVariant = () => {
    if (!activeProject || !activeSource || !activeComposition) return;
    const cleanName =
      newVariantName.trim().replace(/\s+/g, "_") ||
      `Variante_${activeProject.compositions.length + 1}`;
    const newComp: Composition = {
      schemaVersion: 1,
      id: `comp_${Date.now().toString(36)}`,
      projectId: activeProject.id,
      documentId: activeSource.id,
      name: cleanName,
      description: newVariantDesc.trim() || "Variante salva a partir do estado atual do canvas.",
      status: "draft",
      orderIndex: activeProject.compositions.length,
      visibilityOverrides: { ...activeComposition.visibilityOverrides },
      roleOverrides: { ...activeComposition.roleOverrides },
      nameOverrides: { ...activeComposition.nameOverrides },
      lockedNodeIds: [...activeComposition.lockedNodeIds],
      exportPreferences: { ...activeComposition.exportPreferences },
      version: 1,
      sourceSnapshotHash: activeSource.checksumSha256,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = projects.map((p) =>
      p.id === activeProject.id
        ? {
            ...p,
            compositions: [...p.compositions, newComp],
            activeCompositionId: newComp.id,
            updatedAt: new Date().toISOString(),
          }
        : p
    );
    persistProjectsWithAutosave(updated);
    setSelectedExportVariantIds((prev) => [...prev, newComp.id]);
    setIsNewVariantModalOpen(false);
    setNewVariantName("");
    setNewVariantDesc("");
    recordAudit(activeProject.id, "COMPOSITION_CREATED", `Criada variante ${cleanName}`);
    notifyToast(`Variante "${cleanName}" salva com sucesso!`);
  };

  const handleDuplicateVariant = (comp: Composition) => {
    if (!activeProject) return;
    const dupName = `${comp.name}_Copia`;
    const dup: Composition = {
      ...JSON.parse(JSON.stringify(comp)),
      id: `comp_${Date.now().toString(36)}`,
      name: dupName,
      status: "draft",
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = projects.map((p) =>
      p.id === activeProject.id
        ? {
            ...p,
            compositions: [...p.compositions, dup],
            activeCompositionId: dup.id,
          }
        : p
    );
    persistProjectsWithAutosave(updated);
    setSelectedExportVariantIds((prev) => [...prev, dup.id]);
    notifyToast(`Variante duplicada como "${dupName}".`);
  };

  const handleApproveVariant = (compId: string) => {
    if (!activeProject) return;
    const updated = projects.map((p) =>
      p.id === activeProject.id
        ? {
            ...p,
            compositions: p.compositions.map((c) =>
              c.id === compId
                  ? {
                      ...c,
                      status: (c.status === "approved" ? "draft" : "approved") as Composition["status"],
                      updatedAt: new Date().toISOString(),
                    }
                  : c
            ),
          }
        : p
    );
    persistProjectsWithAutosave(updated);
    recordAudit(activeProject.id, "COMPOSITION_APPROVED", `Status da variante atualizado`);
  };

  const handleDeleteVariant = (compId: string) => {
    if (!activeProject) return;
    if (activeProject.compositions.length <= 1) {
      notifyToast("O projeto deve manter pelo menos uma variante ativa.");
      return;
    }
    const target = activeProject.compositions.find((c) => c.id === compId);
    if (!window.confirm(`Excluir a variante "${target?.name}"? O SVG original permanecerá intacto.`)) {
      return;
    }
    const remaining = activeProject.compositions.filter((c) => c.id !== compId);
    const updated = projects.map((p) =>
      p.id === activeProject.id
        ? {
            ...p,
            compositions: remaining,
            activeCompositionId:
              p.activeCompositionId === compId ? remaining[0].id : p.activeCompositionId,
          }
        : p
    );
    persistProjectsWithAutosave(updated);
    setSelectedExportVariantIds((prev) => prev.filter((id) => id !== compId));
    notifyToast("Variante removida.");
  };

  const handleRestoreSourceDefaults = () => {
    if (!activeComposition) return;
    applyCompositionMutation("Restaurar visibilidade da fonte original", () => ({
      visibilityOverrides: {},
    }));
    notifyToast("Visibilidade restaurada para o estado original da fonte.");
  };

  // ============================================================================
  // MOTOR DE EXPORTAÇÃO EM LOTE (SEÇÃO 7.5 & 15.1)
  // ============================================================================
  const plannedBatchItems = useMemo(() => {
    if (!activeProject || !activeSource) return [];
    const safeProjName = activeProject.name.replace(/[^a-zA-Z0-9_-]/g, "_");
    const suffixPart = exportSuffix.trim()
      ? `_${exportSuffix.trim().replace(/[^a-zA-Z0-9_-]/g, "_")}`
      : "";

    const items: Array<{
      key: string;
      composition: Composition;
      artboard?: ArtboardItem;
      groupId?: string;
      groupLabel?: string;
      format: "svg" | "png";
      scalePx?: number;
      dimensionsLabel: string;
      defaultFilename: string;
    }> = [];

    // Modo 0: Pranchetas Identificadas (Multi-Artboard separado individualmente)
    if (exportMode === "artboards" && activeComposition) {
      const selectedArts = (activeSource.artboards || []).filter((a) =>
        selectedArtboardIds.includes(a.id)
      );
      for (const art of selectedArts) {
        const effName = getEffectiveArtboardName(art);
        const cleanArt = effName
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-zA-Z0-9_-]+/g, "_")
          .replace(/^_+|_+$/g, "");
        for (const fmt of selectedExportFormats) {
          if (fmt === "svg") {
            const key = `art_${art.id}_svg`;
            items.push({
              key,
              composition: activeComposition,
              artboard: art,
              groupLabel: effName,
              format: "svg",
              dimensionsLabel: `${Math.round(art.bounds.width)}×${Math.round(art.bounds.height)} (Prancheta)`,
              defaultFilename: `${cleanArt}${suffixPart}.svg`,
            });
          } else {
            for (const scale of exportPngScales) {
              const key = `art_${art.id}_png_${scale}`;
              items.push({
                key,
                composition: activeComposition,
                artboard: art,
                groupLabel: effName,
                format: "png",
                scalePx: scale,
                dimensionsLabel: `${scale} px`,
                defaultFilename: `${cleanArt}_${scale}px${suffixPart}.png`,
              });
            }
          }
        }
      }
      return items;
    }

    const targetComps =
      exportMode === "current-complete" && activeComposition
        ? [activeComposition]
        : activeProject.compositions.filter((c) => selectedExportVariantIds.includes(c.id));

    if (exportMode === "individual-groups" && activeComposition) {
      const topGroups = activeSource.nodes.filter(
        (n) =>
          n.depth === 0 &&
          isNodeEffectivelyVisible(n.id, nodesMap, activeComposition.visibilityOverrides)
      );
      for (const grp of topGroups) {
        const cleanGrp = (
          activeComposition.nameOverrides?.[grp.id] || grp.displayName
        ).replace(/[^a-zA-Z0-9_-]/g, "_");
        for (const fmt of selectedExportFormats) {
          if (fmt === "svg") {
            const key = `${activeComposition.id}_${grp.id}_svg`;
            items.push({
              key,
              composition: activeComposition,
              groupId: grp.id,
              groupLabel: grp.displayName,
              format: "svg",
              dimensionsLabel:
                exportFramingMode === "fit-to-content"
                  ? "Ajustado ao grupo"
                  : `${activeSource.sourceMetadata.viewBox.width}×${activeSource.sourceMetadata.viewBox.height} (ViewBox)`,
              defaultFilename: `${safeProjName}_${cleanGrp}${suffixPart}.svg`,
            });
          } else {
            for (const scale of exportPngScales) {
              const key = `${activeComposition.id}_${grp.id}_png_${scale}`;
              items.push({
                key,
                composition: activeComposition,
                groupId: grp.id,
                groupLabel: grp.displayName,
                format: "png",
                scalePx: scale,
                dimensionsLabel: `${scale} px`,
                defaultFilename: `${safeProjName}_${cleanGrp}_${scale}px${suffixPart}.png`,
              });
            }
          }
        }
      }
      return items;
    }

    for (const comp of targetComps) {
      const cleanVar = comp.name.replace(/[^a-zA-Z0-9_-]/g, "_");
      for (const fmt of selectedExportFormats) {
        if (fmt === "svg") {
          const key = `${comp.id}_svg`;
          items.push({
            key,
            composition: comp,
            format: "svg",
            dimensionsLabel:
              exportFramingMode === "fit-to-content"
                ? "Ajustado ao conteúdo"
                : `${activeSource.sourceMetadata.viewBox.width}×${activeSource.sourceMetadata.viewBox.height} (ViewBox)`,
            defaultFilename: `${safeProjName}_${cleanVar}${suffixPart}.svg`,
          });
        } else {
          for (const scale of exportPngScales) {
            const key = `${comp.id}_png_${scale}`;
            items.push({
              key,
              composition: comp,
              format: "png",
              scalePx: scale,
              dimensionsLabel: `${scale} px`,
              defaultFilename: `${safeProjName}_${cleanVar}_${scale}px${suffixPart}.png`,
            });
          }
        }
      }
    }
    return items;
  }, [
    activeProject,
    activeSource,
    activeComposition,
    exportMode,
    selectedArtboardIds,
    getEffectiveArtboardName,
    selectedExportVariantIds,
    selectedExportFormats,
    exportPngScales,
    exportFramingMode,
    exportSuffix,
    nodesMap,
  ]);

  const executeBatchExportJob = async () => {
    if (!activeProject || !activeSource || plannedBatchItems.length === 0) return;
    if (plannedBatchItems.length > 100) {
      if (
        !window.confirm(
          `Este lote gerará ${plannedBatchItems.length} arquivos (acima do alerta de 100 itens). Deseja confirmar a execução?`
        )
      ) {
        return;
      }
    }

    const jobId = `exp_${Date.now().toString(36)}`;
    const correlationId = `corr_${Date.now().toString(36)}`;
    const initialItems: ExportJobItem[] = plannedBatchItems.map((plan, idx) => ({
      id: `item_${jobId}_${idx + 1}`,
      jobId,
      compositionId: plan.composition.id,
      compositionName: plan.artboard
        ? getEffectiveArtboardName(plan.artboard)
        : plan.groupLabel
        ? `${plan.composition.name} (${plan.groupLabel})`
        : plan.composition.name,
      compositionVersion: plan.composition.version,
      groupId: plan.artboard ? `artboard:${plan.artboard.id}` : plan.groupId,
      format: plan.format,
      profile: exportSvgProfile,
      dimensionsLabel: plan.dimensionsLabel,
      targetPx: plan.scalePx,
      backgroundMode: exportBgMode,
      backgroundColor: exportCustomBgColor,
      framingMode: exportFramingMode,
      outputFilename: customOutputFilenames[plan.key] || plan.defaultFilename,
      status: "queued",
    }));

    const newJob: ExportJob = {
      id: jobId,
      correlationId,
      projectId: activeProject.id,
      projectName: activeProject.name,
      requestedBy: "Studio Veronna",
      exportMode,
      status: "running",
      totalItems: initialItems.length,
      completedItems: 0,
      failedItems: 0,
      includeZip: exportIncludeZip,
      items: initialItems,
      startedAt: new Date().toISOString(),
    };

    setExportJobs((prev) => [newJob, ...prev]);
    setExportStep(5);
    setGlobalState("export-running");
    recordAudit(activeProject.id, "EXPORT_JOB_STARTED", `Iniciado lote com ${initialItems.length} arquivo(s)`, {
      jobId,
      totalItems: initialItems.length,
    });

    const zipEntries: Array<{ filename: string; data: Uint8Array | string }> = [];
    const manifestItems: any[] = [];
    let completed = 0;
    let failed = 0;

    for (let i = 0; i < initialItems.length; i++) {
      const item = initialItems[i];
      // Marcar como processing
      setExportJobs((prev) =>
        prev.map((j) =>
          j.id === jobId
            ? {
                ...j,
                items: j.items.map((it) =>
                  it.id === item.id ? { ...it, status: "processing" } : it
                ),
              }
            : j
        )
      );

      await new Promise((r) => setTimeout(r, 80));

      try {
        const isArtboardExport = item.groupId?.startsWith("artboard:");
        const targetArtboard = isArtboardExport
          ? activeSource.artboards.find((a) => `artboard:${a.id}` === item.groupId)
          : undefined;

        const comp =
          activeProject.compositions.find((c) => c.id === item.compositionId) ||
          activeComposition!;

        const { svgString, viewBox } = targetArtboard
          ? serializeArtboardToSvg({
              sourceDoc: activeSource,
              artboard: targetArtboard,
              keepArtboardBackground:
                item.backgroundMode === "transparent" ? artboardKeepBg : false,
              backgroundMode:
                item.backgroundMode === "transparent"
                  ? artboardKeepBg
                    ? "original"
                    : "transparent"
                  : (item.backgroundMode as any),
              customBackgroundColor: item.backgroundColor,
              framingMode:
                item.framingMode === "fit-to-content" ? "fit-to-content" : "artboard-bounds",
              profile: item.profile,
              idPrefix: exportPrefixIds ? `p${targetArtboard.index}` : undefined,
              visibilityOverrides: comp.visibilityOverrides,
              nameOverrides: comp.nameOverrides,
            })
          : serializeCompositionToSvg({
              sourceDoc: activeSource,
              composition: comp,
              profile: item.profile,
              framingMode: item.framingMode,
              backgroundMode: item.backgroundMode,
              backgroundColor: item.backgroundColor,
              onlySpecificGroupId: item.groupId,
              idPrefix: exportPrefixIds ? comp.name.toLowerCase() : undefined,
            });

        if (item.format === "svg") {
          const svgBytes = new TextEncoder().encode(svgString);
          const checksum = await computeSha256Hex(svgBytes);
          const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
          const url = URL.createObjectURL(blob);

          zipEntries.push({ filename: item.outputFilename, data: svgBytes });
          manifestItems.push({
            filename: item.outputFilename,
            variant: item.compositionName,
            compositionVersion: item.compositionVersion,
            format: "SVG",
            profile: item.profile,
            dimensions: `${viewBox.width}x${viewBox.height}`,
            background: item.backgroundMode,
            status: "completed",
            checksumSha256: checksum,
          });

          completed++;
          setExportJobs((prev) =>
            prev.map((j) =>
              j.id === jobId
                ? {
                    ...j,
                    completedItems: completed,
                    items: j.items.map((it) =>
                      it.id === item.id
                        ? {
                            ...it,
                            status: "completed",
                            artifactUrl: url,
                            artifactBlob: blob,
                            artifactText: svgString,
                            fileSize: svgBytes.byteLength,
                            checksumSha256: checksum,
                          }
                        : it
                    ),
                  }
                : j
            )
          );
        } else {
          const { blob, width, height } = await renderSvgStringToPngBlob({
            svgString,
            viewBox,
            targetLongestSidePx: item.targetPx || 2048,
          });
          const pngBytes = new Uint8Array(await blob.arrayBuffer());
          const checksum = await computeSha256Hex(pngBytes);
          const url = URL.createObjectURL(blob);

          zipEntries.push({ filename: item.outputFilename, data: pngBytes });
          manifestItems.push({
            filename: item.outputFilename,
            variant: item.compositionName,
            compositionVersion: item.compositionVersion,
            format: "PNG",
            profile: item.profile,
            dimensions: `${width}x${height}px`,
            background: item.backgroundMode,
            status: "completed",
            checksumSha256: checksum,
          });

          completed++;
          setExportJobs((prev) =>
            prev.map((j) =>
              j.id === jobId
                ? {
                    ...j,
                    completedItems: completed,
                    items: j.items.map((it) =>
                      it.id === item.id
                        ? {
                            ...it,
                            status: "completed",
                            dimensionsLabel: `${width}×${height} px`,
                            artifactUrl: url,
                            artifactBlob: blob,
                            fileSize: pngBytes.byteLength,
                            checksumSha256: checksum,
                          }
                        : it
                    ),
                  }
                : j
            )
          );
        }
      } catch (err: any) {
        failed++;
        setExportJobs((prev) =>
          prev.map((j) =>
            j.id === jobId
              ? {
                  ...j,
                  failedItems: failed,
                  items: j.items.map((it) =>
                    it.id === item.id
                      ? {
                          ...it,
                          status: "failed",
                          errorCode: "EXPORT_RENDER_FAILED",
                          errorMessageSafe:
                            err?.message || "Falha ao serializar ou rasterizar item do lote.",
                        }
                      : it
                  ),
                }
              : j
          )
        );
      }
    }

    const manifestObj = {
      generator: "Veronna Motion Studio — Studio Suite",
      schemaVersion: 1,
      jobId,
      correlationId,
      project: activeProject.name,
      sourceFilename: activeSource.originalFilename,
      sourceChecksumSha256: activeSource.checksumSha256,
      exportedAt: new Date().toISOString(),
      totalFiles: initialItems.length,
      completedFiles: completed,
      failedFiles: failed,
      files: manifestItems,
    };
    const manifestJson = JSON.stringify(manifestObj, null, 2);
    zipEntries.push({ filename: "manifest.json", data: manifestJson });

    const zipBlob = buildZipBlob(zipEntries);
    const zipUrl = URL.createObjectURL(zipBlob);
    const zipFilename = `${activeProject.name.replace(/[^a-zA-Z0-9_-]/g, "_")}_Pacote_Veronna.zip`;

    const finalStatus: ExportJob["status"] =
      failed === 0 ? "completed" : completed > 0 ? "partial" : "failed";

    setExportJobs((prev) =>
      prev.map((j) =>
        j.id === jobId
          ? {
              ...j,
              status: finalStatus,
              zipArtifactUrl: zipUrl,
              zipFilename,
              manifestJson,
              finishedAt: new Date().toISOString(),
            }
          : j
      )
    );

    setGlobalState(
      finalStatus === "completed"
        ? "export-completed"
        : finalStatus === "partial"
        ? "export-partial"
        : "export-failed"
    );
    recordAudit(activeProject.id, "EXPORT_JOB_COMPLETED", `Lote finalizado (${completed}/${initialItems.length} concluídos)`, {
      jobId,
      status: finalStatus,
    });
    notifyToast(`Pacote de lote concluído (${completed} arquivos gerados)!`);
  };

  // ============================================================================
  // MOTION STUDIO: CONFIGURAÇÃO, PREVIEW E RENDER MP4 5.000s (SEÇÃO 7.6 & 15.2)
  // ============================================================================
  const handleStartMotionFromActiveVariant = () => {
    if (!activeProject || !activeComposition) return;
    const existingForComp = activeProject.motions.find(
      (m) => m.compositionId === activeComposition.id
    );
    if (existingForComp) {
      const updated = projects.map((p) =>
        p.id === activeProject.id ? { ...p, activeMotionId: existingForComp.id } : p
      );
      persistProjectsWithAutosave(updated);
      setActiveTab("motion");
      return;
    }

    const newMotion: MotionProject = {
      id: `mot_${Date.now().toString(36)}`,
      projectId: activeProject.id,
      compositionId: activeComposition.id,
      compositionVersion: activeComposition.version,
      compositionSnapshot: JSON.parse(JSON.stringify(activeComposition)),
      name: `Motion 5s — ${activeComposition.name}`,
      presetId: "assemble",
      config: JSON.parse(JSON.stringify(MOTION_PRESET_LIBRARY[0].defaultSpec)),
      durationMs: 5000,
      fps: 30,
      canvasProfile: "landscape",
      status: "ready",
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = projects.map((p) =>
      p.id === activeProject.id
        ? {
            ...p,
            motions: [newMotion, ...p.motions],
            activeMotionId: newMotion.id,
          }
        : p
    );
    persistProjectsWithAutosave(updated);
    recordAudit(activeProject.id, "MOTION_CREATED", `Criado Motion Project para ${activeComposition.name}`);
    setActiveTab("motion");
    setCurrentFrame(0);
    setIsPlayingMotion(true);
  };

  const updateActiveMotionSpec = (updater: (prev: MotionSpec) => MotionSpec) => {
    if (!activeProject || !activeMotion) return;
    const nextSpec = updater(activeMotion.config);
    // Garantir invariantes de 5,000 segundos e 30 fps (Seção 0 e 7.6)
    nextSpec.durationMs = 5000;
    nextSpec.fps = 30;

    const updated = projects.map((p) =>
      p.id === activeProject.id
        ? {
            ...p,
            motions: p.motions.map((m) =>
              m.id === activeMotion.id
                ? {
                    ...m,
                    presetId: nextSpec.presetId,
                    canvasProfile: nextSpec.canvasProfile,
                    config: nextSpec,
                    version: m.version + 1,
                    updatedAt: new Date().toISOString(),
                  }
                : m
            ),
          }
        : p
    );
    persistProjectsWithAutosave(updated);
  };

  const handleDuplicateActiveMotion = () => {
    if (!activeProject || !activeMotion) return;
    const dup: MotionProject = {
      ...JSON.parse(JSON.stringify(activeMotion)),
      id: `mot_${Date.now().toString(36)}`,
      name: `${activeMotion.name} (Variação)`,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = projects.map((p) =>
      p.id === activeProject.id
        ? {
            ...p,
            motions: [dup, ...p.motions],
            activeMotionId: dup.id,
          }
        : p
    );
    persistProjectsWithAutosave(updated);
    notifyToast(`Motion duplicado como "${dup.name}" sem alterar a variante de origem.`);
  };

  const currentMotionFrameRender = useMemo(() => {
    if (!activeSource || !activeComposition || !activeMotion) return null;
    if (activeSource.importStatus === "failed") return null;
    return renderMotionFrameSvg({
      spec: activeMotion.config,
      sourceDoc: activeSource,
      composition: activeComposition,
      frameIndex: currentFrame,
      showSafeAreaGuides,
      scaleFactor: 0.5, // Escala leve para preview 60fps fluido na UI
    });
  }, [activeSource, activeComposition, activeMotion, currentFrame, showSafeAreaGuides]);

  const handleRenderFinalMotionVideo = async () => {
    if (!activeProject || !activeSource || !activeComposition || !activeMotion) return;
    setIsPlayingMotion(false);

    const jobId = `rnd_${Date.now().toString(36)}`;
    const correlationId = `corr_${Date.now().toString(36)}`;
    const newRenderJob: RenderJob = {
      id: jobId,
      correlationId,
      projectId: activeProject.id,
      projectName: activeProject.name,
      motionProjectId: activeMotion.id,
      motionProjectName: activeMotion.name,
      motionVersion: activeMotion.version,
      status: "running",
      progress: 0,
      currentFrame: 0,
      attempt: 1,
      startedAt: new Date().toISOString(),
    };

    setRenderJobs((prev) => [newRenderJob, ...prev]);
    setGlobalState("render-running");
    recordAudit(activeProject.id, "MOTION_RENDER_STARTED", `Render MP4 5,000s iniciado (${activeMotion.name})`, {
      jobId,
      preset: activeMotion.presetId,
    });

    try {
      const artifact = await executeDeterministicMotionRender({
        renderJobId: jobId,
        motionProjectId: activeMotion.id,
        spec: activeMotion.config,
        sourceDoc: activeSource,
        composition: activeComposition,
        onProgress: (frameIdx, pct, phase) => {
          setCurrentFrame(Math.min(149, frameIdx));
          if (phase === "validation") setGlobalState("render-validation");
          setRenderJobs((prev) =>
            prev.map((rj) =>
              rj.id === jobId
                ? {
                    ...rj,
                    status: phase === "validation" ? "validation" : "running",
                    currentFrame: frameIdx,
                    progress: pct,
                  }
                : rj
            )
          );
        },
      });

      setRenderJobs((prev) =>
        prev.map((rj) =>
          rj.id === jobId
            ? {
                ...rj,
                status: "completed",
                progress: 100,
                currentFrame: 150,
                finishedAt: new Date().toISOString(),
                artifact,
              }
            : rj
        )
      );
      setGlobalState("render-completed");
      recordAudit(
        activeProject.id,
        "MOTION_RENDER_COMPLETED",
        `Render MP4 5,000s concluído e validado (${artifact.width}×${artifact.height} @ 30fps)`,
        {
          jobId,
          checksum: artifact.checksumSha256.slice(0, 12),
          valid: artifact.validationReport.valid,
        }
      );
      notifyToast("Render de 5,000s concluído e aprovado pelo Validador Técnico!");
    } catch (err: any) {
      setRenderJobs((prev) =>
        prev.map((rj) =>
          rj.id === jobId
            ? {
                ...rj,
                status: "failed",
                finishedAt: new Date().toISOString(),
                errorCode: "MOTION_RENDER_FAILED",
                errorMessageSafe: err?.message || "Erro durante a renderização dos frames.",
              }
            : rj
        )
      );
      setGlobalState("render-failed");
      notifyToast("Falha durante a renderização do vídeo.");
    }
  };

  // ============================================================================
  // SUITE AUTOMATIZADA DE REGRESSÃO E TESTES QA (SEÇÃO 16)
  // ============================================================================
  const runAllQaFixtures = async () => {
    setIsRunningQaSuite(true);
    const results: Array<{
      fixture: SvgFixtureDefinition;
      report: CompatibilityReport;
      passed: boolean;
    }> = [];

    for (const fix of MOTION_STUDIO_FIXTURES) {
      const parsed = await parseAndSanitizeSvgDocument({
        projectId: "qa_runner",
        filename: fix.filename,
        rawSvgContent: fix.svgContent,
      });
      const passed = parsed.compatibilityReport.status === fix.expectedOutcome;
      results.push({
        fixture: fix,
        report: parsed.compatibilityReport,
        passed,
      });
    }
    setQaResults(results);
    setIsRunningQaSuite(false);
    notifyToast(
      `Suite QA concluída: ${results.filter((r) => r.passed).length}/${
        results.length
      } fixtures verificadas com sucesso!`
    );
  };

  // ============================================================================
  // RENDERIZAÇÃO RECURSIVA DA ÁRVORE DE ELEMENTOS (SEÇÃO 7.3)
  // ============================================================================
  const filteredNodeIds = useMemo(() => {
    if (!activeSource || !layerSearch.trim()) return null;
    const q = layerSearch.toLowerCase();
    const matched = new Set<string>();
    for (const n of activeSource.nodes) {
      const customName = activeComposition?.nameOverrides?.[n.id] || n.displayName;
      if (
        customName.toLowerCase().includes(q) ||
        n.tagName.toLowerCase().includes(q) ||
        (n.sourceNodeId && n.sourceNodeId.toLowerCase().includes(q)) ||
        ROLE_LABELS[activeComposition?.roleOverrides?.[n.id] || n.motionRole].label
          .toLowerCase()
          .includes(q)
      ) {
        matched.add(n.id);
        let curr = n.parentId ? nodesMap.get(n.parentId) : undefined;
        while (curr) {
          matched.add(curr.id);
          curr = curr.parentId ? nodesMap.get(curr.parentId) : undefined;
        }
      }
    }
    return matched;
  }, [activeSource, activeComposition, layerSearch, nodesMap]);

  const renderTreeNodes = (parentId: string | null, depth = 0): React.ReactNode => {
    if (!activeSource || !activeComposition) return null;
    const children = activeSource.nodes.filter((n) => n.parentId === parentId);
    if (children.length === 0) return null;

    return children.map((node) => {
      if (filteredNodeIds && !filteredNodeIds.has(node.id)) return null;

      const isGroup = node.type === "group";
      const isExpanded = expandedGroupIds.has(node.id) || Boolean(filteredNodeIds);
      const isSelected = selectedNodeIds.includes(node.id);
      const ownVisible = getOwnNodeVisibility(node, activeComposition.visibilityOverrides);
      const effectiveVisible = isNodeEffectivelyVisible(
        node.id,
        nodesMap,
        activeComposition.visibilityOverrides
      );
      const groupTriState = isGroup
        ? getGroupSelectionState(node, nodesMap, activeComposition.visibilityOverrides)
        : ownVisible
        ? "all"
        : "none";

      const effectiveName = activeComposition.nameOverrides?.[node.id] || node.displayName;
      const effectiveRole = activeComposition.roleOverrides?.[node.id] || node.motionRole;
      const roleMeta = ROLE_LABELS[effectiveRole];
      const isLocked = activeComposition.lockedNodeIds.includes(node.id);

      return (
        <div key={node.id} className="select-none">
          <div
            onClick={(e) => {
              e.stopPropagation();
              if (e.ctrlKey || e.metaKey) {
                setSelectedNodeIds((prev) =>
                  prev.includes(node.id)
                    ? prev.filter((id) => id !== node.id)
                    : [...prev, node.id]
                );
              } else if (e.shiftKey && selectedNodeIds.length > 0) {
                const siblings = children.map((c) => c.id);
                const startIdx = siblings.indexOf(selectedNodeIds[selectedNodeIds.length - 1]);
                const endIdx = siblings.indexOf(node.id);
                if (startIdx !== -1 && endIdx !== -1) {
                  const [lo, hi] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
                  setSelectedNodeIds(siblings.slice(lo, hi + 1));
                } else {
                  setSelectedNodeIds([node.id]);
                }
              } else {
                setSelectedNodeIds([node.id]);
              }
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              setEditingNodeNameId(node.id);
              setEditingNodeNameValue(effectiveName);
            }}
            style={{ paddingLeft: `${depth * 14 + 8}px` }}
            className={`group flex items-center gap-1.5 py-1.5 pr-2 rounded-xl text-[11.5px] font-roboto cursor-pointer transition-colors ${
              isSelected
                ? "bg-[var(--color-atelier-terracota)]/15 text-[var(--color-atelier-grafite)] font-semibold border border-[var(--color-atelier-terracota)]/35"
                : "text-[var(--color-atelier-grafite)]/85 hover:bg-[var(--color-atelier-creme)]/80 border border-transparent"
            } ${!effectiveVisible ? "opacity-45" : ""}`}
          >
            {/* Chevron de Grupo */}
            {isGroup ? (
              <button
                type="button"
                aria-label={isExpanded ? "Recolher grupo" : "Expandir grupo"}
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedGroupIds((prev) => {
                    const next = new Set(prev);
                    if (next.has(node.id)) next.delete(node.id);
                    else next.add(node.id);
                    return next;
                  });
                }}
                className="w-4 h-4 flex items-center justify-center text-[var(--color-atelier-madeira)] hover:text-[var(--color-atelier-terracota)] rounded"
              >
                {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </button>
            ) : (
              <span className="w-4 h-4 inline-block shrink-0" />
            )}

            {/* Checkbox Tri-state para Grupos (Regra Seção 7.3) */}
            <button
              type="button"
              role="checkbox"
              aria-checked={
                groupTriState === "partial"
                  ? "mixed"
                  : groupTriState === "all"
                  ? "true"
                  : "false"
              }
              onClick={(e) => {
                e.stopPropagation();
                toggleNodeVisibility(node.id);
              }}
              title={
                groupTriState === "partial"
                  ? "Parcialmente incluído (alguns filhos ocultos)"
                  : groupTriState === "all"
                  ? "Incluído na variante"
                  : "Oculto na variante"
              }
              className={`w-3.5 h-3.5 rounded-[4px] flex items-center justify-center border transition-colors shrink-0 ${
                groupTriState === "all"
                  ? "bg-[var(--color-atelier-terracota)] border-[var(--color-atelier-terracota)] text-white"
                  : groupTriState === "partial"
                  ? "bg-amber-500/20 border-amber-500 text-amber-600"
                  : "border-[var(--color-atelier-grafite)]/25 bg-white text-transparent"
              }`}
            >
              {groupTriState === "all" && <Check size={9} strokeWidth={3} />}
              {groupTriState === "partial" && (
                <span className="w-2 h-0.5 bg-amber-600 rounded-full" />
              )}
            </button>

            {/* Ícone por Tipo */}
            <span className="text-[9.5px] font-mono px-1.5 py-0.5 rounded bg-[var(--color-atelier-creme)] text-[var(--color-atelier-madeira)] border border-[var(--color-atelier-grafite)]/10 shrink-0">
              {node.isSyntheticLooseGroup
                ? "SOLTOS"
                : isGroup
                ? "GRP"
                : node.tagName.slice(0, 4).toUpperCase()}
            </span>

            {/* Nome ou Input de Renomeação */}
            {editingNodeNameId === node.id ? (
              <input
                type="text"
                autoFocus
                value={editingNodeNameValue}
                onChange={(e) => setEditingNodeNameValue(e.target.value)}
                onBlur={() => {
                  if (editingNodeNameValue.trim()) {
                    applyCompositionMutation(`Renomear camada para ${editingNodeNameValue}`, (c) => ({
                      nameOverrides: {
                        ...c.nameOverrides,
                        [node.id]: editingNodeNameValue.trim(),
                      },
                    }));
                  }
                  setEditingNodeNameId(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  if (e.key === "Escape") setEditingNodeNameId(null);
                }}
                className="flex-1 min-w-0 bg-white border border-[var(--color-atelier-terracota)] rounded px-1.5 py-0.5 text-[11px] text-[var(--color-atelier-grafite)] outline-none"
              />
            ) : (
              <span className="flex-1 truncate font-medium" title={effectiveName}>
                {effectiveName}
              </span>
            )}

            {/* Badge de Papel de Motion */}
            {effectiveRole !== "generic" && (
              <span
                style={{ color: roleMeta.color, backgroundColor: roleMeta.bg }}
                className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0"
              >
                {roleMeta.label.slice(0, 3)}
              </span>
            )}

            {/* Controle de Bloqueio */}
            {isLocked && <Lock size={11} className="text-[var(--color-atelier-terracota)] shrink-0" />}

            {/* Toggle de Visibilidade (Olho) */}
            <button
              type="button"
              aria-label={ownVisible ? "Ocultar camada" : "Exibir camada"}
              onClick={(e) => {
                e.stopPropagation();
                toggleNodeVisibility(node.id);
              }}
              className={`p-1 rounded hover:bg-[var(--color-atelier-creme)] transition-opacity shrink-0 ${
                ownVisible
                  ? "text-[var(--color-atelier-madeira)] opacity-70 group-hover:opacity-100"
                  : "text-rose-500 opacity-100"
              }`}
            >
              {ownVisible ? <Eye size={13} /> : <EyeOff size={13} />}
            </button>
          </div>

          {isGroup && isExpanded && renderTreeNodes(node.id, depth + 1)}
        </div>
      );
    });
  };

  const stateBadge = GLOBAL_STATE_BADGES[globalState] || GLOBAL_STATE_BADGES.ready;

  // ============================================================================
  // RENDERIZAÇÃO PRINCIPAL DO WORKBENCH (IDENTIDADE VISUAL ATELIER)
  // ============================================================================
  return (
    <div
      className={`${
        isFullscreenWorkbench
          ? "fixed inset-0 z-[9990] p-0"
          : "w-full h-[calc(100dvh-5.5rem)] rounded-[2rem]"
      } flex flex-col overflow-hidden border transition-all duration-300 select-none font-roboto ${
        studioTheme === "dark"
          ? "bg-[#0D1D30] text-[#E8E3DD] border-[#234E80]"
          : "bg-[var(--color-atelier-creme)]/75 backdrop-blur-xl text-[var(--color-atelier-grafite)] border-white"
      } shadow-[0_20px_60px_-15px_rgba(20, 44, 72,0.18)]`}
    >
      {/* Input oculto para upload de SVG */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".svg,image/svg+xml"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFileUpload(f);
          e.target.value = "";
        }}
      />

      {/* ===================================================================== */}
      {/* BARRA SUPERIOR ESTILO FIGMA (COMPACTA, COM MENU DE ARQUIVO & MODOS)   */}
      {/* ===================================================================== */}
      <header
        className={`h-12 px-4 border-b flex items-center justify-between gap-3 shrink-0 z-30 relative ${
          studioTheme === "dark"
            ? "bg-[#2A2623] border-[#234E80]"
            : "bg-white/90 backdrop-blur-xl border-[var(--color-atelier-grafite)]/10"
        }`}
      >
        {/* Esquerda: Menu Principal (Estilo Figma) + Breadcrumb do Arquivo Atual */}
        <div className="flex items-center gap-2.5 min-w-0 relative">
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsProjectMenuOpen((v) => !v)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-[var(--color-atelier-creme)]/75 hover:bg-[var(--color-atelier-creme)] border border-[var(--color-atelier-grafite)]/12 text-xs font-bold text-[var(--color-atelier-grafite)] cursor-pointer transition-colors"
              title="Menu de Projeto, Arquivos e Ferramentas"
            >
              <div className="w-5 h-5 rounded-lg bg-[var(--color-atelier-terracota)]/15 text-[var(--color-atelier-terracota)] flex items-center justify-center shrink-0">
                <Film size={12} />
              </div>
              <span className="font-elegant text-sm tracking-tight hidden sm:inline">
                Veronna Motion
              </span>
              <ChevronDown size={12} className="text-[var(--color-atelier-madeira)]" />
            </button>

            {/* Dropdown Menu Estilo Figma */}
            {isProjectMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsProjectMenuOpen(false)}
                />
                <div className="absolute left-0 top-full mt-1.5 w-68 rounded-2xl bg-white border border-[var(--color-atelier-grafite)]/15 shadow-xl p-1.5 z-50 text-xs text-[var(--color-atelier-grafite)] space-y-1">
                  <div className="px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-widest text-[var(--color-atelier-madeira)]">
                    Arquivo & Projeto
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsProjectMenuOpen(false);
                      fileInputRef.current?.click();
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-[var(--color-atelier-creme)]/80 text-left font-medium cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <UploadCloud size={13} className="text-[var(--color-atelier-terracota)]" />
                      <span>Importar Arquivo SVG...</span>
                    </span>
                    <span className="text-[10px] font-mono text-[var(--color-atelier-madeira)]">
                      .svg
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsProjectMenuOpen(false);
                      setIsNewProjectModalOpen(true);
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-[var(--color-atelier-creme)]/80 text-left font-medium cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <FolderPlus size={13} className="text-[var(--color-atelier-madeira)]" />
                      <span>Novo Projeto em Branco...</span>
                    </span>
                  </button>

                  {projects.length > 0 && (
                    <div className="pt-1 border-t border-[var(--color-atelier-grafite)]/10">
                      <div className="px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-widest text-[var(--color-atelier-madeira)] flex items-center justify-between">
                        <span>Projetos Salvos ({projects.length})</span>
                        <button
                          type="button"
                          onClick={() => {
                            setIsProjectMenuOpen(false);
                            setActiveTab("projects");
                          }}
                          className="text-[var(--color-atelier-terracota)] hover:underline cursor-pointer"
                        >
                          Ver todos
                        </button>
                      </div>
                      <div className="max-h-36 overflow-y-auto space-y-0.5 custom-scrollbar">
                        {projects.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setActiveProjectId(p.id);
                              setSelectedExportVariantIds(p.compositions.map((c) => c.id));
                              const src = p.sources[0];
                              if (src) {
                                setSelectedArtboardIds(src.artboards.map((a) => a.id));
                              }
                              setActiveTab("studio");
                              setIsProjectMenuOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left truncate cursor-pointer ${
                              p.id === activeProject?.id
                                ? "bg-[var(--color-atelier-terracota)]/12 text-[var(--color-atelier-terracota)] font-bold"
                                : "hover:bg-[var(--color-atelier-creme)]/70"
                            }`}
                          >
                            <span className="truncate">{p.name}</span>
                            {p.id === activeProject?.id && <Check size={12} />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-1 border-t border-[var(--color-atelier-grafite)]/10">
                    <div className="px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-widest text-[var(--color-atelier-madeira)]">
                      Ferramentas & Painéis
                    </div>
                    {[
                      { id: "import", label: "Diagnóstico & QA do SVG", icon: <ShieldCheck size={13} /> },
                      { id: "artboards", label: "Grade Expandida de Pranchetas", icon: <LayoutGrid size={13} /> },
                      {
                        id: "jobs",
                        label: `Histórico de Jobs (${exportJobs.length + renderJobs.length})`,
                        icon: <Activity size={13} />,
                      },
                      { id: "presets", label: "Biblioteca de Presets", icon: <BookOpen size={13} /> },
                    ].map((tool) => (
                      <button
                        key={tool.id}
                        type="button"
                        onClick={() => {
                          setActiveTab(tool.id as StudioTab);
                          setIsProjectMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-[var(--color-atelier-creme)]/80 text-left text-[var(--color-atelier-grafite)]/85 cursor-pointer"
                      >
                        <span className="text-[var(--color-atelier-madeira)]">{tool.icon}</span>
                        <span>{tool.label}</span>
                      </button>
                    ))}
                  </div>

                  {activeProject && (
                    <div className="pt-1 border-t border-[var(--color-atelier-grafite)]/10">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveProjectId(null);
                          setIsProjectMenuOpen(false);
                          setActiveTab("studio");
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-rose-500/10 text-rose-600 text-left font-medium cursor-pointer"
                      >
                        <Trash2 size={12} />
                        <span>Fechar Arquivo / Limpar Tela</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <span className="text-[var(--color-atelier-grafite)]/25">/</span>

          {/* Nome do Arquivo / Projeto Atual */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-semibold text-[var(--color-atelier-grafite)] truncate max-w-[200px]">
              {activeProject?.name || "Sem arquivo aberto"}
            </span>
            {activeSource && (
              <span className="hidden md:inline-block text-[10px] font-mono px-2 py-0.5 rounded-md bg-[var(--color-atelier-creme)] text-[var(--color-atelier-madeira)] border border-[var(--color-atelier-grafite)]/10 truncate max-w-[150px]">
                {activeSource.originalFilename}
              </span>
            )}
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: stateBadge.dot }}
              title={stateBadge.label}
            />
          </div>
        </div>

        {/* Centro: Seletor Enxuto de Modos (Design | Motion 5.00s | Exportar) */}
        <div className="flex items-center gap-1.5">
          <nav className="flex items-center gap-0.5 bg-[var(--color-atelier-creme)]/85 p-1 rounded-xl border border-[var(--color-atelier-grafite)]/10">
            {[
              { id: "studio", label: "Design & Camadas", icon: <Layers size={12} /> },
              { id: "motion", label: "Motion 5.00s", icon: <Film size={12} /> },
              { id: "export", label: "Exportar Lote", icon: <Package size={12} /> },
            ].map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id as StudioTab)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-roboto font-bold transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? "bg-[var(--color-atelier-grafite)] text-white shadow-2xs"
                      : "text-[var(--color-atelier-grafite)]/65 hover:text-[var(--color-atelier-terracota)] hover:bg-white/80"
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {!["studio", "motion", "export"].includes(activeTab) && (
            <button
              type="button"
              onClick={() => setActiveTab("studio")}
              className="px-2.5 py-1 rounded-lg bg-[var(--color-atelier-terracota)]/12 text-[var(--color-atelier-terracota)] text-[11px] font-bold cursor-pointer hover:bg-[var(--color-atelier-terracota)] hover:text-white transition-colors"
            >
              Voltar ao Canvas
            </button>
          )}
        </div>

        {/* Direita: Controles Compactos (Undo/Redo, Painéis Laterais, Importar e Ação) */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={handleUndo}
            disabled={undoStack.length === 0}
            title="Desfazer (Ctrl+Z)"
            className="p-1.5 rounded-lg border border-[var(--color-atelier-grafite)]/12 bg-white/70 text-[var(--color-atelier-grafite)] hover:text-[var(--color-atelier-terracota)] disabled:opacity-30 cursor-pointer"
          >
            <Undo2 size={13} />
          </button>
          <button
            type="button"
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            title="Refazer (Ctrl+Shift+Z)"
            className="p-1.5 rounded-lg border border-[var(--color-atelier-grafite)]/12 bg-white/70 text-[var(--color-atelier-grafite)] hover:text-[var(--color-atelier-terracota)] disabled:opacity-30 cursor-pointer"
          >
            <Redo2 size={13} />
          </button>

          {(activeTab === "studio" || activeTab === "motion") && activeSource && (
            <>
              <div className="w-px h-4 bg-[var(--color-atelier-grafite)]/12 mx-0.5" />
              <button
                type="button"
                onClick={() => setIsLeftPanelOpen((v) => !v)}
                title={isLeftPanelOpen ? "Recolher painel esquerdo" : "Mostrar painel esquerdo"}
                className={`p-1.5 rounded-lg border text-[11px] cursor-pointer transition-colors ${
                  isLeftPanelOpen
                    ? "bg-[var(--color-atelier-terracota)]/12 border-[var(--color-atelier-terracota)]/30 text-[var(--color-atelier-terracota)]"
                    : "bg-white/70 border-[var(--color-atelier-grafite)]/12 text-[var(--color-atelier-madeira)]"
                }`}
              >
                <ListIcon size={13} />
              </button>
              <button
                type="button"
                onClick={() => setIsRightPanelOpen((v) => !v)}
                title={isRightPanelOpen ? "Recolher inspetor direito" : "Mostrar inspetor direito"}
                className={`p-1.5 rounded-lg border text-[11px] cursor-pointer transition-colors ${
                  isRightPanelOpen
                    ? "bg-[var(--color-atelier-terracota)]/12 border-[var(--color-atelier-terracota)]/30 text-[var(--color-atelier-terracota)]"
                    : "bg-white/70 border-[var(--color-atelier-grafite)]/12 text-[var(--color-atelier-madeira)]"
                }`}
              >
                <Sliders size={13} />
              </button>
            </>
          )}

          <div className="w-px h-4 bg-[var(--color-atelier-grafite)]/12 mx-0.5" />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-[var(--color-atelier-grafite)]/15 hover:border-[var(--color-atelier-terracota)]/50 text-[11px] font-semibold text-[var(--color-atelier-grafite)] cursor-pointer transition-colors"
          >
            <UploadCloud size={12} className="text-[var(--color-atelier-terracota)]" />
            <span className="hidden sm:inline">Importar SVG</span>
          </button>

          {activeSource && (
            <button
              type="button"
              onClick={
                activeTab === "motion"
                  ? handleRenderFinalMotionVideo
                  : handleStartMotionFromActiveVariant
              }
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-atelier-terracota)] hover:bg-[#234E80] text-white text-[11px] font-bold shadow-2xs transition-colors cursor-pointer"
            >
              <Film size={12} />
              <span className="hidden md:inline">
                {activeTab === "motion" ? "Renderizar MP4" : "Animar 5s"}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsFullscreenWorkbench((f) => !f)}
            title={isFullscreenWorkbench ? "Sair da Tela Cheia" : "Expandir Estúdio"}
            className="p-1.5 rounded-lg border border-[var(--color-atelier-grafite)]/12 bg-white/70 text-[var(--color-atelier-grafite)] hover:text-[var(--color-atelier-terracota)] cursor-pointer"
          >
            {isFullscreenWorkbench ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
        </div>
      </header>

      {/* ===================================================================== */}
      {/* CORPO PRINCIPAL POR ABA                                               */}
      {/* ===================================================================== */}
      <div className="flex-1 min-h-0 flex overflow-hidden relative">
        {/* ------------------------------------------------------------------- */}
        {/* TELA PRINCIPAL: PRANCHETAS SEPARADAS (FECHAMENTO DE ID VISUAL)      */}
        {/* ------------------------------------------------------------------- */}
        {activeTab === "artboards" && (
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar flex flex-col gap-5">
            {/* Cabeçalho & Dropzone Rápida de Multi-Pranchetas */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files?.[0];
                if (file) handleFileUpload(file);
              }}
              className="glass-panel bg-white/85 backdrop-blur-xl border border-white rounded-[2rem] p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xs"
            >
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-0.5 rounded-full text-[10px] font-roboto font-bold uppercase tracking-widest bg-[var(--color-atelier-terracota)]/12 text-[var(--color-atelier-terracota)] border border-[var(--color-atelier-terracota)]/25">
                    Fechamento Rápido de Identidade Visual
                  </span>
                  {activeSource && (
                    <span className="px-3 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-600/12 text-emerald-700 border border-emerald-600/20">
                      {activeSource.artboards.length} Prancheta(s) Identificada(s)
                    </span>
                  )}
                </div>
                <h1 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] tracking-tight">
                  Separação e Download Individual de Pranchetas
                </h1>
                <p className="text-xs font-roboto text-[var(--color-atelier-grafite)]/75 max-w-3xl leading-relaxed">
                  Envie um SVG com várias pranchetas: o Veronna Motion identifica e recorta cada prancheta automaticamente para você selecionar, renomear e baixar uma a uma em <strong>SVG</strong> ou <strong>PNG</strong> (ou todas de uma vez em <strong>.ZIP</strong>).
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[var(--color-atelier-creme)]/80 hover:bg-white border border-dashed border-[var(--color-atelier-terracota)]/60 text-xs font-bold text-[var(--color-atelier-grafite)] transition-all cursor-pointer shadow-2xs"
                >
                  <UploadCloud size={15} className="text-[var(--color-atelier-terracota)]" />
                  <span>Enviar SVG com Pranchetas</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleDownloadSelectedArtboardsBatch("zip-both")
                  }
                  disabled={isDownloadingArtboardZip || selectedArtboardIds.length === 0}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[var(--color-atelier-grafite)] hover:bg-[var(--color-atelier-terracota)] disabled:opacity-40 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                >
                  <Package size={15} />
                  <span>
                    {isDownloadingArtboardZip
                      ? "Gerando Pacote..."
                      : `Baixar Selecionadas (${selectedArtboardIds.length}) em .ZIP`}
                  </span>
                </button>
              </div>
            </div>

            {/* Barra de Controle das Pranchetas: Modo de Detecção, Fundo, Enquadramento, Escala PNG e Seleção */}
            {activeSource && (
              <div className="glass-panel bg-white/80 backdrop-blur-xl border border-white rounded-[1.75rem] p-4 flex flex-wrap items-center justify-between gap-4 shadow-2xs">
                <div className="flex flex-wrap items-center gap-3.5">
                  {/* Estratégia de Detecção */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-roboto font-bold uppercase tracking-widest text-[var(--color-atelier-madeira)]">
                      Modo de Separação das Pranchetas
                    </label>
                    <select
                      value={artboardStrategy}
                      onChange={(e) =>
                        handleChangeArtboardStrategy(
                          e.target.value as ArtboardDetectionStrategy
                        )
                      }
                      className="px-3 py-1.5 rounded-xl bg-[var(--color-atelier-creme)]/70 border border-[var(--color-atelier-grafite)]/15 focus:border-[var(--color-atelier-terracota)] focus:bg-white text-xs text-[var(--color-atelier-grafite)] font-semibold outline-none cursor-pointer transition-colors"
                    >
                      <option value="auto">
                        Automático Inteligente (Pranchetas / Placas / Ilhas)
                      </option>
                      <option value="background-rects">
                        Por Placas / Retângulos de Base (Grid de Pranchetas)
                      </option>
                      <option value="spatial-clusters">
                        Por Ilhas Espaciais 2D (Logos Lado a Lado)
                      </option>
                      <option value="top-groups">
                        Por Grupos Principais (&lt;g&gt; de Topo)
                      </option>
                      <option value="subgroups">
                        Por Subgrupos Internos (Dentro de Camada 1)
                      </option>
                    </select>
                  </div>

                  {/* Fundo das Pranchetas */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-roboto font-bold uppercase tracking-widest text-[var(--color-atelier-madeira)]">
                      Fundo no Download
                    </label>
                    <div className="flex items-center bg-[var(--color-atelier-creme)]/70 border border-[var(--color-atelier-grafite)]/15 rounded-xl p-0.5">
                      {[
                        {
                          id: "original",
                          label: "Fundo da Prancheta",
                          keep: true,
                        },
                        {
                          id: "transparent",
                          label: "Transparente (Sem Fundo)",
                          keep: false,
                        },
                        { id: "white", label: "Branco", keep: false },
                        { id: "black", label: "Preto", keep: false },
                      ].map((opt) => {
                        const active =
                          (opt.id === "original" &&
                            artboardKeepBg &&
                            artboardBgMode === "original") ||
                          (opt.id === "transparent" && !artboardKeepBg && artboardBgMode === "transparent") ||
                          (!artboardKeepBg && artboardBgMode === opt.id);
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              setArtboardKeepBg(opt.keep);
                              setArtboardBgMode(opt.id as any);
                            }}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                              active
                                ? "bg-[var(--color-atelier-terracota)] text-white shadow-2xs"
                                : "text-[var(--color-atelier-grafite)]/70 hover:text-[var(--color-atelier-grafite)]"
                            }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Enquadramento */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-roboto font-bold uppercase tracking-widest text-[var(--color-atelier-madeira)]">
                      Recorte / Enquadramento
                    </label>
                    <div className="flex items-center bg-[var(--color-atelier-creme)]/70 border border-[var(--color-atelier-grafite)]/15 rounded-xl p-0.5">
                      <button
                        type="button"
                        onClick={() => setArtboardFramingMode("artboard-bounds")}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer transition-all ${
                          artboardFramingMode === "artboard-bounds"
                            ? "bg-[var(--color-atelier-terracota)] text-white shadow-2xs"
                            : "text-[var(--color-atelier-grafite)]/70 hover:text-[var(--color-atelier-grafite)]"
                        }`}
                      >
                        Tamanho da Prancheta
                      </button>
                      <button
                        type="button"
                        onClick={() => setArtboardFramingMode("fit-to-content")}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer transition-all ${
                          artboardFramingMode === "fit-to-content"
                            ? "bg-[var(--color-atelier-terracota)] text-white shadow-2xs"
                            : "text-[var(--color-atelier-grafite)]/70 hover:text-[var(--color-atelier-grafite)]"
                        }`}
                      >
                        Justo na Logo
                      </button>
                    </div>
                  </div>

                  {/* Resolução PNG */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-roboto font-bold uppercase tracking-widest text-[var(--color-atelier-madeira)]">
                      Resolução PNG
                    </label>
                    <div className="flex items-center bg-[var(--color-atelier-creme)]/70 border border-[var(--color-atelier-grafite)]/15 rounded-xl p-0.5">
                      {[1080, 2048, 4096].map((sc) => (
                        <button
                          key={sc}
                          type="button"
                          onClick={() => setArtboardPngScale(sc)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold cursor-pointer transition-all ${
                            artboardPngScale === sc
                              ? "bg-[var(--color-atelier-terracota)] text-white shadow-2xs"
                              : "text-[var(--color-atelier-grafite)]/70 hover:text-[var(--color-atelier-grafite)]"
                          }`}
                        >
                          {sc}px
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Ações de Seleção e Download Rápido */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedArtboardIds(
                        activeSource.artboards.map((a) => a.id)
                      )
                    }
                    className="px-3 py-1.5 rounded-xl bg-white border border-[var(--color-atelier-grafite)]/15 hover:border-[var(--color-atelier-terracota)]/50 text-[11px] font-semibold text-[var(--color-atelier-grafite)] cursor-pointer transition-colors"
                  >
                    Selecionar Todas ({activeSource.artboards.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedArtboardIds([])}
                    className="px-3 py-1.5 rounded-xl bg-white border border-[var(--color-atelier-grafite)]/15 hover:border-[var(--color-atelier-terracota)]/50 text-[11px] font-semibold text-[var(--color-atelier-madeira)] hover:text-[var(--color-atelier-grafite)] cursor-pointer transition-colors"
                  >
                    Limpar Seleção
                  </button>

                  <div className="w-px h-5 bg-[var(--color-atelier-grafite)]/15 mx-0.5" />

                  <button
                    type="button"
                    onClick={() =>
                      handleDownloadSelectedArtboardsBatch("individual-svg")
                    }
                    disabled={selectedArtboardIds.length === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--color-atelier-terracota)]/12 hover:bg-[var(--color-atelier-terracota)] text-[var(--color-atelier-terracota)] hover:text-white border border-[var(--color-atelier-terracota)]/25 disabled:opacity-40 text-[11px] font-bold transition-all cursor-pointer"
                  >
                    <FileCode2 size={13} />
                    <span>Baixar SVGs ({selectedArtboardIds.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleDownloadSelectedArtboardsBatch("individual-png")
                    }
                    disabled={selectedArtboardIds.length === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--color-atelier-madeira)]/15 hover:bg-[var(--color-atelier-grafite)] text-[var(--color-atelier-grafite)] hover:text-white border border-[var(--color-atelier-madeira)]/30 disabled:opacity-40 text-[11px] font-bold transition-all cursor-pointer"
                  >
                    <ImageIcon size={13} />
                    <span>Baixar PNGs ({selectedArtboardIds.length})</span>
                  </button>
                </div>
              </div>
            )}

            {/* Grade de Pranchetas Listadas Individualmente */}
            {activeSource && activeSource.artboards.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {activeSource.artboards.map((art) => {
                  const isSelected = selectedArtboardIds.includes(art.id);
                  const artPaths = getArtboardGraphicNodes(activeSource, art);
                  const visiblePathsCount = artPaths.filter((p) =>
                    getOwnNodeVisibility(p, activeComposition?.visibilityOverrides)
                  ).length;
                  const isPathsExpanded = expandedArtboardIds.has(art.id);
                  const selectedInArtboard = artPaths.filter((p) =>
                    selectedNodeIds.includes(p.id)
                  );

                  const livePreview = serializeArtboardToSvg({
                    sourceDoc: activeSource,
                    artboard: art,
                    keepArtboardBackground:
                      artboardKeepBg && artboardBgMode === "original",
                    backgroundMode: artboardKeepBg ? artboardBgMode : "transparent",
                    framingMode: artboardFramingMode,
                    profile: "preserve-structure",
                    visibilityOverrides: activeComposition?.visibilityOverrides,
                    nameOverrides: activeComposition?.nameOverrides,
                  });

                  const originLabelMap: Record<ArtboardItem["origin"], string> = {
                    "inkscape-page": "Página SVG",
                    "named-artboard": "Prancheta Nomeada",
                    "background-rect": "Placa de Prancheta",
                    "spatial-cluster": "Ilha Visual",
                    "top-group": "Grupo Principal",
                    subgroup: "Subgrupo",
                    "full-canvas": "Canvas Completo",
                  };

                  return (
                    <div
                      key={art.id}
                      className={`rounded-[1.75rem] border p-5 flex flex-col justify-between gap-3.5 transition-all ${
                        isSelected
                          ? "bg-white border-[var(--color-atelier-terracota)] shadow-[0_14px_32px_-8px_rgba(20, 44, 72,0.18)]"
                          : "bg-white/70 border-[var(--color-atelier-grafite)]/15 opacity-80 hover:opacity-100"
                      }`}
                    >
                      {/* Topo do Card: Checkbox + Número da Prancheta + Dimensões */}
                      <div className="flex items-center justify-between gap-2">
                        <div
                          onClick={() =>
                            setSelectedArtboardIds((prev) =>
                              isSelected
                                ? prev.filter((id) => id !== art.id)
                                : [...prev, art.id]
                            )
                          }
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <div
                            className={`w-4 h-4 rounded-[5px] flex items-center justify-center border transition-colors ${
                              isSelected
                                ? "bg-[var(--color-atelier-terracota)] border-[var(--color-atelier-terracota)] text-white"
                                : "border-[var(--color-atelier-grafite)]/25 bg-[var(--color-atelier-creme)]"
                            }`}
                          >
                            {isSelected && <Check size={11} strokeWidth={3} />}
                          </div>
                          <span className="text-[10.5px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-[var(--color-atelier-terracota)]/12 text-[var(--color-atelier-terracota)]">
                            PRANCHETA #{String(art.index).padStart(2, "0")}
                          </span>
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--color-atelier-creme)] text-[var(--color-atelier-madeira)] border border-[var(--color-atelier-grafite)]/10">
                            {originLabelMap[art.origin]}
                          </span>
                        </div>

                        <span className="text-[10.5px] font-mono text-[var(--color-atelier-madeira)] font-semibold">
                          {Math.round(livePreview.viewBox.width)} ×{" "}
                          {Math.round(livePreview.viewBox.height)} px
                        </span>
                      </div>

                      {/* Preview Isolado da Prancheta (Reflete os caminhos visíveis/ocultos em tempo real) */}
                      <div
                        onClick={() =>
                          setSelectedArtboardIds((prev) =>
                            isSelected
                              ? prev.filter((id) => id !== art.id)
                              : [...prev, art.id]
                          )
                        }
                        style={{
                          backgroundColor: "#EFEAE1",
                          backgroundImage:
                            "linear-gradient(45deg, #B9D1E3 25%, transparent 25%), linear-gradient(-45deg, #B9D1E3 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #B9D1E3 75%), linear-gradient(-45deg, transparent 75%, #B9D1E3 75%)",
                          backgroundSize: "20px 20px",
                          backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
                        }}
                        className="h-48 rounded-2xl border border-[var(--color-atelier-grafite)]/12 flex items-center justify-center p-4 overflow-hidden cursor-pointer relative group shadow-inner"
                      >
                        {livePreview.includedNodeCount > 0 ? (
                          <div
                            className="w-full h-full flex items-center justify-center [&>svg]:max-w-full [&>svg]:max-h-full [&>svg]:w-auto [&>svg]:h-auto drop-shadow-xs"
                            dangerouslySetInnerHTML={{
                              __html: livePreview.svgString,
                            }}
                          />
                        ) : (
                          <div className="text-center text-[11px] text-[var(--color-atelier-madeira)] font-medium">
                            Todos os caminhos desta prancheta estão ocultos
                          </div>
                        )}
                        <div className="absolute bottom-2.5 right-2.5 text-[9.5px] font-mono px-2.5 py-0.5 rounded-full bg-white/95 text-[var(--color-atelier-grafite)] border border-[var(--color-atelier-grafite)]/15 shadow-2xs font-semibold">
                          {visiblePathsCount}/{artPaths.length} caminhos visíveis
                        </div>
                      </div>

                      {/* Nome Editável da Prancheta (Define o nome do arquivo no download) */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-roboto font-bold uppercase tracking-widest text-[var(--color-atelier-madeira)] block">
                          Nome da Prancheta / Arquivo
                        </label>
                        <input
                          type="text"
                          value={artboardCustomNames[art.id] ?? art.name}
                          onChange={(e) =>
                            setArtboardCustomNames((prev) => ({
                              ...prev,
                              [art.id]: e.target.value,
                            }))
                          }
                          className="w-full px-3 py-1.5 rounded-xl bg-[var(--color-atelier-creme)]/60 border border-[var(--color-atelier-grafite)]/15 focus:border-[var(--color-atelier-terracota)] focus:bg-white text-xs text-[var(--color-atelier-grafite)] font-semibold outline-none transition-colors"
                        />
                      </div>

                      {/* Lista Expansível de Caminhos Específicos desta Prancheta */}
                      <div className="rounded-2xl border border-[var(--color-atelier-grafite)]/12 bg-[var(--color-atelier-creme)]/35 overflow-hidden">
                        <div className="px-3 py-2 flex items-center justify-between gap-2 bg-[var(--color-atelier-creme)]/60">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedArtboardIds((prev) => {
                                const next = new Set(prev);
                                if (next.has(art.id)) next.delete(art.id);
                                else next.add(art.id);
                                return next;
                              })
                            }
                            className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--color-atelier-grafite)] hover:text-[var(--color-atelier-terracota)] cursor-pointer"
                          >
                            {isPathsExpanded ? (
                              <ChevronDown size={13} className="text-[var(--color-atelier-terracota)]" />
                            ) : (
                              <ChevronRight size={13} className="text-[var(--color-atelier-madeira)]" />
                            )}
                            <span>Caminhos da Prancheta</span>
                            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-full bg-white text-[var(--color-atelier-terracota)] border border-[var(--color-atelier-grafite)]/10">
                              {visiblePathsCount}/{artPaths.length}
                            </span>
                          </button>

                          <div className="flex items-center gap-1.5 text-[10px] font-semibold">
                            <button
                              type="button"
                              onClick={() => handleSetAllArtboardPathsVisibility(art, true)}
                              className="text-[var(--color-atelier-madeira)] hover:text-[var(--color-atelier-grafite)] cursor-pointer"
                              title="Mostrar todos os caminhos desta prancheta"
                            >
                              Todos
                            </button>
                            <span className="text-[var(--color-atelier-grafite)]/25">•</span>
                            <button
                              type="button"
                              onClick={() => handleSetAllArtboardPathsVisibility(art, false)}
                              className="text-[var(--color-atelier-madeira)] hover:text-[var(--color-atelier-grafite)] cursor-pointer"
                              title="Ocultar todos os caminhos desta prancheta"
                            >
                              Nenhum
                            </button>
                            {selectedInArtboard.length > 0 && (
                              <>
                                <span className="text-[var(--color-atelier-grafite)]/25">•</span>
                                <button
                                  type="button"
                                  onClick={() => handleKeepOnlySelectedPathsInArtboard(art)}
                                  className="text-[var(--color-atelier-terracota)] hover:underline cursor-pointer"
                                  title="Manter visíveis apenas os caminhos selecionados"
                                >
                                  Isolar ({selectedInArtboard.length})
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {isPathsExpanded && (
                          <div className="max-h-48 overflow-y-auto p-2 space-y-1 custom-scrollbar border-t border-[var(--color-atelier-grafite)]/10 bg-white/80">
                            {artPaths.map((pathNode, pIdx) => {
                              const isVisible = getOwnNodeVisibility(
                                pathNode,
                                activeComposition?.visibilityOverrides
                              );
                              const swatchColor = resolveNodeEffectiveColor(pathNode, nodesMap);
                              const pathLabel =
                                activeComposition?.nameOverrides?.[pathNode.id] ??
                                pathNode.displayName;

                              return (
                                <div
                                  key={pathNode.id}
                                  className={`group/path flex items-center justify-between gap-2 px-2 py-1.5 rounded-xl border text-[11px] transition-all ${
                                    isVisible
                                      ? "bg-white border-[var(--color-atelier-grafite)]/10 text-[var(--color-atelier-grafite)]"
                                      : "bg-[var(--color-atelier-creme)]/40 border-transparent text-[var(--color-atelier-madeira)]/60 opacity-65"
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <button
                                      type="button"
                                      onClick={() => toggleNodeVisibility(pathNode.id)}
                                      className={`w-4 h-4 rounded-[4px] flex items-center justify-center border shrink-0 cursor-pointer transition-colors ${
                                        isVisible
                                          ? "bg-[var(--color-atelier-terracota)] border-[var(--color-atelier-terracota)] text-white"
                                          : "bg-white border-[var(--color-atelier-grafite)]/25 text-transparent"
                                      }`}
                                      title={
                                        isVisible
                                          ? "Ocultar este caminho da exportação"
                                          : "Incluir este caminho na exportação"
                                      }
                                    >
                                      <Check size={10} strokeWidth={3} />
                                    </button>

                                    <span
                                      className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/15"
                                      style={{
                                        backgroundColor: swatchColor || "#142C48",
                                      }}
                                      title={`Cor: ${swatchColor || "padrão"}`}
                                    />

                                    <span className="font-mono text-[9.5px] text-[var(--color-atelier-madeira)] shrink-0">
                                      #{String(pIdx + 1).padStart(2, "0")}
                                    </span>

                                    <span
                                      onClick={() => toggleNodeVisibility(pathNode.id)}
                                      className="truncate font-medium cursor-pointer"
                                      title={`${pathLabel} (<${pathNode.tagName}>)`}
                                    >
                                      {pathLabel}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => handleSoloArtboardPath(art, pathNode.id)}
                                      className="px-1.5 py-0.5 rounded bg-[var(--color-atelier-creme)] hover:bg-[var(--color-atelier-terracota)]/15 text-[var(--color-atelier-madeira)] hover:text-[var(--color-atelier-terracota)] text-[9.5px] font-bold cursor-pointer transition-colors"
                                      title="Mostrar apenas este caminho na prancheta"
                                    >
                                      Só este
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleDownloadSingleArtboardSvg(
                                          art,
                                          [pathNode.id],
                                          pathLabel
                                        )
                                      }
                                      className="px-1.5 py-0.5 rounded bg-[var(--color-atelier-terracota)]/12 hover:bg-[var(--color-atelier-terracota)] text-[var(--color-atelier-terracota)] hover:text-white text-[9.5px] font-mono font-bold cursor-pointer transition-colors"
                                      title="Baixar somente este caminho em SVG"
                                    >
                                      SVG
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleDownloadSingleArtboardPng(
                                          art,
                                          [pathNode.id],
                                          pathLabel
                                        )
                                      }
                                      className="px-1.5 py-0.5 rounded bg-[var(--color-atelier-grafite)]/10 hover:bg-[var(--color-atelier-grafite)] text-[var(--color-atelier-grafite)] hover:text-white text-[9.5px] font-mono font-bold cursor-pointer transition-colors"
                                      title="Baixar somente este caminho em PNG"
                                    >
                                      PNG
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Botões de Download Individual Imediato (Exporta os caminhos visíveis) */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          type="button"
                          disabled={visiblePathsCount === 0}
                          onClick={() => handleDownloadSingleArtboardSvg(art)}
                          className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[var(--color-atelier-terracota)] hover:bg-[#234E80] disabled:opacity-40 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                        >
                          <Download size={13} />
                          <span>
                            {visiblePathsCount < artPaths.length
                              ? `SVG (${visiblePathsCount}/${artPaths.length})`
                              : "Baixar SVG"}
                          </span>
                        </button>

                        <button
                          type="button"
                          disabled={
                            downloadingArtboardId === art.id || visiblePathsCount === 0
                          }
                          onClick={() => handleDownloadSingleArtboardPng(art)}
                          className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[var(--color-atelier-grafite)] hover:bg-[var(--color-atelier-madeira)] disabled:opacity-40 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                        >
                          <ImageIcon size={13} />
                          <span>
                            {downloadingArtboardId === art.id
                              ? "Gerando..."
                              : visiblePathsCount < artPaths.length
                              ? `PNG (${visiblePathsCount}/${artPaths.length})`
                              : `Baixar PNG (${artboardPngScale}px)`}
                          </span>
                        </button>
                      </div>

                      {/* Ações Rápidas: Animar esta Prancheta em 5s ou Editar Camadas */}
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--color-atelier-grafite)]/10">
                        <button
                          type="button"
                          onClick={() =>
                            handleOpenArtboardInStudioOrMotion(art, "motion")
                          }
                          className="flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl bg-[var(--color-atelier-creme)]/70 hover:bg-[var(--color-atelier-terracota)]/12 border border-[var(--color-atelier-grafite)]/12 text-[11px] font-semibold text-[var(--color-atelier-grafite)] cursor-pointer transition-colors"
                        >
                          <Film size={12} className="text-[var(--color-atelier-terracota)]" />
                          <span>Animar 5.00s</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleOpenArtboardInStudioOrMotion(art, "studio")
                          }
                          className="flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl bg-[var(--color-atelier-creme)]/70 hover:bg-[var(--color-atelier-terracota)]/12 border border-[var(--color-atelier-grafite)]/12 text-[11px] font-semibold text-[var(--color-atelier-madeira)] hover:text-[var(--color-atelier-grafite)] cursor-pointer transition-colors"
                        >
                          <Layers size={12} />
                          <span>Focar no Studio</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="glass-panel bg-white/80 border border-white rounded-[2rem] p-12 text-center space-y-3 shadow-xs">
                <UploadCloud size={32} className="mx-auto text-[var(--color-atelier-terracota)]" />
                <h3 className="font-elegant text-xl text-[var(--color-atelier-grafite)]">
                  Nenhuma prancheta carregada no momento
                </h3>
                <p className="text-xs text-[var(--color-atelier-madeira)] max-w-md mx-auto">
                  Clique em &quot;Enviar SVG com Pranchetas&quot; para separar automaticamente todas as pranchetas do seu arquivo.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* TELA 7.1: PROJETOS                                                  */}
        {/* ------------------------------------------------------------------- */}
        {activeTab === "projects" && (
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar flex flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--color-atelier-grafite)]/12 pb-4">
              <div>
                <h1 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] tracking-tight">
                  Projetos & Identidades Visuais
                </h1>
                <p className="text-xs text-[var(--color-atelier-madeira)] mt-0.5">
                  Gerencie fontes SVG imutáveis, pacotes de variantes nomeadas e animações de 5,000 segundos.
                </p>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-atelier-madeira)]"
                  />
                  <input
                    type="text"
                    value={projectSearch}
                    onChange={(e) => setProjectSearch(e.target.value)}
                    placeholder="Buscar projeto, fonte ou variante..."
                    className="pl-8 pr-3 py-1.5 rounded-xl bg-white/85 border border-[var(--color-atelier-grafite)]/15 text-xs text-[var(--color-atelier-grafite)] placeholder:text-[var(--color-atelier-madeira)]/60 outline-none focus:border-[var(--color-atelier-terracota)] transition-colors"
                  />
                </div>

                <select
                  value={projectFilterStatus}
                  onChange={(e) => setProjectFilterStatus(e.target.value as any)}
                  className="px-3 py-1.5 rounded-xl bg-white/85 border border-[var(--color-atelier-grafite)]/15 text-xs text-[var(--color-atelier-grafite)] font-semibold outline-none focus:border-[var(--color-atelier-terracota)]"
                >
                  <option value="active">Ativos</option>
                  <option value="archived">Arquivados</option>
                  <option value="all">Todos</option>
                </select>

                <div className="flex items-center bg-white/85 border border-[var(--color-atelier-grafite)]/15 rounded-xl p-0.5">
                  <button
                    type="button"
                    onClick={() => setProjectsViewMode("grid")}
                    className={`p-1.5 rounded-lg transition-colors ${
                      projectsViewMode === "grid"
                        ? "bg-[var(--color-atelier-terracota)] text-white"
                        : "text-[var(--color-atelier-madeira)] hover:text-[var(--color-atelier-grafite)]"
                    }`}
                  >
                    <LayoutGrid size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setProjectsViewMode("list")}
                    className={`p-1.5 rounded-lg transition-colors ${
                      projectsViewMode === "list"
                        ? "bg-[var(--color-atelier-terracota)] text-white"
                        : "text-[var(--color-atelier-madeira)] hover:text-[var(--color-atelier-grafite)]"
                    }`}
                  >
                    <ListIcon size={13} />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setIsNewProjectModalOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--color-atelier-grafite)] hover:bg-[var(--color-atelier-terracota)] text-white text-xs font-bold cursor-pointer transition-colors shadow-xs"
                >
                  <FolderPlus size={14} />
                  <span>Novo Projeto</span>
                </button>
              </div>
            </div>

            {/* Grade ou Lista de Cartões de Projeto */}
            <div
              className={
                projectsViewMode === "grid"
                  ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
                  : "flex flex-col gap-3"
              }
            >
              {projects
                .filter((p) =>
                  projectFilterStatus === "all" ? true : p.status === projectFilterStatus
                )
                .filter((p) => {
                  if (!projectSearch.trim()) return true;
                  const q = projectSearch.toLowerCase();
                  return (
                    p.name.toLowerCase().includes(q) ||
                    (p.clientName && p.clientName.toLowerCase().includes(q)) ||
                    p.sources.some((s) => s.originalFilename.toLowerCase().includes(q)) ||
                    p.compositions.some((c) => c.name.toLowerCase().includes(q))
                  );
                })
                .map((proj) => {
                  const isCurrent = proj.id === activeProject?.id;
                  const mainSrc = proj.sources[0];
                  return (
                    <div
                      key={proj.id}
                      onClick={() => {
                        setActiveProjectId(proj.id);
                        setSelectedExportVariantIds(proj.compositions.map((c) => c.id));
                        if (mainSrc) {
                          setExpandedGroupIds(
                            new Set(
                              mainSrc.nodes
                                .filter((n) => n.type === "group")
                                .map((n) => n.id)
                            )
                          );
                        }
                        setActiveTab("studio");
                      }}
                      className={`group rounded-[1.75rem] border p-5 transition-all cursor-pointer flex flex-col justify-between ${
                        isCurrent
                          ? "bg-white border-[var(--color-atelier-terracota)] shadow-[0_14px_32px_-8px_rgba(20, 44, 72,0.18)]"
                          : "bg-white/75 border-[var(--color-atelier-grafite)]/12 hover:border-[var(--color-atelier-terracota)]/50 hover:bg-white"
                      }`}
                    >
                      <div>
                        {/* Thumbnail da Logo */}
                        <div className="h-36 rounded-2xl bg-[var(--color-atelier-creme)]/70 border border-[var(--color-atelier-grafite)]/10 flex items-center justify-center p-4 mb-3.5 overflow-hidden relative">
                          {mainSrc && mainSrc.normalizedSvgString ? (
                            <div
                              className="w-full h-full flex items-center justify-center [&>svg]:max-w-full [&>svg]:max-h-full [&>svg]:w-auto [&>svg]:h-auto"
                              dangerouslySetInnerHTML={{
                                __html: mainSrc.normalizedSvgString,
                              }}
                            />
                          ) : (
                            <Layers size={28} className="text-[var(--color-atelier-madeira)]/40" />
                          )}
                          <span className="absolute top-2.5 right-2.5 text-[9.5px] font-mono px-2.5 py-0.5 rounded-full bg-white/90 text-[var(--color-atelier-grafite)] border border-[var(--color-atelier-grafite)]/15 font-bold">
                            {proj.status === "archived" ? "Arquivado" : "Ativo"}
                          </span>
                        </div>

                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-elegant text-lg text-[var(--color-atelier-grafite)] group-hover:text-[var(--color-atelier-terracota)] transition-colors">
                              {proj.name}
                            </h3>
                            <p className="text-[11px] text-[var(--color-atelier-madeira)]">
                              {proj.clientName || "Studio Veronna"}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-[var(--color-atelier-grafite)]/10 flex items-center justify-between text-[11px] text-[var(--color-atelier-madeira)]">
                        <div className="flex items-center gap-3 font-mono font-medium">
                          <span>{proj.sources.length} SVG</span>
                          <span>•</span>
                          <span>{proj.compositions.length} Variantes</span>
                          <span>•</span>
                          <span>{proj.motions.length} Motions</span>
                        </div>

                        <div
                          className="flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            title="Duplicar Projeto"
                            onClick={() => {
                              const dup: MotionStudioProject = {
                                ...JSON.parse(JSON.stringify(proj)),
                                id: `proj_${Date.now().toString(36)}`,
                                name: `${proj.name} (Cópia)`,
                                createdAt: new Date().toISOString(),
                                updatedAt: new Date().toISOString(),
                              };
                              persistProjectsWithAutosave([dup, ...projects]);
                              recordAudit(dup.id, "PROJECT_DUPLICATED", `Projeto duplicado a partir de ${proj.name}`);
                              notifyToast(`Projeto "${proj.name}" duplicado.`);
                            }}
                            className="p-1.5 rounded-lg hover:bg-[var(--color-atelier-creme)] text-[var(--color-atelier-madeira)] hover:text-[var(--color-atelier-grafite)] transition-colors"
                          >
                            <Copy size={13} />
                          </button>
                          <button
                            type="button"
                            title={
                              proj.status === "archived"
                                ? "Restaurar Projeto"
                                : "Arquivar Projeto"
                            }
                            onClick={() => {
                              const nextStatus: MotionStudioProject["status"] =
                                proj.status === "archived" ? "active" : "archived";
                              if (
                                nextStatus === "archived" &&
                                !window.confirm(
                                  `Arquivar o projeto "${proj.name}"? Ele poderá ser restaurado a qualquer momento.`
                                )
                              ) {
                                return;
                              }
                              const updated = projects.map((p) =>
                                p.id === proj.id ? { ...p, status: nextStatus } : p
                              );
                              persistProjectsWithAutosave(updated);
                              recordAudit(
                                proj.id,
                                nextStatus === "archived"
                                  ? "PROJECT_ARCHIVED"
                                  : "PROJECT_RESTORED",
                                `Projeto ${proj.name} ${
                                  nextStatus === "archived" ? "arquivado" : "restaurado"
                                }`
                              );
                            }}
                            className="p-1.5 rounded-lg hover:bg-[var(--color-atelier-creme)] text-[var(--color-atelier-madeira)] hover:text-[var(--color-atelier-terracota)] transition-colors"
                          >
                            <Archive size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Biblioteca Rápida de Identidades Vitrine da Agência */}
            <div className="glass-panel bg-white/85 border border-white rounded-[2rem] p-6 shadow-xs">
              <h2 className="text-[10px] font-roboto font-bold uppercase tracking-widest text-[var(--color-atelier-madeira)] mb-3.5 flex items-center gap-2">
                <Film size={14} className="text-[var(--color-atelier-terracota)]" />
                Identidades Vitrine do Studio Veronna (Carregar em 1 Clique)
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {MOTION_STUDIO_FIXTURES.filter(
                  (f) => f.category === "agency-showcase"
                ).map((fix) => (
                  <div
                    key={fix.id}
                    className="p-4 rounded-2xl bg-[var(--color-atelier-creme)]/60 border border-[var(--color-atelier-grafite)]/12 flex flex-col justify-between gap-3"
                  >
                    <div>
                      <span className="text-[10px] font-mono text-[var(--color-atelier-terracota)] font-bold">
                        {fix.code}
                      </span>
                      <h4 className="font-elegant text-base text-[var(--color-atelier-grafite)] mt-0.5">{fix.name}</h4>
                      <p className="text-[11px] text-[var(--color-atelier-madeira)] mt-1">{fix.description}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        handleImportSvgContent(
                          fix.filename,
                          fix.svgContent,
                          fix.name,
                          fix.clientName
                        );
                        setActiveTab("studio");
                      }}
                      className="w-full py-2 rounded-xl bg-[var(--color-atelier-terracota)]/12 hover:bg-[var(--color-atelier-terracota)] text-[var(--color-atelier-terracota)] hover:text-white border border-[var(--color-atelier-terracota)]/25 text-[11px] font-bold transition-colors cursor-pointer"
                    >
                      Criar Projeto com esta Marca
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* TELA 7.2: IMPORTAR SVG E DIAGNÓSTICO DE COMPATIBILIDADE             */}
        {/* ------------------------------------------------------------------- */}
        {activeTab === "import" && (
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar flex flex-col gap-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Dropzone de Importação Segura */}
              <div className="lg:col-span-5 flex flex-col gap-4">
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[var(--color-atelier-terracota)]/40 hover:border-[var(--color-atelier-terracota)] bg-white/80 hover:bg-white rounded-[2rem] p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all min-h-[240px] shadow-xs"
                >
                  <div className="w-14 h-14 rounded-2xl bg-[var(--color-atelier-terracota)]/12 text-[var(--color-atelier-terracota)] border border-[var(--color-atelier-terracota)]/25 flex items-center justify-center mb-4">
                    <UploadCloud size={28} />
                  </div>
                  <h3 className="font-elegant text-lg text-[var(--color-atelier-grafite)]">
                    Arraste e solte o arquivo SVG aqui ou clique para selecionar
                  </h3>
                  <p className="text-xs text-[var(--color-atelier-madeira)] mt-1.5 max-w-sm">
                    SVG vetorial — máximo inicial configurável de <strong>25 MB</strong> por arquivo.
                  </p>
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-[10px] text-[var(--color-atelier-madeira)] font-mono">
                    <span className="px-2.5 py-0.5 rounded-full bg-[var(--color-atelier-creme)] border border-[var(--color-atelier-grafite)]/12">
                      Sanitizador XSS Ativo
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-[var(--color-atelier-creme)] border border-[var(--color-atelier-grafite)]/12">
                      Fonte Original Imutável
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-[var(--color-atelier-creme)] border border-[var(--color-atelier-grafite)]/12">
                      SHA-256 Verificado
                    </span>
                  </div>
                </div>

                {/* Suite de Regressão e Fixtures QA (Seção 16.1) */}
                <div className="glass-panel bg-white/85 border border-white rounded-[2rem] p-5 flex flex-col gap-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-[11px] font-roboto font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)] flex items-center gap-1.5">
                        <ShieldCheck size={14} className="text-emerald-600" />
                        Fixtures Obrigatórias de Teste (Seção 16.1)
                      </h4>
                      <p className="text-[11px] text-[var(--color-atelier-madeira)]">
                        Teste casos reais de grupos, gradientes, máscaras, scripts bloqueados e XML malformado.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={runAllQaFixtures}
                      disabled={isRunningQaSuite}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600/12 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-600/25 text-[11px] font-bold transition-colors cursor-pointer shrink-0"
                    >
                      {isRunningQaSuite ? "Executando..." : "Rodar Regressão QA"}
                    </button>
                  </div>

                  <div className="max-h-[280px] overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                    {MOTION_STUDIO_FIXTURES.map((fix) => {
                      const qaMatch = qaResults.find((r) => r.fixture.id === fix.id);
                      return (
                        <div
                          key={fix.id}
                          className="p-3 rounded-xl bg-[var(--color-atelier-creme)]/55 border border-[var(--color-atelier-grafite)]/12 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[9.5px] font-mono px-1.5 py-0.2 rounded bg-white text-[var(--color-atelier-madeira)] border border-[var(--color-atelier-grafite)]/10">
                                {fix.code}
                              </span>
                              <span className="text-xs font-semibold text-[var(--color-atelier-grafite)] truncate">
                                {fix.name}
                              </span>
                              {qaMatch && (
                                <span
                                  className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold ${
                                    qaMatch.passed
                                      ? "bg-emerald-600/15 text-emerald-700"
                                      : "bg-rose-600/15 text-rose-700"
                                  }`}
                                >
                                  {qaMatch.passed ? "PASS" : "FAIL"}
                                </span>
                              )}
                            </div>
                            <p className="text-[10.5px] text-[var(--color-atelier-madeira)] truncate mt-0.5">
                              {fix.description}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              handleImportSvgContent(fix.filename, fix.svgContent)
                            }
                            className="px-3 py-1 rounded-lg bg-white hover:bg-[var(--color-atelier-terracota)] text-[10.5px] font-semibold text-[var(--color-atelier-grafite)] hover:text-white border border-[var(--color-atelier-grafite)]/15 shrink-0 cursor-pointer transition-colors"
                          >
                            Testar
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Relatório de Diagnóstico da Fonte Atual */}
              <div className="lg:col-span-7 glass-panel bg-white/85 border border-white rounded-[2rem] p-6 flex flex-col gap-5 shadow-xs">
                {activeSource ? (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-atelier-grafite)]/12 pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              activeSource.importStatus === "complete"
                                ? "bg-emerald-600/15 text-emerald-700"
                                : activeSource.importStatus === "partial"
                                ? "bg-amber-500/15 text-amber-700"
                                : "bg-rose-600/15 text-rose-700"
                            }`}
                          >
                            Status: {activeSource.importStatus.toUpperCase()}
                          </span>
                          <span className="text-xs font-mono text-[var(--color-atelier-madeira)]">
                            {(activeSource.fileSize / 1024).toFixed(2)} KB •{" "}
                            {activeSource.compatibilityReport.executionTimeMs} ms
                          </span>
                        </div>
                        <h2 className="font-elegant text-xl text-[var(--color-atelier-grafite)] mt-1">
                          {activeSource.originalFilename}
                        </h2>
                        <p className="text-[10.5px] font-mono text-[var(--color-atelier-madeira)] mt-0.5">
                          SHA-256: {activeSource.checksumSha256.slice(0, 32)}...
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-3 py-1.5 rounded-xl bg-white border border-[var(--color-atelier-grafite)]/15 hover:border-[var(--color-atelier-terracota)]/50 text-xs font-semibold text-[var(--color-atelier-madeira)] hover:text-[var(--color-atelier-grafite)] cursor-pointer transition-colors"
                        >
                          Substituir Arquivo
                        </button>
                        {activeSource.importStatus !== "failed" && (
                          <>
                            <button
                              type="button"
                              onClick={() => setActiveTab("artboards")}
                              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[var(--color-atelier-terracota)]/12 border border-[var(--color-atelier-terracota)]/30 hover:bg-[var(--color-atelier-terracota)] text-[var(--color-atelier-terracota)] hover:text-white text-xs font-bold cursor-pointer transition-colors"
                            >
                              <LayoutGrid size={13} />
                              <span>
                                Separar Pranchetas ({activeSource.artboards?.length ?? 0})
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveTab("studio")}
                              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[var(--color-atelier-grafite)] hover:bg-[var(--color-atelier-terracota)] text-white text-xs font-bold cursor-pointer transition-colors"
                            >
                              <span>Abrir no Editor</span>
                              <ArrowRight size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Métricas Estruturais Extraídas */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        {
                          label: "Grupos (<g>)",
                          val: activeSource.compatibilityReport.summary.groupCount,
                        },
                        {
                          label: "Objetos Gráficos",
                          val: activeSource.compatibilityReport.summary.graphicObjectCount,
                        },
                        {
                          label: "Recursos <defs>",
                          val: activeSource.compatibilityReport.summary.defsCount,
                        },
                        {
                          label: "Dependências Internas",
                          val: activeSource.compatibilityReport.summary
                            .internalDependenciesCount,
                        },
                        {
                          label: "Paths c/ Traçado",
                          val: activeSource.compatibilityReport.summary
                            .strokeCompatiblePathsCount,
                        },
                        {
                          label: "Elementos Soltos Raiz",
                          val: activeSource.compatibilityReport.summary.looseElementsCount,
                        },
                        {
                          label: "Scripts Removidos",
                          val: activeSource.compatibilityReport.summary.scriptsRemoved,
                        },
                        {
                          label: "Refs Externas Bloq.",
                          val: activeSource.compatibilityReport.summary
                            .externalReferencesBlocked,
                        },
                      ].map((m, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-2xl bg-[var(--color-atelier-creme)]/60 border border-[var(--color-atelier-grafite)]/12"
                        >
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-atelier-madeira)] block">
                            {m.label}
                          </span>
                          <span className="text-lg font-bold font-mono text-[var(--color-atelier-grafite)]">
                            {m.val}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Preview Seguro lado a lado com Lista de Avisos */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-[220px]">
                      <div className="rounded-2xl bg-[var(--color-atelier-creme)]/60 border border-[var(--color-atelier-grafite)]/12 p-4 flex flex-col">
                        <span className="text-[10px] font-mono uppercase text-[var(--color-atelier-madeira)] mb-2">
                          Preview Renderizado pela Pipeline Segura ({activeSource.sourceMetadata.rawViewBoxString})
                        </span>
                        <div className="flex-1 flex items-center justify-center overflow-hidden p-2">
                          {activeSource.normalizedSvgString ? (
                            <div
                              className="w-full h-44 flex items-center justify-center [&>svg]:max-w-full [&>svg]:max-h-full [&>svg]:w-auto [&>svg]:h-auto"
                              dangerouslySetInnerHTML={{
                                __html: activeSource.normalizedSvgString,
                              }}
                            />
                          ) : (
                            <div className="text-center text-xs text-rose-600">
                              Documento inválido — preview bloqueado.
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="rounded-2xl bg-[var(--color-atelier-creme)]/60 border border-[var(--color-atelier-grafite)]/12 p-4 flex flex-col">
                        <span className="text-[10px] font-mono uppercase text-[var(--color-atelier-madeira)] mb-2">
                          Relatório de Avisos & Ações Recomendadas (
                          {activeSource.compatibilityReport.issues.length})
                        </span>
                        <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar max-h-48">
                          {activeSource.compatibilityReport.issues.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center text-xs text-emerald-700 gap-1.5">
                              <CheckCircle2 size={22} />
                              <span>
                                100% compatível! Nenhum script, referência externa ou anomalia detectada.
                              </span>
                            </div>
                          ) : (
                            activeSource.compatibilityReport.issues.map((iss) => (
                              <div
                                key={iss.id}
                                className={`p-2.5 rounded-xl border text-[11px] ${
                                  iss.severity === "error"
                                    ? "bg-rose-500/10 border-rose-500/30 text-rose-700"
                                    : iss.severity === "warning"
                                    ? "bg-amber-500/10 border-amber-500/30 text-amber-800"
                                    : "bg-[var(--color-atelier-terracota)]/10 border-[var(--color-atelier-terracota)]/30 text-[var(--color-atelier-terracota)]"
                                }`}
                              >
                                <div className="flex items-center justify-between font-mono text-[9.5px] font-bold">
                                  <span>{iss.code}</span>
                                  <span>{iss.feature}</span>
                                </div>
                                <p className="text-[var(--color-atelier-grafite)] mt-1">{iss.description}</p>
                                <p className="text-[10px] text-[var(--color-atelier-madeira)] mt-1">
                                  <strong>Ação sugerida:</strong> {iss.suggestedAction}
                                </p>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-sm text-[var(--color-atelier-madeira)]">
                    Selecione ou importe um arquivo SVG para visualizar o diagnóstico.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* TELA PRINCIPAL (ESTILO FIGMA): DESIGN, CAMADAS, PRANCHETAS & EXPORT */}
        {/* ------------------------------------------------------------------- */}
        {activeTab === "studio" && (
          <div className="flex-1 flex min-h-0 overflow-hidden">
            {!activeSource ? (
              /* ESTADO VAZIO: COMEÇAR DO ZERO (SEM PROJETO FAKE) */
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleFileUpload(file);
                }}
                className="flex-1 flex flex-col items-center justify-center p-6 overflow-y-auto"
              >
                <div className="w-full max-w-lg glass-panel bg-white/85 backdrop-blur-xl border border-white rounded-[2rem] p-8 text-center space-y-5 shadow-sm">
                  <div className="w-12 h-12 rounded-2xl bg-[var(--color-atelier-terracota)]/12 border border-[var(--color-atelier-terracota)]/25 text-[var(--color-atelier-terracota)] flex items-center justify-center mx-auto">
                    <UploadCloud size={24} />
                  </div>

                  <div className="space-y-1.5">
                    <h2 className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">
                      Começar do Zero
                    </h2>
                    <p className="text-xs text-[var(--color-atelier-madeira)] max-w-sm mx-auto leading-relaxed">
                      Arraste e solte um arquivo <strong>.SVG</strong> aqui ou selecione do seu computador para inspecionar camadas, listar pranchetas e animar em 5.00s.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--color-atelier-grafite)] hover:bg-[var(--color-atelier-terracota)] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                    >
                      <UploadCloud size={14} />
                      <span>Importar Arquivo SVG</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsNewProjectModalOpen(true)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--color-atelier-creme)]/80 hover:bg-white border border-[var(--color-atelier-grafite)]/15 text-xs font-semibold text-[var(--color-atelier-grafite)] transition-colors cursor-pointer"
                    >
                      <FolderPlus size={14} className="text-[var(--color-atelier-terracota)]" />
                      <span>Novo Projeto</span>
                    </button>
                  </div>

                  {projects.length > 0 && (
                    <div className="pt-4 border-t border-[var(--color-atelier-grafite)]/10 text-left space-y-2">
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-madeira)]">
                        <span>Seus Projetos Recentes ({projects.length})</span>
                        <button
                          type="button"
                          onClick={() => setActiveTab("projects")}
                          className="text-[var(--color-atelier-terracota)] hover:underline cursor-pointer"
                        >
                          Gerenciar
                        </button>
                      </div>
                      <div className="max-h-36 overflow-y-auto space-y-1 custom-scrollbar">
                        {projects.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setActiveProjectId(p.id);
                              setSelectedExportVariantIds(p.compositions.map((c) => c.id));
                              const src = p.sources[0];
                              if (src) {
                                setSelectedArtboardIds(src.artboards.map((a) => a.id));
                              }
                            }}
                            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-[var(--color-atelier-creme)]/55 hover:bg-[var(--color-atelier-creme)] border border-[var(--color-atelier-grafite)]/10 text-xs text-[var(--color-atelier-grafite)] cursor-pointer transition-colors"
                          >
                            <span className="font-semibold truncate">{p.name}</span>
                            <span className="text-[10px] font-mono text-[var(--color-atelier-madeira)]">
                              {p.sources[0]?.originalFilename || "Vazio"}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                {/* PAINEL ESQUERDO ESTILO FIGMA (COLAPSÁVEL): CAMADAS | PRANCHETAS | VARIANTES */}
                {isLeftPanelOpen && (
                  <aside className="w-72 shrink-0 bg-white/90 backdrop-blur-xl border-r border-[var(--color-atelier-grafite)]/10 flex flex-col min-h-0">
                    {/* Sub-abas Compactas do Painel Esquerdo */}
                    <div className="p-2 border-b border-[var(--color-atelier-grafite)]/10 grid grid-cols-3 gap-1 bg-[var(--color-atelier-creme)]/40">
                      {[
                        {
                          id: "layers",
                          label: "Camadas",
                          count: activeSource.nodes.length,
                        },
                        {
                          id: "artboards",
                          label: "Pranchetas",
                          count: activeSource.artboards.length,
                        },
                        {
                          id: "variants",
                          label: "Variantes",
                          count: activeProject?.compositions.length || 0,
                        },
                      ].map((tab) => {
                        const active = leftSidebarTab === tab.id;
                        return (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setLeftSidebarTab(tab.id as any)}
                            className={`py-1.5 px-1.5 rounded-lg text-[10.5px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                              active
                                ? "bg-white text-[var(--color-atelier-grafite)] shadow-2xs border border-[var(--color-atelier-grafite)]/10"
                                : "text-[var(--color-atelier-madeira)] hover:text-[var(--color-atelier-grafite)]"
                            }`}
                          >
                            <span className="truncate">{tab.label}</span>
                            <span className="text-[9px] font-mono opacity-75">
                              {tab.count}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* ABA ESQUERDA 1: ÁRVORE DE CAMADAS */}
                    {leftSidebarTab === "layers" && (
                      <>
                        <div className="p-2.5 border-b border-[var(--color-atelier-grafite)]/10 space-y-2">
                          <div className="relative">
                            <Search
                              size={12}
                              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-atelier-madeira)]"
                            />
                            <input
                              type="text"
                              value={layerSearch}
                              onChange={(e) => setLayerSearch(e.target.value)}
                              placeholder="Filtrar camadas..."
                              className="w-full pl-7 pr-2 py-1 rounded-lg bg-[var(--color-atelier-creme)]/60 border border-[var(--color-atelier-grafite)]/15 text-[11px] text-[var(--color-atelier-grafite)] placeholder:text-[var(--color-atelier-madeira)]/60 outline-none focus:border-[var(--color-atelier-terracota)] focus:bg-white"
                            />
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-[var(--color-atelier-madeira)] px-0.5">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedGroupIds(
                                    new Set(
                                      activeSource.nodes
                                        .filter((n) => n.type === "group")
                                        .map((n) => n.id)
                                    )
                                  )
                                }
                                className="hover:text-[var(--color-atelier-grafite)] cursor-pointer"
                              >
                                Expandir
                              </button>
                              <span>•</span>
                              <button
                                type="button"
                                onClick={() => setExpandedGroupIds(new Set())}
                                className="hover:text-[var(--color-atelier-grafite)] cursor-pointer"
                              >
                                Recolher
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={handleRestoreSourceDefaults}
                              className="text-[var(--color-atelier-terracota)] hover:underline font-semibold cursor-pointer"
                            >
                              Restaurar
                            </button>
                          </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5 custom-scrollbar">
                          {activeSource.nodes.length > 0 ? (
                            renderTreeNodes(null, 0)
                          ) : (
                            <div className="p-6 text-center text-xs text-[var(--color-atelier-madeira)]">
                              Nenhuma camada detectada.
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    {/* ABA ESQUERDA 2: LISTA DE PRANCHETAS + CAMINHOS ESPECÍFICOS (ESTILO FIGMA FRAMES) */}
                    {leftSidebarTab === "artboards" && (
                      <>
                        <div className="p-2.5 border-b border-[var(--color-atelier-grafite)]/10 space-y-2 bg-[var(--color-atelier-creme)]/30">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[9.5px] font-bold uppercase tracking-wider text-[var(--color-atelier-madeira)]">
                              Pranchetas & Caminhos
                            </span>
                            <button
                              type="button"
                              onClick={() => setActiveTab("artboards")}
                              className="text-[10px] text-[var(--color-atelier-terracota)] hover:underline font-semibold cursor-pointer flex items-center gap-1"
                              title="Abrir visualização em grade"
                            >
                              <LayoutGrid size={10} />
                              <span>Ver Grade</span>
                            </button>
                          </div>

                          <select
                            value={artboardStrategy}
                            onChange={(e) =>
                              handleChangeArtboardStrategy(
                                e.target.value as ArtboardDetectionStrategy
                              )
                            }
                            className="w-full px-2 py-1 rounded-lg bg-white border border-[var(--color-atelier-grafite)]/15 text-[11px] text-[var(--color-atelier-grafite)] font-medium outline-none"
                          >
                            <option value="auto">Automático (Placas/Ilhas)</option>
                            <option value="background-rects">Placas / Retângulos</option>
                            <option value="spatial-clusters">Ilhas Espaciais 2D</option>
                            <option value="top-groups">Grupos de Topo (&lt;g&gt;)</option>
                            <option value="subgroups">Subgrupos Internos</option>
                          </select>

                          <div className="grid grid-cols-2 gap-1.5">
                            <select
                              value={artboardKeepBg ? artboardBgMode : "transparent"}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === "transparent") {
                                  setArtboardKeepBg(false);
                                  setArtboardBgMode("transparent");
                                } else {
                                  setArtboardKeepBg(true);
                                  setArtboardBgMode(val as any);
                                }
                              }}
                              className="px-2 py-1 rounded-lg bg-white border border-[var(--color-atelier-grafite)]/15 text-[10.5px] text-[var(--color-atelier-grafite)] outline-none"
                              title="Fundo das pranchetas no download"
                            >
                              <option value="original">Fundo Original</option>
                              <option value="transparent">Sem Fundo</option>
                              <option value="white">Fundo Branco</option>
                              <option value="black">Fundo Preto</option>
                            </select>

                            <select
                              value={artboardPngScale}
                              onChange={(e) => setArtboardPngScale(Number(e.target.value))}
                              className="px-2 py-1 rounded-lg bg-white border border-[var(--color-atelier-grafite)]/15 text-[10.5px] font-mono text-[var(--color-atelier-grafite)] outline-none"
                              title="Escala PNG"
                            >
                              <option value={1080}>PNG 1080px</option>
                              <option value={2048}>PNG 2048px</option>
                              <option value={4096}>PNG 4096px</option>
                            </select>
                          </div>

                          <div className="flex items-center justify-between pt-0.5">
                            <div className="flex items-center gap-1.5 text-[10px] text-[var(--color-atelier-madeira)]">
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedArtboardIds(
                                    new Set(activeSource.artboards.map((a) => a.id))
                                  )
                                }
                                className="hover:text-[var(--color-atelier-grafite)] cursor-pointer"
                                title="Expandir caminhos de todas as pranchetas"
                              >
                                Expandir Caminhos
                              </button>
                              <span>•</span>
                              <button
                                type="button"
                                onClick={() => setExpandedArtboardIds(new Set())}
                                className="hover:text-[var(--color-atelier-grafite)] cursor-pointer"
                                title="Recolher listas de caminhos"
                              >
                                Recolher
                              </button>
                            </div>

                            <button
                              type="button"
                              disabled={
                                isDownloadingArtboardZip || selectedArtboardIds.length === 0
                              }
                              onClick={() =>
                                handleDownloadSelectedArtboardsBatch("zip-both")
                              }
                              className="px-2 py-0.5 rounded-md bg-[var(--color-atelier-grafite)] hover:bg-[var(--color-atelier-terracota)] disabled:opacity-40 text-white text-[10px] font-bold cursor-pointer transition-colors"
                            >
                              .ZIP ({selectedArtboardIds.length})
                            </button>
                          </div>
                        </div>

                        {/* Lista Compacta de Pranchetas com Seus Caminhos Específicos */}
                        <div className="flex-1 overflow-y-auto p-1.5 space-y-1.5 custom-scrollbar">
                          {activeSource.artboards.map((art) => {
                            const isChecked = selectedArtboardIds.includes(art.id);
                            const isExpanded = expandedArtboardIds.has(art.id);
                            const isFocused = focusedArtboardId === art.id;
                            const artPaths = getArtboardGraphicNodes(activeSource, art);
                            const visiblePathsCount = artPaths.filter((p) =>
                              getOwnNodeVisibility(p, activeComposition?.visibilityOverrides)
                            ).length;
                            const selectedInArtboard = artPaths.filter((p) =>
                              selectedNodeIds.includes(p.id)
                            );

                            return (
                              <div
                                key={art.id}
                                className={`group rounded-xl border transition-all flex flex-col overflow-hidden ${
                                  isFocused
                                    ? "bg-white border-[var(--color-atelier-terracota)] shadow-xs"
                                    : isChecked
                                    ? "bg-white border-[var(--color-atelier-terracota)]/35 shadow-2xs"
                                    : "bg-[var(--color-atelier-creme)]/40 border-transparent hover:border-[var(--color-atelier-grafite)]/15"
                                }`}
                              >
                                {/* Cabeçalho da Prancheta */}
                                <div className="p-2 flex flex-col gap-1.5">
                                  <div className="flex items-center gap-1.5">
                                    {/* Botão Expandir/Recolher Caminhos da Prancheta */}
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setExpandedArtboardIds((prev) => {
                                          const next = new Set(prev);
                                          if (next.has(art.id)) next.delete(art.id);
                                          else next.add(art.id);
                                          return next;
                                        })
                                      }
                                      className="p-0.5 rounded hover:bg-[var(--color-atelier-creme)] text-[var(--color-atelier-madeira)] hover:text-[var(--color-atelier-terracota)] cursor-pointer shrink-0"
                                      title={
                                        isExpanded
                                          ? "Recolher caminhos desta prancheta"
                                          : "Ver caminhos específicos desta prancheta"
                                      }
                                    >
                                      {isExpanded ? (
                                        <ChevronDown size={13} />
                                      ) : (
                                        <ChevronRight size={13} />
                                      )}
                                    </button>

                                    {/* Checkbox da Prancheta para Lote */}
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setSelectedArtboardIds((prev) =>
                                          isChecked
                                            ? prev.filter((id) => id !== art.id)
                                            : [...prev, art.id]
                                        )
                                      }
                                      className={`w-3.5 h-3.5 rounded-[4px] flex items-center justify-center border shrink-0 cursor-pointer ${
                                        isChecked
                                          ? "bg-[var(--color-atelier-terracota)] border-[var(--color-atelier-terracota)] text-white"
                                          : "bg-white border-[var(--color-atelier-grafite)]/25"
                                      }`}
                                      title="Incluir prancheta no download em lote"
                                    >
                                      {isChecked && <Check size={9} strokeWidth={3} />}
                                    </button>

                                    {/* Nome Editável da Prancheta */}
                                    <input
                                      type="text"
                                      value={artboardCustomNames[art.id] ?? art.name}
                                      onChange={(e) =>
                                        setArtboardCustomNames((prev) => ({
                                          ...prev,
                                          [art.id]: e.target.value,
                                        }))
                                      }
                                      className="flex-1 min-w-0 bg-transparent text-[11px] font-semibold text-[var(--color-atelier-grafite)] focus:bg-white focus:px-1.5 py-0.5 rounded outline-none focus:ring-1 focus:ring-[var(--color-atelier-terracota)] truncate"
                                    />

                                    {/* Contador de Caminhos Visíveis/Totais */}
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setExpandedArtboardIds((prev) => {
                                          const next = new Set(prev);
                                          if (next.has(art.id)) next.delete(art.id);
                                          else next.add(art.id);
                                          return next;
                                        })
                                      }
                                      className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full border shrink-0 cursor-pointer ${
                                        visiblePathsCount < artPaths.length
                                          ? "bg-[var(--color-atelier-terracota)]/15 text-[var(--color-atelier-terracota)] border-[var(--color-atelier-terracota)]/30 font-bold"
                                          : "bg-[var(--color-atelier-creme)] text-[var(--color-atelier-madeira)] border-[var(--color-atelier-grafite)]/10"
                                      }`}
                                      title={`${visiblePathsCount} de ${artPaths.length} caminhos visíveis`}
                                    >
                                      {visiblePathsCount}/{artPaths.length}
                                    </button>
                                  </div>

                                  {/* Linha de Ações Rápidas da Prancheta */}
                                  <div className="flex items-center justify-between gap-1 pl-5">
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setFocusedArtboardId((prev) =>
                                            prev === art.id ? null : art.id
                                          )
                                        }
                                        className={`text-[10px] font-semibold cursor-pointer ${
                                          isFocused
                                            ? "text-[var(--color-atelier-terracota)] underline"
                                            : "text-[var(--color-atelier-madeira)] hover:text-[var(--color-atelier-terracota)]"
                                        }`}
                                      >
                                        {isFocused ? "Em Foco (Ver Tudo)" : "Focar Canvas"}
                                      </button>

                                      <span className="text-[var(--color-atelier-grafite)]/20">•</span>

                                      <button
                                        type="button"
                                        onClick={() =>
                                          setExpandedArtboardIds((prev) => {
                                            const next = new Set(prev);
                                            if (next.has(art.id)) next.delete(art.id);
                                            else next.add(art.id);
                                            return next;
                                          })
                                        }
                                        className="text-[10px] text-[var(--color-atelier-madeira)] hover:text-[var(--color-atelier-grafite)] font-medium cursor-pointer"
                                      >
                                        {isExpanded ? "Ocultar Caminhos" : `Caminhos (${artPaths.length})`}
                                      </button>
                                    </div>

                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        disabled={visiblePathsCount === 0}
                                        onClick={() => handleDownloadSingleArtboardSvg(art)}
                                        className="px-1.5 py-0.5 rounded bg-[var(--color-atelier-terracota)]/12 hover:bg-[var(--color-atelier-terracota)] disabled:opacity-40 text-[var(--color-atelier-terracota)] hover:text-white text-[9.5px] font-mono font-bold cursor-pointer transition-colors"
                                        title="Baixar SVG com os caminhos visíveis desta prancheta"
                                      >
                                        SVG
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDownloadSingleArtboardPng(art)}
                                        disabled={
                                          downloadingArtboardId === art.id ||
                                          visiblePathsCount === 0
                                        }
                                        className="px-1.5 py-0.5 rounded bg-[var(--color-atelier-grafite)]/10 hover:bg-[var(--color-atelier-grafite)] disabled:opacity-40 text-[var(--color-atelier-grafite)] hover:text-white text-[9.5px] font-mono font-bold cursor-pointer transition-colors"
                                        title="Baixar PNG com os caminhos visíveis desta prancheta"
                                      >
                                        {downloadingArtboardId === art.id ? "..." : "PNG"}
                                      </button>
                                    </div>
                                  </div>
                                </div>

                                {/* Sub-lista Expansível: Caminhos Específicos desta Prancheta */}
                                {isExpanded && (
                                  <div className="border-t border-[var(--color-atelier-grafite)]/10 bg-[var(--color-atelier-creme)]/30 p-1.5 space-y-1">
                                    {/* Barra de Controle Rápido dos Caminhos da Prancheta */}
                                    <div className="flex items-center justify-between px-1.5 py-0.5 text-[9.5px] text-[var(--color-atelier-madeira)]">
                                      <div className="flex items-center gap-1.5 font-semibold">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleSetAllArtboardPathsVisibility(art, true)
                                          }
                                          className="hover:text-[var(--color-atelier-grafite)] cursor-pointer"
                                        >
                                          Todos
                                        </button>
                                        <span>•</span>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleSetAllArtboardPathsVisibility(art, false)
                                          }
                                          className="hover:text-[var(--color-atelier-grafite)] cursor-pointer"
                                        >
                                          Nenhum
                                        </button>
                                        {selectedInArtboard.length > 0 && (
                                          <>
                                            <span>•</span>
                                            <button
                                              type="button"
                                              onClick={() =>
                                                handleKeepOnlySelectedPathsInArtboard(art)
                                              }
                                              className="text-[var(--color-atelier-terracota)] hover:underline cursor-pointer"
                                              title="Ocultar os demais e manter apenas os selecionados"
                                            >
                                              Só Selecionados ({selectedInArtboard.length})
                                            </button>
                                          </>
                                        )}
                                      </div>

                                      {selectedInArtboard.length > 0 && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleDownloadSingleArtboardSvg(
                                              art,
                                              selectedInArtboard.map((p) => p.id),
                                              "selecionados"
                                            )
                                          }
                                          className="text-[9px] font-mono font-bold text-[var(--color-atelier-terracota)] hover:underline cursor-pointer"
                                          title="Exportar apenas os caminhos selecionados desta prancheta"
                                        >
                                          Exportar ({selectedInArtboard.length})
                                        </button>
                                      )}
                                    </div>

                                    {/* Linhas de Cada Caminho Individual da Prancheta */}
                                    <div className="max-h-56 overflow-y-auto space-y-0.5 pr-0.5 custom-scrollbar">
                                      {artPaths.map((pathNode, idx) => {
                                        const isVisible = getOwnNodeVisibility(
                                          pathNode,
                                          activeComposition?.visibilityOverrides
                                        );
                                        const isPathSelected = selectedNodeIds.includes(
                                          pathNode.id
                                        );
                                        const swatchColor = resolveNodeEffectiveColor(
                                          pathNode,
                                          nodesMap
                                        );
                                        const pathName =
                                          activeComposition?.nameOverrides?.[pathNode.id] ??
                                          pathNode.displayName;

                                        return (
                                          <div
                                            key={pathNode.id}
                                            className={`group/pitem flex items-center justify-between gap-1.5 px-1.5 py-1 rounded-lg text-[10.5px] transition-colors ${
                                              isPathSelected
                                                ? "bg-[var(--color-atelier-terracota)]/15 text-[var(--color-atelier-grafite)] font-semibold"
                                                : isVisible
                                                ? "bg-white/80 hover:bg-white text-[var(--color-atelier-grafite)]"
                                                : "bg-transparent text-[var(--color-atelier-madeira)]/55 opacity-65"
                                            }`}
                                          >
                                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                              {/* Checkbox / Olho de Visibilidade do Caminho */}
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  toggleNodeVisibility(pathNode.id)
                                                }
                                                className={`w-3.5 h-3.5 rounded-[3px] flex items-center justify-center border shrink-0 cursor-pointer transition-colors ${
                                                  isVisible
                                                    ? "bg-[var(--color-atelier-terracota)] border-[var(--color-atelier-terracota)] text-white"
                                                    : "bg-white border-[var(--color-atelier-grafite)]/25 text-transparent"
                                                }`}
                                                title={
                                                  isVisible
                                                    ? "Ocultar caminho (não será exportado)"
                                                    : "Mostrar caminho (incluir na exportação)"
                                                }
                                              >
                                                <Check size={8} strokeWidth={3} />
                                              </button>

                                              {/* Amostra de Cor Efetiva do Caminho */}
                                              <span
                                                className="w-2 h-2 rounded-full shrink-0 border border-black/15"
                                                style={{
                                                  backgroundColor:
                                                    swatchColor || "#142C48",
                                                }}
                                              />

                                              {/* Nome do Caminho (Clique seleciona no canvas) */}
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  if (e.shiftKey || e.ctrlKey || e.metaKey) {
                                                    setSelectedNodeIds((prev) =>
                                                      prev.includes(pathNode.id)
                                                        ? prev.filter((id) => id !== pathNode.id)
                                                        : [...prev, pathNode.id]
                                                    );
                                                  } else {
                                                    setSelectedNodeIds([pathNode.id]);
                                                  }
                                                }}
                                                className="truncate text-left flex-1 cursor-pointer"
                                                title={`#${idx + 1} ${pathName} (<${pathNode.tagName}>) — Clique para selecionar`}
                                              >
                                                {pathName}
                                              </button>
                                            </div>

                                            {/* Ações Rápidas do Caminho: Isolar ("Só") ou Baixar SVG único */}
                                            <div className="flex items-center gap-0.5 shrink-0 opacity-75 group-hover/pitem:opacity-100">
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  handleSoloArtboardPath(art, pathNode.id)
                                                }
                                                className="px-1 py-0.5 rounded hover:bg-[var(--color-atelier-creme)] text-[9px] font-bold text-[var(--color-atelier-madeira)] hover:text-[var(--color-atelier-terracota)] cursor-pointer"
                                                title="Isolar apenas este caminho na prancheta"
                                              >
                                                Só
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  handleDownloadSingleArtboardSvg(
                                                    art,
                                                    [pathNode.id],
                                                    pathName
                                                  )
                                                }
                                                className="px-1 py-0.5 rounded hover:bg-[var(--color-atelier-terracota)] text-[9px] font-mono font-bold text-[var(--color-atelier-terracota)] hover:text-white cursor-pointer transition-colors"
                                                title="Exportar apenas este caminho em SVG"
                                              >
                                                SVG
                                              </button>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}

                    {/* ABA ESQUERDA 3: LISTA VERTICAL DE VARIANTES SALVAS */}
                    {leftSidebarTab === "variants" && (
                      <>
                        <div className="p-2.5 border-b border-[var(--color-atelier-grafite)]/10 flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-atelier-madeira)]">
                            Composições
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsNewVariantModalOpen(true)}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--color-atelier-terracota)]/12 hover:bg-[var(--color-atelier-terracota)] text-[var(--color-atelier-terracota)] hover:text-white text-[10.5px] font-bold cursor-pointer transition-colors"
                          >
                            <Plus size={11} />
                            <span>Nova</span>
                          </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-1.5 space-y-1 custom-scrollbar">
                          {activeProject?.compositions.map((comp) => {
                            const isAct = comp.id === activeComposition?.id;
                            return (
                              <div
                                key={comp.id}
                                onClick={() => {
                                  const updated = projects.map((p) =>
                                    p.id === activeProject.id
                                      ? { ...p, activeCompositionId: comp.id }
                                      : p
                                  );
                                  persistProjectsWithAutosave(updated);
                                }}
                                className={`group px-2.5 py-2 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-all ${
                                  isAct
                                    ? "bg-[var(--color-atelier-terracota)]/12 border-[var(--color-atelier-terracota)]/40 text-[var(--color-atelier-grafite)] font-bold"
                                    : "bg-white/60 border-transparent hover:bg-[var(--color-atelier-creme)]/60 text-[var(--color-atelier-grafite)]/80"
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span
                                    className={`w-2 h-2 rounded-full shrink-0 ${
                                      comp.status === "approved"
                                        ? "bg-emerald-600"
                                        : "bg-[var(--color-atelier-madeira)]/50"
                                    }`}
                                  />
                                  <span className="text-xs truncate">{comp.name}</span>
                                </div>

                                <div
                                  className="flex items-center gap-1 opacity-70 group-hover:opacity-100"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    type="button"
                                    title="Duplicar variante"
                                    onClick={() => handleDuplicateVariant(comp)}
                                    className="p-1 rounded hover:bg-white text-[var(--color-atelier-madeira)] hover:text-[var(--color-atelier-terracota)] cursor-pointer"
                                  >
                                    <Copy size={11} />
                                  </button>
                                  {activeProject.compositions.length > 1 && (
                                    <button
                                      type="button"
                                      title="Excluir variante"
                                      onClick={() => handleDeleteVariant(comp.id)}
                                      className="p-1 rounded hover:bg-white text-[var(--color-atelier-madeira)] hover:text-rose-600 cursor-pointer"
                                    >
                                      <Trash2 size={11} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </aside>
                )}

                {/* PAINEL CENTRAL (HERO CANVAS ESTILO FIGMA COM BARRA FLUTUANTE) */}
                <section className="flex-1 flex flex-col min-w-0 relative overflow-hidden">
                  {/* Pílula Flutuante Superior Esquerda: Variante Ativa & Foco de Prancheta */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-20">
                    <div className="pointer-events-auto flex items-center gap-2">
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/90 backdrop-blur-md border border-[var(--color-atelier-grafite)]/12 shadow-xs text-xs">
                        <select
                          value={activeComposition?.id || ""}
                          onChange={(e) => {
                            if (!activeProject) return;
                            const updated = projects.map((p) =>
                              p.id === activeProject.id
                                ? { ...p, activeCompositionId: e.target.value }
                                : p
                            );
                            persistProjectsWithAutosave(updated);
                          }}
                          className="bg-transparent font-semibold text-[var(--color-atelier-grafite)] outline-none cursor-pointer max-w-[180px] truncate"
                          title="Alternar variante ativa no canvas"
                        >
                          {activeProject?.compositions.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          onClick={() => setIsNewVariantModalOpen(true)}
                          title="Salvar como nova variante"
                          className="p-1 rounded-lg hover:bg-[var(--color-atelier-creme)] text-[var(--color-atelier-terracota)] cursor-pointer"
                        >
                          <Plus size={12} />
                        </button>
                      </div>

                      {focusedArtboard && (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--color-atelier-terracota)] text-white shadow-xs text-xs font-semibold">
                          <span>
                            Foco: {artboardCustomNames[focusedArtboard.id] ?? focusedArtboard.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => setFocusedArtboardId(null)}
                            className="px-1.5 py-0.5 rounded bg-white/20 hover:bg-white/30 text-[10px] font-bold cursor-pointer"
                            title="Voltar a exibir todas as pranchetas no canvas"
                          >
                            Ver Todas
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="pointer-events-auto flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setIsCompareMode((v) => !v);
                          if (!compareCompositionId && activeProject) {
                            const other = activeProject.compositions.find(
                              (c) => c.id !== activeComposition?.id
                            );
                            if (other) setCompareCompositionId(other.id);
                          }
                        }}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold border shadow-xs backdrop-blur-md transition-colors cursor-pointer ${
                          isCompareMode
                            ? "bg-[var(--color-atelier-terracota)] text-white border-[var(--color-atelier-terracota)]"
                            : "bg-white/90 border-[var(--color-atelier-grafite)]/12 text-[var(--color-atelier-grafite)] hover:text-[var(--color-atelier-terracota)]"
                        }`}
                      >
                        <Columns size={12} />
                        <span className="hidden sm:inline">Comparar</span>
                      </button>

                      {isCompareMode && activeProject && (
                        <select
                          value={compareCompositionId || ""}
                          onChange={(e) => setCompareCompositionId(e.target.value)}
                          className="px-2.5 py-1.5 rounded-xl bg-white/95 border border-[var(--color-atelier-terracota)] text-[11px] text-[var(--color-atelier-grafite)] shadow-xs outline-none"
                        >
                          {activeProject.compositions.map((c) => (
                            <option key={c.id} value={c.id}>
                              vs. {c.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>

                  {/* Área Interativa do Canvas */}
                  <div
                    onClick={handleCanvasClick}
                    onMouseDown={(e) => {
                      if (isSpacePressed || e.button === 1) {
                        setIsPanning(true);
                        panStartRef.current = {
                          x: e.clientX,
                          y: e.clientY,
                          panX: canvasPan.x,
                          panY: canvasPan.y,
                        };
                      }
                    }}
                    onMouseMove={(e) => {
                      if (isPanning && panStartRef.current) {
                        setCanvasPan({
                          x: panStartRef.current.panX + (e.clientX - panStartRef.current.x),
                          y: panStartRef.current.panY + (e.clientY - panStartRef.current.y),
                        });
                      }
                    }}
                    onMouseUp={() => setIsPanning(false)}
                    onWheel={(e) => {
                      if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        const delta = e.deltaY < 0 ? 0.12 : -0.12;
                        setCanvasZoom((z) =>
                          Math.max(0.25, Math.min(4, Number((z + delta).toFixed(2))))
                        );
                      }
                    }}
                    style={{
                      backgroundColor:
                        canvasBg === "white"
                          ? "#FFFFFF"
                          : canvasBg === "black"
                          ? "#0C0B0A"
                          : canvasBg === "light"
                          ? "#E8E3DD"
                          : canvasBg === "dark"
                          ? "#0D1D30"
                          : canvasBg === "custom"
                          ? customCanvasBgColor
                          : "#EFEAE1",
                      backgroundImage:
                        canvasBg === "checkerboard"
                          ? "linear-gradient(45deg, #B9D1E3 25%, transparent 25%), linear-gradient(-45deg, #B9D1E3 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #B9D1E3 75%), linear-gradient(-45deg, transparent 75%, #B9D1E3 75%)"
                          : "none",
                      backgroundSize: "24px 24px",
                      backgroundPosition: "0 0, 0 12px, 12px -12px, -12px 0px",
                    }}
                    className={`flex-1 flex items-center justify-center overflow-hidden relative ${
                      isSpacePressed || isPanning ? "cursor-grab active:cursor-grabbing" : ""
                    }`}
                  >
                    {currentCanvasSvgResult ? (
                      <div
                        style={{
                          transform: `translate(${canvasPan.x}px, ${canvasPan.y}px) scale(${canvasZoom})`,
                          transformOrigin: "center center",
                        }}
                        className="transition-transform duration-75 relative flex items-center justify-center p-10"
                      >
                        <div
                          className="relative [&>svg]:max-w-[700px] [&>svg]:max-h-[480px] [&>svg]:w-auto [&>svg]:h-auto drop-shadow-sm"
                          dangerouslySetInnerHTML={{
                            __html: currentCanvasSvgResult.svgString,
                          }}
                        />

                        {isCompareMode && compareCanvasSvgResult && (
                          <div
                            style={{
                              clipPath: `inset(0 0 0 ${compareSplitPct}%)`,
                            }}
                            className="absolute inset-0 flex items-center justify-center p-10 pointer-events-none"
                          >
                            <div
                              className="relative [&>svg]:max-w-[700px] [&>svg]:max-h-[480px] [&>svg]:w-auto [&>svg]:h-auto"
                              dangerouslySetInnerHTML={{
                                __html: compareCanvasSvgResult.serialized.svgString,
                              }}
                            />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center text-xs text-[var(--color-atelier-madeira)]">
                        Nenhum elemento visível nesta variante.
                      </div>
                    )}

                    {/* Slider do Split-View quando Comparação ativa */}
                    {isCompareMode && compareCanvasSvgResult && (
                      <div className="absolute bottom-14 left-1/2 -translate-x-1/2 bg-white/95 border border-[var(--color-atelier-terracota)] rounded-full px-4 py-1.5 flex items-center gap-3 shadow-lg z-20">
                        <span className="text-[10.5px] font-bold text-[var(--color-atelier-terracota)]">
                          {activeComposition?.name}
                        </span>
                        <input
                          type="range"
                          min={5}
                          max={95}
                          value={compareSplitPct}
                          onChange={(e) => setCompareSplitPct(Number(e.target.value))}
                          className="w-28 accent-[var(--color-atelier-terracota)]"
                        />
                        <span className="text-[10.5px] font-bold text-emerald-700">
                          {compareCanvasSvgResult.composition.name}
                        </span>
                      </div>
                    )}

                    {/* Barra Inferior Flutuante Estilo Figma (Zoom + Fundo do Canvas) */}
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-white/90 backdrop-blur-md border border-[var(--color-atelier-grafite)]/12 shadow-sm z-20 text-[11px]">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            setCanvasZoom((z) => Math.max(0.25, Number((z - 0.15).toFixed(2))))
                          }
                          className="p-1 rounded hover:bg-[var(--color-atelier-creme)] text-[var(--color-atelier-grafite)] cursor-pointer"
                          title="Afastar (-)"
                        >
                          <ZoomOut size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCanvasZoom(1);
                            setCanvasPan({ x: 0, y: 0 });
                          }}
                          className="font-mono px-1.5 py-0.5 rounded hover:bg-[var(--color-atelier-creme)] text-[var(--color-atelier-grafite)] font-bold cursor-pointer"
                          title="Clique para resetar zoom (100%)"
                        >
                          {Math.round(canvasZoom * 100)}%
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setCanvasZoom((z) => Math.min(4, Number((z + 0.15).toFixed(2))))
                          }
                          className="p-1 rounded hover:bg-[var(--color-atelier-creme)] text-[var(--color-atelier-grafite)] cursor-pointer"
                          title="Aproximar (+)"
                        >
                          <ZoomIn size={12} />
                        </button>
                      </div>

                      <div className="w-px h-3.5 bg-[var(--color-atelier-grafite)]/15" />

                      <div className="flex items-center gap-1">
                        {[
                          { id: "checkerboard", label: "Grid" },
                          { id: "light", label: "Creme" },
                          { id: "dark", label: "Grafite" },
                          { id: "white", label: "Branco" },
                          { id: "black", label: "Preto" },
                        ].map((b) => (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => setCanvasBg(b.id as CanvasBgType)}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold cursor-pointer transition-colors ${
                              canvasBg === b.id
                                ? "bg-[var(--color-atelier-terracota)] text-white"
                                : "text-[var(--color-atelier-madeira)] hover:text-[var(--color-atelier-grafite)]"
                            }`}
                          >
                            {b.label}
                          </button>
                        ))}
                        <input
                          type="color"
                          value={customCanvasBgColor}
                          onChange={(e) => {
                            setCustomCanvasBgColor(e.target.value);
                            setCanvasBg("custom");
                          }}
                          title="Cor personalizada de preview"
                          className="w-4 h-4 rounded cursor-pointer bg-transparent border-0 ml-0.5"
                        />
                      </div>
                    </div>
                  </div>
                </section>

                {/* PAINEL DIREITO ESTILO FIGMA INSPECTOR (COLAPSÁVEL, COM LISTAS & EXPORT) */}
                {isRightPanelOpen && (
                  <aside className="w-68 shrink-0 bg-white/90 backdrop-blur-xl border-l border-[var(--color-atelier-grafite)]/10 flex flex-col justify-between min-h-0 overflow-y-auto custom-scrollbar">
                    {/* Seção Superior: Propriedades da Camada ou Resumo do Documento */}
                    <div className="p-3.5 space-y-3.5 text-xs">
                      <div className="flex items-center justify-between border-b border-[var(--color-atelier-grafite)]/10 pb-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-madeira)]">
                          {primarySelectedNode ? "Propriedades da Camada" : "Documento SVG"}
                        </span>
                        {primarySelectedNode && (
                          <button
                            type="button"
                            onClick={() => setSelectedNodeIds([])}
                            className="text-[10px] text-[var(--color-atelier-madeira)] hover:text-[var(--color-atelier-grafite)] cursor-pointer"
                          >
                            Limpar
                          </button>
                        )}
                      </div>

                      {primarySelectedNode && activeComposition ? (
                        <div className="space-y-3">
                          {/* Nome e Tag */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[10px] text-[var(--color-atelier-madeira)]">
                              <span>Nome</span>
                              <span className="font-mono">&lt;{primarySelectedNode.tagName}&gt;</span>
                            </div>
                            <input
                              type="text"
                              value={
                                activeComposition.nameOverrides?.[primarySelectedNode.id] ??
                                primarySelectedNode.displayName
                              }
                              onChange={(e) => {
                                const val = e.target.value;
                                applyCompositionMutation(
                                  `Renomear ${primarySelectedNode.displayName}`,
                                  (c) => ({
                                    nameOverrides: {
                                      ...c.nameOverrides,
                                      [primarySelectedNode.id]: val,
                                    },
                                  }),
                                  false
                                );
                              }}
                              className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--color-atelier-creme)]/60 border border-[var(--color-atelier-grafite)]/15 focus:border-[var(--color-atelier-terracota)] focus:bg-white text-[11.5px] text-[var(--color-atelier-grafite)] font-semibold outline-none"
                            />
                          </div>

                          {/* Coordenadas Compactas Estilo Figma (X, Y, W, H) */}
                          {primarySelectedNode.computedBounds && (
                            <div className="grid grid-cols-4 gap-1 font-mono text-[10px]">
                              {[
                                { k: "X", v: primarySelectedNode.computedBounds.x },
                                { k: "Y", v: primarySelectedNode.computedBounds.y },
                                { k: "W", v: primarySelectedNode.computedBounds.width },
                                { k: "H", v: primarySelectedNode.computedBounds.height },
                              ].map((item) => (
                                <div
                                  key={item.k}
                                  className="px-1.5 py-1 rounded bg-[var(--color-atelier-creme)]/55 border border-[var(--color-atelier-grafite)]/10 flex items-center justify-between"
                                >
                                  <span className="text-[var(--color-atelier-madeira)]">{item.k}</span>
                                  <span className="text-[var(--color-atelier-grafite)] font-bold">
                                    {Math.round(item.v)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Papel no Motion via Menu Dropdown Compacto */}
                          <div className="space-y-1 pt-2 border-t border-[var(--color-atelier-grafite)]/10">
                            <div className="flex items-center justify-between">
                              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-atelier-madeira)]">
                                Papel no Motion
                              </label>
                              <button
                                type="button"
                                onClick={() => {
                                  applyCompositionMutation(
                                    "Reclassificar papéis automaticamente",
                                    () => ({ roleOverrides: {} })
                                  );
                                  notifyToast("Papéis reclassificados automaticamente.");
                                }}
                                className="flex items-center gap-1 text-[10px] text-[var(--color-atelier-terracota)] hover:underline font-semibold cursor-pointer"
                              >
                                <Wand2 size={10} />
                                <span>Auto</span>
                              </button>
                            </div>
                            <select
                              value={
                                activeComposition.roleOverrides?.[primarySelectedNode.id] ||
                                primarySelectedNode.motionRole
                              }
                              onChange={(e) => {
                                const rKey = e.target.value as MotionRole;
                                applyCompositionMutation(
                                  `Definir papel para ${ROLE_LABELS[rKey].label}`,
                                  (c) => ({
                                    roleOverrides: {
                                      ...c.roleOverrides,
                                      [primarySelectedNode.id]: rKey,
                                    },
                                  })
                                );
                              }}
                              className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--color-atelier-creme)]/60 border border-[var(--color-atelier-grafite)]/15 text-[11.5px] font-semibold text-[var(--color-atelier-grafite)] outline-none cursor-pointer"
                            >
                              {(
                                [
                                  "symbol",
                                  "wordmark",
                                  "descriptor",
                                  "detail",
                                  "background",
                                  "generic",
                                ] as MotionRole[]
                              ).map((rKey) => (
                                <option key={rKey} value={rKey}>
                                  {ROLE_LABELS[rKey].label}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Visibilidade & Bloqueio */}
                          <div className="flex items-center gap-1.5 pt-1">
                            <button
                              type="button"
                              onClick={() => toggleNodeVisibility(primarySelectedNode.id)}
                              className="flex-1 py-1.5 px-2.5 rounded-lg bg-[var(--color-atelier-creme)]/60 border border-[var(--color-atelier-grafite)]/15 hover:border-[var(--color-atelier-terracota)] flex items-center justify-center gap-1.5 text-[11px] font-semibold text-[var(--color-atelier-grafite)] cursor-pointer"
                            >
                              {getOwnNodeVisibility(
                                primarySelectedNode,
                                activeComposition.visibilityOverrides
                              ) ? (
                                <>
                                  <Eye size={12} className="text-emerald-600" />
                                  <span>Visível</span>
                                </>
                              ) : (
                                <>
                                  <EyeOff size={12} className="text-rose-600" />
                                  <span>Oculto</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                const isLocked = activeComposition.lockedNodeIds.includes(
                                  primarySelectedNode.id
                                );
                                const nextLocked = isLocked
                                  ? activeComposition.lockedNodeIds.filter(
                                      (id) => id !== primarySelectedNode.id
                                    )
                                  : [...activeComposition.lockedNodeIds, primarySelectedNode.id];
                                const updated = projects.map((p) =>
                                  p.id === activeProject?.id
                                    ? {
                                        ...p,
                                        compositions: p.compositions.map((c) =>
                                          c.id === activeComposition.id
                                            ? { ...c, lockedNodeIds: nextLocked }
                                            : c
                                        ),
                                      }
                                    : p
                                );
                                persistProjectsWithAutosave(updated);
                              }}
                              className="p-1.5 rounded-lg bg-[var(--color-atelier-creme)]/60 border border-[var(--color-atelier-grafite)]/15 text-[var(--color-atelier-madeira)] hover:text-[var(--color-atelier-grafite)] cursor-pointer"
                              title="Bloquear/Desbloquear camada"
                            >
                              {activeComposition.lockedNodeIds.includes(
                                primarySelectedNode.id
                              ) ? (
                                <Lock size={13} className="text-[var(--color-atelier-terracota)]" />
                              ) : (
                                <Unlock size={13} />
                              )}
                            </button>
                          </div>

                          {/* Resumo de Fill / Stroke / Defs */}
                          <div className="pt-2 border-t border-[var(--color-atelier-grafite)]/10 space-y-1 font-mono text-[10px] text-[var(--color-atelier-madeira)]">
                            <div className="flex justify-between">
                              <span>Fill:</span>
                              <span className="text-[var(--color-atelier-grafite)] truncate max-w-[130px]">
                                {primarySelectedNode.normalizedProperties.fill || "padrão"}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Stroke:</span>
                              <span className="text-[var(--color-atelier-grafite)] truncate max-w-[130px]">
                                {primarySelectedNode.normalizedProperties.stroke || "nenhum"}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Defs vinculadas:</span>
                              <span className="text-[var(--color-atelier-terracota)] font-bold">
                                {primarySelectedNode.referencedDefIds.length}
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* Resumo Limpo do Documento quando nenhuma camada está selecionada */
                        <div className="space-y-2.5 text-[11px]">
                          <div className="p-2.5 rounded-xl bg-[var(--color-atelier-creme)]/55 border border-[var(--color-atelier-grafite)]/10 space-y-1.5 font-mono text-[10px]">
                            <div className="flex justify-between">
                              <span className="text-[var(--color-atelier-madeira)]">ViewBox:</span>
                              <span className="text-[var(--color-atelier-grafite)] font-bold">
                                {activeSource.sourceMetadata.rawViewBoxString}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[var(--color-atelier-madeira)]">Camadas:</span>
                              <span className="text-[var(--color-atelier-grafite)] font-bold">
                                {currentCanvasSvgResult?.includedNodeCount || 0} visíveis
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[var(--color-atelier-madeira)]">Pranchetas:</span>
                              <span className="text-[var(--color-atelier-terracota)] font-bold">
                                {activeSource.artboards.length}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                activeComposition && handleApproveVariant(activeComposition.id)
                              }
                              className="flex-1 py-1.5 px-2.5 rounded-lg border border-emerald-600/30 bg-emerald-600/10 text-emerald-700 font-bold text-[10.5px] flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <CheckCircle2 size={11} />
                              <span>
                                {activeComposition?.status === "approved"
                                  ? "Variante Aprovada"
                                  : "Aprovar Variante"}
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveTab("import")}
                              className="py-1.5 px-2.5 rounded-lg bg-[var(--color-atelier-creme)]/70 border border-[var(--color-atelier-grafite)]/12 text-[var(--color-atelier-madeira)] hover:text-[var(--color-atelier-grafite)] text-[10.5px] font-semibold cursor-pointer"
                            >
                              Diagnóstico
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Seção Inferior Estilo Figma: EXPORTAÇÃO RÁPIDA (CAMINHOS SELECIONADOS OU PRANCHETAS) */}
                    <div className="p-3.5 border-t border-[var(--color-atelier-grafite)]/10 bg-[var(--color-atelier-creme)]/35 space-y-2.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]">
                          Exportar
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab("export");
                            setExportStep(1);
                          }}
                          className="text-[10px] text-[var(--color-atelier-terracota)] hover:underline font-semibold cursor-pointer"
                        >
                          Lote Avançado...
                        </button>
                      </div>

                      {/* Exportação Exclusiva de Caminho(s) Selecionado(s) */}
                      {selectedNodeIds.length > 0 && activeSource.artboards.length > 0 && (() => {
                        const owningArtboard =
                          focusedArtboard ||
                          activeSource.artboards.find((a) =>
                            a.nodeIds.some((id) => selectedNodeIds.includes(id))
                          ) ||
                          activeSource.artboards[0];
                        const suffix =
                          selectedNodeIds.length === 1 && primarySelectedNode
                            ? activeComposition?.nameOverrides?.[primarySelectedNode.id] ??
                              primarySelectedNode.displayName
                            : `${selectedNodeIds.length}_caminhos`;

                        return (
                          <div className="p-2.5 rounded-xl bg-white border border-[var(--color-atelier-terracota)]/35 space-y-2 shadow-2xs">
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="font-bold text-[var(--color-atelier-terracota)]">
                                {selectedNodeIds.length === 1
                                  ? "1 Caminho Selecionado"
                                  : `${selectedNodeIds.length} Caminhos Selecionados`}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  handleKeepOnlySelectedPathsInArtboard(owningArtboard)
                                }
                                className="text-[9.5px] font-semibold text-[var(--color-atelier-madeira)] hover:text-[var(--color-atelier-terracota)] underline cursor-pointer"
                                title="Ocultar os outros caminhos desta prancheta"
                              >
                                Isolar na Prancheta
                              </button>
                            </div>

                            <div className="grid grid-cols-2 gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  handleDownloadSingleArtboardSvg(
                                    owningArtboard,
                                    selectedNodeIds,
                                    suffix
                                  )
                                }
                                className="py-1.5 px-2 rounded-lg bg-[var(--color-atelier-terracota)] hover:bg-[#234E80] text-white text-[10.5px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                              >
                                <Download size={11} />
                                <span>Só Caminho SVG</span>
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleDownloadSingleArtboardPng(
                                    owningArtboard,
                                    selectedNodeIds,
                                    suffix
                                  )
                                }
                                className="py-1.5 px-2 rounded-lg bg-[var(--color-atelier-grafite)] hover:bg-[var(--color-atelier-madeira)] text-white text-[10.5px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                              >
                                <ImageIcon size={11} />
                                <span>Só Caminho PNG</span>
                              </button>
                            </div>
                          </div>
                        );
                      })()}

                      {activeSource.artboards.length > 0 && (
                        <div className="space-y-1.5">
                          <div className="grid grid-cols-2 gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                handleDownloadSelectedArtboardsBatch("individual-svg")
                              }
                              disabled={selectedArtboardIds.length === 0}
                              className="py-1.5 px-2 rounded-lg bg-white border border-[var(--color-atelier-grafite)]/15 hover:border-[var(--color-atelier-terracota)] text-[10.5px] font-bold text-[var(--color-atelier-grafite)] flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40"
                            >
                              <Download size={11} className="text-[var(--color-atelier-terracota)]" />
                              <span>SVG ({selectedArtboardIds.length})</span>
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleDownloadSelectedArtboardsBatch("individual-png")
                              }
                              disabled={selectedArtboardIds.length === 0}
                              className="py-1.5 px-2 rounded-lg bg-white border border-[var(--color-atelier-grafite)]/15 hover:border-[var(--color-atelier-terracota)] text-[10.5px] font-bold text-[var(--color-atelier-grafite)] flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40"
                            >
                              <ImageIcon size={11} className="text-[var(--color-atelier-madeira)]" />
                              <span>PNG ({selectedArtboardIds.length})</span>
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDownloadSelectedArtboardsBatch("zip-both")}
                            disabled={
                              isDownloadingArtboardZip || selectedArtboardIds.length === 0
                            }
                            className="w-full py-2 px-3 rounded-xl bg-[var(--color-atelier-grafite)] hover:bg-[var(--color-atelier-terracota)] disabled:opacity-40 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
                          >
                            <Package size={12} />
                            <span>
                              {isDownloadingArtboardZip
                                ? "Empacotando..."
                                : `Baixar ${selectedArtboardIds.length} em .ZIP`}
                            </span>
                          </button>
                        </div>
                      )}
                    </div>
                  </aside>
                )}
              </>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* TELA 7.5: ASSISTENTE DE EXPORTAÇÃO EM LOTE (5 PASSOS)               */}
        {/* ------------------------------------------------------------------- */}
        {activeTab === "export" && (
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar flex flex-col gap-6">
            {/* Stepper de 5 Passos */}
            <div className="flex flex-wrap items-center justify-between glass-panel bg-white/85 border border-white rounded-[2rem] p-4 gap-2 shadow-xs">
              {[
                { step: 1, title: "1. Variantes & Modo" },
                { step: 2, title: "2. Formatos (SVG/PNG)" },
                { step: 3, title: "3. Perfis & Parâmetros" },
                { step: 4, title: "4. Revisar Lote" },
                { step: 5, title: "5. Processar & Baixar" },
              ].map((s) => (
                <button
                  key={s.step}
                  type="button"
                  onClick={() => setExportStep(s.step as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    exportStep === s.step
                      ? "bg-[var(--color-atelier-grafite)] text-white shadow-xs"
                      : exportStep > s.step
                      ? "bg-[var(--color-atelier-terracota)]/12 text-[var(--color-atelier-terracota)]"
                      : "text-[var(--color-atelier-madeira)] hover:text-[var(--color-atelier-grafite)] hover:bg-[var(--color-atelier-creme)]/60"
                  }`}
                >
                  <span>{s.title}</span>
                </button>
              ))}
            </div>

            {/* PASSO 1: ESCOLHER VARIANTES E MODO DE COMPOSIÇÃO */}
            {exportStep === 1 && activeProject && (
              <div className="glass-panel bg-white/85 border border-white rounded-[2rem] p-6 space-y-6 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="font-elegant text-xl text-[var(--color-atelier-grafite)]">
                      Passo 1 — Escolher Modo de Composição, Pranchetas ou Variantes
                    </h2>
                    <p className="text-xs text-[var(--color-atelier-madeira)]">
                      Exporte Pranchetas identificadas individualmente (com recorte de viewBox exato) ou variantes nomeadas — nunca gera combinações 2^N irrestritas.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (exportMode === "artboards" && activeSource) {
                          setSelectedArtboardIds(
                            activeSource.artboards.map((ab) => ab.id)
                          );
                        } else {
                          setSelectedExportVariantIds(
                            activeProject.compositions.map((c) => c.id)
                          );
                        }
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-white border border-[var(--color-atelier-grafite)]/15 hover:border-[var(--color-atelier-terracota)]/50 text-xs font-semibold text-[var(--color-atelier-grafite)] cursor-pointer transition-colors"
                    >
                      Selecionar Todas
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (exportMode === "artboards") {
                          setSelectedArtboardIds([]);
                        } else {
                          setSelectedExportVariantIds([]);
                        }
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-white border border-[var(--color-atelier-grafite)]/15 hover:border-[var(--color-atelier-terracota)]/50 text-xs font-semibold text-[var(--color-atelier-madeira)] cursor-pointer transition-colors"
                    >
                      Desmarcar Todas
                    </button>
                  </div>
                </div>

                {/* Modos de Exportação de Composição (Seção 7.4 + Pranchetas) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  {[
                    {
                      id: "artboards",
                      title: `Pranchetas Identificadas (${activeSource?.artboards?.length ?? 0})`,
                      desc: "Separa e exporta cada Prancheta detectada no SVG com viewBox recortado individualmente.",
                    },
                    {
                      id: "saved-variants",
                      title: "Variantes Salvas (Modo Principal)",
                      desc: "Exporta cada composição nomeada selecionada abaixo mantendo fidelidade e dependências.",
                    },
                    {
                      id: "current-complete",
                      title: "Variante Completa Atual",
                      desc: "Exporta imediatamente todos os elementos visíveis da composição ativa no editor.",
                    },
                    {
                      id: "individual-groups",
                      title: "Cada Grupo Selecionado Separadamente",
                      desc: "Gera um arquivo individual por grupo raiz visível, preservando seus recursos <defs>.",
                    },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setExportMode(m.id as CompositionExportMode)}
                      className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                        exportMode === m.id
                          ? "bg-[var(--color-atelier-terracota)]/12 border-[var(--color-atelier-terracota)] text-[var(--color-atelier-grafite)] shadow-2xs"
                          : "bg-[var(--color-atelier-creme)]/60 border-[var(--color-atelier-grafite)]/12 text-[var(--color-atelier-madeira)] hover:bg-white"
                      }`}
                    >
                      <div className="font-bold text-xs text-[var(--color-atelier-grafite)]">{m.title}</div>
                      <p className="text-[11px] text-[var(--color-atelier-madeira)] mt-1">{m.desc}</p>
                    </button>
                  ))}
                </div>

                {/* Lista de Pranchetas quando exportMode === "artboards" */}
                {exportMode === "artboards" && activeSource && (
                  <div className="space-y-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-2 bg-[var(--color-atelier-creme)]/70 border border-[var(--color-atelier-grafite)]/12 rounded-2xl px-4 py-3">
                      <span className="text-xs text-[var(--color-atelier-madeira)]">
                        Selecione quais Pranchetas entrarão no pacote de fechamento ou abra a{" "}
                        <button
                          type="button"
                          onClick={() => setActiveTab("artboards")}
                          className="text-[var(--color-atelier-terracota)] underline font-bold cursor-pointer"
                        >
                          aba Pranchetas dedicada
                        </button>{" "}
                        para download individual instantâneo.
                      </span>
                      <label className="flex items-center gap-2 text-xs text-[var(--color-atelier-grafite)] font-semibold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={artboardKeepBg}
                          onChange={(e) => setArtboardKeepBg(e.target.checked)}
                          className="accent-[var(--color-atelier-terracota)]"
                        />
                        <span>Manter cartão de fundo da prancheta</span>
                      </label>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {activeSource.artboards.map((ab) => {
                        const checked = selectedArtboardIds.includes(ab.id);
                        const previewSvg = serializeArtboardToSvg({
                          sourceDoc: activeSource,
                          artboard: ab,
                          keepArtboardBackground: artboardKeepBg,
                          backgroundMode: artboardBgMode,
                          framingMode: artboardFramingMode,
                        }).svgString;
                        const svgFilename = getSafeArtboardFilename(ab, "svg");
                        return (
                          <div
                            key={ab.id}
                            onClick={() =>
                              setSelectedArtboardIds((prev) =>
                                checked
                                  ? prev.filter((id) => id !== ab.id)
                                  : [...prev, ab.id]
                              )
                            }
                            className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                              checked
                                ? "bg-white border-[var(--color-atelier-terracota)] shadow-xs"
                                : "bg-white/60 border-[var(--color-atelier-grafite)]/12 opacity-65"
                            }`}
                          >
                            <div className="h-28 rounded-xl bg-[var(--color-atelier-creme)]/80 border border-[var(--color-atelier-grafite)]/10 flex items-center justify-center p-2 mb-2.5 overflow-hidden">
                              <div
                                className="w-full h-full flex items-center justify-center [&>svg]:max-w-full [&>svg]:max-h-full [&>svg]:w-auto [&>svg]:h-auto"
                                dangerouslySetInnerHTML={{ __html: previewSvg }}
                              />
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-xs text-[var(--color-atelier-grafite)] truncate">
                                {ab.name}
                              </span>
                              <span className="text-[9.5px] font-mono px-1.5 py-0.5 rounded bg-[var(--color-atelier-creme)] text-[var(--color-atelier-madeira)] shrink-0">
                                {Math.round(ab.bounds.width)}×{Math.round(ab.bounds.height)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-[var(--color-atelier-grafite)]/10">
                              <span className="text-[10px] font-mono text-[var(--color-atelier-madeira)] truncate">
                                {svgFilename}
                              </span>
                              <div
                                className="flex items-center gap-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  onClick={() => handleDownloadSingleArtboardSvg(ab)}
                                  className="px-2 py-0.5 rounded-lg bg-[var(--color-atelier-terracota)]/15 hover:bg-[var(--color-atelier-terracota)] text-[var(--color-atelier-terracota)] hover:text-white text-[10px] font-bold cursor-pointer transition-colors"
                                >
                                  SVG
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDownloadSingleArtboardPng(ab)}
                                  className="px-2 py-0.5 rounded-lg bg-[var(--color-atelier-creme)] border border-[var(--color-atelier-grafite)]/15 hover:bg-[var(--color-atelier-grafite)] text-[var(--color-atelier-grafite)] hover:text-white text-[10px] font-bold cursor-pointer transition-colors"
                                >
                                  PNG
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Lista de Variantes */}
                {exportMode === "saved-variants" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {activeProject.compositions.map((comp) => {
                      const checked = selectedExportVariantIds.includes(comp.id);
                      const previewSvg = activeSource
                        ? serializeCompositionToSvg({
                            sourceDoc: activeSource,
                            composition: comp,
                          }).svgString
                        : "";
                      return (
                        <div
                          key={comp.id}
                          onClick={() =>
                            setSelectedExportVariantIds((prev) =>
                              checked
                                ? prev.filter((id) => id !== comp.id)
                                : [...prev, comp.id]
                            )
                          }
                          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                            checked
                              ? "bg-white border-[var(--color-atelier-terracota)] shadow-xs"
                              : "bg-white/60 border-[var(--color-atelier-grafite)]/12 opacity-65"
                          }`}
                        >
                          <div className="h-24 rounded-xl bg-[var(--color-atelier-creme)]/80 border border-[var(--color-atelier-grafite)]/10 flex items-center justify-center p-2 mb-2.5 overflow-hidden">
                            {previewSvg && (
                              <div
                                className="w-full h-full flex items-center justify-center [&>svg]:max-w-full [&>svg]:max-h-full [&>svg]:w-auto [&>svg]:h-auto"
                                dangerouslySetInnerHTML={{ __html: previewSvg }}
                              />
                            )}
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-[var(--color-atelier-grafite)] truncate">
                              {comp.name}
                            </span>
                            <span
                              className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                comp.status === "approved"
                                  ? "bg-emerald-600/15 text-emerald-700"
                                  : "bg-[var(--color-atelier-creme)] text-[var(--color-atelier-madeira)]"
                              }`}
                            >
                              {comp.status === "approved" ? "Aprovada" : "Draft"}
                            </span>
                          </div>
                          <p className="text-[10.5px] text-[var(--color-atelier-madeira)] truncate mt-1">
                            {comp.description}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setExportStep(2)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--color-atelier-grafite)] hover:bg-[var(--color-atelier-terracota)] text-white text-xs font-bold cursor-pointer transition-colors"
                  >
                    <span>Próximo: Escolher Formatos</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* PASSO 2 & 3: FORMATOS, PERFIS E PARÂMETROS */}
            {(exportStep === 2 || exportStep === 3) && (
              <div className="glass-panel bg-white/85 border border-white rounded-[2rem] p-6 space-y-6 shadow-xs">
                <h2 className="font-elegant text-xl text-[var(--color-atelier-grafite)]">
                  Passos 2 & 3 — Formatos, Perfis de Saída e Parâmetros
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Formatos */}
                  <div className="p-5 rounded-2xl bg-[var(--color-atelier-creme)]/60 border border-[var(--color-atelier-grafite)]/12 space-y-3">
                    <span className="text-[10px] font-roboto font-bold uppercase tracking-widest text-[var(--color-atelier-madeira)] block">
                      Formatos Ativos
                    </span>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        {
                          id: "svg",
                          title: "SVG Vetorial",
                          desc: "Composição preservada e <defs> necessários incluídos.",
                          icon: <FileCode2 size={18} />,
                        },
                        {
                          id: "png",
                          title: "PNG Raster",
                          desc: "Alta resolução com transparência real ou fundo sólido.",
                          icon: <ImageIcon size={18} />,
                        },
                      ].map((fmt) => {
                        const active = selectedExportFormats.includes(fmt.id as any);
                        return (
                          <button
                            key={fmt.id}
                            type="button"
                            onClick={() => {
                              setSelectedExportFormats((prev) =>
                                active
                                  ? prev.length > 1
                                    ? prev.filter((f) => f !== fmt.id)
                                    : prev
                                  : [...prev, fmt.id as any]
                              );
                            }}
                            className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                              active
                                ? "border-[var(--color-atelier-terracota)] bg-white text-[var(--color-atelier-grafite)] shadow-2xs"
                                : "border-[var(--color-atelier-grafite)]/12 bg-white/50 text-[var(--color-atelier-madeira)]"
                            }`}
                          >
                            <div className="flex items-center gap-2 font-bold text-xs text-[var(--color-atelier-grafite)]">
                              <span className="text-[var(--color-atelier-terracota)]">{fmt.icon}</span>
                              <span>{fmt.title}</span>
                            </div>
                            <p className="text-[10.5px] text-[var(--color-atelier-madeira)] mt-1">{fmt.desc}</p>
                          </button>
                        );
                      })}
                    </div>

                    {/* Perfil SVG */}
                    <div className="pt-3 border-t border-[var(--color-atelier-grafite)]/10 space-y-2">
                      <span className="text-[10px] font-roboto font-bold uppercase tracking-widest text-[var(--color-atelier-madeira)] block">
                        Perfil de Saída SVG
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setExportSvgProfile("preserve-structure")}
                          className={`p-2.5 rounded-xl border text-left text-xs cursor-pointer transition-colors ${
                            exportSvgProfile === "preserve-structure"
                              ? "border-[var(--color-atelier-terracota)] bg-white text-[var(--color-atelier-grafite)] font-bold"
                              : "border-[var(--color-atelier-grafite)]/12 bg-white/50 text-[var(--color-atelier-madeira)]"
                          }`}
                        >
                          Preservar Estrutura (Padrão)
                        </button>
                        <button
                          type="button"
                          onClick={() => setExportSvgProfile("optimized")}
                          className={`p-2.5 rounded-xl border text-left text-xs cursor-pointer transition-colors ${
                            exportSvgProfile === "optimized"
                              ? "border-[var(--color-atelier-terracota)] bg-white text-[var(--color-atelier-grafite)] font-bold"
                              : "border-[var(--color-atelier-grafite)]/12 bg-white/50 text-[var(--color-atelier-madeira)]"
                          }`}
                        >
                          Otimizado (SVGO Safe)
                        </button>
                      </div>
                      <label className="flex items-center gap-2 text-[11px] text-[var(--color-atelier-madeira)] pt-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={exportPrefixIds}
                          onChange={(e) => setExportPrefixIds(e.target.checked)}
                          className="accent-[var(--color-atelier-terracota)]"
                        />
                        <span>
                          Prefixar IDs internos com nome da variante (evita colisão em páginas web)
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Dimensões PNG, Fundo e Enquadramento */}
                  <div className="p-5 rounded-2xl bg-[var(--color-atelier-creme)]/60 border border-[var(--color-atelier-grafite)]/12 space-y-4">
                    <div>
                      <span className="text-[10px] font-roboto font-bold uppercase tracking-widest text-[var(--color-atelier-madeira)] block mb-2">
                        Resoluções PNG (Maior Lado)
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        {[512, 1080, 2048, 4096].map((sz) => {
                          const active = exportPngScales.includes(sz);
                          return (
                            <button
                              key={sz}
                              type="button"
                              onClick={() =>
                                setExportPngScales((prev) =>
                                  active
                                    ? prev.length > 1
                                      ? prev.filter((s) => s !== sz)
                                      : prev
                                    : [...prev, sz]
                                )
                              }
                              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold border cursor-pointer transition-colors ${
                                active
                                  ? "border-[var(--color-atelier-terracota)] bg-[var(--color-atelier-terracota)] text-white"
                                  : "border-[var(--color-atelier-grafite)]/15 bg-white text-[var(--color-atelier-madeira)]"
                              }`}
                            >
                              {sz} px
                            </button>
                          );
                        })}
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={64}
                            max={8192}
                            value={customPngScale}
                            onChange={(e) => setCustomPngScale(Number(e.target.value))}
                            className="w-20 px-2.5 py-1 rounded-xl bg-white border border-[var(--color-atelier-grafite)]/15 text-xs font-mono text-[var(--color-atelier-grafite)]"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (
                                customPngScale >= 64 &&
                                !exportPngScales.includes(customPngScale)
                              ) {
                                setExportPngScales((prev) => [...prev, customPngScale]);
                              }
                            }}
                            className="px-2.5 py-1 rounded-xl bg-[var(--color-atelier-grafite)] text-xs text-white cursor-pointer"
                          >
                            + Add
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[var(--color-atelier-grafite)]/10">
                      <div>
                        <span className="text-[10px] font-roboto font-bold uppercase tracking-widest text-[var(--color-atelier-madeira)] block mb-1.5">
                          Fundo de Saída
                        </span>
                        <select
                          value={exportBgMode}
                          onChange={(e) => setExportBgMode(e.target.value as any)}
                          className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-[var(--color-atelier-grafite)]/15 text-xs text-[var(--color-atelier-grafite)] font-semibold"
                        >
                          <option value="transparent">Transparente (Padrão)</option>
                          <option value="white">Branco (#FFFFFF)</option>
                          <option value="black">Preto (#0A0A0C)</option>
                          <option value="brand">Azul Veronna (#142C48)</option>
                          <option value="custom">Cor Personalizada</option>
                        </select>
                      </div>

                      <div>
                        <span className="text-[10px] font-roboto font-bold uppercase tracking-widest text-[var(--color-atelier-madeira)] block mb-1.5">
                          Enquadramento
                        </span>
                        <select
                          value={exportFramingMode}
                          onChange={(e) => setExportFramingMode(e.target.value as any)}
                          className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-[var(--color-atelier-grafite)]/15 text-xs text-[var(--color-atelier-grafite)] font-semibold"
                        >
                          <option value="original-viewbox">ViewBox Original</option>
                          <option value="fit-to-content">Ajustar ao Conteúdo</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[var(--color-atelier-grafite)]/10">
                      <div>
                        <span className="text-[10px] font-roboto font-bold uppercase tracking-widest text-[var(--color-atelier-madeira)] block mb-1">
                          Sufixo Opcional de Nome
                        </span>
                        <input
                          type="text"
                          value={exportSuffix}
                          onChange={(e) => setExportSuffix(e.target.value)}
                          placeholder="ex: vFinal_RGB"
                          className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-[var(--color-atelier-grafite)]/15 text-xs text-[var(--color-atelier-grafite)]"
                        />
                      </div>
                      <div className="flex items-end pb-1">
                        <label className="flex items-center gap-2 text-xs text-[var(--color-atelier-grafite)] font-semibold cursor-pointer">
                          <input
                            type="checkbox"
                            checked={exportIncludeZip}
                            onChange={(e) => setExportIncludeZip(e.target.checked)}
                            className="accent-[var(--color-atelier-terracota)]"
                          />
                          <span>Gerar pacote .ZIP + manifest.json</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between">
                  <button
                    type="button"
                    onClick={() => setExportStep(1)}
                    className="px-4 py-2 rounded-xl border border-[var(--color-atelier-grafite)]/15 bg-white text-xs font-semibold text-[var(--color-atelier-madeira)] hover:text-[var(--color-atelier-grafite)] cursor-pointer"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    onClick={() => setExportStep(4)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--color-atelier-grafite)] hover:bg-[var(--color-atelier-terracota)] text-white text-xs font-bold cursor-pointer transition-colors"
                  >
                    <span>
                      Revisar Lote ({plannedBatchItems.length} arquivo
                      {plannedBatchItems.length === 1 ? "" : "s"})
                    </span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* PASSO 4: REVISAR ANTES DE EXPORTAR (TABELA COM EDIÇÃO DE NOME DE ARQUIVO) */}
            {exportStep === 4 && (
              <div className="glass-panel bg-white/85 border border-white rounded-[2rem] p-6 space-y-5 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="font-elegant text-xl text-[var(--color-atelier-grafite)]">
                      Passo 4 — Revisão Pré-Exportação ({plannedBatchItems.length} arquivos previstos)
                    </h2>
                    <p className="text-xs text-[var(--color-atelier-madeira)]">
                      Você pode ajustar qualquer nome de arquivo individualmente abaixo sem alterar o nome da variante no projeto.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={executeBatchExportJob}
                    disabled={plannedBatchItems.length === 0}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-[var(--color-atelier-terracota)] hover:bg-[#234E80] text-white text-xs font-bold shadow-sm cursor-pointer transition-colors"
                  >
                    <Package size={15} />
                    <span>Confirmar e Processar Lote ({plannedBatchItems.length})</span>
                  </button>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-[var(--color-atelier-grafite)]/12 bg-white">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[var(--color-atelier-creme)]/80 text-[var(--color-atelier-madeira)] uppercase text-[10px] font-roboto tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Variante / Origem</th>
                        <th className="py-3 px-4">Formato</th>
                        <th className="py-3 px-4">Dimensões</th>
                        <th className="py-3 px-4">Fundo</th>
                        <th className="py-3 px-4">Nome de Arquivo Final (Editável)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-atelier-grafite)]/10">
                      {plannedBatchItems.map((item) => (
                        <tr key={item.key} className="hover:bg-[var(--color-atelier-creme)]/40">
                          <td className="py-2.5 px-4 font-semibold text-[var(--color-atelier-grafite)]">
                            {item.composition.name}
                            {item.groupLabel ? ` / ${item.groupLabel}` : ""}
                          </td>
                          <td className="py-2.5 px-4 font-mono uppercase">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                item.format === "svg"
                                  ? "bg-[var(--color-atelier-terracota)]/15 text-[var(--color-atelier-terracota)]"
                                  : "bg-[var(--color-atelier-grafite)]/15 text-[var(--color-atelier-grafite)]"
                              }`}
                            >
                              {item.format}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 font-mono text-[var(--color-atelier-madeira)]">
                            {item.dimensionsLabel}
                          </td>
                          <td className="py-2.5 px-4 text-[var(--color-atelier-madeira)] capitalize">
                            {exportBgMode}
                          </td>
                          <td className="py-2.5 px-4">
                            <input
                              type="text"
                              value={
                                customOutputFilenames[item.key] ?? item.defaultFilename
                              }
                              onChange={(e) =>
                                setCustomOutputFilenames((prev) => ({
                                  ...prev,
                                  [item.key]: e.target.value,
                                }))
                              }
                              className="w-full max-w-md px-3 py-1 rounded-xl bg-[var(--color-atelier-creme)]/60 border border-[var(--color-atelier-grafite)]/15 focus:border-[var(--color-atelier-terracota)] focus:bg-white font-mono text-[11px] text-[var(--color-atelier-grafite)] outline-none"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* PASSO 5: PROCESSAR E BAIXAR */}
            {exportStep === 5 && (
              <div className="glass-panel bg-white/85 border border-white rounded-[2rem] p-6 space-y-5 shadow-xs">
                {exportJobs.length > 0 ? (
                  (() => {
                    const latestJob = exportJobs[0];
                    return (
                      <>
                        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--color-atelier-grafite)]/12 pb-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono text-[var(--color-atelier-terracota)] font-bold">
                                Job #{latestJob.id}
                              </span>
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-600/15 text-emerald-700">
                                {latestJob.status}
                              </span>
                            </div>
                            <h2 className="font-elegant text-xl text-[var(--color-atelier-grafite)] mt-1">
                              Resultado do Lote — {latestJob.completedItems} de{" "}
                              {latestJob.totalItems} concluídos
                            </h2>
                          </div>

                          <div className="flex items-center gap-2.5">
                            {latestJob.zipArtifactUrl && (
                              <a
                                href={latestJob.zipArtifactUrl}
                                download={latestJob.zipFilename || "Pacote_Veronna.zip"}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--color-atelier-terracota)] hover:bg-[#234E80] text-white text-xs font-bold shadow-xs transition-colors"
                              >
                                <Download size={14} />
                                <span>Baixar ZIP Completo + Manifesto</span>
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => setExportStep(1)}
                              className="px-3.5 py-2 rounded-xl bg-white border border-[var(--color-atelier-grafite)]/15 text-xs font-semibold text-[var(--color-atelier-grafite)] cursor-pointer"
                            >
                              Novo Lote
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                          {latestJob.items.map((it) => (
                            <div
                              key={it.id}
                              className="p-3.5 rounded-2xl bg-[var(--color-atelier-creme)]/60 border border-[var(--color-atelier-grafite)]/12 flex items-center justify-between gap-3"
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-white text-[var(--color-atelier-terracota)] border border-[var(--color-atelier-terracota)]/25 font-bold">
                                    {it.format}
                                  </span>
                                  <span className="text-xs font-bold text-[var(--color-atelier-grafite)] truncate">
                                    {it.outputFilename}
                                  </span>
                                </div>
                                <div className="text-[10px] font-mono text-[var(--color-atelier-madeira)] mt-1">
                                  {it.dimensionsLabel} • SHA-256:{" "}
                                  {it.checksumSha256?.slice(0, 14) || "..."}
                                </div>
                              </div>

                              {it.status === "completed" && it.artifactUrl ? (
                                <a
                                  href={it.artifactUrl}
                                  download={it.outputFilename}
                                  className="px-3.5 py-1.5 rounded-xl bg-[var(--color-atelier-grafite)] hover:bg-[var(--color-atelier-terracota)] text-white text-xs font-bold transition-colors shrink-0"
                                >
                                  Baixar
                                </a>
                              ) : (
                                <span className="text-xs font-mono text-amber-700">
                                  {it.status}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </>
                    );
                  })()
                ) : (
                  <div className="text-center py-12 text-xs text-[var(--color-atelier-madeira)]">
                    Nenhum lote executado ainda. Configure os passos 1 a 4 para iniciar.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* TELA 7.6: MOTION STUDIO (5,000 SEGUNDOS DETERMINÍSTICO @ 30 FPS)     */}
        {/* ------------------------------------------------------------------- */}
        {activeTab === "motion" && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {!activeSource ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-3">
                <Film size={28} className="text-[var(--color-atelier-terracota)]" />
                <h3 className="font-elegant text-xl text-[var(--color-atelier-grafite)]">
                  Nenhum SVG carregado para animar
                </h3>
                <p className="text-xs text-[var(--color-atelier-madeira)] max-w-sm">
                  Importe um arquivo SVG para configurar os papéis na coreografia de 5.00s e renderizar o vídeo MP4.
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 rounded-xl bg-[var(--color-atelier-grafite)] hover:bg-[var(--color-atelier-terracota)] text-white text-xs font-bold cursor-pointer transition-colors"
                >
                  Importar Arquivo SVG
                </button>
              </div>
            ) : (
              <>
                <div className="flex-1 flex min-h-0 overflow-hidden">
                  {/* ESQUERDA (COLAPSÁVEL): LISTA COMPACTA DE PAPÉIS DOS COMPONENTES */}
                  {isLeftPanelOpen && (
                    <aside className="w-60 shrink-0 bg-white/90 backdrop-blur-xl border-r border-[var(--color-atelier-grafite)]/10 flex flex-col min-h-0">
                      <div className="p-3 border-b border-[var(--color-atelier-grafite)]/10 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)] block">
                            Papéis na Coreografia
                          </span>
                          <span className="text-[10px] text-[var(--color-atelier-madeira)] truncate block max-w-[140px]">
                            {activeComposition?.name}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            applyCompositionMutation("Auto-classificar papéis", () => ({
                              roleOverrides: {},
                            }));
                            notifyToast("Papéis reclassificados automaticamente.");
                          }}
                          className="text-[10px] text-[var(--color-atelier-terracota)] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Wand2 size={10} />
                          <span>Auto</span>
                        </button>
                      </div>

                      <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                        {activeSource.nodes
                          .filter(
                            (n) =>
                              n.depth <= 1 &&
                              isNodeEffectivelyVisible(
                                n.id,
                                nodesMap,
                                activeComposition?.visibilityOverrides || {}
                              )
                          )
                          .map((n) => {
                            const currentRole =
                              activeComposition?.roleOverrides?.[n.id] || n.motionRole;
                            const roleMeta = ROLE_LABELS[currentRole];
                            return (
                              <div
                                key={n.id}
                                className="flex items-center justify-between gap-1.5 text-[11px] bg-[var(--color-atelier-creme)]/45 hover:bg-white px-2.5 py-1.5 rounded-xl border border-[var(--color-atelier-grafite)]/10 transition-colors"
                              >
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span
                                    className="w-2 h-2 rounded-full shrink-0"
                                    style={{ backgroundColor: roleMeta.color }}
                                  />
                                  <span className="truncate text-[var(--color-atelier-grafite)] font-medium">
                                    {activeComposition?.nameOverrides?.[n.id] ||
                                      n.displayName}
                                  </span>
                                </div>
                                <select
                                  value={currentRole}
                                  onChange={(e) => {
                                    const nextRole = e.target.value as MotionRole;
                                    applyCompositionMutation(
                                      `Alterar papel de ${n.displayName}`,
                                      (c) => ({
                                        roleOverrides: {
                                          ...c.roleOverrides,
                                          [n.id]: nextRole,
                                        },
                                      })
                                    );
                                  }}
                                  className="bg-white text-[10px] text-[var(--color-atelier-grafite)] font-semibold rounded-lg px-1.5 py-0.5 border border-[var(--color-atelier-grafite)]/15 outline-none shrink-0 cursor-pointer"
                                >
                                  <option value="symbol">Símbolo</option>
                                  <option value="wordmark">Lettering</option>
                                  <option value="descriptor">Descritor</option>
                                  <option value="detail">Detalhe</option>
                                  <option value="background">Fundo</option>
                                  <option value="generic">Genérico</option>
                                </select>
                              </div>
                            );
                          })}
                      </div>
                    </aside>
                  )}

                  {/* CENTRO: STAGE DE PREVIEW DO MOTION (16:9 / 1:1 / 9:16) */}
                  <section className="flex-1 flex flex-col min-w-0 bg-[#E9E1D2]/55 relative overflow-hidden">
                    {/* Pílula Flutuante Superior: Proporção e Guias */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-20">
                      <div className="pointer-events-auto flex items-center gap-2 px-3 py-1 rounded-xl bg-white/90 backdrop-blur-md border border-[var(--color-atelier-grafite)]/12 shadow-xs text-xs">
                        <span className="font-semibold text-[var(--color-atelier-grafite)] truncate max-w-[160px]">
                          {activeMotion?.name || "Motion 5.00s"}
                        </span>
                        {currentMotionFrameRender && (
                          <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-[var(--color-atelier-terracota)]/12 text-[var(--color-atelier-terracota)]">
                            {currentMotionFrameRender.evaluated.phaseLabel}
                          </span>
                        )}
                      </div>

                      <div className="pointer-events-auto flex items-center gap-1 bg-white/90 backdrop-blur-md p-1 rounded-xl border border-[var(--color-atelier-grafite)]/12 shadow-xs">
                        {(
                          [
                            { id: "landscape", label: "16:9" },
                            { id: "square", label: "1:1" },
                            { id: "portrait", label: "9:16" },
                          ] as Array<{ id: CanvasAspectRatioProfile; label: string }>
                        ).map((prof) => (
                          <button
                            key={prof.id}
                            type="button"
                            onClick={() =>
                              updateActiveMotionSpec((s) => ({
                                ...s,
                                canvasProfile: prof.id,
                              }))
                            }
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold cursor-pointer transition-colors ${
                              activeMotion?.config.canvasProfile === prof.id
                                ? "bg-[var(--color-atelier-terracota)] text-white"
                                : "text-[var(--color-atelier-madeira)] hover:text-[var(--color-atelier-grafite)]"
                            }`}
                          >
                            {prof.label}
                          </button>
                        ))}

                        <div className="w-px h-3.5 bg-[var(--color-atelier-grafite)]/15 mx-0.5" />

                        <button
                          type="button"
                          onClick={() => setShowSafeAreaGuides((g) => !g)}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold cursor-pointer transition-colors ${
                            showSafeAreaGuides
                              ? "text-emerald-700 bg-emerald-600/12"
                              : "text-[var(--color-atelier-madeira)]"
                          }`}
                        >
                          Guias
                        </button>
                      </div>
                    </div>

                    {/* Quadro do Vídeo Renderizado em Tempo Real */}
                    <div className="flex-1 flex items-center justify-center p-8 overflow-hidden relative">
                      {currentMotionFrameRender ? (
                        <div
                          className="relative rounded-2xl overflow-hidden shadow-[0_24px_60px_-12px_rgba(20, 44, 72,0.35)] border border-white flex items-center justify-center bg-[#111318]"
                          style={{
                            maxWidth: "100%",
                            maxHeight: "100%",
                            aspectRatio:
                              activeMotion?.config.canvasProfile === "square"
                                ? "1 / 1"
                                : activeMotion?.config.canvasProfile === "portrait"
                                ? "9 / 16"
                                : "16 / 9",
                          }}
                        >
                          <div
                            className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"
                            dangerouslySetInnerHTML={{
                              __html: currentMotionFrameRender.svgString,
                            }}
                          />
                        </div>
                      ) : (
                        <div className="text-xs text-[var(--color-atelier-madeira)]">
                          Selecione uma variante válida para pré-visualizar o motion.
                        </div>
                      )}
                    </div>
                  </section>

                  {/* DIREITA (COLAPSÁVEL): PRESET EM MENU & PARÂMETROS COMPACTOS */}
                  {isRightPanelOpen && (
                    <aside className="w-68 shrink-0 bg-white/90 backdrop-blur-xl border-l border-[var(--color-atelier-grafite)]/10 flex flex-col min-h-0 overflow-y-auto custom-scrollbar">
                      <div className="p-3 border-b border-[var(--color-atelier-grafite)]/10 flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-madeira)]">
                          Inspetor Motion
                        </span>
                        <button
                          type="button"
                          onClick={handleDuplicateActiveMotion}
                          className="text-[10px] text-[var(--color-atelier-terracota)] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Copy size={10} />
                          <span>Duplicar</span>
                        </button>
                      </div>

                      {activeMotion && (
                        <div className="p-3.5 space-y-3.5 text-xs">
                          {/* Menu Dropdown de Família de Preset (A a F) */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-atelier-madeira)] block">
                              Família Coreográfica (Preset)
                            </label>
                            <select
                              value={activeMotion.config.presetId}
                              onChange={(e) => {
                                const preset = MOTION_PRESET_LIBRARY.find(
                                  (p) => p.id === e.target.value
                                );
                                if (!preset) return;
                                updateActiveMotionSpec((prev) => ({
                                  ...preset.defaultSpec,
                                  canvasProfile: prev.canvasProfile,
                                  backgroundColor: prev.backgroundColor,
                                  backgroundMode: prev.backgroundMode,
                                }));
                                setCurrentFrame(0);
                                setIsPlayingMotion(true);
                              }}
                              className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--color-atelier-creme)]/60 border border-[var(--color-atelier-grafite)]/15 text-[11.5px] font-bold text-[var(--color-atelier-grafite)] outline-none cursor-pointer"
                            >
                              {MOTION_PRESET_LIBRARY.map((preset) => (
                                <option key={preset.id} value={preset.id}>
                                  {preset.code} — {preset.name}
                                </option>
                              ))}
                            </select>
                            <p className="text-[10px] text-[var(--color-atelier-madeira)] leading-snug pt-0.5">
                              {
                                MOTION_PRESET_LIBRARY.find(
                                  (p) => p.id === activeMotion.config.presetId
                                )?.subtitle
                              }
                            </p>
                          </div>

                          {/* Direção & Easing em Lista Compacta */}
                          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--color-atelier-grafite)]/10">
                            <div>
                              <label className="text-[10px] text-[var(--color-atelier-madeira)] block mb-1">
                                Entrada
                              </label>
                              <select
                                value={activeMotion.config.entryDirection}
                                onChange={(e) =>
                                  updateActiveMotionSpec((s) => ({
                                    ...s,
                                    entryDirection: e.target.value as EntryDirection,
                                  }))
                                }
                                className="w-full px-2 py-1 rounded-lg bg-[var(--color-atelier-creme)]/60 border border-[var(--color-atelier-grafite)]/15 text-[11px] font-semibold text-[var(--color-atelier-grafite)]"
                              >
                                <option value="bottom">De Baixo</option>
                                <option value="top">De Cima</option>
                                <option value="left">Esquerda</option>
                                <option value="right">Direita</option>
                                <option value="center">Centro</option>
                                <option value="preset">Preset</option>
                              </select>
                            </div>

                            <div>
                              <label className="text-[10px] text-[var(--color-atelier-madeira)] block mb-1">
                                Curva Easing
                              </label>
                              <select
                                value={activeMotion.config.easing}
                                onChange={(e) =>
                                  updateActiveMotionSpec((s) => ({
                                    ...s,
                                    easing: e.target.value as EasingCurveId,
                                  }))
                                }
                                className="w-full px-2 py-1 rounded-lg bg-[var(--color-atelier-creme)]/60 border border-[var(--color-atelier-grafite)]/15 text-[11px] font-semibold text-[var(--color-atelier-grafite)]"
                              >
                                <option value="editorial_smooth">Editorial Quint</option>
                                <option value="crisp_out">Crisp Cubic</option>
                                <option value="cinematic_quart">Cinematic Quart</option>
                                <option value="soft_overshoot">Overshoot 4%</option>
                                <option value="linear">Linear</option>
                              </select>
                            </div>
                          </div>

                          {/* Sliders Essenciais */}
                          <div className="space-y-2.5 pt-2 border-t border-[var(--color-atelier-grafite)]/10">
                            <div>
                              <div className="flex justify-between text-[10.5px] mb-0.5">
                                <span className="text-[var(--color-atelier-madeira)]">Deslocamento</span>
                                <span className="font-mono font-bold text-[var(--color-atelier-grafite)]">
                                  {activeMotion.config.displacementDistancePct}%
                                </span>
                              </div>
                              <input
                                type="range"
                                min={0}
                                max={50}
                                value={activeMotion.config.displacementDistancePct}
                                onChange={(e) =>
                                  updateActiveMotionSpec((s) => ({
                                    ...s,
                                    displacementDistancePct: Number(e.target.value),
                                  }))
                                }
                                className="w-full accent-[var(--color-atelier-terracota)]"
                              />
                            </div>

                            <div>
                              <div className="flex justify-between text-[10.5px] mb-0.5">
                                <span className="text-[var(--color-atelier-madeira)]">
                                  Atraso entre Papéis
                                </span>
                                <span className="font-mono font-bold text-[var(--color-atelier-grafite)]">
                                  {activeMotion.config.staggerDelayMs} ms
                                </span>
                              </div>
                              <input
                                type="range"
                                min={0}
                                max={350}
                                step={10}
                                value={activeMotion.config.staggerDelayMs}
                                onChange={(e) =>
                                  updateActiveMotionSpec((s) => ({
                                    ...s,
                                    staggerDelayMs: Number(e.target.value),
                                  }))
                                }
                                className="w-full accent-[var(--color-atelier-terracota)]"
                              />
                            </div>

                            <div>
                              <span className="text-[10px] text-[var(--color-atelier-madeira)] block mb-1">
                                Fundo do Vídeo MP4
                              </span>
                              <div className="flex items-center gap-1">
                                {[
                                  { mode: "dark", col: "#111318", label: "Grafite" },
                                  { mode: "light", col: "#E8E3DD", label: "Alabastro" },
                                  { mode: "brand", col: "#142C48", label: "Veronna" },
                                ].map((b) => (
                                  <button
                                    key={b.label}
                                    type="button"
                                    onClick={() =>
                                      updateActiveMotionSpec((s) => ({
                                        ...s,
                                        backgroundMode: b.mode as any,
                                        backgroundColor: b.col,
                                      }))
                                    }
                                    className={`flex-1 py-1 px-1.5 rounded-lg border text-[10px] font-semibold cursor-pointer transition-colors ${
                                      activeMotion.config.backgroundColor === b.col
                                        ? "border-[var(--color-atelier-terracota)] text-[var(--color-atelier-terracota)] bg-[var(--color-atelier-terracota)]/12 font-bold"
                                        : "border-[var(--color-atelier-grafite)]/15 bg-white text-[var(--color-atelier-madeira)]"
                                    }`}
                                  >
                                    {b.label}
                                  </button>
                                ))}
                                <input
                                  type="color"
                                  value={activeMotion.config.backgroundColor}
                                  onChange={(e) =>
                                    updateActiveMotionSpec((s) => ({
                                      ...s,
                                      backgroundMode: "custom",
                                      backgroundColor: e.target.value,
                                    }))
                                  }
                                  className="w-6 h-6 rounded border-0 bg-transparent cursor-pointer shrink-0"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Ajustes Avançados Colapsáveis */}
                          <div className="pt-2 border-t border-[var(--color-atelier-grafite)]/10">
                            <button
                              type="button"
                              onClick={() => setShowAdvancedMotionParams((v) => !v)}
                              className="w-full flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[var(--color-atelier-madeira)] hover:text-[var(--color-atelier-grafite)] py-1 cursor-pointer"
                            >
                              <span>Acabamento Avançado</span>
                              {showAdvancedMotionParams ? (
                                <ChevronDown size={12} />
                              ) : (
                                <ChevronRight size={12} />
                              )}
                            </button>

                            {showAdvancedMotionParams && (
                              <div className="mt-2 space-y-2.5 p-2.5 rounded-xl bg-[var(--color-atelier-creme)]/55 border border-[var(--color-atelier-grafite)]/10">
                                <div>
                                  <div className="flex justify-between text-[10px] mb-0.5">
                                    <span className="text-[var(--color-atelier-madeira)]">Escala Inicial</span>
                                    <span className="font-mono font-bold">
                                      {Math.round(activeMotion.config.initialScale * 100)}%
                                    </span>
                                  </div>
                                  <input
                                    type="range"
                                    min={0.7}
                                    max={1.25}
                                    step={0.02}
                                    value={activeMotion.config.initialScale}
                                    onChange={(e) =>
                                      updateActiveMotionSpec((s) => ({
                                        ...s,
                                        initialScale: Number(e.target.value),
                                      }))
                                    }
                                    className="w-full accent-[var(--color-atelier-terracota)]"
                                  />
                                </div>

                                <div>
                                  <div className="flex justify-between text-[10px] mb-0.5">
                                    <span className="text-[var(--color-atelier-madeira)]">Blur de Entrada</span>
                                    <span className="font-mono font-bold">
                                      {activeMotion.config.blurStrengthPx} px
                                    </span>
                                  </div>
                                  <input
                                    type="range"
                                    min={0}
                                    max={14}
                                    step={1}
                                    value={activeMotion.config.blurStrengthPx}
                                    onChange={(e) =>
                                      updateActiveMotionSpec((s) => ({
                                        ...s,
                                        blurStrengthPx: Number(e.target.value),
                                      }))
                                    }
                                    className="w-full accent-[var(--color-atelier-terracota)]"
                                  />
                                </div>

                                <div>
                                  <div className="flex justify-between text-[10px] mb-0.5">
                                    <span className="text-[var(--color-atelier-madeira)]">Passagem de Luz</span>
                                    <span className="font-mono font-bold">
                                      {Math.round(activeMotion.config.accentLightIntensity * 100)}%
                                    </span>
                                  </div>
                                  <input
                                    type="range"
                                    min={0}
                                    max={1}
                                    step={0.05}
                                    value={activeMotion.config.accentLightIntensity}
                                    onChange={(e) =>
                                      updateActiveMotionSpec((s) => ({
                                        ...s,
                                        accentLightIntensity: Number(e.target.value),
                                      }))
                                    }
                                    className="w-full accent-[var(--color-atelier-terracota)]"
                                  />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Seção de Exportação de Vídeo MP4 */}
                          <div className="pt-2 border-t border-[var(--color-atelier-grafite)]/10 space-y-2">
                            <button
                              type="button"
                              onClick={handleRenderFinalMotionVideo}
                              disabled={globalState === "render-running"}
                              className="w-full py-2 px-3 rounded-xl bg-[var(--color-atelier-terracota)] hover:bg-[#234E80] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50 transition-colors"
                            >
                              <Film size={13} />
                              <span>
                                {globalState === "render-running"
                                  ? "Renderizando 150 Frames..."
                                  : "Renderizar Vídeo MP4 (5.00s)"}
                              </span>
                            </button>

                            {renderJobs.length > 0 && renderJobs[0].artifact && (
                              <div className="p-2.5 rounded-xl bg-emerald-600/10 border border-emerald-600/25 flex items-center justify-between gap-2">
                                <span className="text-[10.5px] font-bold text-emerald-700 truncate">
                                  ✓ MP4 Pronto ({renderJobs[0].artifact.width}×
                                  {renderJobs[0].artifact.height})
                                </span>
                                <a
                                  href={renderJobs[0].artifact.videoUrl}
                                  download={`${activeProject?.name.replace(
                                    /\s+/g,
                                    "_"
                                  )}_Motion_5s.mp4`}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-700 text-white font-bold text-[10.5px] shrink-0"
                                >
                                  Baixar MP4
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </aside>
                  )}
                </div>

                {/* TIMELINE COMPACTA DE 5,000 SEGUNDOS (150 FRAMES @ 30 FPS) */}
                <div className="h-28 bg-white/95 border-t border-[var(--color-atelier-grafite)]/10 px-4 py-2 flex flex-col justify-between shrink-0">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          if (!isPlayingMotion && currentFrame >= 149) setCurrentFrame(0);
                          setIsPlayingMotion((p) => !p);
                        }}
                        className="w-7 h-7 rounded-lg bg-[var(--color-atelier-terracota)] hover:bg-[#234E80] text-white flex items-center justify-center cursor-pointer transition-colors"
                        title="Play / Pause (Espaço)"
                      >
                        {isPlayingMotion ? <Pause size={13} /> : <Play size={13} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsPlayingMotion(false);
                          setCurrentFrame(0);
                        }}
                        className="p-1.5 rounded-lg bg-[var(--color-atelier-creme)]/70 border border-[var(--color-atelier-grafite)]/15 text-[var(--color-atelier-madeira)] hover:text-[var(--color-atelier-grafite)] cursor-pointer"
                        title="Início"
                      >
                        <RotateCcw size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsPlayingMotion(false);
                          setCurrentFrame(149);
                        }}
                        className="px-2 py-1 rounded-lg bg-[var(--color-atelier-creme)]/70 border border-[var(--color-atelier-grafite)]/15 text-[10.5px] font-semibold text-[var(--color-atelier-terracota)] flex items-center gap-1 cursor-pointer"
                      >
                        <SkipForward size={11} />
                        <span>Quadro Final</span>
                      </button>

                      <label className="flex items-center gap-1 text-[10.5px] text-[var(--color-atelier-madeira)] ml-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isLoopEnabled}
                          onChange={(e) => setIsLoopEnabled(e.target.checked)}
                          className="accent-[var(--color-atelier-terracota)]"
                        />
                        <span>Loop</span>
                      </label>
                    </div>

                    <div className="flex items-center gap-2 font-mono text-[11px]">
                      <span className="px-2 py-0.5 rounded-lg bg-[var(--color-atelier-creme)] border border-[var(--color-atelier-grafite)]/15 text-[var(--color-atelier-grafite)] font-bold">
                        {((currentFrame / 149) * 5).toFixed(2)}s / 05.00s
                      </span>
                      <span className="text-[var(--color-atelier-madeira)] text-[10px]">
                        F{String(currentFrame + 1).padStart(3, "0")}/150
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <input
                      type="range"
                      min={0}
                      max={149}
                      value={currentFrame}
                      onChange={(e) => {
                        setIsPlayingMotion(false);
                        setCurrentFrame(Number(e.target.value));
                      }}
                      className="w-full accent-[var(--color-atelier-terracota)] cursor-pointer h-1.5"
                    />

                    <div className="grid grid-cols-6 gap-1 text-[9px] font-mono">
                      {CHOREOGRAPHY_PHASES.map((ph) => {
                        const tSec = (currentFrame / 149) * 5.0;
                        const isActivePhase = tSec >= ph.startSec && tSec <= ph.endSec;
                        return (
                          <div
                            key={ph.id}
                            onClick={() => {
                              setIsPlayingMotion(false);
                              setCurrentFrame(Math.round((ph.startSec / 5.0) * 149));
                            }}
                            style={{
                              borderColor: isActivePhase ? ph.color : "rgba(20, 44, 72,0.18)",
                              backgroundColor: isActivePhase ? `${ph.color}18` : "#E8E3DD",
                            }}
                            className="px-1.5 py-0.5 rounded border cursor-pointer transition-colors flex items-center justify-between truncate"
                            title={ph.intent}
                          >
                            <span className="font-bold text-[var(--color-atelier-grafite)] truncate">
                              {ph.label}
                            </span>
                            <span className="text-[var(--color-atelier-madeira)] ml-1 hidden sm:inline">
                              {ph.startSec.toFixed(1)}s
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* TELA 7.7: CENTRAL DE JOBS, ENTREGAS E AUDITORIA                     */}
        {/* ------------------------------------------------------------------- */}
        {activeTab === "jobs" && (
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar flex flex-col gap-5">
            <div className="flex flex-wrap items-center justify-between border-b border-[var(--color-atelier-grafite)]/12 pb-4 gap-3">
              <div>
                <h1 className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">
                  Central de Jobs, Entregas & Auditoria
                </h1>
                <p className="text-xs text-[var(--color-atelier-madeira)]">
                  Acompanhe pacotes de exportação em lote, renders de vídeo MP4 de 5s, falhas individuais e rastreabilidade.
                </p>
              </div>

              <div className="flex items-center gap-1.5 bg-white/85 p-1 rounded-2xl border border-[var(--color-atelier-grafite)]/12 shadow-2xs">
                {[
                  { id: "exports", label: `Exportações (${exportJobs.length})` },
                  { id: "motions", label: `Motions (${renderJobs.length})` },
                  {
                    id: "failures",
                    label: `Falhas (${
                      exportJobs.filter((j) => j.failedItems > 0).length +
                      renderJobs.filter((r) => r.status === "failed").length
                    })`,
                  },
                  { id: "audit", label: `Auditoria (${auditLogs.length})` },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setJobsSubTab(t.id as any)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                      jobsSubTab === t.id
                        ? "bg-[var(--color-atelier-grafite)] text-white"
                        : "text-[var(--color-atelier-madeira)] hover:text-[var(--color-atelier-grafite)]"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {jobsSubTab === "exports" && (
              <div className="space-y-3">
                {exportJobs.length === 0 ? (
                  <div className="p-10 rounded-[2rem] glass-panel bg-white/80 border border-white text-center text-xs text-[var(--color-atelier-madeira)]">
                    Nenhum job de exportação em lote registrado nesta sessão.
                  </div>
                ) : (
                  exportJobs.map((job) => (
                    <div
                      key={job.id}
                      className="p-5 rounded-[1.75rem] glass-panel bg-white/85 border border-white flex flex-wrap items-center justify-between gap-4 shadow-2xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-[var(--color-atelier-terracota)] font-bold">
                            {job.id}
                          </span>
                          <span className="font-elegant text-base text-[var(--color-atelier-grafite)]">
                            {job.projectName}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-600/15 text-emerald-700">
                            {job.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--color-atelier-madeira)] font-mono mt-1">
                          Concluídos: {job.completedItems}/{job.totalItems} • Falhas:{" "}
                          {job.failedItems} • Correlation: {job.correlationId}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {job.zipArtifactUrl && (
                          <a
                            href={job.zipArtifactUrl}
                            download={job.zipFilename || "Pacote.zip"}
                            className="px-4 py-2 rounded-xl bg-[var(--color-atelier-terracota)] hover:bg-[#234E80] text-white text-xs font-bold transition-colors"
                          >
                            Baixar ZIP
                          </a>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {jobsSubTab === "motions" && (
              <div className="space-y-3">
                {renderJobs.length === 0 ? (
                  <div className="p-10 rounded-[2rem] glass-panel bg-white/80 border border-white text-center text-xs text-[var(--color-atelier-madeira)]">
                    Nenhum job de renderização de motion iniciado ainda.
                  </div>
                ) : (
                  renderJobs.map((rj) => (
                    <div
                      key={rj.id}
                      className="p-5 rounded-[1.75rem] glass-panel bg-white/85 border border-white flex flex-wrap items-center justify-between gap-4 shadow-2xs"
                    >
                      <div className="flex items-center gap-3">
                        {rj.artifact?.thumbnailDataUrl && (
                          <img
                            src={rj.artifact.thumbnailDataUrl}
                            alt="Thumbnail"
                            className="w-16 h-10 object-contain rounded-lg bg-[#111318] border border-[var(--color-atelier-grafite)]/15"
                          />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-[var(--color-atelier-terracota)] font-bold">
                              {rj.id}
                            </span>
                            <span className="font-elegant text-base text-[var(--color-atelier-grafite)]">
                              {rj.motionProjectName}
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-600/15 text-emerald-700">
                              {rj.status} ({rj.progress}%)
                            </span>
                          </div>
                          {rj.artifact && (
                            <p className="text-[11px] font-mono text-[var(--color-atelier-madeira)] mt-1">
                              {rj.artifact.width}×{rj.artifact.height} • 30 fps • 5,000s •
                              SHA-256: {rj.artifact.checksumSha256.slice(0, 16)}...
                            </p>
                          )}
                        </div>
                      </div>

                      {rj.artifact && (
                        <div className="flex items-center gap-2">
                          <a
                            href={rj.artifact.videoUrl}
                            download={`${rj.motionProjectName.replace(/\s+/g, "_")}.mp4`}
                            className="px-4 py-2 rounded-xl bg-[var(--color-atelier-terracota)] hover:bg-[#234E80] text-white text-xs font-bold transition-colors"
                          >
                            Baixar Vídeo MP4
                          </a>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {jobsSubTab === "failures" && (
              <div className="p-8 rounded-[2rem] glass-panel bg-white/85 border border-white text-center text-xs text-emerald-700 shadow-2xs">
                <CheckCircle2 size={24} className="mx-auto mb-2" />
                Nenhuma falha pendente de reprocessamento nos jobs atuais.
              </div>
            )}

            {jobsSubTab === "audit" && (
              <div className="rounded-[2rem] glass-panel bg-white/85 border border-white overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[var(--color-atelier-creme)]/80 text-[var(--color-atelier-madeira)] text-[10px] font-roboto uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Horário</th>
                      <th className="py-3 px-4">Evento</th>
                      <th className="py-3 px-4">Resumo</th>
                      <th className="py-3 px-4">Correlation ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-atelier-grafite)]/10">
                    {auditLogs.map((ev) => (
                      <tr key={ev.id} className="hover:bg-[var(--color-atelier-creme)]/40">
                        <td className="py-2.5 px-4 font-mono text-[10.5px] text-[var(--color-atelier-madeira)]">
                          {new Date(ev.createdAt).toLocaleTimeString("pt-BR")}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-[10.5px] text-[var(--color-atelier-terracota)] font-bold">
                          {ev.action}
                        </td>
                        <td className="py-2.5 px-4 text-[var(--color-atelier-grafite)]">{ev.summary}</td>
                        <td className="py-2.5 px-4 font-mono text-[10.5px] text-[var(--color-atelier-madeira)]">
                          {ev.correlationId}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* BIBLIOTECA DE PRESETS DA EQUIPE (SEÇÃO 5)                           */}
        {/* ------------------------------------------------------------------- */}
        {activeTab === "presets" && (
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-6">
            <div>
              <h1 className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">
                Biblioteca Oficial de Presets — Studio Veronna
              </h1>
              <p className="text-xs text-[var(--color-atelier-madeira)]">
                Padrões centralizados de exportação em lote e famílias coreográficas de 5,000 segundos.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {exportPresets.map((pr) => (
                <div
                  key={pr.id}
                  className="p-5 rounded-[1.75rem] glass-panel bg-white/85 border border-white flex flex-col justify-between gap-4 shadow-xs"
                >
                  <div>
                    <span className="text-[10px] font-roboto uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-[var(--color-atelier-terracota)]/12 text-[var(--color-atelier-terracota)] font-bold">
                      Preset de Exportação
                    </span>
                    <h3 className="font-elegant text-lg text-[var(--color-atelier-grafite)] mt-2">{pr.name}</h3>
                    <p className="text-xs text-[var(--color-atelier-madeira)] mt-1">{pr.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedExportFormats(pr.formats);
                      setExportSvgProfile(pr.svgProfile);
                      setExportPngScales(pr.pngScalesPx);
                      setExportFramingMode(pr.framingMode);
                      setActiveTab("export");
                      setExportStep(4);
                      notifyToast(`Preset "${pr.name}" aplicado ao lote!`);
                    }}
                    className="w-full py-2.5 rounded-xl bg-[var(--color-atelier-grafite)] hover:bg-[var(--color-atelier-terracota)] text-white text-xs font-bold cursor-pointer transition-colors"
                  >
                    Usar este Perfil no Lote
                  </button>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {MOTION_PRESET_LIBRARY.map((mp) => (
                <div
                  key={mp.id}
                  className="p-5 rounded-[1.75rem] glass-panel bg-white/85 border border-white flex flex-col justify-between gap-4 shadow-xs"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-[var(--color-atelier-madeira)]/15 text-[var(--color-atelier-grafite)] font-bold">
                        Família Motion {mp.code}
                      </span>
                      <span className="text-[10px] font-mono text-[var(--color-atelier-madeira)]">
                        5,000 s • 30 fps
                      </span>
                    </div>
                    <h3 className="font-elegant text-lg text-[var(--color-atelier-grafite)] mt-2">{mp.name}</h3>
                    <p className="text-xs text-[var(--color-atelier-madeira)] mt-1">{mp.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      updateActiveMotionSpec((prev) => ({
                        ...mp.defaultSpec,
                        canvasProfile: prev.canvasProfile,
                      }));
                      setActiveTab("motion");
                      setCurrentFrame(0);
                      setIsPlayingMotion(true);
                    }}
                    className="w-full py-2.5 rounded-xl bg-[var(--color-atelier-terracota)]/12 hover:bg-[var(--color-atelier-terracota)] text-[var(--color-atelier-terracota)] hover:text-white border border-[var(--color-atelier-terracota)]/25 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Aplicar no Motion Studio
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* MODAL: NOVO PROJETO                                                   */}
      {/* ===================================================================== */}
      <AnimatePresence>
        {isNewProjectModalOpen && (
          <div className="fixed inset-0 z-[9999] bg-[var(--color-atelier-grafite)]/40 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="w-full max-w-md bg-[var(--color-atelier-creme)] border border-white rounded-[2.5rem] p-7 space-y-4 text-[var(--color-atelier-grafite)] shadow-2xl"
            >
              <h3 className="font-elegant text-2xl">Criar Novo Projeto no Motion Studio</h3>
              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-[10px] font-roboto font-bold uppercase tracking-widest text-[var(--color-atelier-madeira)] block mb-1">
                    Nome do Projeto
                  </label>
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="Ex: Identidade Visual Maison Lumière"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-white border border-[var(--color-atelier-grafite)]/15 text-[var(--color-atelier-grafite)] outline-none focus:border-[var(--color-atelier-terracota)]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-roboto font-bold uppercase tracking-widest text-[var(--color-atelier-madeira)] block mb-1">
                    Cliente / Marca (Opcional)
                  </label>
                  <input
                    type="text"
                    value={newProjectClient}
                    onChange={(e) => setNewProjectClient(e.target.value)}
                    placeholder="Ex: Maison Lumière"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-white border border-[var(--color-atelier-grafite)]/15 text-[var(--color-atelier-grafite)] outline-none focus:border-[var(--color-atelier-terracota)]"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewProjectModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white border border-[var(--color-atelier-grafite)]/15 text-xs font-semibold text-[var(--color-atelier-madeira)] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const name = newProjectName.trim() || "Novo Projeto";
                    const client = newProjectClient.trim() || "Atelier Veronna";
                    const newProjId = `proj_${Date.now().toString(36)}`;
                    const emptyProj: MotionStudioProject = {
                      id: newProjId,
                      name,
                      clientName: client,
                      status: "active",
                      createdBy: "Studio Veronna",
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                      sources: [],
                      activeSourceId: null,
                      compositions: [],
                      activeCompositionId: null,
                      motions: [],
                      activeMotionId: null,
                    };
                    const nextList = [emptyProj, ...projects];
                    persistProjectsWithAutosave(nextList);
                    setActiveProjectId(emptyProj.id);
                    setSelectedExportVariantIds([]);
                    setSelectedArtboardIds([]);
                    setIsNewProjectModalOpen(false);
                    setNewProjectName("");
                    setNewProjectClient("");
                    setActiveTab("studio");
                    notifyToast(`Projeto "${name}" criado em branco. Envie seu arquivo SVG para começar.`);
                  }}
                  className="px-5 py-2 rounded-xl bg-[var(--color-atelier-grafite)] hover:bg-[var(--color-atelier-terracota)] text-white text-xs font-bold cursor-pointer transition-colors"
                >
                  Criar Projeto em Branco
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ===================================================================== */}
      {/* MODAL: NOVA VARIANTE NOMEADA                                          */}
      {/* ===================================================================== */}
      <AnimatePresence>
        {isNewVariantModalOpen && (
          <div className="fixed inset-0 z-[9999] bg-[var(--color-atelier-grafite)]/40 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="w-full max-w-md bg-[var(--color-atelier-creme)] border border-white rounded-[2.5rem] p-7 space-y-4 text-[var(--color-atelier-grafite)] shadow-2xl"
            >
              <h3 className="font-elegant text-2xl">
                Salvar Composição Atual como Nova Variante
              </h3>
              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-[10px] font-roboto font-bold uppercase tracking-widest text-[var(--color-atelier-madeira)] block mb-1">
                    Nome da Variante (ex: Logo_Horizontal, Logo_Simbolo)
                  </label>
                  <input
                    type="text"
                    autoFocus
                    value={newVariantName}
                    onChange={(e) => setNewVariantName(e.target.value)}
                    placeholder="Ex: Logo_Horizontal_Positiva"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-white border border-[var(--color-atelier-grafite)]/15 text-[var(--color-atelier-grafite)] outline-none focus:border-[var(--color-atelier-terracota)]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-roboto font-bold uppercase tracking-widest text-[var(--color-atelier-madeira)] block mb-1">
                    Descrição
                  </label>
                  <input
                    type="text"
                    value={newVariantDesc}
                    onChange={(e) => setNewVariantDesc(e.target.value)}
                    placeholder="Ex: Versão para assinatura de papelaria sem fundo"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-white border border-[var(--color-atelier-grafite)]/15 text-[var(--color-atelier-grafite)] outline-none focus:border-[var(--color-atelier-terracota)]"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewVariantModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white border border-[var(--color-atelier-grafite)]/15 text-xs font-semibold text-[var(--color-atelier-madeira)] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleCreateVariant}
                  className="px-5 py-2 rounded-xl bg-[var(--color-atelier-grafite)] hover:bg-[var(--color-atelier-terracota)] text-white text-xs font-bold cursor-pointer transition-colors"
                >
                  Salvar Variante
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
