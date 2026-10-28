// src/lib/finance/errors.ts
// Erros customizados do domínio financeiro (Fase 3).

export class FinanceDomainError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = 'FinanceDomainError';
    this.statusCode = statusCode;
  }
}

export class PeriodClosedError extends FinanceDomainError {
  closingMonth: string;

  constructor(closingMonth: string) {
    super(
      `O período contábil ${closingMonth} está fechado e consolidado. Alterações financeiras são bloqueadas.`,
      409
    );
    this.name = 'PeriodClosedError';
    this.closingMonth = closingMonth;
  }
}

export class AuditReasonRequiredError extends FinanceDomainError {
  constructor(field: string) {
    super(
      `A alteração de '${field}' exige o fornecimento de uma justificativa formal (mínimo 5 caracteres) para o log de auditoria da contabilidade.`,
      400
    );
    this.name = 'AuditReasonRequiredError';
  }
}

export class EntryNotFoundError extends FinanceDomainError {
  constructor(id: string) {
    super(`Lançamento financeiro com id '${id}' não foi encontrado.`, 404);
    this.name = 'EntryNotFoundError';
  }
}

export class InvalidSettlementError extends FinanceDomainError {
  constructor(message: string) {
    super(message, 400);
    this.name = 'InvalidSettlementError';
  }
}
