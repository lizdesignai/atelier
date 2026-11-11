// src/lib/linkUtils.ts
// Utilitário para resolução, normalização e atalhos rápidos de links externos no Atelier.

export interface ResolvedLinkMetadata {
  url: string;
  title: string;
  domain: string;
  type: 'figma' | 'google-docs' | 'google-sheets' | 'google-drive' | 'canva' | 'trello' | 'instagram' | 'pinterest' | 'notion' | 'youtube' | 'dropbox' | 'loom' | 'miro' | 'generic';
}

/**
 * Normaliza qualquer URL inserida pelo usuário, garantindo protocolo https://
 * e tratando links de redirecionamento ou texto bruto.
 */
export function normalizeUrl(rawUrl?: string | null): string {
  if (!rawUrl) return '';
  let clean = String(rawUrl).trim();
  if (!clean) return '';

  // Tratamento de redirecionamento do Google (ex: https://www.google.com/url?q=https://canva.com/...)
  if (clean.includes('google.com/url?') && clean.includes('q=')) {
    try {
      const parsed = new URL(clean);
      const target = parsed.searchParams.get('q');
      if (target) clean = target.trim();
    } catch {
      // Ignora erro e continua com a url original
    }
  }

  // Se não tem protocolo (ex: "figma.com/file/...", "drive.google.com/..."), acrescenta https://
  if (!/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//i.test(clean)) {
    clean = `https://${clean}`;
  }

  return clean;
}

/**
 * Resolve qualquer formato de link (string pura ou objeto { title, url })
 * extraindo a URL normalizada, domínio e um título inteligente como atalho.
 */
export function resolveExternalLink(link: any): ResolvedLinkMetadata {
  if (!link) {
    return { url: '', title: 'Link', domain: '', type: 'generic' };
  }

  let rawUrl = '';
  let rawTitle = '';

  if (typeof link === 'string') {
    rawUrl = link;
  } else if (typeof link === 'object') {
    rawUrl = link.url || link.href || link.link || '';
    rawTitle = typeof link.title === 'string' ? link.title.trim() : '';
  }

  const cleanUrl = normalizeUrl(rawUrl);

  let domain = '';
  try {
    if (cleanUrl) {
      const u = new URL(cleanUrl);
      domain = u.hostname.replace(/^www\./i, '');
    }
  } catch {
    domain = cleanUrl.replace(/^https?:\/\//i, '').split('/')[0] || '';
  }

  const d = domain.toLowerCase();
  const lowerUrl = cleanUrl.toLowerCase();
  let type: ResolvedLinkMetadata['type'] = 'generic';
  let defaultTitle = '';

  if (d.includes('figma.com')) {
    type = 'figma';
    defaultTitle = 'Figma';
  } else if (d.includes('docs.google.com')) {
    if (lowerUrl.includes('/document/')) {
      type = 'google-docs';
      defaultTitle = 'Google Docs';
    } else if (lowerUrl.includes('/spreadsheets/')) {
      type = 'google-sheets';
      defaultTitle = 'Planilha';
    } else {
      type = 'google-docs';
      defaultTitle = 'Documento';
    }
  } else if (d.includes('drive.google.com')) {
    type = 'google-drive';
    defaultTitle = 'Google Drive';
  } else if (d.includes('canva.com') || d.includes('canva.link')) {
    type = 'canva';
    defaultTitle = 'Canva';
  } else if (d.includes('trello.com')) {
    type = 'trello';
    defaultTitle = 'Card Trello';
  } else if (d.includes('instagram.com')) {
    type = 'instagram';
    defaultTitle = lowerUrl.includes('/reel/') ? 'Reels' : 'Instagram';
  } else if (d.includes('pinterest.com') || d.includes('pin.it')) {
    type = 'pinterest';
    defaultTitle = 'Pinterest';
  } else if (d.includes('notion.so') || d.includes('notion.site')) {
    type = 'notion';
    defaultTitle = 'Notion';
  } else if (d.includes('youtube.com') || d.includes('youtu.be')) {
    type = 'youtube';
    defaultTitle = 'YouTube';
  } else if (d.includes('dropbox.com')) {
    type = 'dropbox';
    defaultTitle = 'Dropbox';
  } else if (d.includes('loom.com')) {
    type = 'loom';
    defaultTitle = 'Loom';
  } else if (d.includes('miro.com')) {
    type = 'miro';
    defaultTitle = 'Miro';
  } else {
    defaultTitle = domain || 'Link Externo';
  }

  // Se o título gravado for genérico demais (ex: "Link de Referência" ou vazio), usa o título inteligente detectado
  const finalTitle = (!rawTitle || rawTitle.toLowerCase() === 'link de referencia' || rawTitle.toLowerCase() === 'link de referência' || rawTitle.toLowerCase() === 'link')
    ? defaultTitle
    : rawTitle;

  return {
    url: cleanUrl,
    title: finalTitle,
    domain,
    type
  };
}
