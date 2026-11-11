import { describe, it, expect } from 'vitest';
import { normalizeUrl, resolveExternalLink } from '../linkUtils';

describe('linkUtils — Atalhos e Resolução de Links Externos', () => {
  describe('normalizeUrl', () => {
    it('adiciona https:// quando a url não possui protocolo', () => {
      expect(normalizeUrl('figma.com/file/123/design')).toBe('https://figma.com/file/123/design');
      expect(normalizeUrl('drive.google.com/drive/folders/abc')).toBe('https://drive.google.com/drive/folders/abc');
      expect(normalizeUrl('canva.link/xyz')).toBe('https://canva.link/xyz');
    });

    it('mantém https:// e http:// existentes', () => {
      expect(normalizeUrl('https://trello.com/c/123')).toBe('https://trello.com/c/123');
      expect(normalizeUrl('http://meusite.com')).toBe('http://meusite.com');
    });

    it('extrai url real de links de redirecionamento do Google', () => {
      const redirectUrl = 'https://www.google.com/url?sa=D&q=https://canva.link/3au09troc1ookny&ust=1784629920000000';
      expect(normalizeUrl(redirectUrl)).toBe('https://canva.link/3au09troc1ookny');
    });

    it('retorna string vazia para entradas nulas ou vazias', () => {
      expect(normalizeUrl('')).toBe('');
      expect(normalizeUrl(null)).toBe('');
      expect(normalizeUrl(undefined)).toBe('');
    });
  });

  describe('resolveExternalLink', () => {
    it('resolve string pura do Google Docs com título inteligente', () => {
      const res = resolveExternalLink('https://docs.google.com/document/d/1at1blSNvYy0hGE9FE/edit');
      expect(res.url).toBe('https://docs.google.com/document/d/1at1blSNvYy0hGE9FE/edit');
      expect(res.title).toBe('Google Docs');
      expect(res.type).toBe('google-docs');
    });

    it('resolve string pura do Canva com título inteligente', () => {
      const res = resolveExternalLink('canva.link/anuzj5nt4z17or1');
      expect(res.url).toBe('https://canva.link/anuzj5nt4z17or1');
      expect(res.title).toBe('Canva');
      expect(res.type).toBe('canva');
    });

    it('resolve objeto { title, url } preservando título customizado', () => {
      const res = resolveExternalLink({
        title: 'Roteiro Aprovado',
        url: 'https://docs.google.com/document/d/123'
      });
      expect(res.url).toBe('https://docs.google.com/document/d/123');
      expect(res.title).toBe('Roteiro Aprovado');
      expect(res.type).toBe('google-docs');
    });

    it('substitui título genérico "Link de Referência" pelo título do serviço', () => {
      const res = resolveExternalLink({
        title: 'Link de Referência',
        url: 'https://www.figma.com/file/xyz'
      });
      expect(res.title).toBe('Figma');
      expect(res.type).toBe('figma');
    });

    it('resolve Instagram e Reels', () => {
      const res1 = resolveExternalLink('https://www.instagram.com/reel/DaGAy7nuN_f/');
      expect(res1.title).toBe('Reels');
      expect(res1.type).toBe('instagram');

      const res2 = resolveExternalLink('https://www.instagram.com/p/Dec7rGasITv/');
      expect(res2.title).toBe('Instagram');
      expect(res2.type).toBe('instagram');
    });

    it('resolve Trello', () => {
      const res = resolveExternalLink('https://trello.com/c/yThLZuTn');
      expect(res.title).toBe('Card Trello');
      expect(res.type).toBe('trello');
    });
  });
});
