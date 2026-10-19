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
      bg: 'bg-rose-950/40 text-rose-300 border-rose-800/50'
    },
    high: {
      label: 'Alta',
      icon: ArrowUp,
      bg: 'bg-amber-950/40 text-amber-300 border-amber-800/50'
    },
    medium: {
      label: 'Média',
      icon: Minus,
      bg: 'bg-stone-800 text-stone-300 border-stone-700'
    },
    low: {
      label: 'Baixa',
      icon: ArrowDown,
      bg: 'bg-stone-900 text-stone-400 border-stone-800'
    }
  };

  const config = configs[priority] || configs.medium;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 rounded border font-medium ${config.bg} ${
      size === 'sm' ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-0.5 text-xs'
    }`}>
      <Icon className="w-3 h-3" />
      <span>{config.label}</span>
    </span>
  );
};
