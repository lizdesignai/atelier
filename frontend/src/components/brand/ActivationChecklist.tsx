import React, { useState } from 'react';
import { CheckCircle2, Circle, Rocket } from 'lucide-react';

export interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  completed: boolean;
}

interface ActivationChecklistProps {
  items: ChecklistItem[];
  onToggleItem?: (id: string, completed: boolean) => Promise<void>;
  isClient?: boolean;
}

export function ActivationChecklist({ items, onToggleItem, isClient }: ActivationChecklistProps) {
  const [localItems, setLocalItems] = useState<ChecklistItem[]>(items);

  const handleToggle = async (id: string) => {
    if (!isClient) return;
    
    const newItems = localItems.map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    );
    setLocalItems(newItems);

    if (onToggleItem) {
      const item = newItems.find(i => i.id === id);
      if (item) {
        await onToggleItem(id, item.completed);
      }
    }
  };

  const completedCount = localItems.filter(i => i.completed).length;
  const progress = localItems.length > 0 ? (completedCount / localItems.length) * 100 : 0;

  return (
    <div className="flex flex-col gap-8 w-full max-w-4xl mx-auto glass-panel bg-white/70 p-8 md:p-12 rounded-[3rem] border border-white shadow-[0_20px_50px_rgba(0,0,0,0.03)]">
      
      <div className="flex flex-col md:flex-row gap-8 items-center justify-between border-b border-[var(--color-atelier-grafite)]/10 pb-8">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-[var(--color-atelier-terracota)] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-[var(--color-atelier-terracota)]/30">
             <Rocket size={24} />
          </div>
          <div>
            <h3 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] mb-1">Checklist de Ativação</h3>
            <p className="font-roboto text-sm text-[var(--color-atelier-grafite)]/60">Coloque sua nova marca no mundo de forma consistente.</p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 w-full md:w-auto">
          <span className="font-roboto text-[10px] uppercase tracking-widest font-bold text-[var(--color-atelier-terracota)]">
            Progresso de Lançamento ({completedCount}/{localItems.length})
          </span>
          <div className="w-full md:w-48 h-2 bg-[var(--color-atelier-grafite)]/5 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-[var(--color-atelier-rose)] to-[var(--color-atelier-terracota)] transition-all duration-1000 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {localItems.map((item) => (
          <div 
            key={item.id}
            onClick={() => handleToggle(item.id)}
            className={`p-6 rounded-[2rem] border flex gap-5 items-center transition-all duration-300
              ${item.completed 
                ? 'bg-[var(--color-atelier-terracota)]/5 border-[var(--color-atelier-terracota)]/20 opacity-80' 
                : 'bg-white border-white hover:border-[var(--color-atelier-grafite)]/10 shadow-sm cursor-pointer hover:shadow-md'}
            `}
          >
            <div className={`shrink-0 transition-colors duration-300 ${item.completed ? 'text-[var(--color-atelier-terracota)]' : 'text-[var(--color-atelier-grafite)]/20'}`}>
              {item.completed ? <CheckCircle2 size={28} /> : <Circle size={28} />}
            </div>
            
            <div className="flex-1">
              <h4 className={`font-roboto text-base font-bold mb-1 transition-colors duration-300 ${item.completed ? 'text-[var(--color-atelier-grafite)]/50 line-through' : 'text-[var(--color-atelier-grafite)]'}`}>
                {item.title}
              </h4>
              <p className={`font-roboto text-sm transition-colors duration-300 ${item.completed ? 'text-[var(--color-atelier-grafite)]/40' : 'text-[var(--color-atelier-grafite)]/70'}`}>
                {item.description}
              </p>
            </div>
          </div>
        ))}

        {localItems.length === 0 && (
          <div className="text-center py-12">
            <p className="font-roboto text-sm text-[var(--color-atelier-grafite)]/50">O checklist de ativação será liberado assim que a marca for aprovada.</p>
          </div>
        )}
      </div>
      
    </div>
  );
}
