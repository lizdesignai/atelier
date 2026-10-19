// src/components/tessera/StatusBadge.tsx
import React from 'react';
import { WorkItemStatus } from '@/lib/tessera/types';
import { getStatusLabel, getStatusTone } from '@/lib/tessera/stateMachine';

interface StatusBadgeProps {
  status: WorkItemStatus;
  size?: 'sm' | 'md';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  className = ''
}) => {
  const tone = getStatusTone(status);
  const label = getStatusLabel(status);

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border transition-colors ${tone.bg} ${tone.text} ${tone.border} ${
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'
      } ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
};
