// src/app/error.tsx
"use client";

import { useEffect } from "react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Registra o erro em serviços de monitoramento em produção
    console.error("[Atelier Runtime Error]:", error);
  }, [error]);

  return (
    <div className="w-full h-full min-h-[500px] flex flex-col items-center justify-center p-6 text-center gap-6">
      {/* Ícone de Alerta */}
      <div className="w-16 h-16 rounded-full bg-[var(--color-atelier-terracota)]/10 flex items-center justify-center text-[var(--color-atelier-terracota)] mb-2">
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          fill="none" 
          viewBox="0 0 24 24" 
          strokeWidth="1.5" 
          stroke="currentColor" 
          className="w-8 h-8"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" 
          />
        </svg>
      </div>

      <div className="flex flex-col gap-2 max-w-md">
        <h2 className="text-xl font-bold tracking-tight text-[var(--color-atelier-grafite)] font-roboto">
          Ocorreu um erro inesperado
        </h2>
        <p className="text-[13px] text-[var(--color-atelier-grafite)]/60 leading-relaxed font-roboto">
          Pedimos desculpa pelo inconveniente. A nossa equipa já foi notificada e estamos a trabalhar para resolver o problema.
        </p>
      </div>

      {/* Botões de Ação */}
      <div className="flex gap-4 items-center">
        <button
          onClick={() => reset()}
          className="px-6 py-3 bg-[var(--color-atelier-terracota)] text-white text-[12px] font-bold tracking-wider uppercase rounded-xl hover:bg-[var(--color-atelier-terracota)]/90 transition-all shadow-[0_10px_20px_rgba(173,111,64,0.15)] cursor-pointer"
        >
          Tentar novamente
        </button>
        <button
          onClick={() => window.location.href = "/"}
          className="px-6 py-3 border border-[var(--color-atelier-grafite)]/20 text-[var(--color-atelier-grafite)] text-[12px] font-bold tracking-wider uppercase rounded-xl hover:bg-[var(--color-atelier-grafite)]/5 transition-all cursor-pointer"
        >
          Ir para o início
        </button>
      </div>
    </div>
  );
}
