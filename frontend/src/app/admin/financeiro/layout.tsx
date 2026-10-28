// src/app/admin/financeiro/layout.tsx
import { ReactNode } from "react";
import { FinanceNavigation } from "./components/FinanceNavigation";

export const metadata = {
  title: "Bills & Payments (B&P) | Studio Veronna",
  description: "Módulo Bills & Payments (B&P) — gestão integrada de faturamento, pagamentos, fiscal e valuation do Studio Veronna.",
};

export default function FinanceLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 w-full max-w-[1600px] mx-auto p-4 md:p-8 animate-fade-in">
      {/* HEADER SUPERIOR DO MÓDULO */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-3 pt-1 pb-1">
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] text-[var(--color-veronna-bordo)] tracking-wider uppercase font-bold">
            B&P • Bills & Payments
          </span>
          <h1 className="font-elegant text-2xl md:text-3xl text-[var(--color-veronna-navy)] tracking-tight font-medium">
            Bills & Payments <span className="text-[var(--color-veronna-bordo)] font-serif italic text-xl md:text-2xl">(B&P)</span>
          </h1>
          <p className="text-xs text-[var(--color-atelier-grafite)]/65">
            Entradas, saídas, conciliação bancária, faturamento, notas fiscais e obrigações tributárias.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex flex-col items-start md:items-end text-left md:text-right">
            <span className="text-[11px] uppercase font-bold tracking-wider text-gray-500">
              Regime Tributário
            </span>
            <span className="text-xs font-semibold text-[var(--color-veronna-navy)]">
              Simples Nacional (Anexo III)
            </span>
          </div>
        </div>
      </div>

      {/* SUBMENU DE ABAS */}
      <FinanceNavigation />

      {/* CONTEÚDO DA ROTA ATUAL */}
      <div className="w-full">{children}</div>
    </div>
  );
}
