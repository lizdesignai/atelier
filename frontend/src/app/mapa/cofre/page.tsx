"use client";

import React from 'react';
import EvidenceVault from '@/components/mapa/EvidenceVault';

export default function CofrePage() {
  return (
    <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar relative">
      <EvidenceVault />
    </div>
  );
}
