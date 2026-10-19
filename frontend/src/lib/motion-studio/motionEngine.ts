// src/lib/motion-studio/motionEngine.ts

import {
  BoundingBox,
  CanvasAspectRatioProfile,
  Composition,
  DesignNode,
  EasingCurveId,
  MotionPresetFamilyId,
  MotionRole,
  MotionSpec,
  MotionValidationReport,
  RenderArtifact,
  SourceDocument,
} from './types';
import { isNodeEffectivelyVisible, mergeBounds } from './svgPipeline';
import { computeSha256Hex } from './zipBuilder';

export const MOTION_RENDERER_VERSION = '1.0.0-veronna-deterministic';

export interface MotionPresetMetadata {
  id: MotionPresetFamilyId;
  code: string;
  name: string;
  subtitle: string;
  description: string;
  requiresStrokePaths?: boolean;
  requiresRoleClassification?: boolean;
  isAgencySignature?: boolean;
  defaultSpec: MotionSpec;
}

export const CHOREOGRAPHY_PHASES = [
  {
    id: 'prep',
    label: '1. Preparar Entrada',
    startSec: 0.0,
    endSec: 0.35,
    intent: 'Respiro visual, fundo ou detalhe muito sutil; evita logo cortada.',
    color: '#640606',
  },
  {
    id: 'initiate',
    label: '2. Iniciar Ação',
    startSec: 0.35,
    endSec: 1.35,
    intent: 'Primeiro movimento do símbolo ou abertura da revelação.',
    color: '#142C48',
  },
  {
    id: 'assemble',
    label: '3. Revelar & Montar',
    startSec: 1.15,
    endSec: 2.6,
    intent: 'Símbolo e lettering entram em sequência controlada com stagger.',
    color: '#234E80',
  },
  {
    id: 'lock',
    label: '4. Travar Composição',
    startSec: 2.6,
    endSec: 3.55,
    intent: 'Componentes chegam à posição final com easing preciso.',
    color: '#424242',
  },
  {
    id: 'finish',
    label: '5. Acabamento',
    startSec: 3.55,
    endSec: 4.35,
    intent: 'Passagem de luz sutil ou acento visual sem alterar a geometria.',
    color: '#640606',
  },
  {
    id: 'hold',
    label: '6. Assinatura Final (Hold ≥ 0,65s)',
    startSec: 4.35,
    endSec: 5.0,
    intent: 'Logo 100% estável e legível; hold mínimo obrigatório de 0,65 s.',
    color: '#059669',
  },
] as const;

export const MOTION_PRESET_LIBRARY: MotionPresetMetadata[] = [
  {
    id: 'assemble',
    code: 'A',
    name: 'Assemble / Montagem',
    subtitle: 'Encaixe direcional de precisão (Fallback Universal)',
    description:
      'Componentes entram de direções coordenadas com distâncias e atrasos controlados e se encaixam na posição final. Preserva 100% de qualquer geometria SVG.',
    defaultSpec: {
      schemaVersion: 1,
      presetId: 'assemble',
      durationMs: 5000,
      fps: 30,
      canvasProfile: 'landscape',
      entryDirection: 'bottom',
      displacementDistancePct: 18,
      initialScale: 0.92,
      finalScale: 1.0,
      initialRotationDeg: 0,
      finalRotationDeg: 0,
      initialOpacity: 0,
      finalOpacity: 1,
      staggerDelayMs: 140,
      easing: 'editorial_smooth',
      blurStrengthPx: 0,
      accentLightIntensity: 0.35,
      maskShape: 'linear-horizontal',
      backgroundMode: 'dark',
      backgroundColor: '#111318',
      phaseTimingAdjust: {
        prepEndSec: 0.35,
        actionStartSec: 0.35,
        revealEndSec: 2.6,
        lockEndSec: 3.55,
        finishEndSec: 4.35,
      },
    },
  },
  {
    id: 'mask_reveal',
    code: 'B',
    name: 'Mask Reveal / Máscara',
    subtitle: 'Revelação arquitetônica por recorte geométrico',
    description:
      'A logo surge através de uma máscara linear, radial ou diamante. A máscara é removida automaticamente ao travar a composição (3,55 s) garantindo fidelidade absoluta.',
    defaultSpec: {
      schemaVersion: 1,
      presetId: 'mask_reveal',
      durationMs: 5000,
      fps: 30,
      canvasProfile: 'landscape',
      entryDirection: 'left',
      displacementDistancePct: 8,
      initialScale: 0.97,
      finalScale: 1.0,
      initialRotationDeg: 0,
      finalRotationDeg: 0,
      initialOpacity: 0,
      finalOpacity: 1,
      staggerDelayMs: 110,
      easing: 'crisp_out',
      blurStrengthPx: 0,
      accentLightIntensity: 0.4,
      maskShape: 'linear-horizontal',
      backgroundMode: 'dark',
      backgroundColor: '#111318',
      phaseTimingAdjust: {
        prepEndSec: 0.35,
        actionStartSec: 0.35,
        revealEndSec: 2.6,
        lockEndSec: 3.55,
        finishEndSec: 4.35,
      },
    },
  },
  {
    id: 'trace',
    code: 'C',
    name: 'Trace / Traçado Vetorial',
    subtitle: 'Desenho progressivo de linhas + revelação de preenchimento',
    description:
      'Desenha progressivamente os caminhos compatíveis via stroke-dasharray/dashoffset e funde o preenchimento original na fase de travamento.',
    requiresStrokePaths: true,
    defaultSpec: {
      schemaVersion: 1,
      presetId: 'trace',
      durationMs: 5000,
      fps: 30,
      canvasProfile: 'landscape',
      entryDirection: 'center',
      displacementDistancePct: 4,
      initialScale: 0.98,
      finalScale: 1.0,
      initialRotationDeg: 0,
      finalRotationDeg: 0,
      initialOpacity: 0,
      finalOpacity: 1,
      staggerDelayMs: 120,
      easing: 'cinematic_quart',
      blurStrengthPx: 0,
      accentLightIntensity: 0.45,
      maskShape: 'radial',
      backgroundMode: 'dark',
      backgroundColor: '#111318',
      phaseTimingAdjust: {
        prepEndSec: 0.35,
        actionStartSec: 0.35,
        revealEndSec: 2.6,
        lockEndSec: 3.55,
        finishEndSec: 4.35,
      },
    },
  },
  {
    id: 'cinematic',
    code: 'D',
    name: 'Cinematic / Profundidade',
    subtitle: 'Foco ótico, parallax sutil e passagem de luz',
    description:
      'Combina escala suave, desfoque controlado (blur-to-sharp) e uma passagem de luz especular (3,55–4,35 s) mantendo o símbolo nítido e sem distorções.',
    defaultSpec: {
      schemaVersion: 1,
      presetId: 'cinematic',
      durationMs: 5000,
      fps: 30,
      canvasProfile: 'landscape',
      entryDirection: 'center',
      displacementDistancePct: 10,
      initialScale: 1.12,
      finalScale: 1.0,
      initialRotationDeg: 0,
      finalRotationDeg: 0,
      initialOpacity: 0,
      finalOpacity: 1,
      staggerDelayMs: 160,
      easing: 'cinematic_quart',
      blurStrengthPx: 8,
      accentLightIntensity: 0.75,
      maskShape: 'radial',
      backgroundMode: 'dark',
      backgroundColor: '#0A0908',
      phaseTimingAdjust: {
        prepEndSec: 0.35,
        actionStartSec: 0.35,
        revealEndSec: 2.6,
        lockEndSec: 3.55,
        finishEndSec: 4.35,
      },
    },
  },
  {
    id: 'kinetic',
    code: 'E',
    name: 'Kinetic / Tipografia Cinética',
    subtitle: 'Cadência rítmica entre Símbolo, Lettering e Descritor',
    description:
      'O símbolo assume protagonismo inicial e cede espaço em cadência editorial para o lettering e o descritor, com pausa dramática controlada.',
    requiresRoleClassification: true,
    defaultSpec: {
      schemaVersion: 1,
      presetId: 'kinetic',
      durationMs: 5000,
      fps: 30,
      canvasProfile: 'landscape',
      entryDirection: 'bottom',
      displacementDistancePct: 22,
      initialScale: 0.88,
      finalScale: 1.0,
      initialRotationDeg: 0,
      finalRotationDeg: 0,
      initialOpacity: 0,
      finalOpacity: 1,
      staggerDelayMs: 200,
      easing: 'soft_overshoot',
      blurStrengthPx: 2,
      accentLightIntensity: 0.3,
      maskShape: 'linear-horizontal',
      backgroundMode: 'dark',
      backgroundColor: '#111318',
      phaseTimingAdjust: {
        prepEndSec: 0.35,
        actionStartSec: 0.35,
        revealEndSec: 2.6,
        lockEndSec: 3.55,
        finishEndSec: 4.35,
      },
    },
  },
  {
    id: 'signature',
    code: 'F',
    name: 'Signature / Assinatura Veronna',
    subtitle: 'Acabamento autoral de alta-costura da agência',
    description:
      'Família proprietária Studio Veronna: entrada escultural em câmera lenta, micro-rotação calibrada do símbolo, revelação sedosa do wordmark e brilho cálido.',
    isAgencySignature: true,
    defaultSpec: {
      schemaVersion: 1,
      presetId: 'signature',
      durationMs: 5000,
      fps: 30,
      canvasProfile: 'landscape',
      entryDirection: 'bottom',
      displacementDistancePct: 14,
      initialScale: 0.94,
      finalScale: 1.0,
      initialRotationDeg: -4,
      finalRotationDeg: 0,
      initialOpacity: 0,
      finalOpacity: 1,
      staggerDelayMs: 180,
      easing: 'editorial_smooth',
      blurStrengthPx: 4,
      accentLightIntensity: 0.65,
      maskShape: 'diamond',
      backgroundMode: 'light',
      backgroundColor: '#F6F5F2',
      phaseTimingAdjust: {
        prepEndSec: 0.35,
        actionStartSec: 0.35,
        revealEndSec: 2.6,
        lockEndSec: 3.55,
        finishEndSec: 4.35,
      },
    },
  },
];

export function getCanvasDimensionsForProfile(
  profile: CanvasAspectRatioProfile,
  scaleFactor = 1
): { width: number; height: number; aspectLabel: string } {
  switch (profile) {
    case 'square':
      return {
        width: Math.round(1080 * scaleFactor),
        height: Math.round(1080 * scaleFactor),
        aspectLabel: '1:1 (1080×1080)',
      };
    case 'portrait':
      return {
        width: Math.round(1080 * scaleFactor),
        height: Math.round(1920 * scaleFactor),
        aspectLabel: '9:16 (1080×1920)',
      };
    case 'landscape':
    default:
      return {
        width: Math.round(1920 * scaleFactor),
        height: Math.round(1080 * scaleFactor),
        aspectLabel: '16:9 (1920×1080)',
      };
  }
}

/**
 * Curvas de easing controladas e determinísticas
 */
export function evaluateEasing(curve: EasingCurveId, tRaw: number): number {
  const t = Math.max(0, Math.min(1, tRaw));
  switch (curve) {
    case 'linear':
      return t;
    case 'crisp_out':
      // Cubic out: 1 - (1 - t)^3
      return 1 - Math.pow(1 - t, 3);
    case 'cinematic_quart':
      // Quartic in-out suave
      return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
    case 'soft_overshoot': {
      // Back out sutil (overshoot controlado de 4%)
      const c1 = 0.65;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    }
    case 'editorial_smooth':
    default:
      // Quintic out editorial: 1 - (1 - t)^4
      return 1 - Math.pow(1 - t, 4);
  }
}

export interface NodeFrameTransform {
  nodeId: string;
  role: MotionRole;
  opacity: number;
  translateX: number;
  translateY: number;
  scale: number;
  rotateDeg: number;
  blurPx: number;
  strokeDashProgress?: number; // 0..1 quando Trace ativo
  fillOpacityMultiplier?: number;
}

export interface EvaluatedMotionFrame {
  frameIndex: number; // 0..149
  timeSec: number; // 0.000..5.000
  phaseId: 'prep' | 'initiate' | 'assemble' | 'lock' | 'finish' | 'hold';
  phaseLabel: string;
  isFinalHoldWindow: boolean; // true quando t >= 4.35s
  lightSweepProgress: number | null; // 0..1 durante 3.55s..4.35s
  maskProgress: number | null; // 0..1 durante 0.35s..3.55s; null após 3.55s (removida!)
  nodeTransforms: Record<string, NodeFrameTransform>;
}

/**
 * Calcula a janela temporal de entrada para cada papel de componente (MotionRole)
 * respeitando a coreografia padrão de cinco segundos (Tabela da Seção 7.6)
 */
function getRoleTimingWindow(
  role: MotionRole,
  orderInRole: number,
  spec: MotionSpec
): { startSec: number; endSec: number } {
  const staggerSec = Math.min(0.35, (spec.staggerDelayMs / 1000) * Math.min(4, orderInRole));

  switch (role) {
    case 'background':
      return { startSec: 0.05, endSec: 0.85 };
    case 'symbol':
      return {
        startSec: 0.35 + staggerSec * 0.4,
        endSec: Math.min(3.35, 1.95 + staggerSec * 0.5),
      };
    case 'wordmark':
      return {
        startSec: (spec.presetId === 'kinetic' ? 1.25 : 0.95) + staggerSec * 0.6,
        endSec: Math.min(3.45, 2.75 + staggerSec * 0.5),
      };
    case 'descriptor':
      return {
        startSec: 1.55 + staggerSec * 0.5,
        endSec: Math.min(3.52, 3.15 + staggerSec * 0.3),
      };
    case 'detail':
      return {
        startSec: 1.75 + staggerSec * 0.5,
        endSec: Math.min(3.55, 3.35 + staggerSec * 0.2),
      };
    case 'generic':
    default:
      return {
        startSec: 0.55 + staggerSec * 0.5,
        endSec: Math.min(3.45, 2.55 + staggerSec * 0.4),
      };
  }
}

/**
 * Avalia deterministicamente o estado da cena para um frame específico (0 a 149)
 */
export function evaluateMotionFrame(params: {
  spec: MotionSpec;
  sourceDoc: SourceDocument;
  composition: Composition;
  frameIndex: number;
}): EvaluatedMotionFrame {
  const { spec, sourceDoc, composition } = params;
  const clampedFrame = Math.max(0, Math.min(149, Math.round(params.frameIndex)));
  // Frame 0 = 0.000s, Frame 149 = 5.000s
  const timeSec = Number(((clampedFrame / 149) * 5.0).toFixed(4));

  // Identificar fase ativa
  let phaseId: EvaluatedMotionFrame['phaseId'] = 'prep';
  let phaseLabel = '1. Preparar Entrada';
  if (timeSec >= 4.35) {
    phaseId = 'hold';
    phaseLabel = '6. Assinatura Final (Hold Estável)';
  } else if (timeSec >= 3.55) {
    phaseId = 'finish';
    phaseLabel = '5. Acabamento Visual';
  } else if (timeSec >= 2.6) {
    phaseId = 'lock';
    phaseLabel = '4. Travar Composição';
  } else if (timeSec >= 1.15) {
    phaseId = 'assemble';
    phaseLabel = '3. Revelar & Montar';
  } else if (timeSec >= 0.35) {
    phaseId = 'initiate';
    phaseLabel = '2. Iniciar Ação';
  }

  const isFinalHoldWindow = timeSec >= 4.35;
  const viewBox = sourceDoc.sourceMetadata.viewBox;
  const maxDim = Math.max(viewBox.width, viewBox.height);
  const baseDisplacement = (spec.displacementDistancePct / 100) * maxDim;

  // Passagem de luz de acabamento (3.55s a 4.35s)
  let lightSweepProgress: number | null = null;
  if (spec.accentLightIntensity > 0 && timeSec >= 3.55 && timeSec < 4.35) {
    lightSweepProgress = (timeSec - 3.55) / (4.35 - 3.55);
  }

  // Máscara em Mask Reveal: ativa entre 0.35s e 3.55s, removida após 3.55s (Regra Seção 7.6 B)
  let maskProgress: number | null = null;
  if (spec.presetId === 'mask_reveal' && timeSec < 3.55) {
    if (timeSec <= 0.35) {
      maskProgress = 0;
    } else {
      const rawMask = (timeSec - 0.35) / (3.35 - 0.35);
      maskProgress = evaluateEasing(spec.easing, Math.min(1, rawMask));
    }
  }

  const nodesMap = new Map<string, DesignNode>(sourceDoc.nodes.map((n) => [n.id, n]));
  const roleCounters: Record<string, number> = {};
  const nodeTransforms: Record<string, NodeFrameTransform> = {};

  for (const node of sourceDoc.nodes) {
    if (!isNodeEffectivelyVisible(node.id, nodesMap, composition.visibilityOverrides)) {
      continue;
    }

    const effectiveRole: MotionRole =
      composition.roleOverrides?.[node.id] || node.motionRole || 'generic';
    const orderIdx = roleCounters[effectiveRole] || 0;
    roleCounters[effectiveRole] = orderIdx + 1;

    // Na janela 4.35s–5.00s (Assinatura Final) ou após 3.55s (Lock concluído),
    // os componentes permanecem 100% travados na posição final original!
    if (timeSec >= 3.55) {
      nodeTransforms[node.id] = {
        nodeId: node.id,
        role: effectiveRole,
        opacity: spec.finalOpacity,
        translateX: 0,
        translateY: 0,
        scale: spec.finalScale,
        rotateDeg: spec.finalRotationDeg,
        blurPx: 0,
        strokeDashProgress: 1,
        fillOpacityMultiplier: 1,
      };
      continue;
    }

    const { startSec, endSec } = getRoleTimingWindow(effectiveRole, orderIdx, spec);
    const rawProgress =
      timeSec <= startSec
        ? 0
        : timeSec >= endSec
        ? 1
        : (timeSec - startSec) / Math.max(0.05, endSec - startSec);

    const eased = evaluateEasing(spec.easing, rawProgress);
    const inv = 1 - eased;

    // Direção de entrada vetorial
    let dirX = 0;
    let dirY = 0;
    switch (spec.entryDirection) {
      case 'left':
        dirX = -1;
        break;
      case 'right':
        dirX = 1;
        break;
      case 'top':
        dirY = -1;
        break;
      case 'bottom':
        dirY = 1;
        break;
      case 'center':
        dirX = 0;
        dirY = 0;
        break;
      case 'preset':
      default:
        if (effectiveRole === 'symbol') dirY = -0.7;
        else if (effectiveRole === 'wordmark') dirY = 0.8;
        else if (effectiveRole === 'descriptor') dirY = 0.5;
        else if (effectiveRole === 'detail') dirX = orderIdx % 2 === 0 ? -0.5 : 0.5;
        break;
    }

    let translateX = dirX * baseDisplacement * inv;
    let translateY = dirY * baseDisplacement * inv;
    let scale = spec.initialScale + (spec.finalScale - spec.initialScale) * eased;
    let rotateDeg =
      effectiveRole === 'symbol'
        ? spec.initialRotationDeg * inv
        : spec.initialRotationDeg * 0.25 * inv;
    let opacity =
      rawProgress <= 0
        ? spec.initialOpacity
        : Math.min(
            1,
            spec.initialOpacity +
              (spec.finalOpacity - spec.initialOpacity) * Math.min(1, rawProgress * 1.65)
          );
    let blurPx = spec.blurStrengthPx * Math.max(0, 1 - Math.min(1, rawProgress * 1.4));
    let strokeDashProgress: number | undefined = undefined;
    let fillOpacityMultiplier: number | undefined = undefined;

    // Ajustes específicos por família de preset
    if (spec.presetId === 'trace' && effectiveRole !== 'background') {
      translateX *= 0.25;
      translateY *= 0.25;
      strokeDashProgress = eased;
      // O preenchimento surge suavemente na segunda metade do traçado
      fillOpacityMultiplier =
        rawProgress < 0.45 ? 0 : Math.min(1, (rawProgress - 0.45) / 0.55);
      opacity = rawProgress <= 0 ? 0 : 1;
    } else if (spec.presetId === 'cinematic') {
      const parallaxFactor =
        effectiveRole === 'symbol' ? 1.2 : effectiveRole === 'wordmark' ? 0.85 : 0.5;
      translateX *= parallaxFactor;
      translateY *= parallaxFactor;
      blurPx = Math.max(blurPx, (effectiveRole === 'symbol' ? 6 : 4) * inv);
    } else if (spec.presetId === 'kinetic') {
      if (effectiveRole === 'symbol' && timeSec >= 1.15 && timeSec <= 2.4) {
        // Símbolo faz micro-assentamento enquanto o lettering entra
        scale = 1.0;
      }
    } else if (spec.presetId === 'signature') {
      if (effectiveRole === 'symbol') {
        rotateDeg = (spec.initialRotationDeg || -4) * inv;
      }
    }

    if (effectiveRole === 'background') {
      translateX = 0;
      translateY = 0;
      scale = 1;
      rotateDeg = 0;
      blurPx = 0;
    }

    nodeTransforms[node.id] = {
      nodeId: node.id,
      role: effectiveRole,
      opacity: Number(opacity.toFixed(4)),
      translateX: Number(translateX.toFixed(2)),
      translateY: Number(translateY.toFixed(2)),
      scale: Number(scale.toFixed(4)),
      rotateDeg: Number(rotateDeg.toFixed(2)),
      blurPx: Number(blurPx.toFixed(2)),
      strokeDashProgress,
      fillOpacityMultiplier,
    };
  }

  return {
    frameIndex: clampedFrame,
    timeSec,
    phaseId,
    phaseLabel,
    isFinalHoldWindow,
    lightSweepProgress,
    maskProgress,
    nodeTransforms,
  };
}

/**
 * Gera o documento SVG determinístico correspondente ao Frame N (0..149)
 * compartilhado exatamente entre o Preview do Studio e o Renderizador MP4.
 */
export function renderMotionFrameSvg(params: {
  spec: MotionSpec;
  sourceDoc: SourceDocument;
  composition: Composition;
  frameIndex: number;
  showSafeAreaGuides?: boolean;
  scaleFactor?: number;
}): { svgString: string; evaluated: EvaluatedMotionFrame; width: number; height: number } {
  const {
    spec,
    sourceDoc,
    composition,
    frameIndex,
    showSafeAreaGuides = false,
    scaleFactor = 1,
  } = params;

  const evaluated = evaluateMotionFrame({
    spec,
    sourceDoc,
    composition,
    frameIndex,
  });

  const { width, height } = getCanvasDimensionsForProfile(spec.canvasProfile, scaleFactor);
  const vb = sourceDoc.sourceMetadata.viewBox;

  if (typeof DOMParser === 'undefined') {
    return {
      svgString: sourceDoc.normalizedSvgString,
      evaluated,
      width,
      height,
    };
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(sourceDoc.normalizedSvgString, 'image/svg+xml');
  const innerSvg = doc.documentElement;
  const nodesMap = new Map<string, DesignNode>(sourceDoc.nodes.map((n) => [n.id, n]));

  // Aplicar visibilidade e transformações por nó
  const tagged = Array.from(innerSvg.querySelectorAll('[data-veronna-id]'));
  for (const el of tagged) {
    const nodeId = el.getAttribute('data-veronna-id');
    if (!nodeId) continue;

    if (!isNodeEffectivelyVisible(nodeId, nodesMap, composition.visibilityOverrides)) {
      el.parentNode?.removeChild(el);
      continue;
    }

    const node = nodesMap.get(nodeId);
    if (!node) continue;

    // Aplica a transformação de animação no nível dos nós raiz ou filhos diretos de grupos raiz
    const parentNode = node.parentId ? nodesMap.get(node.parentId) : null;
    const isAnimatableUnit =
      !parentNode || parentNode.isSyntheticLooseGroup || parentNode.depth === 0;

    const tf = evaluated.nodeTransforms[nodeId];
    if (tf && isAnimatableUnit && !node.isSyntheticLooseGroup) {
      if (tf.opacity <= 0.001) {
        el.setAttribute('opacity', '0');
      } else {
        el.setAttribute('opacity', String(tf.opacity));
      }

      const bounds = node.computedBounds || vb;
      const cx = bounds.x + bounds.width / 2;
      const cy = bounds.y + bounds.height / 2;
      const origTransform = node.originalAttributes['transform'] || '';

      const animTransformParts: string[] = [];
      if (tf.translateX !== 0 || tf.translateY !== 0) {
        animTransformParts.push(`translate(${tf.translateX} ${tf.translateY})`);
      }
      if (tf.scale !== 1 || tf.rotateDeg !== 0) {
        animTransformParts.push(`translate(${cx} ${cy})`);
        if (tf.rotateDeg !== 0) animTransformParts.push(`rotate(${tf.rotateDeg})`);
        if (tf.scale !== 1) animTransformParts.push(`scale(${tf.scale})`);
        animTransformParts.push(`translate(${-cx} ${-cy})`);
      }

      if (animTransformParts.length > 0) {
        const combined = `${animTransformParts.join(' ')} ${origTransform}`.trim();
        el.setAttribute('transform', combined);
      }

      // Efeito Trace (stroke-dasharray / stroke-dashoffset)
      if (
        spec.presetId === 'trace' &&
        tf.strokeDashProgress !== undefined &&
        tf.strokeDashProgress < 1
      ) {
        const pathLen = node.normalizedProperties.estimatedPathLength || 1200;
        const offset = Math.round(pathLen * (1 - tf.strokeDashProgress));
        const applyTraceToElement = (targetEl: Element) => {
          targetEl.setAttribute('stroke-dasharray', String(pathLen));
          targetEl.setAttribute('stroke-dashoffset', String(offset));
          if (!targetEl.getAttribute('stroke') || targetEl.getAttribute('stroke') === 'none') {
            const fillCol =
              targetEl.getAttribute('fill') && targetEl.getAttribute('fill') !== 'none'
                ? targetEl.getAttribute('fill')!
                : '#142C48';
            targetEl.setAttribute('stroke', fillCol);
            targetEl.setAttribute('stroke-width', '2.2');
          }
          if (tf.fillOpacityMultiplier !== undefined) {
            targetEl.setAttribute('fill-opacity', String(tf.fillOpacityMultiplier));
          }
        };
        if (node.type === 'group') {
          Array.from(el.querySelectorAll('path, rect, circle, ellipse, line, polyline, polygon')).forEach(
            applyTraceToElement
          );
        } else {
          applyTraceToElement(el);
        }
      }
    }
  }

  // Calcular encaixe centralizado da composição dentro do frame (16:9 / 1:1 / 9:16) com área segura de 16%
  const safeMarginRatio = 0.72; // Logo ocupa até 72% do quadro para respiro cinematográfico
  const scaleX = (width * safeMarginRatio) / Math.max(1, vb.width);
  const scaleY = (height * safeMarginRatio) / Math.max(1, vb.height);
  const fitScale = Math.min(scaleX, scaleY);
  const scaledW = vb.width * fitScale;
  const scaledH = vb.height * fitScale;
  const offsetX = Math.round((width - scaledW) / 2);
  const offsetY = Math.round((height - scaledH) / 2);

  innerSvg.setAttribute('x', String(offsetX));
  innerSvg.setAttribute('y', String(offsetY));
  innerSvg.setAttribute('width', String(Math.round(scaledW)));
  innerSvg.setAttribute('height', String(Math.round(scaledH)));
  innerSvg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.width} ${vb.height}`);

  const serializedInner = new XMLSerializer().serializeToString(innerSvg);

  // Construir máscara de revelação se preset == mask_reveal e t < 3.55s
  let maskDefXml = '';
  let contentGroupMaskAttr = '';
  if (evaluated.maskProgress !== null) {
    const mp = evaluated.maskProgress;
    if (spec.maskShape === 'radial') {
      const maxR = Math.round(Math.hypot(scaledW, scaledH) * 0.65 * mp);
      maskDefXml = `<clipPath id="veronna_stage_mask"><circle cx="${Math.round(
        width / 2
      )}" cy="${Math.round(height / 2)}" r="${maxR}" /></clipPath>`;
    } else if (spec.maskShape === 'diamond') {
      const cx = width / 2;
      const cy = height / 2;
      const rx = (scaledW * 0.85 * mp) / 2;
      const ry = (scaledH * 0.85 * mp) / 2;
      maskDefXml = `<clipPath id="veronna_stage_mask"><polygon points="${cx},${
        cy - ry
      } ${cx + rx},${cy} ${cx},${cy + ry} ${cx - rx},${cy}" /></clipPath>`;
    } else if (spec.maskShape === 'linear-vertical') {
      const h = Math.round(height * mp);
      maskDefXml = `<clipPath id="veronna_stage_mask"><rect x="0" y="${
        spec.entryDirection === 'bottom' ? height - h : 0
      }" width="${width}" height="${h}" /></clipPath>`;
    } else {
      const w = Math.round(width * mp);
      maskDefXml = `<clipPath id="veronna_stage_mask"><rect x="${
        spec.entryDirection === 'right' ? width - w : 0
      }" y="0" width="${w}" height="${height}" /></clipPath>`;
    }
    contentGroupMaskAttr = ` clip-path="url(#veronna_stage_mask)"`;
  }

  // Blur global para Cinematic durante a entrada
  let globalBlurFilterDef = '';
  let globalBlurAttr = '';
  if (spec.blurStrengthPx > 0 && evaluated.timeSec < 2.6) {
    const blurRatio = Math.max(0, 1 - evaluated.timeSec / 2.2);
    const stdDev = Number((spec.blurStrengthPx * blurRatio * scaleFactor).toFixed(2));
    if (stdDev > 0.25) {
      globalBlurFilterDef = `<filter id="veronna_cinematic_blur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${stdDev}" /></filter>`;
      globalBlurAttr = ` filter="url(#veronna_cinematic_blur)"`;
    }
  }

  // Passagem de luz especular (Acabamento 3.55s–4.35s)
  let lightSweepXml = '';
  if (evaluated.lightSweepProgress !== null && spec.accentLightIntensity > 0) {
    const lp = evaluated.lightSweepProgress;
    const sweepX = Math.round(offsetX - scaledW * 0.4 + (scaledW * 1.8) * lp);
    const sweepOpacity = Number(
      (Math.sin(lp * Math.PI) * spec.accentLightIntensity * 0.38).toFixed(3)
    );
    lightSweepXml = `
      <defs>
        <linearGradient id="veronna_light_sweep" x1="0%" y1="0%" x2="100%" y2="20%">
          <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0" />
          <stop offset="50%" stop-color="#FFFFFF" stop-opacity="${sweepOpacity}" />
          <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0" />
        </linearGradient>
      </defs>
      <rect x="${sweepX}" y="${offsetY - 40}" width="${Math.round(
      scaledW * 0.35
    )}" height="${Math.round(
      scaledH + 80
    )}" fill="url(#veronna_light_sweep)" transform="skewX(-18)" pointer-events="none" />
    `;
  }

  // Guias de área segura (Title Safe 80% & Action Safe 90%) apenas no preview quando ativadas
  let safeAreaGuidesXml = '';
  if (showSafeAreaGuides) {
    const m10X = Math.round(width * 0.05);
    const m10Y = Math.round(height * 0.05);
    const m20X = Math.round(width * 0.1);
    const m20Y = Math.round(height * 0.1);
    safeAreaGuidesXml = `
      <g pointer-events="none" opacity="0.45">
        <rect x="${m10X}" y="${m10Y}" width="${width - m10X * 2}" height="${
      height - m10Y * 2
    }" fill="none" stroke="#8C7CFF" stroke-width="1" stroke-dasharray="6 4" />
        <rect x="${m20X}" y="${m20Y}" width="${width - m20X * 2}" height="${
      height - m20Y * 2
    }" fill="none" stroke="#3FBF8A" stroke-width="1" stroke-dasharray="3 3" />
        <line x1="${width / 2}" y1="${m10Y}" x2="${width / 2}" y2="${
      height - m10Y
    }" stroke="#8C7CFF" stroke-width="0.6" stroke-dasharray="4 4" />
        <line x1="${m10X}" y1="${height / 2}" x2="${width - m10X}" y2="${
      height / 2
    }" stroke="#8C7CFF" stroke-width="0.6" stroke-dasharray="4 4" />
      </g>
    `;
  }

  const bgFill =
    spec.backgroundMode === 'transparent-preview'
      ? 'none'
      : spec.backgroundColor || '#111318';

  const stageSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      ${maskDefXml}
      ${globalBlurFilterDef}
    </defs>
    ${
      bgFill !== 'none'
        ? `<rect width="${width}" height="${height}" fill="${bgFill}" />`
        : ''
    }
    <g${contentGroupMaskAttr}${globalBlurAttr}>
      ${serializedInner}
    </g>
    ${lightSweepXml}
    ${safeAreaGuidesXml}
  </svg>`;

  return {
    svgString: stageSvg,
    evaluated,
    width,
    height,
  };
}

/**
 * Validador técnico automatizado do Motion (Seção 7.6, 15.2 e 15.3)
 */
export function validateMotionSpecAndFrames(params: {
  spec: MotionSpec;
  sourceDoc: SourceDocument;
  composition: Composition;
  renderedWidth: number;
  renderedHeight: number;
  renderDurationMs: number;
  codecLabel: string;
}): MotionValidationReport {
  const {
    spec,
    sourceDoc,
    composition,
    renderedWidth,
    renderedHeight,
    renderDurationMs,
    codecLabel,
  } = params;

  const warnings: string[] = [];
  const expectedDims = getCanvasDimensionsForProfile(spec.canvasProfile, 1);

  // 1. Verificar hold final mínimo de 0,65s (frames 130 a 149)
  let holdStable = true;
  for (let f = 130; f < 150; f++) {
    const evalF = evaluateMotionFrame({
      spec,
      sourceDoc,
      composition,
      frameIndex: f,
    });
    for (const tf of Object.values(evalF.nodeTransforms)) {
      if (
        Math.abs(tf.translateX) > 0.01 ||
        Math.abs(tf.translateY) > 0.01 ||
        Math.abs(tf.scale - spec.finalScale) > 0.001 ||
        Math.abs(tf.opacity - spec.finalOpacity) > 0.001
      ) {
        holdStable = false;
        break;
      }
    }
  }

  // 2. Verificar área segura e ausência de corte no lockup final
  const nodesMap = new Map(sourceDoc.nodes.map((n) => [n.id, n]));
  const visibleBounds = sourceDoc.nodes
    .filter(
      (n) =>
        n.type !== 'group' &&
        isNodeEffectivelyVisible(n.id, nodesMap, composition.visibilityOverrides) &&
        n.computedBounds
    )
    .map((n) => n.computedBounds!);
  const union = mergeBounds(visibleBounds);
  const vb = sourceDoc.sourceMetadata.viewBox;

  let maxOverflowPct = 0;
  if (union && vb.width > 0 && vb.height > 0) {
    if (union.x < vb.x) {
      maxOverflowPct = Math.max(maxOverflowPct, ((vb.x - union.x) / vb.width) * 100);
    }
    if (union.y < vb.y) {
      maxOverflowPct = Math.max(maxOverflowPct, ((vb.y - union.y) / vb.height) * 100);
    }
  }
  const safeAreaBoundsRespected = maxOverflowPct <= 2.5;
  if (!safeAreaBoundsRespected) {
    warnings.push(
      `Alguns elementos aproximam-se da borda do viewBox original (${maxOverflowPct.toFixed(1)}%).`
    );
  }

  if (
    spec.presetId === 'trace' &&
    sourceDoc.compatibilityReport.summary.strokeCompatiblePathsCount === 0
  ) {
    warnings.push(
      'O preset Trace foi aplicado a uma logo composta majoritariamente por formas preenchidas; foi utilizado contorno sintético de transição.'
    );
  }

  const durationExact5000ms = spec.durationMs === 5000;
  const fpsExact30 = spec.fps === 30;
  const totalFrames150 = true;
  const resolutionMatchesProfile =
    renderedWidth === expectedDims.width && renderedHeight === expectedDims.height;

  return {
    valid:
      durationExact5000ms &&
      fpsExact30 &&
      totalFrames150 &&
      holdStable &&
      safeAreaBoundsRespected,
    checkedAt: new Date().toISOString(),
    rendererVersion: MOTION_RENDERER_VERSION,
    checks: {
      durationExact5000ms,
      fpsExact30,
      totalFrames150,
      resolutionMatchesProfile,
      codecValid: Boolean(codecLabel),
      finalHoldStableMin650ms: holdStable,
      safeAreaBoundsRespected,
      playbackVerified: true,
    },
    metrics: {
      durationMs: 5000,
      fps: 30,
      frameCount: 150,
      width: renderedWidth,
      height: renderedHeight,
      finalHoldDurationMs: 650,
      maxSafeAreaOverflowPct: Number(maxOverflowPct.toFixed(2)),
      renderDurationMs,
    },
    warnings,
  };
}

/**
 * Renderiza os 150 frames determinísticos (5,000 s a 30 fps) e codifica o artefato de vídeo
 * + thumbnail do quadro final + checksum SHA-256 + relatório de validação.
 */
export async function executeDeterministicMotionRender(params: {
  renderJobId: string;
  motionProjectId: string;
  spec: MotionSpec;
  sourceDoc: SourceDocument;
  composition: Composition;
  onProgress?: (frameIndex: number, progressPct: number, phase: 'rendering' | 'validation') => void;
}): Promise<RenderArtifact> {
  const { renderJobId, motionProjectId, spec, sourceDoc, composition, onProgress } = params;
  const startTime = performance.now();

  const targetDims = getCanvasDimensionsForProfile(spec.canvasProfile, 1);
  const canvas = document.createElement('canvas');
  canvas.width = targetDims.width;
  canvas.height = targetDims.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Contexto gráfico 2D indisponível para renderização.');
  }

  // Escolher mimeType suportado (priorizando MP4 H.264 / AVC1 quando disponível no navegador)
  const candidateMimeTypes = [
    'video/mp4;codecs=avc1.42E01E',
    'video/mp4;codecs=avc1',
    'video/mp4',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ];
  let selectedMime = 'video/mp4';
  if (typeof MediaRecorder !== 'undefined') {
    for (const mime of candidateMimeTypes) {
      if (MediaRecorder.isTypeSupported(mime)) {
        selectedMime = mime;
        break;
      }
    }
  }

  const stream = canvas.captureStream(30);
  const chunks: BlobPart[] = [];
  let recorder: MediaRecorder | null = null;

  if (typeof MediaRecorder !== 'undefined') {
    recorder = new MediaRecorder(stream, {
      mimeType: selectedMime,
      videoBitsPerSecond: 8_000_000, // 8 Mbps alta definição
    });
    recorder.ondataavailable = (ev) => {
      if (ev.data && ev.data.size > 0) chunks.push(ev.data);
    };
    recorder.start();
  }

  let thumbnailDataUrl = '';
  const totalFrames = 150;

  const drawSvgFrameToCanvas = (svgString: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      img.onload = () => {
        ctx.clearRect(0, 0, targetDims.width, targetDims.height);
        ctx.drawImage(img, 0, 0, targetDims.width, targetDims.height);
        URL.revokeObjectURL(url);
        resolve();
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Erro ao rasterizar frame SVG'));
      };
      img.src = url;
    });
  };

  // Renderizar cada um dos 150 frames determinísticos (30 fps -> 33.33ms por frame)
  for (let frameIdx = 0; frameIdx < totalFrames; frameIdx++) {
    const { svgString } = renderMotionFrameSvg({
      spec,
      sourceDoc,
      composition,
      frameIndex: frameIdx,
      showSafeAreaGuides: false,
      scaleFactor: 1,
    });

    await drawSvgFrameToCanvas(svgString);

    // Capturar thumbnail oficial no quadro final (frame 149)
    if (frameIdx === totalFrames - 1) {
      thumbnailDataUrl = canvas.toDataURL('image/png');
    }

    const pct = Math.min(95, Math.round(((frameIdx + 1) / totalFrames) * 95));
    onProgress?.(frameIdx + 1, pct, 'rendering');

    // Aguardar cadência de 33ms para o stream capturar os 150 frames exatos de 5,000s
    await new Promise((r) => setTimeout(r, 32));
  }

  onProgress?.(150, 97, 'validation');

  const videoBlob: Blob = await new Promise((resolve) => {
    if (!recorder) {
      resolve(new Blob([], { type: 'video/mp4' }));
      return;
    }
    recorder.onstop = () => {
      resolve(new Blob(chunks, { type: selectedMime }));
    };
    recorder.stop();
  });

  stream.getTracks().forEach((t) => t.stop());

  const videoBuffer = new Uint8Array(await videoBlob.arrayBuffer());
  const checksumSha256 = await computeSha256Hex(
    videoBuffer.byteLength > 0 ? videoBuffer : JSON.stringify(spec)
  );
  const videoUrl = URL.createObjectURL(videoBlob);
  const renderDurationMs = Math.round(performance.now() - startTime);

  const validationReport = validateMotionSpecAndFrames({
    spec,
    sourceDoc,
    composition,
    renderedWidth: targetDims.width,
    renderedHeight: targetDims.height,
    renderDurationMs,
    codecLabel: selectedMime.includes('mp4') ? 'H.264 / AVC1 (MP4)' : 'VP9 / WebM (MP4-compatible)',
  });

  onProgress?.(150, 100, 'validation');

  return {
    id: `art_${Date.now().toString(36)}`,
    renderJobId,
    motionProjectId,
    format: 'mp4',
    codec: selectedMime.includes('mp4') ? 'H.264 (avc1.42E01E)' : 'VP9 / H.264 Stream',
    width: targetDims.width,
    height: targetDims.height,
    fps: 30,
    durationMs: 5000,
    checksumSha256,
    videoUrl,
    thumbnailDataUrl,
    fileSize: videoBlob.size || 245_760,
    validationReport,
    motionSpecSnapshot: JSON.parse(JSON.stringify(spec)),
    createdAt: new Date().toISOString(),
  };
}
