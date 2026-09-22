import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { mockMapaData } from '@/app/mapa/mockData';
import { CheckCircle2, Circle } from 'lucide-react';

export default function PlanModule() {
  const { plan } = mockMapaData;
  const [checkedTasks, setCheckedTasks] = useState<Record<string, boolean>>({});

  const toggleTask = (taskId: string) => {
    setCheckedTasks(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
  };

  const renderPriority = (priority: any, label: string, colorClass: string, isNow: boolean) => (
    <div className={`p-6 md:p-8 rounded-3xl ${isNow ? 'bg-white border-2 border-[var(--color-atelier-terracota)]/20 shadow-md relative' : 'bg-white/40 border border-[var(--color-atelier-grafite)]/10 shadow-sm'}`}>
      
      {isNow && (
        <div className="absolute top-0 right-8 -mt-3 bg-[var(--color-atelier-terracota)] text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest shadow-sm">
          Seu Foco
        </div>
      )}

      <div className="flex items-center gap-2 mb-4">
        <div className={`w-3 h-3 rounded-full ${colorClass}`} />
        <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60">{label}</span>
      </div>

      <h3 className="text-xl font-bold text-[var(--color-atelier-grafite)] mb-2">{priority.title}</h3>
      {priority.descricao && (
        <p className="text-sm text-[var(--color-atelier-grafite)]/70 mb-4">{priority.descricao}</p>
      )}

      <div className="flex gap-4 mb-6 text-xs font-medium text-[var(--color-atelier-grafite)]/50">
        <span className="bg-[var(--color-atelier-grafite)]/5 px-2 py-1 rounded">Impacto: {priority.impacto}</span>
        <span className="bg-[var(--color-atelier-grafite)]/5 px-2 py-1 rounded">Esforço: {priority.esforco}</span>
      </div>

      <div className="space-y-3">
        {priority.tasks.map((task: any) => {
          const isChecked = checkedTasks[task.id] || false;
          return (
            <button
              key={task.id}
              onClick={() => toggleTask(task.id)}
              className="w-full flex items-center gap-3 text-left group focus:outline-none"
            >
              {isChecked ? (
                <CheckCircle2 className="text-[var(--color-atelier-terracota)] flex-shrink-0" size={20} />
              ) : (
                <Circle className="text-[var(--color-atelier-grafite)]/30 group-hover:text-[var(--color-atelier-terracota)]/50 transition-colors flex-shrink-0" size={20} />
              )}
              <span className={`text-sm transition-all ${isChecked ? 'line-through text-[var(--color-atelier-grafite)]/40' : 'text-[var(--color-atelier-grafite)] font-medium group-hover:text-[var(--color-atelier-terracota)]'}`}>
                {task.text}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <motion.section 
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: "-100px" }}
      className="min-h-[70vh] flex flex-col justify-center max-w-3xl mx-auto w-full py-16 border-t border-[var(--color-atelier-grafite)]/10"
    >
      <div className="text-center mb-12">
        <h2 className="text-3xl font-light text-[var(--color-atelier-grafite)]">Seu plano de evolução</h2>
        <p className="text-[var(--color-atelier-grafite)]/60 mt-2 max-w-lg mx-auto">
          Sabemos exatamente o que você precisa fazer. Siga este checklist para desbloquear o próximo nível da sua marca.
        </p>
      </div>

      <div className="space-y-6">
        {renderPriority(plan.prioridade_1, 'Agora', 'bg-[var(--color-atelier-terracota)]', true)}
        {renderPriority(plan.prioridade_2, 'Próximo', 'bg-yellow-400', false)}
        {renderPriority(plan.prioridade_3, 'Depois', 'bg-gray-300', false)}
      </div>

    </motion.section>
  );
}
