import { describe, expect, it } from 'vitest';
import {
  STUDIO_VERONNA_FROM,
  buildAppLikeEmail,
  formatAbsoluteUrl,
  isValidRealEmail,
} from '../resend';
import { getStudioEmailTemplate } from '../serverNotifications';

describe('Studio Veronna Notification & Email Templates', () => {
  it('usa o domínio verificado lizdesign.com.br no remetente oficial', () => {
    expect(STUDIO_VERONNA_FROM).toBe('Studio Veronna <sistema@lizdesign.com.br>');
  });

  it('valida e-mails reais e bloqueia domínios fictícios de teste', () => {
    expect(isValidRealEmail('lizsacramentosa@gmail.com')).toBe(true);
    expect(isValidRealEmail('igorczarr@gmail.com')).toBe(true);
    expect(isValidRealEmail('stapelliacompany@gmail.com')).toBe(true);
    expect(isValidRealEmail('cliente@teste.com')).toBe(false);
    expect(isValidRealEmail('demo@example.com')).toBe(false);
    expect(isValidRealEmail('user@atelier.local')).toBe(false);
    expect(isValidRealEmail('')).toBe(false);
    expect(isValidRealEmail(null)).toBe(false);
  });

  it('formata URLs absolutas e corrige placeholders legados', () => {
    expect(formatAbsoluteUrl('/tessera/focus')).toContain('/tessera/focus');
    expect(formatAbsoluteUrl('https://seu-dominio.com/meu-espaco')).not.toContain('seu-dominio.com');
  });

  it('gera templates executivos para demandas, revisão QA e alertas de gestão', () => {
    const assigned = getStudioEmailTemplate('task_assigned', {
      taskName: 'Identidade Visual — Conceito',
      projectName: 'Studio Veronna',
      collaboratorName: 'Júlia',
      deadline: '2026-11-10T12:00:00Z',
      link: '/tessera/focus',
    });
    expect(assigned.subject).toContain('Identidade Visual — Conceito');
    expect(assigned.html).toContain('STUDIO VERONNA');
    expect(assigned.html).toContain('OPERAÇÃO & TAREFAS');
    expect(assigned.html).toContain('Júlia');

    const review = getStudioEmailTemplate('internal_review', {
      taskName: 'Key Visual Campanha',
      projectName: 'Cliente Premium',
      collaboratorName: 'Júlia',
      link: '/tessera/reviews',
    });
    expect(review.subject).toContain('Key Visual Campanha');
    expect(review.html).toContain('CURADORIA & QA');
    expect(review.html).toContain('Avaliar Entrega');

    const changes = getStudioEmailTemplate('review_changes_requested', {
      taskName: 'Key Visual Campanha',
      projectName: 'Cliente Premium',
      extraInfo: '[Direção Visual] Ajustar contraste tipográfico.',
      link: '/tessera/focus',
    });
    expect(changes.subject).toContain('Key Visual Campanha');
    expect(changes.html).toContain('Ajustar contraste tipográfico');
  });

  it('remove imagens base64 do corpo do e-mail em buildAppLikeEmail e getStudioEmailTemplate', () => {
    const rawBody = 'Texto antes <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==" /> texto depois';
    const tpl = getStudioEmailTemplate('custom', {
      subject: 'Teste Base64',
      body: rawBody,
    });
    expect(tpl.html).toContain('[Imagem Ocultada no E-mail]');
    expect(tpl.html).not.toContain('iVBORw0KGgoAAAANSUhEUg==');

    const appLike = buildAppLikeEmail('🔔', 'Aviso', rawBody, 'Abrir', '/admin');
    expect(appLike).toContain('[Imagem Ocultada no E-mail]');
    expect(appLike).toContain('STUDIO VERONNA');
  });
});
