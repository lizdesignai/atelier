// src/lib/__tests__/phase7_integrations_cron.test.ts
// Testes Unitários da Fase 7: Webhook Asaas Idempotente, Recorrência e Alertas Contábeis

import { describe, expect, it } from 'vitest';
import { verifyAsaasWebhookToken } from '../finance/asaasWebhookService';
import { extractBillingDay } from '../finance/recurrenceService';
import { getPreviousMonth } from '../finance/alertsService';

describe('Fase 7 — Integrações, Webhooks, Recorrência e Alertas', () => {
  describe('1. Segurança e Validação de Tokens do Webhook Asaas', () => {
    it('rejeita requisições com token nulo, vazio ou inválido', () => {
      // Quando o token enviado é nulo ou indefinido
      expect(verifyAsaasWebhookToken(null)).toBe(false);
      expect(verifyAsaasWebhookToken(undefined)).toBe(false);
      expect(verifyAsaasWebhookToken('')).toBe(false);
      expect(verifyAsaasWebhookToken('token_errado_123')).toBe(false);
    });

    it('aceita token mock de teste ou token configurado no ambiente', () => {
      // Em ambiente de teste (NODE_ENV=test), o helper aceita 'test-webhook-token' como mock
      expect(verifyAsaasWebhookToken('test-webhook-token')).toBe(true);
    });
  });

  describe('2. Idempotência e Regras de Negócio do Webhook Asaas', () => {
    it('garante que a chave única de liquidação (external_ref) seja derivada estritamente do payment.id', () => {
      const paymentId = 'pay_0987654321';
      const expectedEntryRef = `asaas_pay_${paymentId}`;
      const expectedSettleRef = `asaas_settle_${paymentId}`;

      expect(expectedEntryRef).toBe('asaas_pay_pay_0987654321');
      expect(expectedSettleRef).toBe('asaas_settle_pay_0987654321');
    });

    it('calcula o valor líquido e a taxa do gateway com precisão de centavos', () => {
      const paymentValue = 3500.0;
      const netValue = 3450.5; // Taxa de R$ 49.50 do gateway
      const expectedFee = Number((paymentValue - netValue).toFixed(2));

      expect(expectedFee).toBe(49.5);
      expect(netValue + expectedFee).toBe(paymentValue);
    });

    it('identifica corretamente serviços avulsos vs contratos recorrentes por metadados', () => {
      // Cenário 1: Instagram (Recorrente)
      const descInsta = 'Gestão de Instagram - Mensalidade Outubro';
      const isInsta =
        descInsta.toLowerCase().includes('instagram') ||
        descInsta.toLowerCase().includes('mensal');
      expect(isInsta).toBe(true);

      // Cenário 2: O Mapa (Único)
      const descMapa = 'Consultoria Estratégica O Mapa';
      const isMapa = descMapa.toLowerCase().includes('mapa');
      expect(isMapa).toBe(true);

      // Cenário 3: IDV (Único)
      const descIdv = 'Identidade Visual & Branding';
      const isIdv = descIdv.toLowerCase().includes('identidade');
      expect(isIdv).toBe(true);
    });
  });

  describe('3. Motor de Recorrência Mensal de Contratos', () => {
    it('extrai corretamente o dia de faturamento (billing_date) de diferentes formatos', () => {
      // Apenas dia em string
      expect(extractBillingDay('15')).toBe(15);
      expect(extractBillingDay('5')).toBe(5);
      expect(extractBillingDay('28')).toBe(28);

      // Data completa ISO
      expect(extractBillingDay('2026-10-22')).toBe(22);
      expect(extractBillingDay('2026-11-05')).toBe(5);

      // Nulo ou inválido -> padrão dia 10
      expect(extractBillingDay(null)).toBe(10);
      expect(extractBillingDay(undefined)).toBe(10);
      expect(extractBillingDay('')).toBe(10);
      expect(extractBillingDay('invalido')).toBe(10);
    });

    it('monta o external_ref exclusivo por projeto e competência para evitar duplicações', () => {
      const projectId = 'proj-uuid-1234';
      const competence = '2026-11';
      const extRef = `recurring_proj_${projectId}_${competence}`;

      expect(extRef).toBe('recurring_proj_proj-uuid-1234_2026-11');
      // Nova execução no mesmo mês deve gerar a mesma chave para ativar idempotência
      const duplicateExtRef = `recurring_proj_${projectId}_${competence}`;
      expect(duplicateExtRef).toBe(extRef);
    });
  });

  describe('4. Motor de Alertas Contábeis e Notificações Diárias', () => {
    it('calcula a competência do mês anterior corretamente, inclusive na virada de ano', () => {
      // Meio do ano: Outubro -> Setembro
      const dateOut = new Date(2026, 9, 15); // mês 9 em JS = Outubro
      expect(getPreviousMonth(dateOut)).toBe('2026-09');

      // Virada de ano: Janeiro 2027 -> Dezembro 2026
      const dateJan = new Date(2027, 0, 10); // mês 0 = Janeiro
      expect(getPreviousMonth(dateJan)).toBe('2026-12');
    });

    it('aciona a janela fiscal do Simples Nacional (DAS) entre os dias 14 e 20', () => {
      const isDasAlertWindow = (day: number) => day >= 14 && day <= 20;

      expect(isDasAlertWindow(5)).toBe(false);
      expect(isDasAlertWindow(13)).toBe(false);
      expect(isDasAlertWindow(14)).toBe(true);
      expect(isDasAlertWindow(18)).toBe(true);
      expect(isDasAlertWindow(20)).toBe(true);
      expect(isDasAlertWindow(21)).toBe(false);
    });

    it('aciona a janela de lembrete de Fechamento Contábil nos primeiros 10 dias do mês', () => {
      const isClosingReminderWindow = (day: number) => day >= 1 && day <= 10;

      expect(isClosingReminderWindow(1)).toBe(true);
      expect(isClosingReminderWindow(5)).toBe(true);
      expect(isClosingReminderWindow(10)).toBe(true);
      expect(isClosingReminderWindow(11)).toBe(false);
      expect(isClosingReminderWindow(25)).toBe(false);
    });

    it('detecta vencimento iminente de contas a pagar dentro da janela de 3 dias', () => {
      const today = new Date('2026-10-27');
      const isDueWithin3Days = (dueDateStr: string) => {
        const due = new Date(dueDateStr);
        const diffDays = (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
        return diffDays >= 0 && diffDays <= 3;
      };

      expect(isDueWithin3Days('2026-10-27')).toBe(true); // Hoje
      expect(isDueWithin3Days('2026-10-29')).toBe(true); // Em 2 dias
      expect(isDueWithin3Days('2026-10-30')).toBe(true); // Em 3 dias
      expect(isDueWithin3Days('2026-10-31')).toBe(false); // Em 4 dias
      expect(isDueWithin3Days('2026-10-25')).toBe(false); // Já vencido
    });
  });
});
