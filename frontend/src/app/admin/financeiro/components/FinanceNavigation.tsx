// src/app/admin/financeiro/components/FinanceNavigation.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Receipt,
  ArrowDownLeft,
  ArrowUpRight,
  PlusCircle,
  FileSpreadsheet,
  CalendarDays,
  Lock,
  BarChart3,
  TrendingUp,
  Compass,
} from "lucide-react";

export interface NavTab {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

export const FINANCE_NAV_TABS: NavTab[] = [
  { href: "/admin/financeiro", label: "Visão Geral", icon: LayoutDashboard },
  { href: "/admin/financeiro/lancamentos", label: "Lançamentos", icon: Receipt },
  { href: "/admin/financeiro/receber", label: "A Receber", icon: ArrowDownLeft },
  { href: "/admin/financeiro/pagar", label: "A Pagar", icon: ArrowUpRight },
  { href: "/admin/financeiro/avulsos", label: "Gastos & Avulsos", icon: PlusCircle },
  { href: "/admin/financeiro/notas-fiscais", label: "Notas Fiscais", icon: FileSpreadsheet },
  { href: "/admin/financeiro/impostos", label: "Impostos & DAS", icon: CalendarDays },
  { href: "/admin/financeiro/fechamento", label: "Fechamento Mensal", icon: Lock },
  { href: "/admin/financeiro/relatorios", label: "DRE & Balanço", icon: BarChart3 },
  { href: "/admin/financeiro/valuation", label: "Valuation", icon: TrendingUp },
  { href: "/admin/financeiro/crescimento", label: "Onde Crescer", icon: Compass },
];

export function FinanceNavigation() {
  const pathname = usePathname();

  return (
    <div className="w-full flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none border-b border-black/[0.04]">
      {FINANCE_NAV_TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive =
          tab.href === "/admin/financeiro"
            ? pathname === "/admin/financeiro"
            : pathname.startsWith(tab.href);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
              isActive
                ? "bg-[var(--color-veronna-navy)] text-white shadow-2xs"
                : "bg-white/40 text-[var(--color-atelier-grafite)]/75 hover:bg-white/80 hover:text-[var(--color-veronna-navy)] border border-white/60"
            }`}
          >
            <Icon size={13} />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
