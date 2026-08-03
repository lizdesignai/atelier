"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../../../lib/supabase";
import { X, Briefcase, Building2, Check, Loader2, UserCheck } from "lucide-react";

interface CollaboratorAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  collaborator: any;
}

export default function CollaboratorAssignmentModal({
  isOpen,
  onClose,
  collaborator,
}: CollaboratorAssignmentModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [subclients, setSubclients] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://atelier-zwlt.onrender.com';

  useEffect(() => {
    if (isOpen && collaborator?.id) {
      loadAllData();
    }
  }, [isOpen, collaborator]);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      // 1. Load active projects
      const { data: pData } = await supabase
        .from('projects')
        .select('id, type, service_type, client_id, profiles(nome)')
        .in('status', ['active', 'delivered'])
        .order('created_at', { ascending: false });

      // 2. Load subclients
      const { data: sData } = await supabase
        .from('agency_subclients')
        .select('id, name, agency_id')
        .order('name');

      setProjects(pData || []);
      setSubclients(sData || []);

      // 3. Load collaborator assignments from backend API
      const res = await fetch(`${backendUrl}/api/v1/assignments/${collaborator.id}`);
      if (res.ok) {
        const { data: assignData } = await res.json();
        setAssignments(assignData || []);
      }
    } catch (err) {
      console.error("Erro ao carregar atribuições:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const isAssignedToProject = (projectId: string) => {
    return assignments.some((a) => a.project_id === projectId);
  };

  const isAssignedToSubclient = (subclientId: string) => {
    return assignments.some((a) => a.subclient_id === subclientId);
  };

  const getAssignmentId = (projectId?: string, subclientId?: string) => {
    const found = assignments.find((a) => 
      (projectId && a.project_id === projectId) || 
      (subclientId && a.subclient_id === subclientId)
    );
    return found?.id;
  };

  const toggleProjectAssignment = async (projectId: string) => {
    if (!collaborator?.id) return;
    setSavingId(`project-${projectId}`);
    try {
      const existingId = getAssignmentId(projectId, undefined);
      if (existingId) {
        // Remove
        await fetch(`${backendUrl}/api/v1/assignments/${existingId}`, { method: 'DELETE' });
      } else {
        // Add
        await fetch(`${backendUrl}/api/v1/assignments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ collaboratorId: collaborator.id, projectId })
        });
      }
      await loadAllData();
      window.dispatchEvent(new CustomEvent("jtbdRefreshNeeded"));
      window.dispatchEvent(new CustomEvent("showToast", { detail: "Atribuição atualizada!" }));
    } catch (err: any) {
      window.dispatchEvent(new CustomEvent("showToast", { detail: "Erro ao atualizar atribuição." }));
    } finally {
      setSavingId(null);
    }
  };

  const toggleSubclientAssignment = async (subclientId: string) => {
    if (!collaborator?.id) return;
    setSavingId(`subclient-${subclientId}`);
    try {
      const existingId = getAssignmentId(undefined, subclientId);
      if (existingId) {
        // Remove
        await fetch(`${backendUrl}/api/v1/assignments/${existingId}`, { method: 'DELETE' });
      } else {
        // Add
        await fetch(`${backendUrl}/api/v1/assignments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ collaboratorId: collaborator.id, subclientId })
        });
      }
      await loadAllData();
      window.dispatchEvent(new CustomEvent("jtbdRefreshNeeded"));
      window.dispatchEvent(new CustomEvent("showToast", { detail: "Atribuição de subcliente atualizada!" }));
    } catch (err: any) {
      window.dispatchEvent(new CustomEvent("showToast", { detail: "Erro ao atualizar atribuição." }));
    } finally {
      setSavingId(null);
    }
  };

  if (!isOpen || !collaborator) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="bg-white rounded-[2.5rem] p-8 relative z-10 w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 pb-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] flex items-center justify-center">
                <UserCheck size={24} />
              </div>
              <div>
                <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">
                  Atribuir Clientes & Subclientes
                </h3>
                <p className="text-xs font-bold text-gray-400 mt-0.5">
                  Colaborador: <span className="text-[var(--color-atelier-terracota)]">{collaborator.nome}</span>
                </p>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-red-500 bg-gray-50 p-2.5 rounded-full transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={32} className="animate-spin text-[var(--color-atelier-terracota)]" />
              </div>
            ) : (
              <>
                {/* Projetos Diretos */}
                <div>
                  <h4 className="text-xs uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/50 mb-3 flex items-center gap-2">
                    <Briefcase size={14} /> Clientes Diretos (Projetos)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {projects.map((proj) => {
                      const assigned = isAssignedToProject(proj.id);
                      const isSaving = savingId === `project-${proj.id}`;
                      const clientTitle = proj.profiles?.nome ? `${proj.profiles.nome} (${proj.type || proj.service_type})` : (proj.type || 'Projeto');

                      return (
                        <button
                          key={proj.id}
                          onClick={() => toggleProjectAssignment(proj.id)}
                          disabled={isSaving}
                          className={`p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all ${
                            assigned
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-900 font-bold shadow-sm'
                              : 'bg-gray-50 border-gray-100 text-gray-700 hover:bg-white hover:border-gray-300'
                          }`}
                        >
                          <span className="text-xs truncate pr-2" title={clientTitle}>
                            {clientTitle}
                          </span>
                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                            assigned ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300 bg-white'
                          }`}>
                            {isSaving ? <Loader2 size={10} className="animate-spin" /> : assigned ? <Check size={12} /> : null}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Subclientes de Agências */}
                <div>
                  <h4 className="text-xs uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/50 mb-3 flex items-center gap-2">
                    <Building2 size={14} /> Subclientes de Agências (White-Label)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {subclients.map((sub) => {
                      const assigned = isAssignedToSubclient(sub.id);
                      const isSaving = savingId === `subclient-${sub.id}`;

                      return (
                        <button
                          key={sub.id}
                          onClick={() => toggleSubclientAssignment(sub.id)}
                          disabled={isSaving}
                          className={`p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all ${
                            assigned
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-900 font-bold shadow-sm'
                              : 'bg-gray-50 border-gray-100 text-gray-700 hover:bg-white hover:border-gray-300'
                          }`}
                        >
                          <span className="text-xs truncate pr-2" title={sub.name}>
                            {sub.name}
                          </span>
                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                            assigned ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300 bg-white'
                          }`}>
                            {isSaving ? <Loader2 size={10} className="animate-spin" /> : assigned ? <Check size={12} /> : null}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
