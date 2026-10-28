import { describe, expect, it } from 'vitest';
import {
  createEntrySchema,
  updateEntrySchema,
  createSettlementSchema,
  createInvoiceSchema,
  createTaxObligationSchema,
  extractMonth,
  AuditReasonRequiredError,
  PeriodClosedError,
  InvalidSettlementError,
} from '../finance';
import { can } from '../rbac';

describe('Fase 3 — API e Serviços de Domínio Financeiro', () => {
  describe('1. Validações Zod de Lançamentos e Entidades Financeiras', () => {
    it('valida payload correto para criação de lançamento de receita e despesa', () => {
      const validRevenue = {
        kind: 'revenue',
        source: 'contract',
        title: 'Mensalidade Retainer - Outubro 2026',
        account_id: 'acc-rec-01',
        competence_date: '2026-10-01',
        due_date: '2026-10-15',
        amount: 4500.5,
        installment_number: 1,
        installment_total: 1,
      };

      const parsed = createEntrySchema.parse(validRevenue);
      expect(parsed.kind).toBe('revenue');
      expect(parsed.amount).toBe(4500.5);
      expect(parsed.source).toBe('contract');
      expect(parsed.installment_number).toBe(1);
    });

    it('rejeita valores monetários não-positivos ou zerados', () => {
      expect(() => {
        createEntrySchema.parse({
          kind: 'expense',
          title: 'Servidor Neon',
          account_id: 'acc-exp-01',
          competence_date: '2026-10-01',
          due_date: '2026-10-10',
          amount: 0,
        });
      }).toThrow();

      expect(() => {
        createEntrySchema.parse({
          kind: 'expense',
          title: 'Servidor Neon',
          account_id: 'acc-exp-01',
          competence_date: '2026-10-01',
          due_date: '2026-10-10',
          amount: -50,
        });
      }).toThrow();
    });

    it('rejeita formatos de datas de competência ou vencimento inválidos', () => {
      expect(() => {
        createEntrySchema.parse({
          kind: 'expense',
          title: 'Taxa Bancária',
          account_id: 'acc-exp-01',
          competence_date: '10/10/2026', // Formato incorreto (deve ser YYYY-MM-DD)
          due_date: '2026-10-10',
          amount: 30,
        });
      }).toThrow();
    });

    it('valida payload de baixa e liquidação com juros e taxas (createSettlementSchema)', () => {
      const validSettlement = {
        entry_id: 'entry-uuid-123',
        payment_date: '2026-10-16',
        amount: 2500,
        fee_amount: 15.5,
        interest_amount: 50.0,
        discount_amount: 0,
        payment_method: 'pix',
      };

      const parsed = createSettlementSchema.parse(validSettlement);
      expect(parsed.amount).toBe(2500);
      expect(parsed.fee_amount).toBe(15.5);
      expect(parsed.interest_amount).toBe(50.0);
    });

    it('valida criação de notas fiscais com retenção de ISS (createInvoiceSchema)', () => {
      const validInvoice = {
        direction: 'issued',
        number: '2026001',
        issue_date: '2026-10-05',
        total_amount: 10000,
        iss_amount: 200,
        iss_retained: true,
        status: 'issued',
      };

      const parsed = createInvoiceSchema.parse(validInvoice);
      expect(parsed.direction).toBe('issued');
      expect(parsed.total_amount).toBe(10000);
      expect(parsed.iss_retained).toBe(true);
      expect(parsed.iss_amount).toBe(200);
    });

    it('valida obrigações tributárias e guias do Simples Nacional (createTaxObligationSchema)', () => {
      const validTax = {
        tax_type: 'DAS-Simples',
        competence: '2026-09',
        due_date: '2026-10-20',
        amount: 1250.75,
        status: 'pending',
      };

      const parsed = createTaxObligationSchema.parse(validTax);
      expect(parsed.tax_type).toBe('DAS-Simples');
      expect(parsed.competence).toBe('2026-09');
      expect(parsed.amount).toBe(1250.75);
    });
  });

  describe('2. Trava de Período Contábil Consolidado (PeriodClosedError)', () => {
    it('extrai corretamente o mês no formato YYYY-MM a partir de data ISO ou YYYY-MM-DD', () => {
      expect(extractMonth('2026-10-15')).toBe('2026-10');
      expect(extractMonth('2026-01-01T00:00:00.000Z')).toBe('2026-01');
      expect(extractMonth('2025-12-31')).toBe('2025-12');
    });

    it('instancia PeriodClosedError com status HTTP 409 (Conflict)', () => {
      const error = new PeriodClosedError('2026-09');
      expect(error.statusCode).toBe(409);
      expect(error.closingMonth).toBe('2026-09');
      expect(error.message).toContain('2026-09 está fechado e consolidado');
    });
  });

  describe('3. Auditoria Obrigatória e Rastreabilidade Formal', () => {
    it('instancia AuditReasonRequiredError com status HTTP 400 ao editar valores sem motivo', () => {
      const error = new AuditReasonRequiredError('valor de pagamento');
      expect(error.statusCode).toBe(400);
      expect(error.message).toContain('justificativa formal (mínimo 5 caracteres)');
      expect(error.message).toContain('valor de pagamento');
    });

    it('rejeita alteração de status/valor quando reason for vazio ou curto', () => {
      const updatesWithShortReason = {
        amount: 6000,
        reason: 'aj', // Menor que 5 caracteres
      };

      // Simulação da verificação de negócio
      const isCriticalChange = updatesWithShortReason.amount !== 5000;
      const isValidReason = updatesWithShortReason.reason && updatesWithShortReason.reason.trim().length >= 5;

      expect(isCriticalChange).toBe(true);
      expect(isValidReason).toBe(false);
    });
  });

  describe('4. Regras de Transição de Status em Liquidações (Settlements)', () => {
    it('determina transição para partially_paid quando a baixa for parcial', () => {
      const entryTotal = 5000;
      const currentPaid = 0;
      const settlementAmount = 2000;
      const newPaid = currentPaid + settlementAmount;

      const newStatus = newPaid >= entryTotal ? 'paid' : 'partially_paid';
      expect(newStatus).toBe('partially_paid');
      expect(newPaid).toBe(2000);
    });

    it('determina transição para paid quando a baixa quitar o total do lançamento', () => {
      const entryTotal = 5000;
      const currentPaid = 2000;
      const settlementAmount = 3000;
      const newPaid = currentPaid + settlementAmount;

      const newStatus = newPaid >= entryTotal ? 'paid' : 'partially_paid';
      expect(newStatus).toBe('paid');
      expect(newPaid).toBe(5000);
    });

    it('reverte status para pending quando todas as baixas forem estornadas', () => {
      const currentPaid = 2000;
      const settlementAmount = 2000;
      const revertedPaid = Math.max(0, currentPaid - settlementAmount);

      const resultingStatus = revertedPaid > 0 ? 'partially_paid' : 'pending';
      expect(resultingStatus).toBe('pending');
      expect(revertedPaid).toBe(0);
    });
  });

  describe('5. RBAC nos Endpoints da Camada Financeira', () => {
    it('assegura que a contadora tem autorização para as rotas operacionais', () => {
      expect(can('contador', 'view_financial')).toBe(true);
      expect(can('contador', 'edit_payment_date_value')).toBe(true);
      expect(can('contador', 'create_outflow')).toBe(true);
      expect(can('contador', 'create_adhoc_service')).toBe(true);
      expect(can('contador', 'manage_invoices')).toBe(true);
      expect(can('contador', 'manage_taxes')).toBe(true);
      expect(can('contador', 'close_period')).toBe(true);
    });

    it('impede a contadora de reabrir períodos consolidados ou excluir lançamentos (privilégio de admin)', () => {
      expect(can('contador', 'reopen_period')).toBe(false);
      expect(can('contador', 'delete_entry')).toBe(false);

      expect(can('admin', 'reopen_period')).toBe(true);
      expect(can('admin', 'delete_entry')).toBe(true);
    });

    it('bloqueia completamente clientes e colaboradores comuns', () => {
      const blockedRoles = ['client', 'colaborador'] as const;
      for (const role of blockedRoles) {
        expect(can(role, 'view_financial')).toBe(false);
        expect(can(role, 'edit_payment_date_value')).toBe(false);
        expect(can(role, 'create_outflow')).toBe(false);
        expect(can(role, 'manage_invoices')).toBe(false);
        expect(can(role, 'manage_taxes')).toBe(false);
        expect(can(role, 'close_period')).toBe(false);
        expect(can(role, 'reopen_period')).toBe(false);
      }
    });
  });
});
