// src/lib/motion-studio/svgPipeline.ts

import {
  ArtboardDetectionStrategy,
  ArtboardItem,
  BoundingBox,
  CompatibilityIssue,
  CompatibilityReport,
  Composition,
  DefDependencyInfo,
  DesignNode,
  MotionRole,
  NodeGraphicType,
  SourceDocument,
} from './types';
import { computeSha256Hex } from './zipBuilder';

export const PARSER_VERSION = '1.0.0-veronna';
export const NORMALIZER_VERSION = '1.0.0-veronna';
export const DEFAULT_MAX_SVG_BYTES = 25 * 1024 * 1024; // 25 MB configurável
export const DEFAULT_MAX_NODE_COUNT = 10000;
export const DEFAULT_MAX_TREE_DEPTH = 64;

const GRAPHIC_TAGS = new Set([
  'path',
  'rect',
  'circle',
  'ellipse',
  'line',
  'polyline',
  'polygon',
  'text',
  'image',
  'use',
]);

const DEF_TAGS = new Set([
  'lineargradient',
  'radialgradient',
  'clippath',
  'mask',
  'filter',
  'pattern',
  'symbol',
  'marker',
  'style',
]);

const BLOCKED_TAGS = new Set([
  'script',
  'foreignobject',
  'iframe',
  'object',
  'embed',
  'audio',
  'video',
]);

const DECLARATIVE_ANIM_TAGS = new Set([
  'animate',
  'animatemotion',
  'animatetransform',
  'set',
]);

const SUPPORTED_FILTER_PRIMITIVES = new Set([
  'fegaussianblur',
  'fedropshadow',
  'feoffset',
  'feblend',
  'fecolormatrix',
  'femerge',
  'femergenode',
  'feflood',
  'fecomposite',
]);

/**
 * Extrai referências internas do tipo url(#id) ou #id
 */
export function extractReferencedIdsFromValue(val: string): string[] {
  const ids = new Set<string>();
  const urlRegex = /url\(\s*['"]?#([^'")\s]+)['"]?\s*\)/gi;
  let match: RegExpExecArray | null;
  while ((match = urlRegex.exec(val)) !== null) {
    if (match[1]) ids.add(match[1]);
  }
  if (val.startsWith('#') && val.length > 1 && !val.includes(' ')) {
    ids.add(val.slice(1));
  }
  return Array.from(ids);
}

/**
 * Estima o comprimento e a caixa delimitadora (bounds) de um atributo `d` de <path>
 */
export function estimatePathBoundsAndLength(d: string): {
  bounds: BoundingBox | null;
  estimatedLength: number;
} {
  if (!d || !d.trim()) return { bounds: null, estimatedLength: 0 };

  const numRegex = /-?\d*\.?\d+(?:e[-+]?\d+)?/gi;
  const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) || [];

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let curX = 0;
  let curY = 0;
  let startX = 0;
  let startY = 0;
  let totalLen = 0;

  const recordPoint = (x: number, y: number, addDist = true) => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    if (addDist && Number.isFinite(curX) && Number.isFinite(curY)) {
      totalLen += Math.hypot(x - curX, y - curY);
    }
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
    curX = x;
    curY = y;
  };

  let i = 0;
  let cmd = 'M';
  while (i < tokens.length) {
    const t = tokens[i];
    if (/^[a-zA-Z]$/.test(t)) {
      cmd = t;
      i++;
      if (cmd === 'Z' || cmd === 'z') {
        totalLen += Math.hypot(startX - curX, startY - curY);
        curX = startX;
        curY = startY;
        continue;
      }
    }

    const readNum = () => {
      const v = parseFloat(tokens[i++]);
      return Number.isFinite(v) ? v : 0;
    };

    switch (cmd) {
      case 'M': {
        const x = readNum();
        const y = readNum();
        recordPoint(x, y, false);
        startX = x;
        startY = y;
        cmd = 'L';
        break;
      }
      case 'm': {
        const x = curX + readNum();
        const y = curY + readNum();
        recordPoint(x, y, false);
        startX = x;
        startY = y;
        cmd = 'l';
        break;
      }
      case 'L':
      case 'T': {
        recordPoint(readNum(), readNum(), true);
        break;
      }
      case 'l':
      case 't': {
        recordPoint(curX + readNum(), curY + readNum(), true);
        break;
      }
      case 'H': {
        recordPoint(readNum(), curY, true);
        break;
      }
      case 'h': {
        recordPoint(curX + readNum(), curY, true);
        break;
      }
      case 'V': {
        recordPoint(curX, readNum(), true);
        break;
      }
      case 'v': {
        recordPoint(curX, curY + readNum(), true);
        break;
      }
      case 'C': {
        const x1 = readNum();
        const y1 = readNum();
        const x2 = readNum();
        const y2 = readNum();
        const x = readNum();
        const y = readNum();
        recordPoint(x1, y1, false);
        recordPoint(x2, y2, false);
        recordPoint(x, y, true);
        break;
      }
      case 'c': {
        const ox = curX;
        const oy = curY;
        const x1 = ox + readNum();
        const y1 = oy + readNum();
        const x2 = ox + readNum();
        const y2 = oy + readNum();
        const x = ox + readNum();
        const y = oy + readNum();
        recordPoint(x1, y1, false);
        recordPoint(x2, y2, false);
        recordPoint(x, y, true);
        break;
      }
      case 'S':
      case 'Q': {
        const x1 = readNum();
        const y1 = readNum();
        const x = readNum();
        const y = readNum();
        recordPoint(x1, y1, false);
        recordPoint(x, y, true);
        break;
      }
      case 's':
      case 'q': {
        const ox = curX;
        const oy = curY;
        const x1 = ox + readNum();
        const y1 = oy + readNum();
        const x = ox + readNum();
        const y = oy + readNum();
        recordPoint(x1, y1, false);
        recordPoint(x, y, true);
        break;
      }
      case 'A': {
        const rx = Math.abs(readNum());
        const ry = Math.abs(readNum());
        readNum();
        readNum();
        readNum();
        const x = readNum();
        const y = readNum();
        recordPoint(x - rx, y - ry, false);
        recordPoint(x + rx, y + ry, false);
        recordPoint(x, y, true);
        break;
      }
      case 'a': {
        const ox = curX;
        const oy = curY;
        const rx = Math.abs(readNum());
        const ry = Math.abs(readNum());
        readNum();
        readNum();
        readNum();
        const x = ox + readNum();
        const y = oy + readNum();
        recordPoint(x - rx, y - ry, false);
        recordPoint(x + rx, y + ry, false);
        recordPoint(x, y, true);
        break;
      }
      default: {
        i++;
        break;
      }
    }
  }

  // Fallback se numRegex achar coordenadas simples
  if (!Number.isFinite(minX)) {
    const nums = (d.match(numRegex) || []).map(Number);
    for (let j = 0; j + 1 < nums.length; j += 2) {
      recordPoint(nums[j], nums[j + 1], true);
    }
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY)) {
    return { bounds: null, estimatedLength: 0 };
  }

  return {
    bounds: {
      x: Math.round(minX * 100) / 100,
      y: Math.round(minY * 100) / 100,
      width: Math.max(1, Math.round((maxX - minX) * 100) / 100),
      height: Math.max(1, Math.round((maxY - minY) * 100) / 100),
    },
    estimatedLength: Math.max(10, Math.round(totalLen)),
  };
}

/**
 * Aplica transformações SVG (matrix, translate, scale) a um BoundingBox
 */
export function applyTransformToBounds(
  bounds: BoundingBox | null,
  transformStr?: string
): BoundingBox | null {
  if (!bounds || !transformStr) return bounds;
  let { x, y, width, height } = bounds;

  const matrixMatch =
    /matrix\(\s*(-?\d*\.?\d+)[\s,]+(-?\d*\.?\d+)[\s,]+(-?\d*\.?\d+)[\s,]+(-?\d*\.?\d+)[\s,]+(-?\d*\.?\d+)[\s,]+(-?\d*\.?\d+)\s*\)/i.exec(
      transformStr
    );
  if (matrixMatch) {
    const a = parseFloat(matrixMatch[1]) || 1;
    const b = parseFloat(matrixMatch[2]) || 0;
    const c = parseFloat(matrixMatch[3]) || 0;
    const d = parseFloat(matrixMatch[4]) || 1;
    const e = parseFloat(matrixMatch[5]) || 0;
    const f = parseFloat(matrixMatch[6]) || 0;
    const corners = [
      { px: x, py: y },
      { px: x + width, py: y },
      { px: x, py: y + height },
      { px: x + width, py: y + height },
    ].map(({ px, py }) => ({
      tx: a * px + c * py + e,
      ty: b * px + d * py + f,
    }));
    const xs = corners.map((pt) => pt.tx);
    const ys = corners.map((pt) => pt.ty);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    x = minX;
    y = minY;
    width = Math.max(1, maxX - minX);
    height = Math.max(1, maxY - minY);
  }

  const translateMatch = /translate\(\s*(-?\d*\.?\d+)(?:[\s,]+(-?\d*\.?\d+))?\s*\)/i.exec(
    transformStr
  );
  if (translateMatch) {
    const tx = parseFloat(translateMatch[1]) || 0;
    const ty = translateMatch[2] !== undefined ? parseFloat(translateMatch[2]) : 0;
    x += tx;
    y += ty;
  }

  const scaleMatch = /scale\(\s*(-?\d*\.?\d+)(?:[\s,]+(-?\d*\.?\d+))?\s*\)/i.exec(
    transformStr
  );
  if (scaleMatch) {
    const sx = Math.abs(parseFloat(scaleMatch[1]) || 1);
    const sy =
      scaleMatch[2] !== undefined ? Math.abs(parseFloat(scaleMatch[2]) || 1) : sx;
    x *= sx;
    y *= sy;
    width *= sx;
    height *= sy;
  }

  return {
    x: Math.round(x * 100) / 100,
    y: Math.round(y * 100) / 100,
    width: Math.max(1, Math.round(width * 100) / 100),
    height: Math.max(1, Math.round(height * 100) / 100),
  };
}

export function mergeBounds(boxes: (BoundingBox | null)[]): BoundingBox | null {
  const valid = boxes.filter((b): b is BoundingBox => b !== null);
  if (valid.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const b of valid) {
    if (b.x < minX) minX = b.x;
    if (b.y < minY) minY = b.y;
    if (b.x + b.width > maxX) maxX = b.x + b.width;
    if (b.y + b.height > maxY) maxY = b.y + b.height;
  }
  return {
    x: Math.round(minX * 100) / 100,
    y: Math.round(yMinSafe(minY) * 100) / 100,
    width: Math.max(1, Math.round((maxX - minX) * 100) / 100),
    height: Math.max(1, Math.round((maxY - minY) * 100) / 100),
  };
}

function yMinSafe(v: number): number {
  return Number.isFinite(v) ? v : 0;
}

/**
 * Mede as caixas delimitadoras (BoundingBox) exatas no espaço de coordenadas da raiz <svg>
 * usando SVGGraphicsElement.getBBox() + getCTM() quando em ambiente de navegador.
 */
export function measureExactSvgBoundsInDom(
  normalizedSvgString: string,
  nodes: DesignNode[],
  rootViewBox: BoundingBox
): void {
  if (typeof document === 'undefined' || !document.body || !normalizedSvgString) {
    return;
  }

  const host = document.createElement('div');
  host.style.position = 'fixed';
  host.style.left = '-99999px';
  host.style.top = '-99999px';
  host.style.width = `${Math.max(1000, rootViewBox.width)}px`;
  host.style.height = `${Math.max(1000, rootViewBox.height)}px`;
  host.style.visibility = 'hidden';
  host.style.pointerEvents = 'none';
  host.style.overflow = 'hidden';

  try {
    host.innerHTML = normalizedSvgString;
    document.body.appendChild(host);
    const svgEl = host.querySelector('svg') as SVGSVGElement | null;
    if (!svgEl) return;

    const rootCtm = svgEl.getCTM();
    const rootInv = rootCtm ? rootCtm.inverse() : null;
    const nodeById = new Map<string, DesignNode>(nodes.map((n) => [n.id, n]));

    const tagged = Array.from(svgEl.querySelectorAll('[data-veronna-id]'));
    for (const el of tagged) {
      const vId = el.getAttribute('data-veronna-id');
      if (!vId) continue;
      const node = nodeById.get(vId);
      if (!node) continue;

      const graphicsEl = el as unknown as SVGGraphicsElement;
      if (typeof graphicsEl.getBBox === 'function') {
        try {
          const bbox = graphicsEl.getBBox();
          if (
            bbox &&
            Number.isFinite(bbox.x) &&
            Number.isFinite(bbox.y) &&
            bbox.width > 0 &&
            bbox.height > 0
          ) {
            let finalBox: BoundingBox = {
              x: bbox.x,
              y: bbox.y,
              width: bbox.width,
              height: bbox.height,
            };

            if (typeof graphicsEl.getCTM === 'function' && rootInv) {
              const elCtm = graphicsEl.getCTM();
              if (elCtm) {
                const relMatrix = rootInv.multiply(elCtm);
                const corners = [
                  { x: bbox.x, y: bbox.y },
                  { x: bbox.x + bbox.width, y: bbox.y },
                  { x: bbox.x, y: bbox.y + bbox.height },
                  { x: bbox.x + bbox.width, y: bbox.y + bbox.height },
                ].map((pt) => ({
                  x: relMatrix.a * pt.x + relMatrix.c * pt.y + relMatrix.e,
                  y: relMatrix.b * pt.x + relMatrix.d * pt.y + relMatrix.f,
                }));
                const xs = corners.map((c) => c.x);
                const ys = corners.map((c) => c.y);
                const minX = Math.min(...xs);
                const maxX = Math.max(...xs);
                const minY = Math.min(...ys);
                const maxY = Math.max(...ys);
                if (maxX - minX > 0.2 && maxY - minY > 0.2) {
                  finalBox = {
                    x: minX,
                    y: minY,
                    width: maxX - minX,
                    height: maxY - minY,
                  };
                }
              }
            }

            node.computedBounds = {
              x: Math.round(finalBox.x * 100) / 100,
              y: Math.round(finalBox.y * 100) / 100,
              width: Math.max(1, Math.round(finalBox.width * 100) / 100),
              height: Math.max(1, Math.round(finalBox.height * 100) / 100),
            };
          }
        } catch {
          // Mantém o computedBounds matemático de fallback
        }
      }
    }

    // Atualizar grupos sintéticos (ex: Elementos soltos) a partir dos filhos medidos
    for (const node of nodes) {
      if (node.isSyntheticLooseGroup && node.childrenIds.length > 0) {
        const childBoxes = node.childrenIds
          .map((cid) => nodeById.get(cid)?.computedBounds || null);
        const merged = mergeBounds(childBoxes);
        if (merged) node.computedBounds = merged;
      }
    }
  } catch {
    // Fallback silencioso caso DOM offscreen não esteja disponível
  } finally {
    if (host.parentNode) {
      host.parentNode.removeChild(host);
    }
  }
}

/**
 * Heurística conservadora e explicável para classificar o papel de motion (Seção 7.6)
 */
export function classifyNodeMotionRole(
  displayName: string,
  tagName: string,
  bounds: BoundingBox | null,
  viewBox: BoundingBox
): { role: MotionRole; reason: string } {
  const lower = displayName.toLowerCase();

  if (
    lower.includes('fundo') ||
    lower.includes('background') ||
    lower.includes('bg') ||
    lower.includes('base') ||
    lower.includes('placa')
  ) {
    return { role: 'background', reason: 'Identificado pelo nome de camada ("Fundo/BG")' };
  }

  if (
    lower.includes('simbolo') ||
    lower.includes('símbolo') ||
    lower.includes('symbol') ||
    lower.includes('icone') ||
    lower.includes('ícone') ||
    lower.includes('icon') ||
    lower.includes('monograma') ||
    lower.includes('emblema') ||
    lower.includes('mark')
  ) {
    return { role: 'symbol', reason: 'Identificado pelo nome semântico ("Símbolo/Emblema")' };
  }

  if (
    lower.includes('lettering') ||
    lower.includes('wordmark') ||
    lower.includes('logotipo') ||
    lower.includes('tipografia') ||
    lower.includes('nome') ||
    lower.includes('title') ||
    lower.includes('veronna') ||
    lower.includes('atelier') ||
    lower.includes('marca')
  ) {
    return { role: 'wordmark', reason: 'Identificado pelo nome semântico ("Lettering/Logotipo")' };
  }

  if (
    lower.includes('descritor') ||
    lower.includes('tagline') ||
    lower.includes('slogan') ||
    lower.includes('subtitulo') ||
    lower.includes('subtítulo') ||
    lower.includes('descriptor') ||
    lower.includes('assinatura') ||
    lower.includes('est.') ||
    lower.includes('maison')
  ) {
    return { role: 'descriptor', reason: 'Identificado pelo nome semântico ("Descritor/Tagline")' };
  }

  if (
    lower.includes('detalhe') ||
    lower.includes('detail') ||
    lower.includes('acento') ||
    lower.includes('accent') ||
    lower.includes('ornamento') ||
    lower.includes('estrela') ||
    lower.includes('linha') ||
    lower.includes('divisor') ||
    lower.includes('moldura')
  ) {
    return { role: 'detail', reason: 'Identificado pelo nome semântico ("Detalhe/Ornamento")' };
  }

  if (tagName === 'text') {
    if (bounds && bounds.y > viewBox.y + viewBox.height * 0.68) {
      return { role: 'descriptor', reason: 'Elemento <text> posicionado no terço inferior' };
    }
    return { role: 'wordmark', reason: 'Elemento tipográfico <text>' };
  }

  if (bounds && viewBox.width > 0 && viewBox.height > 0) {
    const areaRatio = (bounds.width * bounds.height) / (viewBox.width * viewBox.height);
    if (areaRatio >= 0.88) {
      return { role: 'background', reason: 'Ocupa mais de 88% da área do viewBox' };
    }
    const aspect = bounds.width / Math.max(1, bounds.height);
    if (aspect > 3.2 && bounds.y > viewBox.y + viewBox.height * 0.72) {
      return { role: 'descriptor', reason: 'Proporção horizontal fina na base da composição' };
    }
    if (aspect > 2.4 && bounds.y > viewBox.y + viewBox.height * 0.45) {
      return { role: 'wordmark', reason: 'Proporção horizontal característica de lettering' };
    }
    if (areaRatio < 0.025) {
      return { role: 'detail', reason: 'Elemento gráfico de pequena escala (< 2.5% da área)' };
    }
    if (bounds.y < viewBox.y + viewBox.height * 0.55 && aspect >= 0.5 && aspect <= 2.0) {
      return { role: 'symbol', reason: 'Proporção central/superior típica de símbolo' };
    }
  }

  return { role: 'generic', reason: 'Classificação conservadora (revisão manual recomendada)' };
}

/**
 * Heurística de identificação e nome de camadas (Seção 8.2)
 * Ordem:
 * 1. inkscape:label (quando presente)
 * 2. aria-label
 * 3. data-name ou serif:id
 * 4. id legível
 * 5. <title> direto
 * 6. Nome sintético baseado no tipo e ordem (Grupo 01, Caminho 02, etc.)
 */
function resolveNodeDisplayName(
  el: Element,
  type: NodeGraphicType,
  counterByType: Record<string, number>
): { displayName: string; origin: DesignNode['nameOrigin'] } {
  const inkscapeLabel =
    el.getAttribute('inkscape:label') || el.getAttributeNS('http://www.inkscape.org/namespaces/inkscape', 'label');
  if (inkscapeLabel && inkscapeLabel.trim()) {
    return { displayName: inkscapeLabel.trim(), origin: 'inkscape:label' };
  }

  const ariaLabel = el.getAttribute('aria-label');
  if (ariaLabel && ariaLabel.trim()) {
    return { displayName: ariaLabel.trim(), origin: 'aria-label' };
  }

  const dataName = el.getAttribute('data-name') || el.getAttribute('serif:id');
  if (dataName && dataName.trim()) {
    return { displayName: dataName.trim(), origin: 'data-name' };
  }

  const rawId = el.getAttribute('id');
  if (rawId && rawId.trim()) {
    const cleaned = rawId
      .trim()
      .replace(/^[_-]+/, '')
      .replace(/[_-]+/g, ' ');
    if (cleaned.length > 0) {
      return { displayName: cleaned, origin: 'id' };
    }
  }

  for (let i = 0; i < el.children.length; i++) {
    const child = el.children[i];
    if (child.tagName.toLowerCase() === 'title' && child.textContent?.trim()) {
      return { displayName: child.textContent.trim(), origin: 'title' };
    }
  }

  const labelMap: Record<NodeGraphicType, string> = {
    group: 'Grupo',
    path: 'Caminho',
    rect: 'Retângulo',
    circle: 'Círculo',
    ellipse: 'Elipse',
    line: 'Linha',
    polyline: 'Polilinha',
    polygon: 'Polígono',
    text: 'Texto',
    image: 'Imagem',
    use: ' Símbolo (Use)',
    unknown: 'Elemento',
  };
  counterByType[type] = (counterByType[type] || 0) + 1;
  const idx = String(counterByType[type]).padStart(2, '0');
  return { displayName: `${labelMap[type]} ${idx}`.trim(), origin: 'synthetic' };
}

function computeElementBounds(el: Element, tagName: string): {
  bounds: BoundingBox | null;
  estimatedLength: number;
} {
  const num = (attr: string, fallback = 0) => {
    const v = parseFloat(el.getAttribute(attr) || '');
    return Number.isFinite(v) ? v : fallback;
  };

  let rawBounds: BoundingBox | null = null;
  let estimatedLength = 0;

  switch (tagName) {
    case 'path': {
      const d = el.getAttribute('d') || '';
      const res = estimatePathBoundsAndLength(d);
      rawBounds = res.bounds;
      estimatedLength = res.estimatedLength;
      break;
    }
    case 'rect': {
      const x = num('x', 0);
      const y = num('y', 0);
      const width = Math.max(1, num('width', 100));
      const height = Math.max(1, num('height', 100));
      rawBounds = { x, y, width, height };
      estimatedLength = 2 * (width + height);
      break;
    }
    case 'circle': {
      const cx = num('cx', 0);
      const cy = num('cy', 0);
      const r = Math.max(1, num('r', 25));
      rawBounds = { x: cx - r, y: cy - r, width: r * 2, height: r * 2 };
      estimatedLength = Math.round(2 * Math.PI * r);
      break;
    }
    case 'ellipse': {
      const cx = num('cx', 0);
      const cy = num('cy', 0);
      const rx = Math.max(1, num('rx', 30));
      const ry = Math.max(1, num('ry', 20));
      rawBounds = { x: cx - rx, y: cy - ry, width: rx * 2, height: ry * 2 };
      estimatedLength = Math.round(Math.PI * (3 * (rx + ry) - Math.sqrt((3 * rx + ry) * (rx + 3 * ry))));
      break;
    }
    case 'line': {
      const x1 = num('x1', 0);
      const y1 = num('y1', 0);
      const x2 = num('x2', 50);
      const y2 = num('y2', 50);
      rawBounds = {
        x: Math.min(x1, x2),
        y: Math.min(y1, y2),
        width: Math.max(1, Math.abs(x2 - x1)),
        height: Math.max(1, Math.abs(y2 - y1)),
      };
      estimatedLength = Math.round(Math.hypot(x2 - x1, y2 - y1));
      break;
    }
    case 'polygon':
    case 'polyline': {
      const pts = (el.getAttribute('points') || '')
        .trim()
        .split(/[\s,]+/)
        .map(Number)
        .filter(Number.isFinite);
      if (pts.length >= 2) {
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        for (let i = 0; i + 1 < pts.length; i += 2) {
          const px = pts[i];
          const py = pts[i + 1];
          if (px < minX) minX = px;
          if (py < minY) minY = py;
          if (px > maxX) maxX = px;
          if (py > maxY) maxY = py;
          if (i >= 2) {
            estimatedLength += Math.hypot(px - pts[i - 2], py - pts[i - 1]);
          }
        }
        rawBounds = {
          x: minX,
          y: minY,
          width: Math.max(1, maxX - minX),
          height: Math.max(1, maxY - minY),
        };
      }
      break;
    }
    case 'text': {
      const x = num('x', 50);
      const y = num('y', 50);
      const fontSize = num('font-size', 28);
      const textLen = (el.textContent || '').trim().length || 6;
      const w = Math.max(20, Math.round(textLen * fontSize * 0.58));
      const h = Math.max(14, Math.round(fontSize * 1.2));
      rawBounds = { x, y: y - fontSize, width: w, height: h };
      break;
    }
    case 'image':
    case 'use': {
      const x = num('x', 0);
      const y = num('y', 0);
      const width = Math.max(10, num('width', 120));
      const height = Math.max(10, num('height', 120));
      rawBounds = { x, y, width, height };
      break;
    }
  }

  const transform = el.getAttribute('transform') || undefined;
  return {
    bounds: applyTransformToBounds(rawBounds, transform),
    estimatedLength: Math.max(0, Math.round(estimatedLength)),
  };
}

/**
 * Pipeline completa de Importação, Sanitização, Normalização e Diagnóstico de SVG (Seção 8)
 */
export async function parseAndSanitizeSvgDocument(params: {
  projectId: string;
  filename: string;
  rawSvgContent: string;
  maxSizeBytes?: number;
}): Promise<SourceDocument> {
  const startTime = performance.now();
  const correlationId = `imp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  const docId = `src_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const maxBytes = params.maxSizeBytes ?? DEFAULT_MAX_SVG_BYTES;

  const issues: CompatibilityIssue[] = [];
  const rawBytesLength = new TextEncoder().encode(params.rawSvgContent).byteLength;
  const checksumSha256 = await computeSha256Hex(params.rawSvgContent);

  // 1. Validar extensão e tamanho
  if (!params.filename.toLowerCase().endsWith('.svg')) {
    issues.push({
      id: `iss_${issues.length + 1}`,
      code: 'SVG_INVALID_XML',
      severity: 'error',
      feature: 'Formato de arquivo',
      description: `O arquivo "${params.filename}" não possui extensão .svg. Arquivos .ai, .eps e .pdf estão fora do escopo nativo do MVP.`,
      suggestedAction: 'Exporte o vetor a partir do editor original como SVG 1.1 ou SVG 2 estruturado.',
      recoverable: false,
    });
  }

  if (rawBytesLength > maxBytes) {
    issues.push({
      id: `iss_${issues.length + 1}`,
      code: 'SVG_LIMIT_EXCEEDED',
      severity: 'error',
      feature: 'Limite de tamanho',
      description: `O arquivo possui ${(rawBytesLength / (1024 * 1024)).toFixed(2)} MB, excedendo o limite configurado de ${(maxBytes / (1024 * 1024)).toFixed(0)} MB.`,
      suggestedAction: 'Reduza imagens raster embutidas ou simplifique malhas excessivas antes de importar.',
      recoverable: false,
    });
  }

  // 2. Bloquear XML DTD / Entidades Externas (Prevenção XXE)
  let workingXml = params.rawSvgContent.trim();
  if (/<!ENTITY/i.test(workingXml) || /<!DOCTYPE[^>]+SYSTEM/i.test(workingXml)) {
    issues.push({
      id: `iss_${issues.length + 1}`,
      code: 'SVG_INVALID_XML',
      severity: 'error',
      feature: 'Entidades XML / DTD Externo',
      description: 'O documento contém declarações <!ENTITY> ou DTD externo que representam risco de segurança (XXE).',
      suggestedAction: 'Remova declarações DOCTYPE/ENTITY externas e reimporte o SVG limpo.',
      recoverable: false,
    });
  }

  // Remover DOCTYPE simples inofensivo antes do DOMParser para evitar rejeição
  workingXml = workingXml.replace(/<!DOCTYPE[^>]*>/gi, '');

  // 3. Fazer parsing XML seguro
  let xmlDoc: Document | null = null;
  if (typeof DOMParser !== 'undefined' && !issues.some((i) => !i.recoverable)) {
    const parser = new DOMParser();
    xmlDoc = parser.parseFromString(workingXml, 'image/svg+xml');
    const parserError =
      xmlDoc.querySelector('parsererror') ||
      xmlDoc.getElementsByTagName('parsererror')[0];
    if (parserError) {
      issues.push({
        id: `iss_${issues.length + 1}`,
        code: 'SVG_INVALID_XML',
        severity: 'error',
        feature: 'Estrutura XML',
        description: 'O arquivo não é um SVG XML bem-formado e legível.',
        suggestedAction: 'Verifique se todas as tags XML estão fechadas corretamente ou salve novamente como SVG.',
        recoverable: false,
      });
    }
  }

  const rootSvg = xmlDoc?.documentElement;
  if (!issues.some((i) => !i.recoverable)) {
    if (!rootSvg || rootSvg.tagName.toLowerCase() !== 'svg') {
      issues.push({
        id: `iss_${issues.length + 1}`,
        code: 'SVG_INVALID_XML',
        severity: 'error',
        feature: 'Elemento raiz <svg>',
        description: 'O elemento raiz do documento XML não é <svg>.',
        suggestedAction: 'Forneça um documento vetorial com raiz <svg xmlns="http://www.w3.org/2000/svg">.',
        recoverable: false,
      });
    }
  }

  // Caso falhe de forma irrecuperável, retorna o documento com status 'failed'
  if (!xmlDoc || !rootSvg || issues.some((i) => !i.recoverable)) {
    const execTime = Math.round(performance.now() - startTime);
    return {
      id: docId,
      projectId: params.projectId,
      originalFilename: params.filename,
      originalSvgBytes: params.rawSvgContent,
      normalizedSvgString: '',
      checksumSha256,
      fileSize: rawBytesLength,
      importStatus: 'failed',
      parserVersion: PARSER_VERSION,
      normalizerVersion: NORMALIZER_VERSION,
      sourceMetadata: {
        viewBox: { x: 0, y: 0, width: 1000, height: 1000 },
        rawViewBoxString: '0 0 1000 1000',
        width: 1000,
        height: 1000,
        preserveAspectRatio: 'xMidYMid meet',
        namespace: 'http://www.w3.org/2000/svg',
        detectedEditorLabels: [],
        derivedViewport: false,
      },
      defsMap: {},
      rootCssStyles: '',
      nodes: [],
      artboards: [],
      artboardStrategy: 'auto',
      compatibilityReport: {
        schemaVersion: 1,
        status: 'failed',
        correlationId,
        parsedAt: new Date().toISOString(),
        executionTimeMs: execTime,
        summary: {
          totalNodes: 0,
          groupCount: 0,
          graphicObjectCount: 0,
          defsCount: 0,
          uniqueIdsCount: 0,
          embeddedImagesCount: 0,
          externalReferencesBlocked: 0,
          scriptsRemoved: 0,
          internalDependenciesCount: 0,
          looseElementsCount: 0,
          strokeCompatiblePathsCount: 0,
          filledPathsCount: 0,
        },
        issues,
      },
      createdAt: new Date().toISOString(),
    };
  }

  // 4. Sanitização profunda de segurança (Seção 3.4 e 8.3/8.4)
  let scriptsRemoved = 0;
  let externalReferencesBlocked = 0;
  let embeddedImagesCount = 0;
  const seenIds = new Set<string>();
  const duplicateIds: string[] = [];
  const detectedEditorLabels: string[] = [];

  if (
    rootSvg.getAttribute('xmlns:inkscape') ||
    workingXml.includes('inkscape:groupmode')
  ) {
    detectedEditorLabels.push('Inkscape Layers');
  }
  if (workingXml.includes('Adobe Illustrator') || workingXml.includes('data-name=')) {
    detectedEditorLabels.push('Adobe Illustrator / data-name');
  }
  if (workingXml.includes('Figma') || workingXml.includes('serif:id')) {
    detectedEditorLabels.push('Figma / Affinity');
  }

  const allElements = Array.from(rootSvg.querySelectorAll('*'));
  if (allElements.length > DEFAULT_MAX_NODE_COUNT) {
    issues.push({
      id: `iss_${issues.length + 1}`,
      code: 'SVG_LIMIT_EXCEEDED',
      severity: 'error',
      feature: 'Quantidade máxima de nós',
      description: `O SVG possui ${allElements.length} elementos, acima do limite de segurança (${DEFAULT_MAX_NODE_COUNT} nós).`,
      suggestedAction: 'Simplifique texturas vetoriais extremas antes de importar.',
      recoverable: false,
    });
  }

  for (const el of allElements) {
    const tag = el.tagName.toLowerCase();

    // Bloquear tags executáveis ou proibidas (<script>, <foreignObject>, etc.)
    if (BLOCKED_TAGS.has(tag)) {
      scriptsRemoved++;
      el.parentNode?.removeChild(el);
      continue;
    }

    // Bloquear animações declarativas embutidas (<animate>, <set>, etc.)
    if (DECLARATIVE_ANIM_TAGS.has(tag)) {
      issues.push({
        id: `iss_${issues.length + 1}`,
        code: 'SVG_UNSUPPORTED_FEATURE',
        severity: 'warning',
        feature: `<${tag}> declarativo`,
        description: `Animação SMIL embutida (<${tag}>) foi removida para garantir determinismo no editor e no Motion Studio.`,
        suggestedAction: 'Utilize o Motion Studio para configurar a animação determinística de 5 segundos.',
        recoverable: true,
      });
      el.parentNode?.removeChild(el);
      continue;
    }

    // Verificar atributos de cada elemento
    const attrs = Array.from(el.attributes);
    for (const attr of attrs) {
      const nameLower = attr.name.toLowerCase();
      const val = attr.value.trim();

      // Remover event handlers on*
      if (nameLower.startsWith('on')) {
        scriptsRemoved++;
        el.removeAttribute(attr.name);
        continue;
      }

      // Bloquear javascript: ou data:text/html
      if (
        /^\s*javascript:/i.test(val) ||
        /^\s*vbscript:/i.test(val) ||
        /^\s*data:\s*text\/html/i.test(val)
      ) {
        scriptsRemoved++;
        el.removeAttribute(attr.name);
        continue;
      }

      // Bloquear referências externas HTTP/HTTPS/file em href, xlink:href, style, filter
      if (
        nameLower === 'href' ||
        nameLower === 'xlink:href' ||
        nameLower === 'src'
      ) {
        if (/^(https?:|file:|\/\/)/i.test(val)) {
          externalReferencesBlocked++;
          el.removeAttribute(attr.name);
          issues.push({
            id: `iss_${issues.length + 1}`,
            code: 'SVG_EXTERNAL_REFERENCE_BLOCKED',
            severity: 'warning',
            feature: `Referência externa (${attr.name})`,
            description: `Requisição externa bloqueada por segurança: "${val.slice(0, 80)}".`,
            suggestedAction: 'Incorpore a imagem como Data URI ou converta o ativo em curvas vetoriais.',
            recoverable: true,
          });
          continue;
        }
        if (/^data:image\//i.test(val)) {
          embeddedImagesCount++;
        }
      }

      if (nameLower === 'style' && /url\(\s*['"]?(https?:|file:|\/\/)/i.test(val)) {
        externalReferencesBlocked++;
        const sanitizedStyle = val.replace(
          /url\(\s*['"]?(https?:|file:|\/\/)[^)]+\)/gi,
          'none'
        );
        el.setAttribute('style', sanitizedStyle);
        issues.push({
          id: `iss_${issues.length + 1}`,
          code: 'SVG_EXTERNAL_REFERENCE_BLOCKED',
          severity: 'warning',
          feature: 'URL externa em atributo style',
          description: 'Referência de rede externa em CSS inline foi bloqueada.',
          suggestedAction: 'Remova dependências externas de estilo ou converta fontes em contornos.',
          recoverable: true,
        });
      }
    }

    // Verificar IDs duplicados
    const elId = el.getAttribute('id');
    if (elId) {
      if (seenIds.has(elId)) {
        const newUniqueId = `${elId}_dup_${seenIds.size + 1}`;
        duplicateIds.push(elId);
        el.setAttribute('id', newUniqueId);
        seenIds.add(newUniqueId);
      } else {
        seenIds.add(elId);
      }
    }
  }

  if (scriptsRemoved > 0) {
    issues.push({
      id: `iss_${issues.length + 1}`,
      code: 'SVG_UNSUPPORTED_FEATURE',
      severity: 'warning',
      feature: 'Scripts / Event Handlers / foreignObject',
      description: `${scriptsRemoved} elemento(s) ou atributo(s) executável(is) foram removidos pela camada de sanitização.`,
      suggestedAction: 'Verifique a integridade visual no preview; nenhum script é executado pelo Veronna Motion Studio.',
      recoverable: true,
    });
  }

  if (duplicateIds.length > 0) {
    issues.push({
      id: `iss_${issues.length + 1}`,
      code: 'SVG_UNSUPPORTED_FEATURE',
      severity: 'info',
      feature: 'IDs duplicados normalizados',
      description: `Foram detectados e desambiguados ${duplicateIds.length} ID(s) duplicado(s): ${Array.from(new Set(duplicateIds)).slice(0, 5).join(', ')}.`,
      suggestedAction: 'Nenhuma ação obrigatória; os IDs internos foram estabilizados.',
      recoverable: true,
    });
  }

  // 5. Indexar <defs> e estilos CSS globais
  const defsMap: Record<string, DefDependencyInfo> = {};
  let rootCssStyles = '';
  const serializer = new XMLSerializer();

  const registerDefElement = (defEl: Element) => {
    const tag = defEl.tagName.toLowerCase();
    if (tag === 'style') {
      let cssText = defEl.textContent || '';
      if (/@import/i.test(cssText) || /url\(\s*['"]?(https?:|file:|\/\/)/i.test(cssText)) {
        externalReferencesBlocked++;
        cssText = cssText
          .replace(/@import[^;]+;/gi, '')
          .replace(/url\(\s*['"]?(https?:|file:|\/\/)[^)]+\)/gi, 'none');
        issues.push({
          id: `iss_${issues.length + 1}`,
          code: 'SVG_EXTERNAL_REFERENCE_BLOCKED',
          severity: 'warning',
          feature: 'CSS @import / Fonte Externa',
          description: 'Importação externa em <style> foi bloqueada pela política de isolamento de rede.',
          suggestedAction: 'Converta textos em caminhos (Create Outlines) para fidelidade tipográfica absoluta.',
          recoverable: true,
        });
      }
      rootCssStyles += '\n' + cssText.trim();
      return;
    }

    const id = defEl.getAttribute('id');
    if (!id) return;

    // Verificar suporte de filtros
    if (tag === 'filter') {
      const primitives = Array.from(defEl.children).map((c) => c.tagName.toLowerCase());
      const unsupported = primitives.filter((p) => !SUPPORTED_FILTER_PRIMITIVES.has(p));
      if (unsupported.length > 0) {
        issues.push({
          id: `iss_${issues.length + 1}`,
          code: 'SVG_UNSUPPORTED_FEATURE',
          severity: 'warning',
          feature: `Filtro SVG complexo (#${id})`,
          description: `O filtro #${id} utiliza primitivas fora do subset validado (${unsupported.join(', ')}).`,
          suggestedAction: 'Confira se o efeito visual no canvas corresponde ao esperado.',
          recoverable: true,
        });
      }
    }

    const rawXml = serializer.serializeToString(defEl);
    const refIds = extractReferencedIdsFromValue(rawXml).filter((r) => r !== id);
    defsMap[id] = {
      id,
      tag,
      rawXml,
      referencedIds: refIds,
    };
  };

  // Coletar elementos dentro de <defs> ou definições diretas na raiz
  const defsContainers = Array.from(rootSvg.getElementsByTagName('defs'));
  for (const container of defsContainers) {
    for (const child of Array.from(container.children)) {
      registerDefElement(child);
    }
  }
  for (const child of Array.from(rootSvg.children)) {
    const tag = child.tagName.toLowerCase();
    if (DEF_TAGS.has(tag)) {
      registerDefElement(child);
    }
  }

  // 6. Validar ou derivar viewBox (Seção 7.2 e 8.1)
  let viewBox: BoundingBox = { x: 0, y: 0, width: 1000, height: 1000 };
  let derivedViewport = false;
  const rawVb = rootSvg.getAttribute('viewBox');
  const rawW = rootSvg.getAttribute('width') || '';
  const rawH = rootSvg.getAttribute('height') || '';

  if (rawVb) {
    const parts = rawVb
      .trim()
      .split(/[\s,]+/)
      .map(Number);
    if (parts.length === 4 && parts.every(Number.isFinite) && parts[2] > 0 && parts[3] > 0) {
      viewBox = { x: parts[0], y: parts[1], width: parts[2], height: parts[3] };
    } else {
      derivedViewport = true;
    }
  } else {
    derivedViewport = true;
  }

  // 7. Extrair árvore hierárquica de grupos e objetos (Seção 7.3 e 8.2)
  const nodes: DesignNode[] = [];
  const counterByType: Record<string, number> = {};
  let sourceOrderCounter = 0;
  let strokeCompatiblePathsCount = 0;
  let filledPathsCount = 0;
  let internalDependenciesCount = 0;

  // Coletar dependências transitivas em <defs>
  const resolveTransitiveDefIds = (directIds: string[]): string[] => {
    const visited = new Set<string>();
    const queue = [...directIds];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      if (defsMap[current]) {
        visited.add(current);
        for (const nextId of defsMap[current].referencedIds) {
          if (!visited.has(nextId)) queue.push(nextId);
        }
      }
    }
    return Array.from(visited);
  };

  const extractElementAttributes = (el: Element): Record<string, string> => {
    const map: Record<string, string> = {};
    for (const attr of Array.from(el.attributes)) {
      map[attr.name] = attr.value;
    }
    return map;
  };

  const traverseElement = (
    el: Element,
    parentId: string | null,
    depth: number
  ): DesignNode | null => {
    if (depth > DEFAULT_MAX_TREE_DEPTH) return null;
    const tag = el.tagName.toLowerCase();
    if (tag === 'defs' || DEF_TAGS.has(tag) || tag === 'title' || tag === 'desc' || tag === 'metadata') {
      return null;
    }

    const isGroup = tag === 'g' || tag === 'svg';
    const isGraphic = GRAPHIC_TAGS.has(tag);
    if (!isGroup && !isGraphic) return null;

    const nodeType: NodeGraphicType = isGroup
      ? 'group'
      : (tag as NodeGraphicType);

    const nodeId = `node_${docId}_${++sourceOrderCounter}`;
    const currentOrder = sourceOrderCounter;
    const { displayName, origin } = resolveNodeDisplayName(el, nodeType, counterByType);
    const attrs = extractElementAttributes(el);

    // Verificar visibilidade original na fonte
    const displayAttr = (attrs['display'] || '').toLowerCase();
    const visibilityAttr = (attrs['visibility'] || '').toLowerCase();
    const styleAttr = attrs['style'] || '';
    const isHiddenInSource =
      displayAttr === 'none' ||
      visibilityAttr === 'hidden' ||
      /display\s*:\s*none/i.test(styleAttr) ||
      /visibility\s*:\s*hidden/i.test(styleAttr);

    // Extrair propriedades normalizadas
    const extractStyleProp = (propName: string): string | undefined => {
      if (attrs[propName] !== undefined) return attrs[propName];
      const regex = new RegExp(`(?:^|;)\\s*${propName}\\s*:\\s*([^;]+)`, 'i');
      const m = regex.exec(styleAttr);
      return m ? m[1].trim() : undefined;
    };

    const fill = extractStyleProp('fill');
    const stroke = extractStyleProp('stroke');
    const strokeWidthRaw = extractStyleProp('stroke-width');
    const strokeWidth = strokeWidthRaw ? parseFloat(strokeWidthRaw) : undefined;
    const opacityRaw = extractStyleProp('opacity');
    const opacity = opacityRaw !== undefined ? parseFloat(opacityRaw) : 1;

    // Referências diretas a <defs>
    const directRefs = new Set<string>();
    for (const val of Object.values(attrs)) {
      for (const refId of extractReferencedIdsFromValue(val)) {
        if (defsMap[refId]) directRefs.add(refId);
      }
    }

    // Se for grupo, processa filhos recursivamente
    const childrenIds: string[] = [];
    const childBoundsList: (BoundingBox | null)[] = [];

    if (isGroup) {
      for (const childEl of Array.from(el.children)) {
        const childNode = traverseElement(childEl, nodeId, depth + 1);
        if (childNode) {
          childrenIds.push(childNode.id);
          childBoundsList.push(childNode.computedBounds);
          for (const r of childNode.referencedDefIds) {
            directRefs.add(r);
          }
        }
      }
    }

    const { bounds: ownBounds, estimatedLength } = isGroup
      ? {
          bounds: applyTransformToBounds(
            mergeBounds(childBoundsList),
            attrs['transform']
          ),
          estimatedLength: 0,
        }
      : computeElementBounds(el, tag);

    const hasStrokePath =
      Boolean(stroke && stroke !== 'none' && stroke !== 'transparent') &&
      (strokeWidth === undefined || strokeWidth > 0);
    const hasFill = !fill || (fill !== 'none' && fill !== 'transparent');

    if (tag === 'path' || tag === 'line' || tag === 'polyline' || tag === 'circle' || tag === 'rect') {
      if (hasStrokePath) strokeCompatiblePathsCount++;
      if (hasFill) filledPathsCount++;
    }

    if (tag === 'text') {
      issues.push({
        id: `iss_${issues.length + 1}`,
        code: 'SVG_UNSUPPORTED_FEATURE',
        severity: 'info',
        feature: `Elemento <text> ("${displayName}")`,
        description: 'Texto editável detectado. Fontes não instaladas no ambiente podem alterar o desenho do lettering.',
        suggestedAction: 'Para fidelidade geométrica absoluta, dê preferência a SVGs com tipografia convertida em curvas (<path>).',
        affectedNodeIds: [nodeId],
        recoverable: true,
      });
    }

    const resolvedDefIds = resolveTransitiveDefIds(Array.from(directRefs));
    internalDependenciesCount += resolvedDefIds.length;

    const { role, reason } = classifyNodeMotionRole(displayName, tag, ownBounds, viewBox);

    // Atribuir data-veronna-node-id ao elemento DOM para serialização rápida e determinística
    el.setAttribute('data-veronna-id', nodeId);

    const node: DesignNode = {
      id: nodeId,
      documentId: docId,
      parentId,
      sourceNodeId: attrs['id'] || null,
      type: nodeType,
      tagName: tag,
      displayName,
      nameOrigin: origin,
      sourceOrder: currentOrder,
      depth,
      childrenIds,
      originalAttributes: attrs,
      normalizedProperties: {
        fill,
        stroke,
        strokeWidth,
        opacity: Number.isFinite(opacity) ? opacity : 1,
        transform: attrs['transform'],
        d: attrs['d'],
        hasStrokePath,
        estimatedPathLength: estimatedLength || undefined,
      },
      sourceVisibility: !isHiddenInSource,
      computedBounds: ownBounds,
      motionRole: role,
      motionRoleReason: reason,
      referencedDefIds: resolvedDefIds,
      compatibilityFlags: {
        hasFontDependency: tag === 'text',
        hasEmbeddedImage: tag === 'image',
        traceCompatible: hasStrokePath || (tag === 'path' && estimatedLength > 0),
      },
      rawElementXml: !isGroup ? serializer.serializeToString(el) : '',
    };

    nodes.push(node);
    return node;
  };

  // Separar filhos diretos do <svg> entre grupos (<g>) e elementos soltos (Regra 7.3)
  const directRootChildren = Array.from(rootSvg.children);
  const looseRootElements: Element[] = [];
  const structuredRootElements: Element[] = [];

  for (const child of directRootChildren) {
    const tag = child.tagName.toLowerCase();
    if (tag === 'defs' || DEF_TAGS.has(tag) || tag === 'title' || tag === 'desc' || tag === 'metadata') {
      continue;
    }
    if (tag === 'g') {
      structuredRootElements.push(child);
    } else if (GRAPHIC_TAGS.has(tag)) {
      looseRootElements.push(child);
    }
  }

  for (const groupEl of structuredRootElements) {
    traverseElement(groupEl, null, 0);
  }

  // Agrupar formas soltas na raiz sob um nó sintético "Elementos soltos" sem alterar o arquivo original
  if (looseRootElements.length > 0) {
    const looseGroupId = `node_${docId}_loose_root`;
    const looseChildrenIds: string[] = [];
    const looseChildBounds: (BoundingBox | null)[] = [];
    const looseDefRefs = new Set<string>();

    for (const looseEl of looseRootElements) {
      const childNode = traverseElement(looseEl, looseGroupId, 1);
      if (childNode) {
        looseChildrenIds.push(childNode.id);
        looseChildBounds.push(childNode.computedBounds);
        childNode.referencedDefIds.forEach((r) => looseDefRefs.add(r));
      }
    }

    if (looseChildrenIds.length > 0) {
      const mergedLooseBounds = mergeBounds(looseChildBounds);
      const { role, reason } = classifyNodeMotionRole(
        'Elementos soltos',
        'g',
        mergedLooseBounds,
        viewBox
      );
      const syntheticGroupNode: DesignNode = {
        id: looseGroupId,
        documentId: docId,
        parentId: null,
        sourceNodeId: null,
        type: 'group',
        tagName: 'g',
        displayName: 'Elementos soltos',
        nameOrigin: 'synthetic',
        sourceOrder: ++sourceOrderCounter,
        depth: 0,
        isSyntheticLooseGroup: true,
        childrenIds: looseChildrenIds,
        originalAttributes: {},
        normalizedProperties: { opacity: 1 },
        sourceVisibility: true,
        computedBounds: mergedLooseBounds,
        motionRole: role === 'generic' ? 'symbol' : role,
        motionRoleReason: `${reason} (Agrupamento virtual de ${looseChildrenIds.length} objeto(s) na raiz)`,
        referencedDefIds: Array.from(looseDefRefs),
        compatibilityFlags: {},
        rawElementXml: '',
      };
      nodes.push(syntheticGroupNode);
    }
  }

  // Se o viewBox precisou ser derivado, calcular a partir de width/height ou bounds dos nós
  if (derivedViewport) {
    const parsedW = parseFloat(rawW);
    const parsedH = parseFloat(rawH);
    if (Number.isFinite(parsedW) && parsedW > 0 && Number.isFinite(parsedH) && parsedH > 0) {
      viewBox = { x: 0, y: 0, width: parsedW, height: parsedH };
    } else {
      const union = mergeBounds(nodes.map((n) => n.computedBounds));
      if (union) {
        const pad = Math.max(union.width, union.height) * 0.08;
        viewBox = {
          x: Math.round(union.x - pad),
          y: Math.round(union.y - pad),
          width: Math.round(union.width + pad * 2),
          height: Math.round(union.height + pad * 2),
        };
      }
    }
    rootSvg.setAttribute(
      'viewBox',
      `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`
    );
    issues.push({
      id: `iss_${issues.length + 1}`,
      code: 'SVG_UNSUPPORTED_FEATURE',
      severity: 'warning',
      feature: 'Atributo viewBox ausente',
      description: `O SVG original não possuía viewBox explícito. Foi derivado automaticamente o viewport [${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}].`,
      suggestedAction: 'Confira se o enquadramento da marca no canvas está correto.',
      recoverable: true,
    });
  }

  // Re-classificar papéis com o viewBox definitivo
  for (const n of nodes) {
    const { role, reason } = classifyNodeMotionRole(
      n.displayName,
      n.tagName,
      n.computedBounds,
      viewBox
    );
    n.motionRole = role;
    n.motionRoleReason = reason;
  }

  const normalizedSvgString = serializer.serializeToString(rootSvg);

  // Medir bounds exatos via DOM offscreen quando disponível no navegador
  measureExactSvgBoundsInDom(normalizedSvgString, nodes, viewBox);

  // Re-classificar papéis com os bounds definitivos e viewBox definitivo
  for (const n of nodes) {
    const { role, reason } = classifyNodeMotionRole(
      n.displayName,
      n.tagName,
      n.computedBounds,
      viewBox
    );
    n.motionRole = role;
    n.motionRoleReason = reason;
  }

  const groupCount = nodes.filter((n) => n.type === 'group').length;
  const graphicObjectCount = nodes.filter((n) => n.type !== 'group').length;
  const hasWarnings = issues.some((i) => i.severity === 'warning' || i.severity === 'error');
  const execTime = Math.round(performance.now() - startTime);

  const builtDoc: SourceDocument = {
    id: docId,
    projectId: params.projectId,
    originalFilename: params.filename,
    originalSvgBytes: params.rawSvgContent, // Imutável!
    normalizedSvgString,
    checksumSha256,
    fileSize: rawBytesLength,
    importStatus: hasWarnings ? 'partial' : 'complete',
    parserVersion: PARSER_VERSION,
    normalizerVersion: NORMALIZER_VERSION,
    sourceMetadata: {
      viewBox,
      rawViewBoxString: `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`,
      width: rawW || viewBox.width,
      height: rawH || viewBox.height,
      preserveAspectRatio: rootSvg.getAttribute('preserveAspectRatio') || 'xMidYMid meet',
      namespace: rootSvg.getAttribute('xmlns') || 'http://www.w3.org/2000/svg',
      detectedEditorLabels,
      derivedViewport,
    },
    defsMap,
    rootCssStyles,
    nodes,
    artboards: [],
    artboardStrategy: 'auto',
    compatibilityReport: {
      schemaVersion: 1,
      status: hasWarnings ? 'partial' : 'complete',
      correlationId,
      parsedAt: new Date().toISOString(),
      executionTimeMs: execTime,
      summary: {
        totalNodes: nodes.length,
        groupCount,
        graphicObjectCount,
        defsCount: Object.keys(defsMap).length,
        uniqueIdsCount: seenIds.size,
        embeddedImagesCount,
        externalReferencesBlocked,
        scriptsRemoved,
        internalDependenciesCount,
        looseElementsCount: looseRootElements.length,
        strokeCompatiblePathsCount,
        filledPathsCount,
      },
      issues,
    },
    createdAt: new Date().toISOString(),
  };

  builtDoc.artboards = detectAndExtractArtboards(builtDoc, 'auto');
  return builtDoc;
}

/**
 * Avalia se um nó específico está próprio-visível (sem considerar se um pai está oculto)
 */
export function getOwnNodeVisibility(
  node: DesignNode,
  visibilityOverrides: Record<string, boolean>
): boolean {
  if (node.id in visibilityOverrides) {
    return visibilityOverrides[node.id];
  }
  return node.sourceVisibility;
}

/**
 * Avalia se um nó está efetivamente visível na variante (considerando toda a cadeia de grupos pais).
 * Regra 7.3: Ocultar um grupo oculta visualmente todos os descendentes, mas não apaga
 * a escolha individual dos filhos. Ao reexibir o grupo, os overrides dos filhos voltam a valer.
 */
export function isNodeEffectivelyVisible(
  nodeId: string,
  nodesMap: Map<string, DesignNode>,
  visibilityOverrides: Record<string, boolean>
): boolean {
  let curr = nodesMap.get(nodeId);
  while (curr) {
    if (!getOwnNodeVisibility(curr, visibilityOverrides)) {
      return false;
    }
    curr = curr.parentId ? nodesMap.get(curr.parentId) : undefined;
  }
  return true;
}

/**
 * Calcula o estado de checkbox tri-state de um grupo (Seção 7.3):
 * - 'all': grupo próprio visível e todos os descendentes visíveis
 * - 'none': grupo próprio oculto ou todos os descendentes ocultos
 * - 'partial': alguns descendentes visíveis e outros ocultos
 */
export function getGroupSelectionState(
  groupNode: DesignNode,
  nodesMap: Map<string, DesignNode>,
  visibilityOverrides: Record<string, boolean>
): 'all' | 'none' | 'partial' {
  if (!getOwnNodeVisibility(groupNode, visibilityOverrides)) {
    return 'none';
  }
  if (groupNode.childrenIds.length === 0) {
    return 'all';
  }

  let visibleLeaves = 0;
  let totalLeaves = 0;

  const inspectSubtree = (n: DesignNode, parentVisible: boolean) => {
    const selfVis = parentVisible && getOwnNodeVisibility(n, visibilityOverrides);
    if (n.childrenIds.length === 0) {
      totalLeaves++;
      if (selfVis) visibleLeaves++;
    } else {
      for (const cid of n.childrenIds) {
        const child = nodesMap.get(cid);
        if (child) inspectSubtree(child, selfVis);
      }
    }
  };

  inspectSubtree(groupNode, true);

  if (totalLeaves === 0 || visibleLeaves === totalLeaves) return 'all';
  if (visibleLeaves === 0) return 'none';
  return 'partial';
}

/**
 * Serializa uma Composição/Variante em SVG válido, preservando ordem de pintura,
 * hierarquia e incluindo recursivamente todas as definições (<defs>) referenciadas.
 */
export function serializeCompositionToSvg(params: {
  sourceDoc: SourceDocument;
  composition: Composition;
  profile?: 'preserve-structure' | 'optimized';
  framingMode?: 'original-viewbox' | 'fit-to-content';
  backgroundMode?: string;
  backgroundColor?: string;
  onlySpecificGroupId?: string;
  idPrefix?: string;
}): { svgString: string; viewBox: BoundingBox; includedNodeCount: number; includedDefCount: number } {
  const {
    sourceDoc,
    composition,
    profile = composition.exportPreferences.svgProfile || 'preserve-structure',
    framingMode = composition.exportPreferences.framingMode || 'original-viewbox',
    backgroundMode = composition.exportPreferences.backgroundMode || 'transparent',
    backgroundColor = composition.exportPreferences.customBackgroundColor || '#FFFFFF',
    onlySpecificGroupId,
    idPrefix,
  } = params;

  const nodesMap = new Map<string, DesignNode>(sourceDoc.nodes.map((n) => [n.id, n]));
  const visibilityOverrides = composition.visibilityOverrides || {};

  // Se onlySpecificGroupId foi solicitado (modo "Cada grupo selecionado separadamente")
  const allowedSubtreeIds = new Set<string>();
  if (onlySpecificGroupId) {
    const collectSubtree = (id: string) => {
      allowedSubtreeIds.add(id);
      const n = nodesMap.get(id);
      if (n) n.childrenIds.forEach(collectSubtree);
    };
    collectSubtree(onlySpecificGroupId);
    // Adicionar ancestrais para manter transformações herdadas
    let curr = nodesMap.get(onlySpecificGroupId);
    while (curr?.parentId) {
      allowedSubtreeIds.add(curr.parentId);
      curr = nodesMap.get(curr.parentId);
    }
  }

  // Determinar nós visíveis e coletar seus <defs> necessários
  const visibleNodeIds = new Set<string>();
  const requiredDefIds = new Set<string>();
  const visibleBounds: BoundingBox[] = [];

  for (const node of sourceDoc.nodes) {
    const effVis = isNodeEffectivelyVisible(node.id, nodesMap, visibilityOverrides);
    const inSubtree = !onlySpecificGroupId || allowedSubtreeIds.has(node.id);
    if (effVis && inSubtree) {
      visibleNodeIds.add(node.id);
      for (const defId of node.referencedDefIds) {
        requiredDefIds.add(defId);
      }
      if (node.type !== 'group' && node.computedBounds) {
        visibleBounds.push(node.computedBounds);
      }
    }
  }

  // Calcular viewBox final (ViewBox original vs Ajustar ao conteúdo)
  let targetViewBox = { ...sourceDoc.sourceMetadata.viewBox };
  if (framingMode === 'fit-to-content' && visibleBounds.length > 0) {
    const tight = mergeBounds(visibleBounds);
    if (tight && tight.width > 0 && tight.height > 0) {
      const pad = Math.round(Math.max(tight.width, tight.height) * 0.04 * 100) / 100;
      targetViewBox = {
        x: Math.round((tight.x - pad) * 100) / 100,
        y: Math.round((tight.y - pad) * 100) / 100,
        width: Math.round((tight.width + pad * 2) * 100) / 100,
        height: Math.round((tight.height + pad * 2) * 100) / 100,
      };
    }
  }

  // Construir a partir do normalizedSvgString clonado
  if (typeof DOMParser === 'undefined') {
    return {
      svgString: sourceDoc.normalizedSvgString,
      viewBox: targetViewBox,
      includedNodeCount: visibleNodeIds.size,
      includedDefCount: requiredDefIds.size,
    };
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(sourceDoc.normalizedSvgString, 'image/svg+xml');
  const svgRoot = doc.documentElement;

  // Remover elementos não visíveis mantendo a ordem de pintura exata
  const taggedElements = Array.from(svgRoot.querySelectorAll('[data-veronna-id]'));
  for (const el of taggedElements) {
    const vId = el.getAttribute('data-veronna-id');
    if (!vId || !visibleNodeIds.has(vId)) {
      el.parentNode?.removeChild(el);
    } else {
      // Garantir que se o nó estava oculto na fonte e foi ligado por override, ele fique visível
      if (el.getAttribute('display') === 'none') el.removeAttribute('display');
      if (el.getAttribute('visibility') === 'hidden') el.removeAttribute('visibility');
      const st = el.getAttribute('style');
      if (st) {
        const cleanedStyle = st
          .replace(/display\s*:\s*none\s*;?/gi, '')
          .replace(/visibility\s*:\s*hidden\s*;?/gi, '')
          .trim();
        if (cleanedStyle) el.setAttribute('style', cleanedStyle);
        else el.removeAttribute('style');
      }
      // Aplicar renomeação como data-name se houver override de nome
      const customName = composition.nameOverrides?.[vId];
      if (customName) {
        el.setAttribute('data-name', customName);
      }
      if (profile === 'optimized') {
        el.removeAttribute('data-veronna-id');
      }
    }
  }

  // Limpar <defs> não referenciados se perfil otimizado, mantendo sempre as dependências necessárias
  if (profile === 'optimized') {
    const allDefs = Array.from(svgRoot.querySelectorAll('defs > [id]'));
    for (const defEl of allDefs) {
      const id = defEl.getAttribute('id');
      if (id && !requiredDefIds.has(id)) {
        defEl.parentNode?.removeChild(defEl);
      }
    }
  }

  // Atualizar viewBox
  svgRoot.setAttribute(
    'viewBox',
    `${targetViewBox.x} ${targetViewBox.y} ${targetViewBox.width} ${targetViewBox.height}`
  );
  svgRoot.setAttribute('width', String(targetViewBox.width));
  svgRoot.setAttribute('height', String(targetViewBox.height));

  // Inserir retângulo de fundo caso não seja transparente
  let resolvedBg: string | null = null;
  if (backgroundMode === 'white') resolvedBg = '#FFFFFF';
  else if (backgroundMode === 'black') resolvedBg = '#0A0A0C';
  else if (backgroundMode === 'brand') resolvedBg = '#142C48';
  else if (backgroundMode === 'custom' && backgroundColor) resolvedBg = backgroundColor;

  if (resolvedBg) {
    const bgRect = doc.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bgRect.setAttribute('x', String(targetViewBox.x));
    bgRect.setAttribute('y', String(targetViewBox.y));
    bgRect.setAttribute('width', String(targetViewBox.width));
    bgRect.setAttribute('height', String(targetViewBox.height));
    bgRect.setAttribute('fill', resolvedBg);
    bgRect.setAttribute('data-veronna-bg', 'true');
    const firstGraphic = Array.from(svgRoot.children).find(
      (c) => c.tagName.toLowerCase() !== 'defs' && c.tagName.toLowerCase() !== 'style'
    );
    if (firstGraphic) {
      svgRoot.insertBefore(bgRect, firstGraphic);
    } else {
      svgRoot.appendChild(bgRect);
    }
  }

  let serialized = new XMLSerializer().serializeToString(svgRoot);

  // Prefixar IDs se solicitado (Seção 8.5 / R10 SVGO prefixIds)
  if (idPrefix && idPrefix.trim()) {
    const safePrefix = idPrefix.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    for (const defId of Object.keys(sourceDoc.defsMap)) {
      const prefixed = `${safePrefix}_${defId}`;
      serialized = serialized
        .replace(new RegExp(`id=["']${defId}["']`, 'g'), `id="${prefixed}"`)
        .replace(new RegExp(`url\\(#${defId}\\)`, 'g'), `url(#${prefixed})`)
        .replace(new RegExp(`href=["']#${defId}["']`, 'g'), `href="#${prefixed}"`);
    }
  }

  if (profile === 'optimized') {
    serialized = serialized
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/\s{2,}/g, ' ')
      .replace(/>\s+</g, '><')
      .trim();
  }

  return {
    svgString: serialized,
    viewBox: targetViewBox,
    includedNodeCount: visibleNodeIds.size,
    includedDefCount: requiredDefIds.size,
  };
}

/**
 * Renderiza uma string SVG validada para um Blob PNG em resolução exata (Seção 7.5 e 15.1)
 */
export async function renderSvgStringToPngBlob(params: {
  svgString: string;
  viewBox: BoundingBox;
  targetLongestSidePx: number;
}): Promise<{ blob: Blob; width: number; height: number; dataUrl: string }> {
  const { svgString, viewBox, targetLongestSidePx } = params;
  const aspect = viewBox.width / Math.max(1, viewBox.height);

  let width = targetLongestSidePx;
  let height = targetLongestSidePx;
  if (aspect >= 1) {
    width = targetLongestSidePx;
    height = Math.max(1, Math.round(targetLongestSidePx / aspect));
  } else {
    height = targetLongestSidePx;
    width = Math.max(1, Math.round(targetLongestSidePx * aspect));
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error('Canvas 2D context indisponível'));
          return;
        }
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(url);

        const dataUrl = canvas.toDataURL('image/png');
        canvas.toBlob((pngBlob) => {
          if (!pngBlob) {
            reject(new Error('Falha ao codificar PNG'));
            return;
          }
          resolve({ blob: pngBlob, width, height, dataUrl });
        }, 'image/png');
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Falha ao rasterizar SVG no motor de imagem'));
    };

    img.src = url;
  });
}

// ============================================================================
// MOTOR DE DETECÇÃO, SEPARAÇÃO E EXPORTAÇÃO DE PRANCHETAS (MULTI-ARTBOARD)
// ============================================================================

function boxesIntersectionArea(a: BoundingBox, b: BoundingBox): number {
  const xOverlap = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
  const yOverlap = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  return xOverlap * yOverlap;
}

function isPointInsideBox(px: number, py: number, box: BoundingBox, tolerance = 2): boolean {
  return (
    px >= box.x - tolerance &&
    px <= box.x + box.width + tolerance &&
    py >= box.y - tolerance &&
    py <= box.y + box.height + tolerance
  );
}

function collectSubtreeLeafNodes(
  rootNodeId: string,
  nodesMap: Map<string, DesignNode>
): DesignNode[] {
  const result: DesignNode[] = [];
  const visit = (id: string) => {
    const n = nodesMap.get(id);
    if (!n || !n.sourceVisibility) return;
    if (n.type !== 'group' && n.childrenIds.length === 0) {
      result.push(n);
    } else {
      for (const cid of n.childrenIds) visit(cid);
    }
  };
  visit(rootNodeId);
  return result;
}

function findArtboardBackgroundNode(
  candidateNodes: DesignNode[],
  boardBounds: BoundingBox
): { bgNode?: DesignNode; fill?: string } {
  const boardArea = Math.max(1, boardBounds.width * boardBounds.height);
  const sorted = [...candidateNodes].sort((a, b) => a.sourceOrder - b.sourceOrder);
  for (const n of sorted) {
    if (n.type === 'group' || !n.computedBounds) continue;
    const isRectOrPath = n.type === 'rect' || n.type === 'path';
    if (!isRectOrPath) continue;
    const inter = boxesIntersectionArea(n.computedBounds, boardBounds);
    const coverage = inter / boardArea;
    const nodeArea = Math.max(1, n.computedBounds.width * n.computedBounds.height);
    const ratioToBoard = nodeArea / boardArea;
    if (coverage >= 0.76 && ratioToBoard <= 1.25) {
      const fill = n.normalizedProperties.fill;
      if (fill && fill !== 'none' && fill !== 'transparent') {
        return { bgNode: n, fill };
      }
    }
  }
  return {};
}

/**
 * Retorna todos os caminhos e elementos gráficos (folhas: <path>, <rect>, <circle>, <text>, etc.)
 * pertencentes a uma Prancheta específica, na ordem original de desenho.
 */
export function getArtboardGraphicNodes(
  sourceDoc: SourceDocument,
  artboard: ArtboardItem
): DesignNode[] {
  const nodesMap = new Map<string, DesignNode>(sourceDoc.nodes.map((n) => [n.id, n]));
  const seen = new Set<string>();
  const leaves: DesignNode[] = [];

  const visit = (id: string) => {
    const n = nodesMap.get(id);
    if (!n || seen.has(id)) return;
    seen.add(id);
    if (n.type !== 'group' && n.childrenIds.length === 0) {
      leaves.push(n);
    } else {
      for (const cid of n.childrenIds) {
        visit(cid);
      }
    }
  };

  for (const nid of artboard.nodeIds) {
    visit(nid);
  }

  return leaves.sort((a, b) => a.sourceOrder - b.sourceOrder);
}

/**
 * Resolve a cor principal efetiva (fill ou stroke) de um caminho/nó,
 * subindo na cadeia de grupos pais caso a cor seja herdada de um <g>.
 */
export function resolveNodeEffectiveColor(
  node: DesignNode,
  nodesMap: Map<string, DesignNode>
): string {
  let curr: DesignNode | undefined = node;
  while (curr) {
    const fill = curr.normalizedProperties.fill;
    if (fill && fill !== 'none' && fill !== 'transparent' && !fill.startsWith('url(')) {
      return fill;
    }
    const stroke = curr.normalizedProperties.stroke;
    if (stroke && stroke !== 'none' && stroke !== 'transparent' && !stroke.startsWith('url(')) {
      return stroke;
    }
    if (fill && fill.startsWith('url(')) {
      return '#142C48';
    }
    curr = curr.parentId ? nodesMap.get(curr.parentId) : undefined;
  }
  return '#0D1D30';
}

/**
 * Serializa uma Prancheta individual em um arquivo SVG independente,
 * com viewBox recortado exatamente para a prancheta, respeitando a seleção/visibilidade
 * individual de cada caminho (visibilityOverrides / onlyIncludeNodeIds) e opções de fundo.
 */
export function serializeArtboardToSvg(params: {
  sourceDoc: SourceDocument;
  artboard: ArtboardItem;
  keepArtboardBackground?: boolean;
  backgroundMode?: 'original' | 'transparent' | 'white' | 'black' | 'brand' | 'custom';
  customBackgroundColor?: string;
  framingMode?: 'artboard-bounds' | 'fit-to-content';
  profile?: 'preserve-structure' | 'optimized';
  idPrefix?: string;
  visibilityOverrides?: Record<string, boolean>;
  onlyIncludeNodeIds?: string[];
  nameOverrides?: Record<string, string>;
}): { svgString: string; viewBox: BoundingBox; includedNodeCount: number; totalArtboardNodeCount: number } {
  const {
    sourceDoc,
    artboard,
    keepArtboardBackground = true,
    backgroundMode = 'original',
    customBackgroundColor = '#FFFFFF',
    framingMode = 'artboard-bounds',
    profile = 'preserve-structure',
    idPrefix,
    visibilityOverrides,
    onlyIncludeNodeIds,
    nameOverrides,
  } = params;

  const nodesMap = new Map<string, DesignNode>(sourceDoc.nodes.map((n) => [n.id, n]));
  const masterArea =
    Math.max(1, sourceDoc.sourceMetadata.viewBox.width * sourceDoc.sourceMetadata.viewBox.height);

  // Coletar todos os caminhos/folhas que pertencem à prancheta
  const allBoardLeafNodes = getArtboardGraphicNodes(sourceDoc, artboard);
  const totalArtboardNodeCount = allBoardLeafNodes.length;

  // Se onlyIncludeNodeIds foi informado, expandir caso contenha algum grupo
  let explicitAllowedLeafIds: Set<string> | null = null;
  if (onlyIncludeNodeIds && onlyIncludeNodeIds.length > 0) {
    explicitAllowedLeafIds = new Set<string>();
    const collectTargetLeaves = (id: string) => {
      const n = nodesMap.get(id);
      if (!n) return;
      if (n.type !== 'group' && n.childrenIds.length === 0) {
        explicitAllowedLeafIds!.add(n.id);
      } else {
        for (const cid of n.childrenIds) collectTargetLeaves(cid);
      }
    };
    for (const id of onlyIncludeNodeIds) {
      collectTargetLeaves(id);
    }
  }

  // Se o usuário pediu fundo transparente ou remoção do fundo da prancheta
  const shouldStripBoardBg =
    !keepArtboardBackground ||
    backgroundMode === 'transparent' ||
    backgroundMode === 'white' ||
    backgroundMode === 'black' ||
    backgroundMode === 'brand' ||
    backgroundMode === 'custom';

  const userExplicitlyHidBgNode = Boolean(
    artboard.backgroundNodeId &&
      visibilityOverrides &&
      !isNodeEffectivelyVisible(artboard.backgroundNodeId, nodesMap, visibilityOverrides)
  );

  // Filtrar folhas visíveis da prancheta
  const visibleLeafNodes: DesignNode[] = [];
  for (const leaf of allBoardLeafNodes) {
    if (explicitAllowedLeafIds && !explicitAllowedLeafIds.has(leaf.id)) {
      continue;
    }
    if (
      visibilityOverrides &&
      !isNodeEffectivelyVisible(leaf.id, nodesMap, visibilityOverrides)
    ) {
      continue;
    }
    if (shouldStripBoardBg) {
      if (artboard.backgroundNodeId && leaf.id === artboard.backgroundNodeId) {
        continue;
      }
      if (leaf.computedBounds) {
        const area = leaf.computedBounds.width * leaf.computedBounds.height;
        if (area / masterArea >= 0.8 && (leaf.type === 'rect' || leaf.motionRole === 'background')) {
          continue;
        }
      }
    }
    visibleLeafNodes.push(leaf);
  }

  // Montar conjunto de nós permitidos no DOM (folhas visíveis + seus grupos ancestrais para manter transformações)
  const allowedNodeIds = new Set<string>();
  for (const leaf of visibleLeafNodes) {
    allowedNodeIds.add(leaf.id);
    let curr = nodesMap.get(leaf.parentId || '');
    while (curr) {
      allowedNodeIds.add(curr.id);
      curr = curr.parentId ? nodesMap.get(curr.parentId) : undefined;
    }
  }

  // Coletar <defs> necessários e bounds dos elementos gráficos restantes
  const requiredDefIds = new Set<string>();
  const leafBounds: BoundingBox[] = [];
  for (const id of allowedNodeIds) {
    const n = nodesMap.get(id);
    if (!n) continue;
    for (const defId of n.referencedDefIds) {
      requiredDefIds.add(defId);
    }
  }
  for (const leaf of visibleLeafNodes) {
    if (leaf.id !== artboard.backgroundNodeId && leaf.computedBounds) {
      leafBounds.push(leaf.computedBounds);
    }
  }

  let targetViewBox: BoundingBox = { ...artboard.bounds };
  if (
    (framingMode === 'fit-to-content' || (explicitAllowedLeafIds && explicitAllowedLeafIds.size > 0)) &&
    leafBounds.length > 0
  ) {
    const tight = mergeBounds(leafBounds);
    if (tight && tight.width > 0 && tight.height > 0) {
      const pad = Math.round(Math.max(tight.width, tight.height) * 0.06 * 100) / 100;
      targetViewBox = {
        x: Math.round((tight.x - pad) * 100) / 100,
        y: Math.round((tight.y - pad) * 100) / 100,
        width: Math.max(1, Math.round((tight.width + pad * 2) * 100) / 100),
        height: Math.max(1, Math.round((tight.height + pad * 2) * 100) / 100),
      };
    }
  }

  if (typeof DOMParser === 'undefined') {
    return {
      svgString: sourceDoc.normalizedSvgString,
      viewBox: targetViewBox,
      includedNodeCount: visibleLeafNodes.length,
      totalArtboardNodeCount,
    };
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(sourceDoc.normalizedSvgString, 'image/svg+xml');
  const svgRoot = doc.documentElement;

  const taggedElements = Array.from(svgRoot.querySelectorAll('[data-veronna-id]'));
  for (const el of taggedElements) {
    const vId = el.getAttribute('data-veronna-id');
    if (!vId || !allowedNodeIds.has(vId)) {
      el.parentNode?.removeChild(el);
    } else {
      // Garantir que se o elemento estava oculto na fonte e foi ligado por override, fique visível
      if (el.getAttribute('display') === 'none') el.removeAttribute('display');
      if (el.getAttribute('visibility') === 'hidden') el.removeAttribute('visibility');
      const st = el.getAttribute('style');
      if (st) {
        const cleanedStyle = st
          .replace(/display\s*:\s*none\s*;?/gi, '')
          .replace(/visibility\s*:\s*hidden\s*;?/gi, '')
          .trim();
        if (cleanedStyle) el.setAttribute('style', cleanedStyle);
        else el.removeAttribute('style');
      }
      if (nameOverrides && nameOverrides[vId]) {
        el.setAttribute('data-name', nameOverrides[vId]);
      }
      if (profile === 'optimized') {
        el.removeAttribute('data-veronna-id');
      }
    }
  }

  // Atualizar viewBox e dimensões para o recorte exato da Prancheta
  svgRoot.setAttribute(
    'viewBox',
    `${targetViewBox.x} ${targetViewBox.y} ${targetViewBox.width} ${targetViewBox.height}`
  );
  svgRoot.setAttribute('width', String(Math.round(targetViewBox.width)));
  svgRoot.setAttribute('height', String(Math.round(targetViewBox.height)));

  // Resolver cor de fundo customizada quando aplicável
  let customBgFill: string | null = null;
  if (backgroundMode === 'white') customBgFill = '#FFFFFF';
  else if (backgroundMode === 'black') customBgFill = '#0A0A0C';
  else if (backgroundMode === 'brand') customBgFill = '#142C48';
  else if (backgroundMode === 'custom' && customBackgroundColor) {
    customBgFill = customBackgroundColor;
  } else if (
    backgroundMode === 'original' &&
    keepArtboardBackground &&
    !userExplicitlyHidBgNode &&
    !explicitAllowedLeafIds &&
    artboard.detectedBackgroundFill &&
    !artboard.backgroundNodeId
  ) {
    customBgFill = artboard.detectedBackgroundFill;
  }

  if (customBgFill) {
    const bgRect = doc.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bgRect.setAttribute('x', String(targetViewBox.x));
    bgRect.setAttribute('y', String(targetViewBox.y));
    bgRect.setAttribute('width', String(targetViewBox.width));
    bgRect.setAttribute('height', String(targetViewBox.height));
    bgRect.setAttribute('fill', customBgFill);
    bgRect.setAttribute('data-veronna-artboard-bg', 'true');
    const firstGraphic = Array.from(svgRoot.children).find(
      (c) => c.tagName.toLowerCase() !== 'defs' && c.tagName.toLowerCase() !== 'style'
    );
    if (firstGraphic) {
      svgRoot.insertBefore(bgRect, firstGraphic);
    } else {
      svgRoot.appendChild(bgRect);
    }
  }

  let serialized = new XMLSerializer().serializeToString(svgRoot);

  if (idPrefix && idPrefix.trim()) {
    const safePrefix = idPrefix.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    for (const defId of Object.keys(sourceDoc.defsMap)) {
      const prefixed = `${safePrefix}_${defId}`;
      serialized = serialized
        .replace(new RegExp(`id=["']${defId}["']`, 'g'), `id="${prefixed}"`)
        .replace(new RegExp(`url\\(#${defId}\\)`, 'g'), `url(#${prefixed})`)
        .replace(new RegExp(`href=["']#${defId}["']`, 'g'), `href="#${prefixed}"`);
    }
  }

  if (profile === 'optimized') {
    serialized = serialized
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/\s{2,}/g, ' ')
      .replace(/>\s+</g, '><')
      .trim();
  }

  return {
    svgString: serialized,
    viewBox: targetViewBox,
    includedNodeCount: visibleLeafNodes.length,
    totalArtboardNodeCount,
  };
}

/**
 * Detecta e extrai todas as Pranchetas (Artboards) presentes no SVG importado.
 * Suporta:
 * - Inkscape multi-page (<inkscape:page>)
 * - Grupos nomeados como Prancheta / Artboard / Frame / Versão / Card / Lockup
 * - Placas/Retângulos de base (background-rects) que agrupam elementos contidos na sua região (mesmo em camadas separadas)
 * - Ilhas espaciais 2D (spatial-clusters) para logos posicionados lado a lado ou em grade
 * - Grupos de topo (top-groups) e subgrupos (subgroups, ex: dentro de "Camada 1")
 */
export function detectAndExtractArtboards(
  sourceDoc: SourceDocument,
  strategy: ArtboardDetectionStrategy = 'auto'
): ArtboardItem[] {
  const nodes = sourceDoc.nodes;
  if (!nodes || nodes.length === 0) return [];

  const nodesMap = new Map<string, DesignNode>(nodes.map((n) => [n.id, n]));
  const masterVb = sourceDoc.sourceMetadata.viewBox;
  const masterArea = Math.max(1, masterVb.width * masterVb.height);

  // Identificar se existe um fundo geral do documento inteiro (> 82% da área total)
  const fullCanvasBgIds = new Set<string>();
  let fullCanvasBgFill: string | undefined;
  for (const n of nodes) {
    if (n.type !== 'group' && n.computedBounds) {
      const area = n.computedBounds.width * n.computedBounds.height;
      if (
        area / masterArea >= 0.82 &&
        (n.type === 'rect' || n.type === 'path' || n.motionRole === 'background')
      ) {
        fullCanvasBgIds.add(n.id);
        if (!fullCanvasBgFill && n.normalizedProperties.fill && n.normalizedProperties.fill !== 'none') {
          fullCanvasBgFill = n.normalizedProperties.fill;
        }
      }
    }
  }

  const allLeafNodes = nodes.filter(
    (n) => n.type !== 'group' && n.childrenIds.length === 0 && n.sourceVisibility && n.computedBounds
  );
  const foregroundLeafNodes = allLeafNodes.filter((n) => !fullCanvasBgIds.has(n.id));

  // Helper para finalizar e ordenar pranchetas (de cima para baixo, esquerda para direita)
  const finalizeCandidates = (
    rawList: Array<{
      name: string;
      origin: ArtboardItem['origin'];
      bounds: BoundingBox;
      nodeIds: string[];
      backgroundNodeId?: string;
      hasOwnBackground: boolean;
      detectedBackgroundFill?: string;
    }>
  ): ArtboardItem[] => {
    const valid = rawList.filter(
      (item) => item.bounds.width >= 4 && item.bounds.height >= 4 && item.nodeIds.length > 0
    );

    // Ordenar em ordem de leitura visual (linhas Y com tolerância, depois X)
    const rowTolerance = Math.max(20, masterVb.height * 0.08);
    valid.sort((a, b) => {
      if (Math.abs(a.bounds.y - b.bounds.y) > rowTolerance) {
        return a.bounds.y - b.bounds.y;
      }
      return a.bounds.x - b.bounds.x;
    });

    return valid.map((item, idx) => {
      const index = idx + 1;
      const numStr = String(index).padStart(2, '0');
      const cleanName = item.name.trim() || `Prancheta ${numStr}`;
      const finalName = /^prancheta\b/i.test(cleanName)
        ? cleanName
        : `Prancheta ${numStr} — ${cleanName}`;

      const draftArtboard: ArtboardItem = {
        id: `artboard_${sourceDoc.id}_${numStr}`,
        index,
        name: finalName,
        origin: item.origin,
        bounds: {
          x: Math.round(item.bounds.x * 100) / 100,
          y: Math.round(item.bounds.y * 100) / 100,
          width: Math.max(1, Math.round(item.bounds.width * 100) / 100),
          height: Math.max(1, Math.round(item.bounds.height * 100) / 100),
        },
        nodeIds: item.nodeIds,
        backgroundNodeId: item.backgroundNodeId,
        hasOwnBackground: item.hasOwnBackground,
        detectedBackgroundFill: item.detectedBackgroundFill || fullCanvasBgFill,
        previewSvgString: '',
      };

      const { svgString } = serializeArtboardToSvg({
        sourceDoc,
        artboard: draftArtboard,
        keepArtboardBackground: true,
        backgroundMode: 'original',
        framingMode: 'artboard-bounds',
        profile: 'preserve-structure',
      });
      draftArtboard.previewSvgString = svgString;
      return draftArtboard;
    });
  };

  // -------------------------------------------------------------------------
  // Detector A: Retângulos/Placas de Base de Prancheta (background-rects)
  // -------------------------------------------------------------------------
  const detectByBackgroundRects = () => {
    const rectCandidates = foregroundLeafNodes.filter((n) => {
      if (!n.computedBounds) return false;
      if (n.type !== 'rect' && n.type !== 'path') return false;
      const area = n.computedBounds.width * n.computedBounds.height;
      const ratio = area / masterArea;
      // Cada prancheta num grid costuma ter entre 2% e 65% da área total do SVG mestre
      if (ratio < 0.02 || ratio > 0.68) return false;
      const aspect = n.computedBounds.width / Math.max(1, n.computedBounds.height);
      if (aspect < 0.2 || aspect > 5.5) return false;
      // Para path, verificar se o nome sugere base/fundo/prancheta/card ou se é o primeiro filho de um grupo
      if (n.type === 'path') {
        const lower = n.displayName.toLowerCase();
        const isBgName =
          lower.includes('prancheta') ||
          lower.includes('artboard') ||
          lower.includes('fundo') ||
          lower.includes('bg') ||
          lower.includes('base') ||
          lower.includes('card') ||
          lower.includes('quadro');
        if (!isBgName) return false;
      }
      return true;
    });

    // Filtrar apenas retângulos que NÃO se sobrepõem fortemente entre si (são placas disjuntas lado a lado)
    const disjointRects: DesignNode[] = [];
    const sortedByAreaDesc = [...rectCandidates].sort((a, b) => {
      const areaA = (a.computedBounds?.width || 0) * (a.computedBounds?.height || 0);
      const areaB = (b.computedBounds?.width || 0) * (b.computedBounds?.height || 0);
      return areaB - areaA;
    });

    for (const cand of sortedByAreaDesc) {
      const b = cand.computedBounds!;
      const candArea = Math.max(1, b.width * b.height);
      const overlapsExisting = disjointRects.some((existing) => {
        const eb = existing.computedBounds!;
        const inter = boxesIntersectionArea(b, eb);
        const minArea = Math.min(candArea, eb.width * eb.height);
        return inter / Math.max(1, minArea) > 0.2;
      });
      if (!overlapsExisting) {
        disjointRects.push(cand);
      }
    }

    if (disjointRects.length < 2) return [];

    // Para cada retângulo de prancheta, coletar todos os elementos gráficos cujo centro (ou >= 35% da área) cai dentro dele
    const boards = disjointRects.map((rectNode, i) => {
      const rBounds = rectNode.computedBounds!;
      const containedNodeIds = new Set<string>([rectNode.id]);

      for (const leaf of foregroundLeafNodes) {
        if (leaf.id === rectNode.id || !leaf.computedBounds) continue;
        // Não incluir outros retângulos-base de outras pranchetas
        if (disjointRects.some((other) => other.id === leaf.id)) continue;

        const lb = leaf.computedBounds;
        const cx = lb.x + lb.width / 2;
        const cy = lb.y + lb.height / 2;
        const inter = boxesIntersectionArea(lb, rBounds);
        const leafArea = Math.max(1, lb.width * lb.height);

        if (isPointInsideBox(cx, cy, rBounds, 4) || inter / leafArea >= 0.35) {
          containedNodeIds.add(leaf.id);
        }
      }

      // Descobrir um nome semântico a partir do grupo pai ou do próprio retângulo
      let boardName = rectNode.displayName;
      if (rectNode.parentId) {
        const parent = nodesMap.get(rectNode.parentId);
        if (
          parent &&
          !parent.isSyntheticLooseGroup &&
          parent.childrenIds.every((cid) => containedNodeIds.has(cid) || nodesMap.get(cid)?.type === 'group')
        ) {
          boardName = parent.displayName;
        }
      }
      if (/^(retângulo|rect|rectangle|fundo|bg|base)\s*\d*$/i.test(boardName.trim())) {
        boardName = `Prancheta ${String(i + 1).padStart(2, '0')}`;
      }

      return {
        name: boardName,
        origin: 'background-rect' as const,
        bounds: rBounds,
        nodeIds: Array.from(containedNodeIds),
        backgroundNodeId: rectNode.id,
        hasOwnBackground: true,
        detectedBackgroundFill: rectNode.normalizedProperties.fill,
      };
    });

    // Só validar se pelo menos metade das placas contiverem elementos de logo além do próprio retângulo
    const populatedCount = boards.filter((b) => b.nodeIds.length > 1).length;
    if (populatedCount < Math.ceil(boards.length * 0.5)) {
      return [];
    }

    return boards;
  };

  // -------------------------------------------------------------------------
  // Detector B: Grupos de Prancheta (Top-Level ou filhos de camada única como "Camada 1")
  // -------------------------------------------------------------------------
  const getEffectiveTopGroups = (forceSubgroups = false): DesignNode[] => {
    const rootGroups = nodes.filter(
      (n) => n.parentId === null && n.type === 'group' && !n.isSyntheticLooseGroup && n.sourceVisibility
    );

    if (forceSubgroups) {
      const subGroups: DesignNode[] = [];
      for (const rg of rootGroups) {
        for (const cid of rg.childrenIds) {
          const child = nodesMap.get(cid);
          if (child && child.type === 'group' && child.sourceVisibility) {
            subGroups.push(child);
          }
        }
      }
      if (subGroups.length > 0) return subGroups;
    }

    // Se houver apenas 1 grupo raiz (ex: Illustrator "Camada_1" / "Layer_1"), inspecionar seus subgrupos filhos
    if (rootGroups.length === 1) {
      const singleRoot = rootGroups[0];
      const childGroups = singleRoot.childrenIds
        .map((cid) => nodesMap.get(cid))
        .filter((n): n is DesignNode => Boolean(n && n.type === 'group' && n.sourceVisibility));
      if (childGroups.length >= 2) {
        return childGroups;
      }
    }

    return rootGroups;
  };

  const buildBoardsFromGroups = (
    groupList: DesignNode[],
    originLabel: ArtboardItem['origin']
  ) => {
    const candidates: Array<{
      name: string;
      origin: ArtboardItem['origin'];
      bounds: BoundingBox;
      nodeIds: string[];
      backgroundNodeId?: string;
      hasOwnBackground: boolean;
      detectedBackgroundFill?: string;
    }> = [];

    for (const grp of groupList) {
      const leaves = collectSubtreeLeafNodes(grp.id, nodesMap);
      if (leaves.length === 0) continue;
      // Ignorar grupo se ele for apenas o fundo geral do canvas inteiro
      if (leaves.length === 1 && fullCanvasBgIds.has(leaves[0].id)) continue;

      const grpBounds = grp.computedBounds || mergeBounds(leaves.map((l) => l.computedBounds));
      if (!grpBounds) continue;

      const { bgNode, fill } = findArtboardBackgroundNode(leaves, grpBounds);
      let finalBounds = { ...grpBounds };
      if (!bgNode) {
        // Adicionar respiro sutil de 5% ao redor do lockup se não houver retângulo de prancheta explícito
        const pad = Math.round(Math.max(grpBounds.width, grpBounds.height) * 0.05 * 100) / 100;
        finalBounds = {
          x: grpBounds.x - pad,
          y: grpBounds.y - pad,
          width: grpBounds.width + pad * 2,
          height: grpBounds.height + pad * 2,
        };
      }

      candidates.push({
        name: grp.displayName,
        origin: originLabel,
        bounds: finalBounds,
        nodeIds: [grp.id],
        backgroundNodeId: bgNode?.id,
        hasOwnBackground: Boolean(bgNode),
        detectedBackgroundFill: fill,
      });
    }

    return candidates;
  };

  // -------------------------------------------------------------------------
  // Detector C: Clusterização de Ilhas Espaciais 2D (spatial-clusters)
  // -------------------------------------------------------------------------
  const detectBySpatialClusters = () => {
    if (foregroundLeafNodes.length === 0) return [];

    // Margem de proximidade para agrupar símbolo + wordmark + tagline de uma mesma prancheta
    const minCanvasDim = Math.min(masterVb.width, masterVb.height);
    const proximityGap = Math.max(14, minCanvasDim * 0.038);

    interface Cluster {
      bounds: BoundingBox;
      nodes: DesignNode[];
    }

    const clusters: Cluster[] = foregroundLeafNodes.map((n) => ({
      bounds: { ...n.computedBounds! },
      nodes: [n],
    }));

    const boxesCloseOrOverlapping = (a: BoundingBox, b: BoundingBox, gap: number): boolean => {
      return !(
        a.x + a.width + gap < b.x ||
        b.x + b.width + gap < a.x ||
        a.y + a.height + gap < b.y ||
        b.y + b.height + gap < a.y
      );
    };

    let mergedAny = true;
    while (mergedAny && clusters.length > 1) {
      mergedAny = false;
      outer: for (let i = 0; i < clusters.length; i++) {
        for (let j = i + 1; j < clusters.length; j++) {
          if (boxesCloseOrOverlapping(clusters[i].bounds, clusters[j].bounds, proximityGap)) {
            const combinedBounds = mergeBounds([clusters[i].bounds, clusters[j].bounds])!;
            clusters[i] = {
              bounds: combinedBounds,
              nodes: [...clusters[i].nodes, ...clusters[j].nodes],
            };
            clusters.splice(j, 1);
            mergedAny = true;
            break outer;
          }
        }
      }
    }

    return clusters.map((c, idx) => {
      const { bgNode, fill } = findArtboardBackgroundNode(c.nodes, c.bounds);
      let finalBounds = { ...c.bounds };
      if (!bgNode) {
        const pad = Math.round(Math.max(c.bounds.width, c.bounds.height) * 0.06 * 100) / 100;
        finalBounds = {
          x: c.bounds.x - pad,
          y: c.bounds.y - pad,
          width: c.bounds.width + pad * 2,
          height: c.bounds.height + pad * 2,
        };
      }

      // Tentar nomear pela camada/grupo predominante
      let label = `Ilha Visual ${String(idx + 1).padStart(2, '0')}`;
      const firstParentId = c.nodes[0]?.parentId;
      if (firstParentId) {
        const pNode = nodesMap.get(firstParentId);
        if (pNode && !pNode.isSyntheticLooseGroup) {
          label = pNode.displayName;
        }
      }

      return {
        name: label,
        origin: 'spatial-cluster' as const,
        bounds: finalBounds,
        nodeIds: c.nodes.map((n) => n.id),
        backgroundNodeId: bgNode?.id,
        hasOwnBackground: Boolean(bgNode),
        detectedBackgroundFill: fill,
      };
    });
  };

  // =========================================================================
  // Execução de acordo com a estratégia solicitada
  // =========================================================================
  if (strategy === 'background-rects') {
    const rects = detectByBackgroundRects();
    if (rects.length > 0) return finalizeCandidates(rects);
  }

  if (strategy === 'top-groups') {
    const groups = getEffectiveTopGroups(false);
    const boards = buildBoardsFromGroups(groups, 'top-group');
    if (boards.length > 0) return finalizeCandidates(boards);
  }

  if (strategy === 'subgroups') {
    const groups = getEffectiveTopGroups(true);
    const boards = buildBoardsFromGroups(groups, 'subgroup');
    if (boards.length > 0) return finalizeCandidates(boards);
  }

  if (strategy === 'spatial-clusters') {
    const clusters = detectBySpatialClusters();
    if (clusters.length > 0) return finalizeCandidates(clusters);
  }

  // Estratégia 'auto' (Inteligente):
  // 1. Verificar se existem grupos explicitamente batizados de "Prancheta", "Artboard", "Frame", "Versão", "Lockup", "Card"
  const effectiveGroups = getEffectiveTopGroups(false);
  const namedArtboardRegex =
    /(prancheta|artboard|frame|slide|card|vers[aã]o|variante|lockup|marca\s*\d|logo\s*\d|assinatura|s[ií]mbolo|monograma|horizontal|vertical|principal| secund)/i;
  const explicitlyNamedGroups = effectiveGroups.filter((g) =>
    namedArtboardRegex.test(g.displayName)
  );
  if (explicitlyNamedGroups.length >= 2) {
    const boards = buildBoardsFromGroups(effectiveGroups, 'named-artboard');
    if (boards.length >= 2) {
      return finalizeCandidates(boards);
    }
  }

  // 2. Verificar se existem Placas/Retângulos de Prancheta em Grid/Linha (funciona mesmo quando camadas estão separadas ou soltas!)
  const rectBoards = detectByBackgroundRects();
  if (rectBoards.length >= 2) {
    return finalizeCandidates(rectBoards);
  }

  // 3. Verificar se os grupos de topo ocupam regiões espaciais distintas (pranchetas agrupadas lado a lado)
  if (effectiveGroups.length >= 2) {
    const groupBoards = buildBoardsFromGroups(effectiveGroups, 'top-group');
    if (groupBoards.length >= 2) {
      // Checar se os grupos são espacialmente separados (e não apenas camadas empilhadas do mesmo logo único)
      let distinctPairs = 0;
      let totalPairs = 0;
      for (let i = 0; i < groupBoards.length; i++) {
        for (let j = i + 1; j < groupBoards.length; j++) {
          totalPairs++;
          const a = groupBoards[i].bounds;
          const b = groupBoards[j].bounds;
          const inter = boxesIntersectionArea(a, b);
          const minArea = Math.min(a.width * a.height, b.width * b.height);
          const distCenters = Math.hypot(
            a.x + a.width / 2 - (b.x + b.width / 2),
            a.y + a.height / 2 - (b.y + b.height / 2)
          );
          if (inter / Math.max(1, minArea) < 0.35 && distCenters > Math.min(masterVb.width, masterVb.height) * 0.18) {
            distinctPairs++;
          }
        }
      }
      if (totalPairs > 0 && distinctPairs / totalPairs >= 0.5) {
        return finalizeCandidates(groupBoards);
      }
    }
  }

  // 4. Verificar se existem Ilhas Espaciais 2D bem separadas na folha
  const spatialBoards = detectBySpatialClusters();
  if (spatialBoards.length >= 2) {
    return finalizeCandidates(spatialBoards);
  }

  // 5. Fallback:Prancheta única com o documento completo (ou grupos de topo se o usuário tiver grupos)
  const allRootNodeIds = nodes.filter((n) => n.parentId === null).map((n) => n.id);
  const { bgNode, fill } = findArtboardBackgroundNode(allLeafNodes, masterVb);

  return finalizeCandidates([
    {
      name: 'Prancheta Principal (Completa)',
      origin: 'full-canvas',
      bounds: masterVb,
      nodeIds: allRootNodeIds,
      backgroundNodeId: bgNode?.id,
      hasOwnBackground: Boolean(bgNode),
      detectedBackgroundFill: fill,
    },
  ]);
}

/**
 * Converte uma Prancheta (ArtboardItem) em uma Composição não-destrutiva pronta
 * para edição fina de camadas ou para animação de 5,000 segundos no Motion Studio.
 */
export function createCompositionFromArtboard(params: {
  sourceDoc: SourceDocument;
  artboard: ArtboardItem;
  orderIndex: number;
  keepBackground?: boolean;
}): Composition {
  const { sourceDoc, artboard, orderIndex, keepBackground = true } = params;
  const nodesMap = new Map<string, DesignNode>(sourceDoc.nodes.map((n) => [n.id, n]));

  const allowedNodeIds = new Set<string>();
  const addSubtree = (id: string) => {
    const n = nodesMap.get(id);
    if (!n) return;
    allowedNodeIds.add(id);
    for (const cid of n.childrenIds) addSubtree(cid);
  };

  for (const nid of artboard.nodeIds) {
    addSubtree(nid);
    let curr = nodesMap.get(nid);
    while (curr?.parentId) {
      allowedNodeIds.add(curr.parentId);
      curr = nodesMap.get(curr.parentId);
    }
  }

  if (!keepBackground && artboard.backgroundNodeId) {
    allowedNodeIds.delete(artboard.backgroundNodeId);
  }

  const visibilityOverrides: Record<string, boolean> = {};
  for (const node of sourceDoc.nodes) {
    visibilityOverrides[node.id] = allowedNodeIds.has(node.id);
  }

  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    id: `comp_art_${artboard.index}_${Date.now().toString(36)}`,
    projectId: sourceDoc.projectId,
    documentId: sourceDoc.id,
    name: artboard.name,
    description: `Gerada a partir da ${artboard.name} (${Math.round(artboard.bounds.width)}×${Math.round(artboard.bounds.height)}px)`,
    status: 'approved',
    orderIndex,
    visibilityOverrides,
    roleOverrides: {},
    nameOverrides: {},
    lockedNodeIds: [],
    exportPreferences: {
      defaultFormats: ['svg', 'png'],
      svgProfile: 'preserve-structure',
      pngScalePx: 2048,
      backgroundMode: 'transparent',
      customBackgroundColor: artboard.detectedBackgroundFill || '#0D0D11',
      framingMode: 'fit-to-content',
    },
    isMotionSource: orderIndex === 0,
    version: 1,
    sourceSnapshotHash: sourceDoc.checksumSha256,
    createdAt: now,
    updatedAt: now,
  };
}

