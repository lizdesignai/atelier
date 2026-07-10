// src/app/loading.tsx
export default function Loading() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center min-h-[400px] gap-4">
      {/* Container do Spinner Elegante */}
      <div className="relative w-12 h-12">
        {/* Anel de fundo */}
        <div className="absolute inset-0 rounded-full border-2 border-[var(--color-atelier-terracota)]/10"></div>
        {/* Anel animado */}
        <div className="absolute inset-0 rounded-full border-2 border-t-[var(--color-atelier-terracota)] animate-spin"></div>
      </div>
      {/* Texto sutil */}
      <span className="text-[11px] font-medium tracking-[0.2em] text-[var(--color-atelier-grafite)]/60 uppercase">
        A carregar...
      </span>
    </div>
  );
}
