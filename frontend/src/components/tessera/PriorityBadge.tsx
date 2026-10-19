// src/components/tessera/PriorityBadge.tsx
import React from 'react';
import { WorkItemPriority } from '@/lib/tessera/types';
import { AlertCircle, ArrowUp, ArrowDown, Minus } from 'lucide-react';

interface PriorityBadgeProps {
  priority: WorkItemPriority;
  size?: 'sm' | 'md';
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, size = 'md' }) => {
  const configs = {
    urgent: {
      label: 'Urgente',
      icon: AlertCircle,
      bg: 'bg-[var(--tess-danger)]/12 text-[var(--tess-danger)] border-[var(--tess-danger)]/30'
    },
    high: {
      label: 'Alta',
      icon: ArrowUp,
      bg: 'bg-[var(--tess-warn)]/12 text-[var(--tess-warn)] border-[var(--tess-warn)]/30'
    },
    medium: {
      label: 'Média',
      icon: Minus,
      bg: 'bg-[var(--color-atelier-grafite)]/[0.07] text-[var(--color-atelier-grafite)]/80 border-[var(--color-atelier-grafite)]/20'
    },
    low: {
      label: 'Baixa',
      icon: ArrowDown,
      bg: 'bg-[var(--color-atelier-grafite)]/[0.03] text-[var(--color-atelier-grafite)]/55 border-[var(--color-atelier-grafite)]/12'
    }
  };

  const config = configs[priority] || configs.medium;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border font-medium ${config.bg} ${
      size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-0.5 text-xs'
    }`}>
      <Icon className="w-3 h-3" />
      <span>{config.label}</span>
    </span>
  );
};
