// src/app/admin/gestao/page.tsx
"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabase";
import { Loader2, ShieldAlert } from "lucide-react";
import ExecutiveDashboard from "./views/ExecutiveDashboard";
import PersonalProductivity from "./views/PersonalProductivity";

export default function GestaoPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const authenticateAndRoute = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          window.location.href = "/login";
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        setCurrentUser(profile);
      } catch (error) {
        console.error("Erro na autenticação do Módulo de Gestão:", error);
      } finally {
        setIsLoading(false);
      }
    };

    authenticateAndRoute();
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-60px)] items-center justify-center">
        <Loader2 size={40} className="animate-spin text-[var(--color-atelier-terracota)]" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="flex h-[calc(100vh-60px)] flex-col items-center justify-center text-center gap-4">
        <ShieldAlert size={48} className="text-red-500" />
        <h2 className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">Acesso Negado</h2>
        <p className="text-gray-500 font-roboto">Não foi possível validar as suas credenciais de acesso.</p>
      </div>
    );
  }

  const isAdminOrManager = currentUser.role === 'admin' || currentUser.role === 'gestor';

  return (
    <div className="flex flex-col h-[calc(100vh-60px)] max-w-[1500px] mx-auto relative z-10 px-4 md:px-0 pt-6 pb-6">
      {isAdminOrManager ? (
        <ExecutiveDashboard currentUser={currentUser} />
      ) : (
        <PersonalProductivity currentUser={currentUser} />
      )}
    </div>
  );
}