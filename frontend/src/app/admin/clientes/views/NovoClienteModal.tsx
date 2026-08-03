"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, User, Building, Mail, Lock, Instagram, Briefcase, Loader2, Sparkles } from "lucide-react";
import { supabase } from "../../../../lib/supabase";

interface NovoClienteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function NovoClienteModal({ isOpen, onClose, onSuccess }: NovoClienteModalProps) {
  const [nome, setNome] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [servico, setServico] = useState("");
  const [instagram, setInstagram] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showToast = (message: string) => {
    window.dispatchEvent(new CustomEvent("showToast", { detail: message }));
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !empresa || !servico || !email || !password) {
      showToast("Preencha todos os campos obrigatórios.");
      return;
    }

    setIsSubmitting(true);
    const cleanEmail = email.trim();
    
    let cleanInstagram = instagram.trim();
    if (cleanInstagram && !cleanInstagram.startsWith('@') && !cleanInstagram.includes('instagram.com/')) {
      cleanInstagram = `@${cleanInstagram}`;
    }

    try {
      // Usando a lógica do login conforme solicitado
      const newRole = cleanEmail.includes('admin') ? 'admin' : cleanEmail.includes('gestor') ? 'gestor' : 'client';
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: cleanEmail, 
        password,
        options: { 
          data: { 
            nome, 
            empresa, 
            role: newRole, 
            instagram: cleanInstagram 
          } 
        }
      });

      if (authError) throw authError;

      if (newRole === 'client' && authData.user) {
        await supabase.from('projects').insert({ 
          client_id: authData.user.id, 
          name: `Projeto ${empresa}`, 
          type: servico, 
          status: 'active' 
        });
      }

      showToast("Cliente criado com sucesso!");
      onSuccess();
      onClose();
      
      // Limpar formulário
      setNome("");
      setEmpresa("");
      setServico("");
      setInstagram("");
      setEmail("");
      setPassword("");

    } catch (error: any) {
      showToast(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        >
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="w-full max-w-lg bg-white/90 backdrop-blur-xl border border-white rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col max-h-[90dvh]"
          >
            <div className="shrink-0 flex items-center justify-between p-6 border-b border-gray-100 bg-white/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-[var(--color-atelier-terracota)]">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="font-elegant text-xl font-bold text-[var(--color-atelier-grafite)]">Novo Cliente</h3>
                  <p className="text-xs text-gray-500 font-roboto mt-0.5">Criar nova conta de acesso</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              <form id="new-client-form" onSubmit={handleCreateClient} className="flex flex-col gap-5">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-gray-500 ml-1">Nome Completo *</label>
                    <div className="relative">
                      <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input 
                        type="text" 
                        required
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-xl py-3 pl-10 pr-4 text-sm outline-none focus:border-[var(--color-atelier-terracota)] focus:ring-1 focus:ring-[var(--color-atelier-terracota)] transition-all"
                        placeholder="Nome do cliente"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-gray-500 ml-1">Empresa *</label>
                    <div className="relative">
                      <Building size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input 
                        type="text" 
                        required
                        value={empresa}
                        onChange={(e) => setEmpresa(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-xl py-3 pl-10 pr-4 text-sm outline-none focus:border-[var(--color-atelier-terracota)] focus:ring-1 focus:ring-[var(--color-atelier-terracota)] transition-all"
                        placeholder="Nome da empresa"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-gray-500 ml-1">Instagram</label>
                    <div className="relative">
                      <Instagram size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input 
                        type="text" 
                        value={instagram}
                        onChange={(e) => setInstagram(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-xl py-3 pl-10 pr-4 text-sm outline-none focus:border-[var(--color-atelier-terracota)] focus:ring-1 focus:ring-[var(--color-atelier-terracota)] transition-all"
                        placeholder="@instagram"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-gray-500 ml-1">Serviço Principal *</label>
                    <div className="relative">
                      <Briefcase size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <select 
                        required
                        value={servico}
                        onChange={(e) => setServico(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-xl py-3 pl-10 pr-4 text-sm outline-none focus:border-[var(--color-atelier-terracota)] focus:ring-1 focus:ring-[var(--color-atelier-terracota)] transition-all appearance-none"
                      >
                        <option value="" disabled>Selecione um serviço</option>
                        <option value="Identidade Visual">Identidade Visual</option>
                        <option value="Gestão de Instagram">Gestão de Instagram</option>
                        <option value="Consultoria">Consultoria Estratégica</option>
                        <option value="Outro">Outro</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="h-px w-full bg-gray-100 my-2"></div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-gray-500 ml-1">E-mail de Acesso *</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      type="email" 
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-xl py-3 pl-10 pr-4 text-sm outline-none focus:border-[var(--color-atelier-terracota)] focus:ring-1 focus:ring-[var(--color-atelier-terracota)] transition-all"
                      placeholder="email@cliente.com"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-gray-500 ml-1">Senha Provisória *</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      type="text" 
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-xl py-3 pl-10 pr-4 text-sm outline-none focus:border-[var(--color-atelier-terracota)] focus:ring-1 focus:ring-[var(--color-atelier-terracota)] transition-all"
                      placeholder="Senha forte..."
                    />
                  </div>
                </div>

              </form>
            </div>

            <div className="shrink-0 p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
              <button 
                type="button"
                onClick={onClose}
                className="px-6 py-3 rounded-xl font-roboto font-bold uppercase tracking-widest text-xs text-gray-500 hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                form="new-client-form"
                disabled={isSubmitting}
                className="bg-[var(--color-atelier-grafite)] text-white px-8 py-3 rounded-xl font-roboto font-bold uppercase tracking-widest text-xs hover:bg-[var(--color-atelier-terracota)] transition-all shadow-md flex items-center justify-center min-w-[140px]"
              >
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : "Criar Conta"}
              </button>
            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
