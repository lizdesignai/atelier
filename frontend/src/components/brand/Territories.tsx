import React, { useState } from 'react';
import { Loader2, ArrowRight, CheckCircle2 } from 'lucide-react';

interface Territory {
  id: string;
  name: string;
  description: string;
  concept: string;
  images: string[];
}

interface TerritoriesProps {
  evaluationId: string;
  territories: Territory[];
  status: string;
  chosenTerritoryId?: string;
  feedback?: string;
  onEvaluate?: (chosenId: string, feedback: string) => Promise<void>;
  isClient?: boolean;
}

export function Territories({ evaluationId, territories, status, chosenTerritoryId, feedback, onEvaluate, isClient }: TerritoriesProps) {
  const [selectedId, setSelectedId] = useState<string | null>(chosenTerritoryId || null);
  const [userFeedback, setUserFeedback] = useState(feedback || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEvaluated = status === 'evaluated';

  const handleSubmit = async () => {
    if (!selectedId || !onEvaluate) return;
    setIsSubmitting(true);
    try {
      await onEvaluate(selectedId, userFeedback);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!territories || territories.length === 0) return null;

  return (
    <div className="flex flex-col gap-8 w-full max-w-5xl mx-auto">
      <div className="text-center mb-4">
        <h3 className="font-elegant text-4xl text-[var(--color-atelier-grafite)] mb-3">Territórios Visuais</h3>
        <p className="font-roboto text-sm text-[var(--color-atelier-grafite)]/70 max-w-2xl mx-auto">
          {isEvaluated 
            ? "O caminho estrutural da marca foi definido."
            : "Apresentamos dois caminhos estratégicos distintos baseados no DNA da sua marca. Analise a atmosfera e o conceito de cada um e defina qual caminho devemos seguir para a construção da identidade."}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {territories.map((territory) => {
          const isSelected = selectedId === territory.id;
          

          return (
            <div 
              key={territory.id}
              onClick={() => {
                if (isEvaluated || !isClient) return;
                setSelectedId(territory.id);
              }}
              className={`flex flex-col rounded-[2.5rem] overflow-hidden transition-all duration-300 border-[3px] 
                ${isSelected ? 'border-[var(--color-atelier-terracota)] shadow-[0_20px_40px_rgba(173,111,64,0.15)] scale-[1.02]' : 'border-white/60 bg-white/40 hover:bg-white/80'}
                ${!isEvaluated && isClient ? 'cursor-pointer' : ''}
              `}
            >
              <div className="p-8 pb-6 bg-white flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <h4 className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">{territory.name}</h4>
                  {isSelected && (
                    <div className="w-8 h-8 rounded-full bg-[var(--color-atelier-terracota)] flex items-center justify-center text-white shadow-sm shrink-0">
                      <CheckCircle2 size={16} />
                    </div>
                  )}
                </div>
                
                <p className="font-roboto text-xs uppercase tracking-widest font-bold text-[var(--color-atelier-terracota)] mb-3">Conceito</p>
                <p className="font-roboto text-sm text-[var(--color-atelier-grafite)] mb-6">{territory.concept}</p>
                
                <p className="font-roboto text-xs uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/50 mb-3">Atmosfera</p>
                <p className="font-roboto text-sm text-[var(--color-atelier-grafite)]/70 leading-relaxed flex-1">{territory.description}</p>
              </div>

              {territory.images && territory.images.length > 0 && (
                <div className="grid grid-cols-2 gap-1 p-1 bg-white">
                  {territory.images.slice(0, 4).map((img, idx) => (
                    <div key={idx} className="aspect-square w-full relative overflow-hidden bg-gray-100">
                      <img src={img} alt={`${territory.name} ref ${idx}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}

              {!isEvaluated && isClient && (
                <div className={`p-4 text-center font-roboto text-xs font-bold uppercase tracking-widest transition-colors
                  ${isSelected ? 'bg-[var(--color-atelier-terracota)] text-white' : 'bg-white text-[var(--color-atelier-grafite)]/40 hover:text-[var(--color-atelier-grafite)]/70'}
                `}>
                  {isSelected ? 'Caminho Selecionado' : 'Selecionar este Caminho'}
                </div>
              )}
            </div>
          )
        })}
      </div>
      {isClient && status !== 'evaluated' && selectedId && (
        <div className="mt-8 glass-panel bg-white/90 p-8 rounded-[2.5rem] border border-white shadow-xl max-w-3xl mx-auto w-full animate-[fadeInUp_0.4s_ease-out]">
          <h4 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] mb-2">Por que escolheu este caminho?</h4>
          <p className="font-roboto text-sm text-[var(--color-atelier-grafite)]/70 mb-6">
            O que mais atraiu você nesta direção? Há algo nela que você evitaria? Este feedback guiará o design final.
          </p>
          
          <textarea 
            value={userFeedback}
            onChange={(e) => setUserFeedback(e.target.value)}
            placeholder="Deixe suas impressões finais antes de iniciarmos a construção..."
            className="w-full h-32 bg-white border border-[var(--color-atelier-grafite)]/10 rounded-2xl p-4 text-sm font-roboto resize-none focus:border-[var(--color-atelier-terracota)]/50 outline-none mb-6 shadow-inner"
          />

          <button 
            onClick={handleSubmit}
            disabled={isSubmitting || userFeedback.trim().length < 10}
            className="w-full py-4 bg-[var(--color-atelier-grafite)] text-white rounded-xl font-roboto font-bold uppercase tracking-widest text-xs hover:bg-[var(--color-atelier-terracota)] transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={18} />}
            Confirmar Território e Iniciar Construção
          </button>
        </div>
      )}

      {isEvaluated && (
        <div className="mt-4 glass-panel bg-white/60 p-6 rounded-[2rem] border border-[var(--color-atelier-terracota)]/20 max-w-3xl mx-auto w-full">
          <div className="flex flex-col gap-2">
             <span className="font-roboto text-[10px] uppercase tracking-widest font-bold text-[var(--color-atelier-terracota)]">Feedback do Cliente Registrado</span>
             <p className="font-roboto text-sm text-[var(--color-atelier-grafite)] italic">"{userFeedback}"</p>
          </div>
        </div>
      )}

    </div>
  );
}
