"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Presentation, Link as LinkIcon, Calendar, Loader2, UploadCloud, CheckCircle2 } from 'lucide-react';

interface RevealCeremonyAdminProps {
  project: any;
  onUpdate?: () => void;
}

export default function RevealCeremonyAdmin({ project, onUpdate }: RevealCeremonyAdminProps) {
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [presentationUrl, setPresentationUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (project) {
      if (project.meeting_date) {
        // Format to YYYY-MM-DDThh:mm for datetime-local
        try {
          const d = new Date(project.meeting_date);
          const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
          setMeetingDate(iso);
        } catch(e) {}
      }
      setMeetingLink(project.meeting_link || '');
      setPresentationUrl(project.presentation_url || '');
    }
  }, [project]);

  const handleSave = async () => {
    if (!project) return;
    setIsSaving(true);
    try {
      const { updateProjectAction } = await import('../../app/actions/projects');
      await updateProjectAction(project.id, {
        meeting_date: meetingDate,
        meeting_link: meetingLink,
        presentation_url: presentationUrl
      });
      window.dispatchEvent(new CustomEvent('showToast', { detail: 'Cerimônia de Revelação atualizada!' }));
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error(err);
      window.dispatchEvent(new CustomEvent('showToast', { detail: 'Erro ao salvar Cerimônia.' }));
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !project) return;
    
    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${project.id}-presentation-${Math.random()}.${fileExt}`;
      const filePath = `presentations/${fileName}`;
      
      const { error: uploadError } = await supabase.storage.from('idv_assets').upload(filePath, file);
      if (uploadError) throw uploadError;
      
      const { data: urlData } = supabase.storage.from('idv_assets').getPublicUrl(filePath);
      
      const { updateProjectAction } = await import('../../app/actions/projects');
      await updateProjectAction(project.id, {
        presentation_url: urlData.publicUrl
      });
      
      setPresentationUrl(urlData.publicUrl);
      window.dispatchEvent(new CustomEvent('showToast', { detail: 'Apresentação enviada com sucesso!' }));
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error(err);
      window.dispatchEvent(new CustomEvent('showToast', { detail: 'Erro ao fazer upload do PDF.' }));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-white/60 border border-white p-5 rounded-[1.5rem] shadow-sm flex flex-col gap-3 group transition-all hover:bg-white mt-4">
      <div className="flex justify-between items-center w-full">
        <label className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/70 flex items-center gap-2">
          <Presentation size={14} className="text-[var(--color-atelier-terracota)]" /> Revelação
        </label>
        {presentationUrl && <CheckCircle2 size={14} className="text-green-500" />}
      </div>
      
      <div className="flex flex-col gap-2 mt-2">
        <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-100 px-3 py-2 shadow-sm">
           <Calendar size={14} className="text-[var(--color-atelier-grafite)]/40 shrink-0" />
           <input 
             type="datetime-local" 
             value={meetingDate}
             onChange={e => setMeetingDate(e.target.value)}
             className="w-full text-xs font-bold text-[var(--color-atelier-grafite)] outline-none bg-transparent"
           />
        </div>
        
        <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-100 px-3 py-2 shadow-sm">
           <LinkIcon size={14} className="text-[var(--color-atelier-grafite)]/40 shrink-0" />
           <input 
             type="url" 
             placeholder="Link da Reunião (Zoom/Meet)"
             value={meetingLink}
             onChange={e => setMeetingLink(e.target.value)}
             className="w-full text-xs font-bold text-[var(--color-atelier-grafite)] outline-none bg-transparent"
           />
        </div>

        <button onClick={handleSave} disabled={isSaving} className="w-full mt-1 bg-[var(--color-atelier-grafite)] text-white text-[10px] uppercase font-bold tracking-widest py-2 rounded-xl hover:bg-black transition-colors flex justify-center items-center gap-2 disabled:opacity-50">
          {isSaving ? <Loader2 size={14} className="animate-spin" /> : 'Salvar Reunião'}
        </button>

        <div className="border-t border-gray-100 mt-2 pt-3">
          {!presentationUrl ? (
            <label className="w-full bg-white/50 hover:bg-white border-2 border-dashed border-[var(--color-atelier-grafite)]/20 hover:border-[var(--color-atelier-terracota)]/40 rounded-xl px-4 py-3 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors group/upload shadow-sm">
              <input type="file" accept=".pdf" className="hidden" onChange={handleUpload} disabled={isUploading} />
              {isUploading ? <Loader2 size={16} className="animate-spin text-[var(--color-atelier-terracota)]" /> : <UploadCloud size={16} className="text-[var(--color-atelier-grafite)]/40 group-hover/upload:text-[var(--color-atelier-terracota)] transition-colors" />}
              <span className="font-roboto text-[10px] font-bold text-[var(--color-atelier-grafite)]/60 group-hover/upload:text-[var(--color-atelier-terracota)] transition-colors text-center uppercase tracking-widest">
                {isUploading ? "Enviando PDF..." : "Upload Apresentação (PDF)"}
              </span>
            </label>
          ) : (
            <div className="flex flex-col gap-2">
              <a href={presentationUrl} target="_blank" rel="noreferrer" className="w-full bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] text-[10px] uppercase font-bold tracking-widest py-2 rounded-xl text-center hover:bg-[var(--color-atelier-terracota)]/20 transition-colors">
                Visualizar PDF Apresentação
              </a>
              <button onClick={() => setPresentationUrl('')} className="w-full text-[9px] uppercase font-bold text-red-400 hover:text-red-500 underline text-center">Substituir Arquivo</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
