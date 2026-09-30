import React from 'react';
import { Presentation, Download, Star, ArrowRight } from 'lucide-react';

interface RevealCeremonyProps {
  meetingLink?: string;
  meetingDate?: string;
  pdfUrl?: string;
  brandOsUrl?: string;
  isUnlocked: boolean;
  clientName: string;
}

export function RevealCeremony({ meetingLink, meetingDate, pdfUrl, brandOsUrl, isUnlocked, clientName }: RevealCeremonyProps) {
  
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
              <span className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">{meetingDate}</span>
              {meetingLink && (
                <a href={meetingLink} target="_blank" rel="noreferrer" className="mt-4 px-6 py-3 bg-[var(--color-atelier-grafite)] text-white text-xs font-bold uppercase tracking-widest rounded-full hover:bg-[var(--color-atelier-terracota)] transition-colors inline-flex justify-center items-center gap-2">
                  Acessar Reunião <ArrowRight size={14} />
                </a>
              )}
            </div>
          ) : (
             <div className="flex flex-col gap-4">
               <span className="font-roboto text-[10px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/50">Aguardando Agendamento</span>
               <button className="w-full py-3 border border-[var(--color-atelier-terracota)] text-[var(--color-atelier-terracota)] rounded-full text-xs font-bold uppercase tracking-widest hover:bg-[var(--color-atelier-terracota)]/5 transition-colors">
                 Agendar no Calendly
               </button>
             </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 w-full max-w-4xl mx-auto">
      <div className="text-center mb-6">
        <h3 className="font-elegant text-5xl text-[var(--color-atelier-grafite)] mb-4">O Sistema Está Vivo</h3>
        <p className="font-roboto text-[15px] text-[var(--color-atelier-grafite)]/70 max-w-2xl mx-auto leading-relaxed">
          Sua identidade visual foi revelada e os ativos estão prontos. 
          Acesse a documentação do sistema e o seu Brand OS (Espaço de Ativos).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* PDF / Documentação */}
        <div className="glass-panel p-10 rounded-[3rem] bg-white border border-white shadow-[0_20px_50px_rgba(0,0,0,0.05)] flex flex-col items-center text-center hover:scale-[1.02] transition-transform duration-500">
          <div className="w-16 h-16 bg-[var(--color-atelier-grafite)]/5 rounded-2xl flex items-center justify-center mb-6 text-[var(--color-atelier-grafite)]">
             <Download size={24} />
          </div>
          <h4 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] mb-3">Apresentação Oficial</h4>
          <p className="font-roboto text-sm text-[var(--color-atelier-grafite)]/60 mb-8 max-w-xs">
            O documento mestre apresentado na reunião, contendo toda a narrativa e aplicações visuais do sistema.
          </p>
          <a href={pdfUrl || "#"} target={pdfUrl ? "_blank" : "_self"} className="mt-auto px-8 py-4 w-full bg-[var(--color-atelier-grafite)] text-white text-[11px] font-bold uppercase tracking-widest rounded-full hover:bg-[var(--color-atelier-terracota)] transition-all shadow-md hover:shadow-xl hover:-translate-y-1">
            Baixar Documento (PDF)
          </a>
        </div>

        {/* Brand OS (Figma/Drive) */}
        <div className="glass-panel p-10 rounded-[3rem] bg-gradient-to-br from-[var(--color-atelier-rose)]/20 to-[var(--color-atelier-terracota)]/10 border border-white shadow-[0_20px_50px_rgba(0,0,0,0.05)] flex flex-col items-center text-center hover:scale-[1.02] transition-transform duration-500 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-atelier-terracota)]/20 blur-3xl rounded-full"></div>
          
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-6 text-[var(--color-atelier-terracota)] shadow-sm relative z-10">
             <Star size={24} />
          </div>
          <h4 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] mb-3 relative z-10">Brand OS</h4>
          <p className="font-roboto text-sm text-[var(--color-atelier-grafite)]/70 mb-8 max-w-xs relative z-10">
            O seu cofre de ativos operacionais. Logotipos, paleta técnica, tipografias e templates prontos para uso.
          </p>
          <a href={brandOsUrl || "#"} target={brandOsUrl ? "_blank" : "_self"} className="mt-auto px-8 py-4 w-full bg-white text-[var(--color-atelier-terracota)] border border-[var(--color-atelier-terracota)]/20 text-[11px] font-bold uppercase tracking-widest rounded-full hover:bg-[var(--color-atelier-terracota)] hover:text-white transition-all shadow-sm hover:shadow-xl hover:-translate-y-1 relative z-10">
            Acessar Cofre de Ativos
          </a>
        </div>
      </div>
    </div>
  );
}
