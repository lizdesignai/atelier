// src/app/admin/loading.tsx
export default function AdminLoading() {
  return (
    <div className="w-full h-full flex flex-col gap-8 animate-pulse p-2">
      {/* Simulação de Header do Dashboard */}
      <div className="flex flex-col gap-2">
        <div className="h-7 w-48 bg-[var(--color-atelier-grafite)]/10 rounded-lg"></div>
        <div className="h-4 w-72 bg-[var(--color-atelier-grafite)]/5 rounded-lg"></div>
      </div>

      {/* Cards de Métricas (Simulando 3 cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div 
            key={i} 
            className="h-32 bg-white/40 border border-[var(--color-atelier-terracota)]/5 rounded-2xl p-6 flex flex-col justify-between"
          >
            <div className="flex justify-between items-start">
              <div className="h-4 w-24 bg-[var(--color-atelier-grafite)]/10 rounded"></div>
              <div className="w-8 h-8 rounded-xl bg-[var(--color-atelier-grafite)]/5"></div>
            </div>
            <div className="h-8 w-16 bg-[var(--color-atelier-grafite)]/10 rounded-lg"></div>
          </div>
        ))}
      </div>

      {/* Área de Conteúdo Principal (Simulando duas colunas/tabelas) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Bloco Grande (Tabelas/Kanban) */}
        <div className="lg:col-span-2 h-[450px] bg-white/40 border border-[var(--color-atelier-terracota)]/5 rounded-3xl p-6 flex flex-col gap-4">
          <div className="flex justify-between items-center mb-2">
            <div className="h-5 w-32 bg-[var(--color-atelier-grafite)]/10 rounded-md"></div>
            <div className="h-8 w-24 bg-[var(--color-atelier-grafite)]/5 rounded-lg"></div>
          </div>
          <div className="flex-1 flex flex-col gap-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-4 items-center py-2 border-b border-[var(--color-atelier-grafite)]/5">
                <div className="w-10 h-10 rounded-full bg-[var(--color-atelier-grafite)]/5"></div>
                <div className="flex-1 flex flex-col gap-2">
                  <div className="h-3.5 w-1/3 bg-[var(--color-atelier-grafite)]/10 rounded"></div>
                  <div className="h-3 w-1/4 bg-[var(--color-atelier-grafite)]/5 rounded"></div>
                </div>
                <div className="h-6 w-16 bg-[var(--color-atelier-grafite)]/15 rounded-full"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Bloco Lateral (Atividades/Logs) */}
        <div className="h-[450px] bg-white/40 border border-[var(--color-atelier-terracota)]/5 rounded-3xl p-6 flex flex-col gap-4">
          <div className="h-5 w-24 bg-[var(--color-atelier-grafite)]/10 rounded-md mb-2"></div>
          <div className="flex-1 flex flex-col gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-3 items-start">
                <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-atelier-terracota)]/20 mt-1"></div>
                <div className="flex-1 flex flex-col gap-1.5">
                  <div className="h-3 w-full bg-[var(--color-atelier-grafite)]/10 rounded"></div>
                  <div className="h-2 w-16 bg-[var(--color-atelier-grafite)]/5 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
