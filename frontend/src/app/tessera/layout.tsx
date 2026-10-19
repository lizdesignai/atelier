// src/app/tessera/layout.tsx
import React from 'react';
import { TesseraShell } from '@/components/tessera/TesseraShell';

export const metadata = {
  title: 'Tessera — Sistema Operacional de Gestão & Criação',
  description: 'Comando executivo, orquestração de entregas e produtividade inteligente.'
};

export default function TesseraLayout({ children }: { children: React.ReactNode }) {
  return (
    <TesseraShell>
      {children}
    </TesseraShell>
  );
}
