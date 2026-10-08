import React from 'react';
import { Presentation, Download, Link as LinkIcon, ArrowRight } from 'lucide-react';

interface RevealCeremonyProps {
  meetingLink?: string;
  meetingDate?: string;
  pdfUrl?: string; // fallback or primary presentation
  brandOsUrl?: string; // fallback
  assets?: any[]; // Dynamic links
  isUnlocked: boolean;
  clientName: string;
}

export function RevealCeremony({ meetingLink, meetingDate, pdfUrl, brandOsUrl, assets = [], isUnlocked, clientName }: RevealCeremonyProps) {
  
  if (!isUnlocked) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-12 glass-panel bg-white/60 rounded-[3rem] border border-white max-w-3xl mx-auto shadow-sm">
        <div className="w-20 h-20 bg-[var(--color-atelier-terracota)]/10 rounded-full flex items-center justify-center mb-6">
          <Presentation size={32} className="text-[var(--color-atelier-terracota)]" />
        </div>
        <h3 className="font-elegant text-4xl text-[var(--color-atelier-grafite)] mb-4">A Cerimônia de Revelação</h3>
        <p className="font-roboto text-[15px] text-[var(--color-atelier-grafite)]/70 max-w-lg mb-8 leading-relaxed">
          Nós não enviamos um "logo" por email. Nós apresentamos um sistema. 
          Agende sua Cerimônia de Revelação com nossa diretora criativa para conhecer a sua marca.
        </p>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-[var(--color-atelier-grafite)]/5 w-full max-w-md">
          {meetingDate ? (
            <div className="flex flex-col gap-2">
              <span className="font-roboto text-[10px] uppercase tracking-widest font-bold text-[var(--color-atelier-terracota)]">Reunião Agendada</span>
              <span className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">
                {new Date(meetingDate).toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' })}
              </span>
              {meetingLink && (
                <a href={meetingLink} target="_blank" rel="noreferrer" className="mt-4 w-full bg-[var(--color-atelier-grafite)] text-white px-6 py-3 rounded-xl font-roboto text-[11px] font-bold uppercase tracking-widest hover:bg-[var(--color-atelier-terracota)] transition-colors flex items-center justify-center gap-2">
                  <Presentation size={14} /> Link da Chamada
                </a>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 opacity-50 py-4">
              <span className="font-roboto text-[11px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]">Agendamento Pendente</span>
              <p className="text-[12px] text-[var(--color-atelier-grafite)]/60">Sua diretora de projeto irá definir a data em breve.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Se unlocked, mostra o painel de entrega
  return (
    <div className="flex flex-col gap-12 w-full max-w-5xl mx-auto">
      <div className="text-center max-w-2xl mx-auto mb-4">
        <h2 className="font-elegant text-4xl md:text-5xl text-[var(--color-atelier-grafite)] mb-4 animate-[fadeInUp_0.8s_ease-out]">
          O Futuro de <span className="text-[var(--color-atelier-terracota)] italic">{clientName}</span>
        </h2>
        <p className="font-roboto text-[14px] md:text-[16px] text-[var(--color-atelier-grafite)]/70 leading-relaxed animate-[fadeInUp_0.8s_ease-out_0.2s_both]">
          O projeto foi aprovado e a cerimônia realizada. Abaixo você tem acesso à apresentação completa da marca e ao seu Cofre de Ativos (Brand OS).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-20">
        
        {/* Bloco 1: Apresentação */}
        {(pdfUrl || (assets && assets.length === 0)) && (
          <div className="glass-panel bg-white/40 border border-white rounded-[2.5rem] p-8 md:p-12 flex flex-col justify-center items-center text-center shadow-sm hover:shadow-lg transition-all group overflow-hidden relative min-h-[300px]">
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-atelier-rose)]/20 to-transparent opacity-50"></div>
            <div className="w-16 h-16 rounded-2xl bg-[var(--color-atelier-grafite)] flex items-center justify-center text-white mb-6 shadow-md relative z-10 group-hover:scale-110 transition-transform duration-500">
              <Presentation size={24} />
            </div>
            <h3 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] mb-4 relative z-10">Brandbook</h3>
            <p className="font-roboto text-sm text-[var(--color-atelier-grafite)]/60 mb-8 max-w-xs relative z-10">
              O documento mestre apresentado na reunião, contendo toda a narrativa e aplicações visuais do sistema.
            </p>
            {pdfUrl ? (
              <a href={pdfUrl} target="_blank" className="mt-auto px-8 py-4 w-full bg-[var(--color-atelier-grafite)] text-white text-[11px] font-bold uppercase tracking-widest rounded-full hover:bg-[var(--color-atelier-terracota)] transition-all shadow-md hover:shadow-xl hover:-translate-y-1 relative z-10">
                Acessar Brandbook
              </a>
            ) : (
               <span className="mt-auto opacity-50 font-roboto text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)] relative z-10 border border-dashed border-[var(--color-atelier-grafite)]/20 px-8 py-4 w-full rounded-full">
                 Indisponível
               </span>
            )}
          </div>
        )}

        {/* Dynamic Assets rendered as cards */}
        {assets.map((asset, index) => (
          <div key={asset.id} className="glass-panel bg-[var(--color-atelier-grafite)] text-white border border-[var(--color-atelier-grafite)] rounded-[2.5rem] p-8 md:p-12 flex flex-col justify-center items-center text-center shadow-sm hover:shadow-lg transition-all group overflow-hidden relative min-h-[300px] hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-bl from-white/10 to-transparent opacity-30"></div>
            <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center text-[var(--color-atelier-terracota)] mb-6 shadow-inner relative z-10 group-hover:scale-110 transition-transform duration-500 border border-white/5">
              <LinkIcon size={24} />
            </div>
            <h3 className="font-elegant text-3xl mb-4 relative z-10">{asset.file_name}</h3>
            <p className="font-roboto text-sm text-white/60 mb-8 max-w-xs relative z-10">
              Ativo disponível para acesso online na nuvem.
            </p>
            <a href={asset.file_url} target="_blank" className="mt-auto px-8 py-4 w-full bg-white text-[var(--color-atelier-grafite)] border border-transparent text-[11px] font-bold uppercase tracking-widest rounded-full hover:bg-[var(--color-atelier-terracota)] hover:text-white transition-all shadow-sm hover:shadow-xl relative z-10 flex items-center justify-center gap-2">
              Acessar Conteúdo <ArrowRight size={14}/>
            </a>
          </div>
        ))}
        
        {/* Fallback Cofre se não houver assets e existir brandOsUrl antigo */}
        {assets.length === 0 && brandOsUrl && (
          <div className="glass-panel bg-[var(--color-atelier-grafite)] text-white border border-[var(--color-atelier-grafite)] rounded-[2.5rem] p-8 md:p-12 flex flex-col justify-center items-center text-center shadow-sm hover:shadow-lg transition-all group overflow-hidden relative min-h-[300px]">
            <div className="absolute inset-0 bg-gradient-to-bl from-white/10 to-transparent opacity-30"></div>
            <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center text-[var(--color-atelier-terracota)] mb-6 shadow-inner relative z-10 group-hover:scale-110 transition-transform duration-500 border border-white/5">
              <Download size={24} />
            </div>
            <h3 className="font-elegant text-3xl mb-4 relative z-10">Cofre de Ativos</h3>
            <p className="font-roboto text-sm text-white/60 mb-8 max-w-xs relative z-10">
              O seu cofre de ativos operacionais. Logotipos, paleta técnica, tipografias e templates prontos para uso.
            </p>
            <a href={brandOsUrl} target="_blank" className="mt-auto px-8 py-4 w-full bg-white text-[var(--color-atelier-grafite)] border border-transparent text-[11px] font-bold uppercase tracking-widest rounded-full hover:bg-[var(--color-atelier-terracota)] hover:text-white transition-all shadow-sm hover:shadow-xl hover:-translate-y-1 relative z-10 flex items-center justify-center gap-2">
              Acessar Cofre <ArrowRight size={14}/>
            </a>
          </div>
        )}

      </div>
    </div>
  );
}
