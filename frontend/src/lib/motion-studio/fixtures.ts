// src/lib/motion-studio/fixtures.ts

import { ExportProfilePreset } from './types';

export interface SvgFixtureDefinition {
  id: string;
  code: string;
  name: string;
  clientName: string;
  category: 'agency-showcase' | 'qa-fixture';
  filename: string;
  expectedOutcome: 'complete' | 'partial' | 'failed';
  description: string;
  svgContent: string;
}

export const VERONNA_MAISON_MASTER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" viewBox="0 0 800 500" width="800" height="500">
  <defs>
    <linearGradient id="veronna_gold_grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#D4AF7A" />
      <stop offset="50%" stop-color="#142C48" />
      <stop offset="100%" stop-color="#B9D1E3" />
    </linearGradient>
    <radialGradient id="veronna_halo_grad" cx="50%" cy="40%" r="50%">
      <stop offset="0%" stop-color="#142C48" stop-opacity="0.18" />
      <stop offset="100%" stop-color="#142C48" stop-opacity="0" />
    </radialGradient>
    <clipPath id="veronna_crest_clip">
      <circle cx="400" cy="175" r="96" />
    </clipPath>
  </defs>

  <g id="Camada_Fundo" inkscape:groupmode="layer" inkscape:label="Fundo Editorial">
    <rect id="Placa_Base" x="20" y="20" width="760" height="460" rx="28" fill="#14161D" stroke="#2C323B" stroke-width="1.5" />
    <circle id="Halo_Luz" cx="400" cy="180" r="190" fill="url(#veronna_halo_grad)" />
  </g>

  <g id="Camada_Detalhes" inkscape:groupmode="layer" inkscape:label="Detalhes &amp; Moldura">
    <line id="Filete_Esq" x1="150" y1="352" x2="290" y2="352" stroke="url(#veronna_gold_grad)" stroke-width="1.5" opacity="0.65" />
    <line id="Filete_Dir" x1="510" y1="352" x2="650" y2="352" stroke="url(#veronna_gold_grad)" stroke-width="1.5" opacity="0.65" />
    <polygon id="Estrela_Topo" points="400,56 404,68 416,72 404,76 400,88 396,76 384,72 396,68" fill="url(#veronna_gold_grad)" />
  </g>

  <g id="Camada_Simbolo" inkscape:groupmode="layer" inkscape:label="Símbolo Monograma" clip-path="url(#veronna_crest_clip)">
    <circle id="Anel_Externo" cx="400" cy="175" r="78" fill="none" stroke="url(#veronna_gold_grad)" stroke-width="2.5" />
    <circle id="Anel_Interno" cx="400" cy="175" r="64" fill="none" stroke="#B9D1E3" stroke-width="1" stroke-dasharray="6 4" opacity="0.7" />
    <path id="Monograma_V" d="M 366 136 L 400 218 L 434 136" fill="none" stroke="url(#veronna_gold_grad)" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round" />
    <path id="Arco_Botanico_Esq" d="M 352 196 C 350 155, 378 125, 400 118" fill="none" stroke="#B9D1E3" stroke-width="2.5" stroke-linecap="round" />
    <path id="Arco_Botanico_Dir" d="M 448 196 C 450 155, 422 125, 400 118" fill="none" stroke="#B9D1E3" stroke-width="2.5" stroke-linecap="round" />
    <circle id="Ponto_Central" cx="400" cy="154" r="5" fill="#F6F5F2" />
  </g>

  <g id="Camada_Lettering" inkscape:groupmode="layer" inkscape:label="Lettering Principal">
    <path id="Glyph_V" d="M 205 292 L 224 338 L 243 292" fill="none" stroke="#F6F5F2" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
    <path id="Glyph_E" d="M 268 292 L 268 338 M 268 292 L 296 292 M 268 315 L 290 315 M 268 338 L 296 338" fill="none" stroke="#F6F5F2" stroke-width="5" stroke-linecap="round" />
    <path id="Glyph_R" d="M 322 338 L 322 292 L 346 292 C 356 292, 356 314, 346 314 L 322 314 M 340 314 L 356 338" fill="none" stroke="#F6F5F2" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
    <circle id="Glyph_O" cx="394" cy="315" r="23" fill="none" stroke="#F6F5F2" stroke-width="5" />
    <path id="Glyph_N1" d="M 442 338 L 442 292 L 476 338 L 476 292" fill="none" stroke="#F6F5F2" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
    <path id="Glyph_N2" d="M 504 338 L 504 292 L 538 338 L 538 292" fill="none" stroke="#F6F5F2" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
    <path id="Glyph_A" d="M 564 338 L 583 292 L 602 338 M 571 323 L 595 323" fill="none" stroke="#F6F5F2" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
  </g>

  <g id="Camada_Descritor" inkscape:groupmode="layer" inkscape:label="Descritor Assinatura">
    <rect id="Pill_Descritor" x="308" y="368" width="184" height="28" rx="14" fill="none" stroke="url(#veronna_gold_grad)" stroke-width="1.2" opacity="0.85" />
    <path id="Linha_Assinatura" d="M 332 382 L 468 382" stroke="#D4AF7A" stroke-width="2.5" stroke-dasharray="10 6" stroke-linecap="round" />
  </g>
</svg>`;

export const ATELIER_AURA_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="800" height="500">
  <defs>
    <linearGradient id="aura_rose_grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#B9D1E3" />
      <stop offset="100%" stop-color="#142C48" />
    </linearGradient>
  </defs>
  <g id="Fundo_Creme" data-name="Fundo Creme">
    <rect x="0" y="0" width="800" height="500" rx="24" fill="#E8E3DD" />
  </g>
  <g id="Simbolo_Sol_Botanico" data-name="Símbolo Sol Botânico">
    <circle cx="400" cy="185" r="68" fill="none" stroke="url(#aura_rose_grad)" stroke-width="3.5" />
    <path d="M 400 95 L 400 275 M 310 185 L 490 185" stroke="#142C48" stroke-width="2" stroke-linecap="round" opacity="0.6" />
    <path d="M 365 215 Q 400 130 435 215 Z" fill="url(#aura_rose_grad)" opacity="0.85" />
  </g>
  <g id="Lettering_Aura" data-name="Lettering Aura">
    <path d="M 270 345 L 295 290 L 320 345 M 278 328 L 312 328" fill="none" stroke="#424242" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M 355 290 L 355 325 C 355 348, 395 348, 395 325 L 395 290" fill="none" stroke="#424242" stroke-width="5" stroke-linecap="round" />
    <path d="M 430 345 L 430 290 L 458 290 C 470 290, 470 315, 458 315 L 430 315 M 452 315 L 470 345" fill="none" stroke="#424242" stroke-width="5" stroke-linecap="round" />
    <path d="M 500 345 L 525 290 L 550 345 M 508 328 L 542 328" fill="none" stroke="#424242" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
  </g>
  <g id="Descritor_Atelier" data-name="Descritor Atelier">
    <line x1="320" y1="385" x2="480" y2="385" stroke="#142C48" stroke-width="2" stroke-linecap="round" />
  </g>
</svg>`;

export const LUMINA_ARQUITETURA_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="800" height="500">
  <g id="Fundo_Escuro" aria-label="Fundo Arquitetônico">
    <rect x="24" y="24" width="752" height="452" rx="16" fill="#111318" stroke="#2C323B" stroke-width="2" />
  </g>
  <g id="Simbolo_Isometrico" aria-label="Símbolo Cubo Isométrico">
    <polygon points="400,95 475,138 475,224 400,267 325,224 325,138" fill="none" stroke="#8C7CFF" stroke-width="4" stroke-linejoin="round" />
    <polyline points="325,138 400,181 475,138" fill="none" stroke="#3FBF8A" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" />
    <line x1="400" y1="181" x2="400" y2="267" stroke="#3FBF8A" stroke-width="3.5" stroke-linecap="round" />
  </g>
  <g id="Lettering_Lumina" aria-label="Lettering Lumina">
    <path d="M 250 310 L 250 355 L 282 355 M 310 310 L 310 342 C 310 358, 342 358, 342 342 L 342 310 M 372 355 L 372 310 L 394 336 L 416 310 L 416 355 M 448 310 L 448 355 M 478 355 L 478 310 L 512 355 L 512 310 M 538 355 L 558 310 L 578 355" fill="none" stroke="#F1F3F5" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" />
  </g>
  <g id="Descritor_Arch" aria-label="Descritor Studio">
    <rect x="330" y="384" width="140" height="6" rx="3" fill="#8C7CFF" opacity="0.7" />
  </g>
</svg>`;

export const VERONNA_MULTI_PRANCHETAS_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1800 1100" width="1800" height="1100">
  <defs>
    <linearGradient id="vm_gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#E2C18D" />
      <stop offset="50%" stop-color="#142C48" />
      <stop offset="100%" stop-color="#B9D1E3" />
    </linearGradient>
    <linearGradient id="vm_bronze" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#142C48" />
      <stop offset="100%" stop-color="#8A5229" />
    </linearGradient>
  </defs>

  <!-- PRANCHETA 01: LOGO PRINCIPAL VERTICAL -->
  <g id="Prancheta_01_Logo_Principal" data-name="Prancheta 01 — Logo Principal">
    <rect id="Base_Prancheta_01" x="40" y="40" width="540" height="480" rx="20" fill="#14161D" stroke="#2C323B" stroke-width="2" />
    <circle cx="310" cy="195" r="74" fill="none" stroke="url(#vm_gold)" stroke-width="3" />
    <circle cx="310" cy="195" r="58" fill="none" stroke="#B9D1E3" stroke-width="1.2" stroke-dasharray="6 4" />
    <path d="M 282 162 L 310 232 L 338 162" fill="none" stroke="url(#vm_gold)" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round" />
    <circle cx="310" cy="176" r="4.5" fill="#F6F5F2" />
    <path d="M 162 325 L 178 365 L 194 325 M 214 325 L 214 365 M 214 325 L 238 325 M 214 345 L 232 345 M 214 365 L 238 365 M 258 365 L 258 325 L 280 325 C 288 325, 288 344, 280 344 L 258 344 M 274 344 L 288 365 M 322 345 m -20,0 a 20,20 0 1,0 40,0 a 20,20 0 1,0 -40,0 M 364 365 L 364 325 L 392 365 L 392 325 M 414 365 L 414 325 L 442 365 L 442 325 M 462 365 L 478 325 L 494 365 M 468 352 L 488 352" fill="none" stroke="#F6F5F2" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" />
    <line x1="220" y1="402" x2="400" y2="402" stroke="url(#vm_gold)" stroke-width="2" stroke-linecap="round" />
    <rect x="245" y="422" width="130" height="22" rx="11" fill="none" stroke="#B9D1E3" stroke-width="1.2" opacity="0.8" />
  </g>

  <!-- PRANCHETA 02: VERSÃO HORIZONTAL -->
  <g id="Prancheta_02_Horizontal" data-name="Prancheta 02 — Versão Horizontal">
    <rect id="Base_Prancheta_02" x="630" y="40" width="540" height="480" rx="20" fill="#181B22" stroke="#2C323B" stroke-width="2" />
    <circle cx="745" cy="280" r="62" fill="none" stroke="url(#vm_gold)" stroke-width="3" />
    <path d="M 722 252 L 745 310 L 768 252" fill="none" stroke="url(#vm_gold)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" />
    <line x1="832" y1="220" x2="832" y2="340" stroke="#2C323B" stroke-width="2" />
    <path d="M 862 250 L 876 286 L 890 250 M 908 250 L 908 286 M 908 250 L 928 250 M 908 268 L 924 268 M 908 286 L 928 286 M 946 286 L 946 250 L 966 250 C 974 250, 974 267, 966 267 L 946 267 M 960 267 L 974 286 M 1004 268 m -18,0 a 18,18 0 1,0 36,0 a 18,18 0 1,0 -36,0 M 1040 286 L 1040 250 L 1064 286 L 1064 250 M 1084 286 L 1084 250 L 1108 286 L 1108 250 M 1122 286 L 1136 250 L 1150 286" fill="none" stroke="#F6F5F2" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round" />
    <line x1="862" y1="312" x2="1085" y2="312" stroke="url(#vm_gold)" stroke-width="2.5" stroke-linecap="round" />
    <line x1="862" y1="328" x2="995" y2="328" stroke="#B9D1E3" stroke-width="2" stroke-dasharray="8 6" stroke-linecap="round" />
  </g>

  <!-- PRANCHETA 03: SÍMBOLO ISOLADO -->
  <g id="Prancheta_03_Simbolo_Isolado" data-name="Prancheta 03 — Símbolo Isolado">
    <rect id="Base_Prancheta_03" x="1220" y="40" width="540" height="480" rx="20" fill="#111318" stroke="#2C323B" stroke-width="2" />
    <circle cx="1490" cy="280" r="126" fill="none" stroke="url(#vm_gold)" stroke-width="4" />
    <circle cx="1490" cy="280" r="102" fill="none" stroke="#B9D1E3" stroke-width="1.5" stroke-dasharray="8 6" />
    <polygon points="1490,128 1496,144 1512,150 1496,156 1490,172 1484,156 1468,150 1484,144" fill="url(#vm_gold)" />
    <path d="M 1442 222 L 1490 342 L 1538 222" fill="none" stroke="url(#vm_gold)" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M 1418 308 C 1415 245, 1455 202, 1490 192" fill="none" stroke="#B9D1E3" stroke-width="3.5" stroke-linecap="round" />
    <path d="M 1562 308 C 1565 245, 1525 202, 1490 192" fill="none" stroke="#B9D1E3" stroke-width="3.5" stroke-linecap="round" />
    <circle cx="1490" cy="245" r="7" fill="#F6F5F2" />
  </g>

  <!-- PRANCHETA 04: SELO & MONOGRAMA -->
  <g id="Prancheta_04_Selo_Monograma" data-name="Prancheta 04 — Selo Monograma">
    <rect id="Base_Prancheta_04" x="40" y="570" width="540" height="480" rx="20" fill="#142C48" stroke="#B9D1E3" stroke-width="2" />
    <polygon points="310,655 445,732 445,888 310,965 175,888 175,732" fill="none" stroke="#E8E3DD" stroke-width="3.5" stroke-linejoin="round" />
    <circle cx="310" cy="810" r="92" fill="none" stroke="#E8E3DD" stroke-width="2" stroke-dasharray="5 5" />
    <path d="M 272 762 L 310 858 L 348 762" fill="none" stroke="#E8E3DD" stroke-width="7.5" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M 282 858 L 310 762 L 338 858" fill="none" stroke="#E2C18D" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity="0.85" />
    <circle cx="310" cy="726" r="5" fill="#E8E3DD" />
    <circle cx="310" cy="894" r="5" fill="#E8E3DD" />
  </g>

  <!-- PRANCHETA 05: VERSÃO POSITIVA CREME -->
  <g id="Prancheta_05_Positiva_Creme" data-name="Prancheta 05 — Versão Positiva Creme">
    <rect id="Base_Prancheta_05" x="630" y="570" width="540" height="480" rx="20" fill="#E8E3DD" stroke="#E2C18D" stroke-width="2" />
    <circle cx="900" cy="735" r="72" fill="none" stroke="url(#vm_bronze)" stroke-width="3.2" />
    <path d="M 872 702 L 900 772 L 928 702" fill="none" stroke="#142C48" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round" />
    <circle cx="900" cy="716" r="4.5" fill="#1D1A17" />
    <path d="M 752 862 L 768 902 L 784 862 M 804 862 L 804 902 M 804 862 L 828 862 M 804 882 L 822 882 M 804 902 L 828 902 M 848 902 L 848 862 L 870 862 C 878 862, 878 881, 870 881 L 848 881 M 864 881 L 878 902 M 912 882 m -20,0 a 20,20 0 1,0 40,0 a 20,20 0 1,0 -40,0 M 954 902 L 954 862 L 982 902 L 982 862 M 1004 902 L 1004 862 L 1032 902 L 1032 862 M 1052 902 L 1068 862 L 1084 902 M 1058 889 L 1078 889" fill="none" stroke="#1D1A17" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" />
    <line x1="810" y1="942" x2="990" y2="942" stroke="#142C48" stroke-width="2.5" stroke-linecap="round" />
  </g>

  <!-- PRANCHETA 06: ASSINATURA TIPOGRÁFICA (WORDMARK PURO) -->
  <g id="Prancheta_06_Wordmark" data-name="Prancheta 06 — Assinatura Tipográfica">
    <rect id="Base_Prancheta_06" x="1220" y="570" width="540" height="480" rx="20" fill="#161920" stroke="#2C323B" stroke-width="2" />
    <line x1="1310" y1="735" x2="1670" y2="735" stroke="#2C323B" stroke-width="1.5" />
    <path d="M 1292 780 L 1312 832 L 1332 780 M 1356 780 L 1356 832 M 1356 780 L 1386 780 M 1356 806 L 1378 806 M 1356 832 L 1386 832 M 1412 832 L 1412 780 L 1440 780 C 1450 780, 1450 804, 1440 804 L 1412 804 M 1432 804 L 1450 832 M 1492 806 m -25,0 a 25,25 0 1,0 50,0 a 25,25 0 1,0 -50,0 M 1544 832 L 1544 780 L 1578 832 L 1578 780 M 1604 832 L 1604 780 L 1638 832 L 1638 780 M 1662 832 L 1682 780 L 1702 832 M 1669 816 L 1695 816" fill="none" stroke="url(#vm_gold)" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round" />
    <rect x="1395" y="868" width="190" height="28" rx="14" fill="none" stroke="#B9D1E3" stroke-width="1.4" />
    <line x1="1422" y1="882" x2="1558" y2="882" stroke="#F6F5F2" stroke-width="2.5" stroke-dasharray="10 6" stroke-linecap="round" />
  </g>
</svg>`;

/**
 * Conjunto completo das 18 Fixtures Obrigatórias de Teste e Regressão (Seção 16.1 do Briefing)
 * mais os projetos vitrine da agência (incluindo Folha Multi-Pranchetas).
 */
export const MOTION_STUDIO_FIXTURES: SvgFixtureDefinition[] = [
  {
    id: 'showcase_veronna_multi_artboards',
    code: 'SHOW-00',
    name: 'Veronna Maison — Kit 06 Pranchetas (Fechamento ID Visual)',
    clientName: 'Studio Veronna',
    category: 'agency-showcase',
    filename: 'Veronna_Kit_6_Pranchetas.svg',
    expectedOutcome: 'complete',
    description: 'Folha de apresentação com 6 pranchetas completas (Logo Principal, Horizontal, Símbolo, Selo Monograma, Positiva Creme e Wordmark) prontas para separação e download individual ou em pacote.',
    svgContent: VERONNA_MULTI_PRANCHETAS_SVG,
  },
  {
    id: 'showcase_veronna',
    code: 'SHOW-01',
    name: 'Veronna Maison — Identidade Master (Camadas)',
    clientName: 'Studio Veronna',
    category: 'agency-showcase',
    filename: 'Veronna_Maison_Master.svg',
    expectedOutcome: 'complete',
    description: 'Identidade completa com camadas Inkscape, gradientes em <defs>, clipPath, símbolo, lettering, descritor e detalhes.',
    svgContent: VERONNA_MAISON_MASTER_SVG,
  },
  {
    id: 'showcase_aura',
    code: 'SHOW-02',
    name: 'Atelier Aura — Joalheria & Botânica',
    clientName: 'Aura Fine Jewelry',
    category: 'agency-showcase',
    filename: 'Atelier_Aura_Identity.svg',
    expectedOutcome: 'complete',
    description: 'Composição orgânica em paleta Creme & Terracota com grupos data-name e gradiente linear.',
    svgContent: ATELIER_AURA_SVG,
  },
  {
    id: 'showcase_lumina',
    code: 'SHOW-03',
    name: 'Lumina Arquitetura — Traçado Puro',
    clientName: 'Lumina Arch Studio',
    category: 'agency-showcase',
    filename: 'Lumina_Arquitetura_Trace.svg',
    expectedOutcome: 'complete',
    description: 'Geometria vetorial de linhas contínuas ideal para validação do preset Trace / Traçado.',
    svgContent: LUMINA_ARQUITETURA_SVG,
  },
  // 18 FIXTURES OBRIGATÓRIAS DO PLANO DE TESTES (Seção 16.1)
  {
    id: 'fix_01_single_path',
    code: 'FIX-01',
    name: '01. Logo em Único Path',
    clientName: 'QA Suite (Seção 16.1)',
    category: 'qa-fixture',
    filename: '01_single_path.svg',
    expectedOutcome: 'complete',
    description: 'SVG simples com logo inteira em um único caminho vetorial na raiz.',
    svgContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><path id="Simbolo_Unico" d="M200 60 L320 300 L200 245 L80 300 Z" fill="#8C7CFF" stroke="#F1F3F5" stroke-width="6"/></svg>`,
  },
  {
    id: 'fix_02_nested_groups',
    code: 'FIX-02',
    name: '02. Grupos Nomeados e Aninhados',
    clientName: 'QA Suite (Seção 16.1)',
    category: 'qa-fixture',
    filename: '02_nested_groups.svg',
    expectedOutcome: 'complete',
    description: 'Hierarquia multi-nível com grupos pais e filhos para testar visibilidade tri-state e preservação de overrides.',
    svgContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400">
      <g id="Marca_Completa" data-name="Marca Completa">
        <g id="Grupo_Simbolo" data-name="Símbolo">
          <circle id="Circulo_Externo" cx="300" cy="140" r="65" fill="none" stroke="#142C48" stroke-width="6"/>
          <polygon id="Losango_Interno" points="300,95 345,140 300,185 255,140" fill="#B9D1E3"/>
        </g>
        <g id="Grupo_Tipografia" data-name="Tipografia">
          <rect id="Lettering_Bloco" x="180" y="245" width="240" height="32" rx="8" fill="#F1F3F5"/>
          <rect id="Descritor_Bloco" x="230" y="295" width="140" height="14" rx="4" fill="#A7AFBA"/>
        </g>
      </g>
    </svg>`,
  },
  {
    id: 'fix_03_loose_shapes',
    code: 'FIX-03',
    name: '03. Formas Soltas no SVG Raiz',
    clientName: 'QA Suite (Seção 16.1)',
    category: 'qa-fixture',
    filename: '03_loose_shapes_root.svg',
    expectedOutcome: 'complete',
    description: 'Objetos diretamente sob <svg> agrupados virtualmente em "Elementos soltos" sem modificar a fonte.',
    svgContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 350">
      <circle cx="170" cy="175" r="55" fill="#3FBF8A" />
      <rect x="245" y="120" width="110" height="110" rx="18" fill="#8C7CFF" />
      <line x1="115" y1="265" x2="355" y2="265" stroke="#E6B450" stroke-width="8" stroke-linecap="round" />
    </svg>`,
  },
  {
    id: 'fix_04_nested_transforms',
    code: 'FIX-04',
    name: '04. Transformações Aninhadas',
    clientName: 'QA Suite (Seção 16.1)',
    category: 'qa-fixture',
    filename: '04_nested_transforms.svg',
    expectedOutcome: 'complete',
    description: 'Grupos com translate, scale e rotate acumulados para validar cálculo de bounds e preservação.',
    svgContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 400">
      <g id="Simbolo_Transformado" transform="translate(150, 80) scale(1.2)">
        <g id="Subgrupo_Rotacionado" transform="translate(40, 30)">
          <rect id="Bloco_Base" x="0" y="0" width="140" height="140" rx="24" fill="none" stroke="#8C7CFF" stroke-width="6"/>
          <circle id="Nucleo" cx="70" cy="70" r="35" fill="#142C48"/>
        </g>
      </g>
    </svg>`,
  },
  {
    id: 'fix_05_gradients',
    code: 'FIX-05',
    name: '05. Gradiente Linear e Radial (<defs>)',
    clientName: 'QA Suite (Seção 16.1)',
    category: 'qa-fixture',
    filename: '05_linear_radial_gradients.svg',
    expectedOutcome: 'complete',
    description: 'Verifica resolução recursiva de dependências em <defs> durante exportação parcial de variantes.',
    svgContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 400">
      <defs>
        <linearGradient id="grad_linear_1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#8C7CFF"/>
          <stop offset="100%" stop-color="#3FBF8A"/>
        </linearGradient>
        <radialGradient id="grad_radial_1" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#E6B450"/>
          <stop offset="100%" stop-color="#142C48"/>
        </radialGradient>
      </defs>
      <g id="Camada_Simbolo_Grad"><circle cx="250" cy="155" r="75" fill="url(#grad_radial_1)"/></g>
      <g id="Camada_Wordmark_Grad"><rect x="130" y="265" width="240" height="44" rx="12" fill="url(#grad_linear_1)"/></g>
    </svg>`,
  },
  {
    id: 'fix_06_clip_mask',
    code: 'FIX-06',
    name: '06. clipPath e Mask Internos',
    clientName: 'QA Suite (Seção 16.1)',
    category: 'qa-fixture',
    filename: '06_clippath_and_mask.svg',
    expectedOutcome: 'complete',
    description: 'Testa retenção de clipPath e mask referenciados por camadas visíveis.',
    svgContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 400">
      <defs>
        <clipPath id="clip_circle"><circle cx="250" cy="200" r="95"/></clipPath>
      </defs>
      <g id="Simbolo_Recortado" clip-path="url(#clip_circle)">
        <rect x="140" y="90" width="220" height="110" fill="#8C7CFF"/>
        <rect x="140" y="200" width="220" height="110" fill="#142C48"/>
      </g>
    </svg>`,
  },
  {
    id: 'fix_07_use_elements',
    code: 'FIX-07',
    name: '07. Elementos Reutilizados por <use>',
    clientName: 'QA Suite (Seção 16.1)',
    category: 'qa-fixture',
    filename: '07_use_symbol_reuse.svg',
    expectedOutcome: 'complete',
    description: 'Símbolo definido em <defs> e instanciado múltiplas vezes via <use href="#..."/>.',
    svgContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 400">
      <defs>
        <g id="petala_padrao"><ellipse cx="0" cy="0" rx="28" ry="65" fill="none" stroke="#B9D1E3" stroke-width="4"/></g>
      </defs>
      <g id="Rosacea_Simbolo">
        <use href="#petala_padrao" x="250" y="150"/>
        <use href="#petala_padrao" x="250" y="250"/>
      </g>
    </svg>`,
  },
  {
    id: 'fix_08_text_font',
    code: 'FIX-08',
    name: '08. Texto Editável (<text>)',
    clientName: 'QA Suite (Seção 16.1)',
    category: 'qa-fixture',
    filename: '08_editable_text.svg',
    expectedOutcome: 'complete',
    description: 'Detecta tags <text> e orienta sobre conversão em curvas para fechamento final.',
    svgContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 350">
      <g id="Simbolo"><circle cx="300" cy="120" r="45" fill="none" stroke="#142C48" stroke-width="5"/></g>
      <g id="Lettering_Texto"><text x="195" y="240" font-family="sans-serif" font-size="42" font-weight="bold" fill="#F1F3F5">VERONNA</text></g>
    </svg>`,
  },
  {
    id: 'fix_10_embedded_image',
    code: 'FIX-10',
    name: '10. Imagem Incorporada em Data URI',
    clientName: 'QA Suite (Seção 16.1)',
    category: 'qa-fixture',
    filename: '10_embedded_data_uri.svg',
    expectedOutcome: 'complete',
    description: 'Imagem raster embutida via data:image/png permitida e contabilizada no diagnóstico.',
    svgContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
      <g id="Grupo_Hibrido">
        <image x="150" y="60" width="100" height="100" href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" />
        <rect x="120" y="190" width="160" height="36" rx="8" fill="#3FBF8A"/>
      </g>
    </svg>`,
  },
  {
    id: 'fix_11_external_blocked',
    code: 'FIX-11',
    name: '11. Referência Externa Bloqueada (Segurança)',
    clientName: 'QA Suite (Seção 16.1)',
    category: 'qa-fixture',
    filename: '11_external_ref_blocked.svg',
    expectedOutcome: 'partial',
    description: 'Testa bloqueio de requisição HTTP externa e emissão de aviso SVG_EXTERNAL_REFERENCE_BLOCKED.',
    svgContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 350">
      <g id="Simbolo_Seguro"><circle cx="250" cy="150" r="65" fill="#8C7CFF"/></g>
      <g id="Ativo_Externo"><image x="100" y="240" width="300" height="60" href="https://malicious.example.com/tracker.png"/></g>
    </svg>`,
  },
  {
    id: 'fix_12_duplicate_ids',
    code: 'FIX-12',
    name: '12. IDs Duplicados Normalizados',
    clientName: 'QA Suite (Seção 16.1)',
    category: 'qa-fixture',
    filename: '12_duplicate_ids.svg',
    expectedOutcome: 'complete',
    description: 'Verifica desambiguação automática de elementos que compartilham o mesmo atributo id.',
    svgContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 350">
      <g id="Camada_Duplicada"><circle id="item_1" cx="180" cy="175" r="55" fill="#142C48"/></g>
      <g id="Camada_Duplicada"><circle id="item_1" cx="320" cy="175" r="55" fill="#3FBF8A"/></g>
    </svg>`,
  },
  {
    id: 'fix_13_malformed_xml',
    code: 'FIX-13',
    name: '13. XML Malformado (Teste de Rejeição)',
    clientName: 'QA Suite (Seção 16.1)',
    category: 'qa-fixture',
    filename: '13_malformed_xml.svg',
    expectedOutcome: 'failed',
    description: 'Verifica que XML truncado/inválido é rejeitado com código SVG_INVALID_XML sem travar a UI.',
    svgContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><g id="Quebrado"><path d="M10 10 L100 100"</svg>`,
  },
  {
    id: 'fix_14_security_scripts',
    code: 'FIX-14',
    name: '14. Scripts, Event Handlers e foreignObject',
    clientName: 'QA Suite (Seção 16.1)',
    category: 'qa-fixture',
    filename: '14_security_xss_attempt.svg',
    expectedOutcome: 'partial',
    description: 'Verifica remoção cirúrgica de <script>, onclick, onload e <foreignObject> antes do preview.',
    svgContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 350" onload="alert('xss')">
      <script type="text/javascript">window.hacked = true;</script>
      <foreignObject width="100" height="50"><div>HTML Injetado</div></foreignObject>
      <g id="Simbolo_Sanitizado" onclick=" evil() ">
        <polygon points="250,70 350,260 150,260" fill="#3FBF8A" />
      </g>
    </svg>`,
  },
  {
    id: 'fix_16_no_viewbox',
    code: 'FIX-16',
    name: '16. SVG sem viewBox Explícito',
    clientName: 'QA Suite (Seção 16.1)',
    category: 'qa-fixture',
    filename: '16_missing_viewbox.svg',
    expectedOutcome: 'partial',
    description: 'Deriva automaticamente o viewport a partir dos limites geométricos e emite alerta para revisão.',
    svgContent: `<svg xmlns="http://www.w3.org/2000/svg">
      <g id="Simbolo_Sem_ViewBox"><circle cx="220" cy="180" r="85" fill="#E6B450"/></g>
      <g id="Lettering_Sem_ViewBox"><rect x="110" y="295" width="220" height="35" rx="8" fill="#F1F3F5"/></g>
    </svg>`,
  },
  {
    id: 'fix_18_complex_filter',
    code: 'FIX-18',
    name: '18. Filtro SVG com Aviso de Compatibilidade',
    clientName: 'QA Suite (Seção 16.1)',
    category: 'qa-fixture',
    filename: '18_unsupported_filter_primitive.svg',
    expectedOutcome: 'partial',
    description: 'Detecta primitiva de filtro avançada (feTurbulence/feDisplacementMap) e informa compatibilidade parcial.',
    svgContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 350">
      <defs>
        <filter id="filtro_complexo">
          <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2"/>
          <feDisplacementMap in="SourceGraphic" scale="10"/>
        </filter>
      </defs>
      <g id="Simbolo_Com_Filtro" filter="url(#filtro_complexo)">
        <circle cx="250" cy="175" r="80" fill="#F16C72"/>
      </g>
    </svg>`,
  },
];

export const DEFAULT_EXPORT_PRESETS: ExportProfilePreset[] = [
  {
    id: 'preset_agency_full',
    name: 'Pacote Fechamento Oficial (SVG + PNG 2048px)',
    description: 'Padrão Studio Veronna: SVG com estrutura preservada + PNG 2048px transparente.',
    formats: ['svg', 'png'],
    svgProfile: 'preserve-structure',
    pngScalesPx: [2048],
    backgrounds: ['transparent'],
    framingMode: 'original-viewbox',
    isDefaultAgencyPreset: true,
  },
  {
    id: 'preset_social_kit',
    name: 'Kit Digital & Social (PNG 1080px)',
    description: 'Exportação raster rápida em 1080px para validação e uso digital.',
    formats: ['png'],
    svgProfile: 'preserve-structure',
    pngScalesPx: [1080],
    backgrounds: ['transparent'],
    framingMode: 'original-viewbox',
    isDefaultAgencyPreset: true,
  },
  {
    id: 'preset_vector_optimized',
    name: 'Vetor Web Otimizado (SVGO Safe Profile)',
    description: 'SVG limpo de metadados mantendo fidelidade geométrica e referências internas.',
    formats: ['svg'],
    svgProfile: 'optimized',
    pngScalesPx: [1080],
    backgrounds: ['transparent'],
    framingMode: 'fit-to-content',
    isDefaultAgencyPreset: true,
  },
];
