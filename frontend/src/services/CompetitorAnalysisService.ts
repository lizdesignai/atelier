// frontend/src/services/CompetitorAnalysisService.ts
import { ApifyClient } from 'apify-client';

export interface CompetitorPost {
  url: string;
  imageUrl: string;
  caption: string;
  likes: number;
  comments: number;
  type?: string;
}

export interface CompetitorProfile {
  username: string;
  fullName: string;
  biography: string;
  followersCount: number;
  postsCount: number;
  avgEngagementRate: number;
  profilePicUrl?: string;
  topPosts: CompetitorPost[];
  scrapedAt: string;
}

export class CompetitorAnalysisService {
  private apify: ApifyClient;

  constructor() {
    this.apify = new ApifyClient({ token: process.env.APIFY_API_TOKEN || '' });
  }

  /**
   * Extrai @handles de concorrentes a partir de textos livres, links do Instagram, listas com vírgulas ou quebras de linha
   */
  public extractInstagramHandles(text: string): string[] {
    if (!text || typeof text !== 'string') return [];

    const handles = new Set<string>();

    // 1. URLs do Instagram (ex: https://instagram.com/handle/ ou instagram.com/handle)
    const urlMatches = text.matchAll(/(?:https?:\/\/)?(?:www\.)?instagram\.com\/([A-Za-z0-9_.]+)/gi);
    for (const match of urlMatches) {
      const handle = match[1]?.trim().replace(/\/$/, '');
      if (handle && this.isValidHandle(handle)) {
        handles.add(handle.toLowerCase());
      }
    }

    // 2. Menções diretas com @ (ex: @meuconcorrente)
    const atMatches = text.matchAll(/@([A-Za-z0-9_.]+)/g);
    for (const match of atMatches) {
      const handle = match[1]?.trim();
      if (handle && this.isValidHandle(handle)) {
        handles.add(handle.toLowerCase());
      }
    }

    // 3. Linhas ou palavras soltas (caso o usuário tenha digitado apenas os nomes/handles linha por linha)
    const lines = text.split(/[\n,;]+/);
    for (const rawLine of lines) {
      const line = rawLine.trim().replace(/^@/, '');
      // Se for uma palavra única sem espaços que se pareça com um handle
      if (line && /^[A-Za-z0-9_.]{3,30}$/.test(line) && this.isValidHandle(line)) {
        handles.add(line.toLowerCase());
      }
    }

    // Retorna até 5 concorrentes principais para manter alta performance e relevância
    return Array.from(handles).slice(0, 5);
  }

  private isValidHandle(handle: string): boolean {
    const ignored = new Set([
      'p', 'reel', 'reels', 'stories', 'explore', 'direct', 'tv', 'about', 
      'instagram', 'google', 'www', 'com', 'http', 'https', 'nao', 'nenhum',
      'ainda', 'conheco', 'alguns', 'todos', 'achei', 'mais'
    ]);
    return !ignored.has(handle.toLowerCase()) && handle.length >= 3 && handle.length <= 30;
  }

  /**
   * Coleta dados enriquecidos dos concorrentes no Instagram utilizando Apify
   */
  public async scrapeCompetitors(handles: string[]): Promise<CompetitorProfile[]> {
    if (!handles || handles.length === 0) return [];

    const cleanHandles = handles.map(h => h.replace('@', '').trim().toLowerCase()).filter(Boolean);
    if (cleanHandles.length === 0) return [];

    console.log(`[Competitor Engine] Coletando telemetria de ${cleanHandles.length} concorrentes: ${cleanHandles.join(', ')}`);

    try {
      const run = await this.apify.actor('apify/instagram-profile-scraper').call({
        usernames: cleanHandles,
      });

      const { items } = await this.apify.dataset(run.defaultDatasetId).listItems();
      if (!items || items.length === 0) {
        console.warn('[Competitor Engine] Nenhum perfil retornado pelo Apify.');
        return [];
      }

      const results: CompetitorProfile[] = [];

      for (const rawItem of items) {
        const item = rawItem as any;
        if (!item || !item.username) continue;

        const latestPosts = item.latestPosts || [];

        // Calcular engajamento
        let totalEngagement = 0;
        const postsToProcess = latestPosts.slice(0, 6);
        for (const p of postsToProcess) {
          totalEngagement += (p.likesCount || 0) + (p.commentsCount || 0);
        }

        const avgEngagementRate = postsToProcess.length > 0 && item.followersCount > 0
          ? ((totalEngagement / postsToProcess.length) / item.followersCount) * 100
          : 0;

        // Selecionar top 3 posts por curtidas
        const topPosts: CompetitorPost[] = [...latestPosts]
          .sort((a: any, b: any) => (b.likesCount || 0) - (a.likesCount || 0))
          .slice(0, 3)
          .map((post: any) => ({
            url: post.url || (post.shortCode ? `https://instagram.com/p/${post.shortCode}` : ''),
            imageUrl: post.displayUrl || post.thumbnailUrl || '',
            caption: (post.caption || '').slice(0, 150),
            likes: post.likesCount || 0,
            comments: post.commentsCount || 0,
            type: post.type || 'image'
          }));

        results.push({
          username: item.username,
          fullName: item.fullName || item.username,
          biography: item.biography || '',
          followersCount: item.followersCount || 0,
          postsCount: item.postsCount || 0,
          avgEngagementRate: Number(avgEngagementRate.toFixed(2)),
          profilePicUrl: item.profilePicUrl || item.profilePicUrlHD || '',
          topPosts,
          scrapedAt: new Date().toISOString()
        });
      }

      return results;
    } catch (error: any) {
      console.error('[Competitor Engine] Erro ao buscar perfis de concorrentes no Apify:', error?.message);
      return [];
    }
  }
}

export const competitorAnalysisService = new CompetitorAnalysisService();
