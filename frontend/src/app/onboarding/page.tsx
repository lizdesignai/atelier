"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle2, PlayCircle } from "lucide-react";
import { useEffect, useState } from "react";

export default function OnboardingPage() {
  const router = useRouter();
  const [role, setRole] = useState<string>("client");

  useEffect(() => {
    const storedRole = localStorage.getItem("atelier_role");
    if (storedRole) {
      setRole(storedRole);
    }
  }, []);

  const handleConfirm = () => {
    localStorage.setItem("has_seen_onboarding", "true");
    router.push(role === "client" ? "/" : "/admin");
  };

  return (
    <div className="min-h-screen bg-[var(--color-atelier-creme)] flex items-center justify-center font-roboto relative overflow-hidden p-6">
      {/* Decoração de Fundo */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-100/50 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-orange-100/30 rounded-full blur-3xl pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-4xl bg-white/60 backdrop-blur-3xl border border-white/60 p-8 md:p-12 rounded-[3.5rem] shadow-[0_30px_80px_rgba(122,116,112,0.15)] flex flex-col items-center text-center"
      >
        <div className="w-16 h-16 bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] rounded-full flex items-center justify-center mb-6">
          <PlayCircle size={32} />
        </div>
        
        <h1 className="text-3xl md:text-4xl font-elegant text-gray-800 mb-4">
          Bem-vindo ao Atelier
        </h1>
        <p className="text-[15px] text-gray-500 max-w-2xl mb-10 leading-relaxed">
          Assista ao vídeo abaixo para entender como extrair o máximo do nosso ecossistema. 
          Preparamos um guia rápido para você navegar pelas ferramentas de forma simples e eficiente.
        </p>

        {/* Video Container */}
        <div className="w-full aspect-video bg-gray-900 rounded-[2rem] overflow-hidden shadow-2xl mb-10 border-4 border-white/50 relative group">
          <iframe 
            className="w-full h-full"
            src="https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0&modestbranding=1" 
            title="Atelier Onboarding"
            frameBorder="0" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            allowFullScreen
          ></iframe>
        </div>

        <motion.button 
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleConfirm}
          className="bg-[var(--color-atelier-terracota)] text-white px-10 py-4 rounded-2xl font-bold text-[13px] uppercase tracking-widest flex items-center gap-3 shadow-lg hover:shadow-xl hover:bg-[#b05230] transition-all"
        >
          <CheckCircle2 size={18} />
          Estou pronto para começar
        </motion.button>
        
        <span className="mt-6 text-[11px] text-gray-400 font-medium tracking-wide">
          Ao confirmar, você será redirecionado para a sua Mesa de Trabalho.
        </span>

      </motion.div>
    </div>
  );
}
