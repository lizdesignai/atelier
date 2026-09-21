import emojiRegex from 'emoji-regex';

/**
 * Utilitário global para PDFs gerados pelo @react-pdf/renderer.
 * Esta função foi tornada extremamente agressiva para remover QUALQUER
 * caractere que não seja Português/Inglês, pontuação básica ou números.
 * Evita o crash crítico RangeError: DataView do fontkit.
 */
export const stripEmojis = (str: string | undefined | null): string => {
  if (typeof str !== 'string') return String(str || '');
  
  // 1. Remove emojis convencionais
  let cleanStr = str.replace(emojiRegex(), '');
  
  // 2. Remove modificadores e caracteres ZWJ (Zero Width Joiners)
  cleanStr = cleanStr.replace(/[\u200D\uFE0F\uFE0E]/g, '');

  // 3. REMOÇÃO AGRESSIVA DE UNICODE: 
  // Mantém apenas ASCII visível (x20-x7E), Latin-1 (xA0-xFF), Latin Extended A/B,
  // tabulações, e quebras de linha. Remove todo o resto (símbolos obscuros, 
  // caracteres asiáticos, cirílicos, dingbats, setas estranhas, etc).
  cleanStr = cleanStr.replace(/[^\x20-\x7E\xA0-\xFF\u0100-\u017F\u0180-\u024F\n\r\t]/g, '');
  
  return cleanStr.trim();
};
