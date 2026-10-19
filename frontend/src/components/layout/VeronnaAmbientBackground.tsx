// src/components/layout/VeronnaAmbientBackground.tsx
"use client";

import React from "react";

/**
 * VeronnaAmbientBackground
 * Camada de gradiente dinâmico com iluminação volumétrica fluida inspirada em Verona, Itália.
 * Dança suavemente no fundo da aplicação com curvas naturais e aceleração por hardware (GPU).
 */
export default function VeronnaAmbientBackground() {
  return (
    <div 
      className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none"
      aria-hidden="true"
    >
      {/* Orb 1: Iluminação Superior (Ice Blue / Royal Veronna) */}
      <div 
        className="absolute top-[-15%] right-[-10%] w-[65vw] h-[65vw] max-w-[900px] max-h-[900px] rounded-full opacity-60 filter blur-[120px] transition-colors duration-1000 will-change-transform"
        style={{
          background: "radial-gradient(circle, var(--theme-ambient-1, rgba(185, 209, 227, 0.45)) 0%, transparent 70%)",
          animation: "veronnaAmbientOrb1 28s cubic-bezier(0.4, 0, 0.2, 1) infinite",
        }}
      />

      {/* Orb 2: Profundidade Inferior (Bordô Veronna / Oxblood) */}
      <div 
        className="absolute bottom-[-15%] left-[-10%] w-[60vw] h-[60vw] max-w-[850px] max-h-[850px] rounded-full opacity-50 filter blur-[130px] transition-colors duration-1000 will-change-transform"
        style={{
          background: "radial-gradient(circle, var(--theme-ambient-2, rgba(100, 6, 6, 0.15)) 0%, transparent 70%)",
          animation: "veronnaAmbientOrb2 34s cubic-bezier(0.4, 0, 0.2, 1) infinite",
        }}
      />

      {/* Orb 3: Acento Central Transverso (Navy / Sky Aurora) */}
      <div 
        className="absolute top-[30%] left-[25%] w-[50vw] h-[50vw] max-w-[750px] max-h-[750px] rounded-full opacity-40 filter blur-[140px] transition-colors duration-1000 will-change-transform"
        style={{
          background: "radial-gradient(circle, var(--theme-ambient-3, rgba(35, 78, 128, 0.2)) 0%, transparent 75%)",
          animation: "veronnaAmbientOrb3 42s cubic-bezier(0.4, 0, 0.2, 1) infinite",
        }}
      />
    </div>
  );
}
