// src/components/admin/DiaryModule.tsx
"use client";

import { useState, useEffect } from "react";
import { Image as ImageIcon, Send, Loader2, Clock, Trash2, Sparkles } from "lucide-react";
import { supabase } from "../../lib/supabase";

interface DiaryModuleProps {
  activeProjectId: string | null;
  currentProject: any;
  onActivity?: () => void;
}

const showToast = (message: string) => {
  window.dispatchEvent(new CustomEvent("showToast", { detail: message }));
};

export default function DiaryModule({ activeProjectId, currentProject, onActivity }: DiaryModuleProps) {
  const [postTitle, setPostTitle] = useState("");
  const [postText, setPostText] = useState("");
  const [postImageFile, setPostImageFile] = useState<File | null>(null);
  const [postImagePreview, setPostImagePreview] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [diaryPosts, setDiaryPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // FETCH DIARY POSTS
  useEffect(() => {
    if (!activeProjectId) return;
    
    const fetchDiary = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('diary_posts')
          .select('*, profiles:author_id(nome, avatar_url, role)') 
          .eq('project_id', activeProjectId)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        if (data) setDiaryPosts(data);
      } catch (err) {
        console.error("Erro na busca do diário", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDiary();
  }, [activeProjectId]);

  const handleDiaryImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPostImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPostImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handlePostDiary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProjectId) return;

    setIsPosting(true);
    showToast("A publicar atualização...");
    
    try {
      let imageUrl = null;

      if (postImageFile) {
        const fileExt = postImageFile.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${activeProjectId}/${fileName}`;

        const { error: uploadError } = await supabase.storage.from('community_images').upload(filePath, postImageFile);
        if (!uploadError) {
          const { data } = supabase.storage.from('community_images').getPublicUrl(filePath);
          imageUrl = data.publicUrl;
        }
      }

     if (onActivity) onActivity(); // <--- INJETE ISTO AQUI!


      const { data: { session } } = await supabase.auth.getSession();
      
      const { data: newPost, error } = await supabase.from('diary_posts').insert({
        project_id: activeProjectId,
        author_id: session?.user?.id, 
        title: postTitle,
        content: postText,
        image_url: imageUrl
      }).select().single();

      if (error) throw error;
      
      if (newPost) {
        const postWithProfile = {
          ...newPost,
          profiles: {
            nome: session?.user?.user_metadata?.nome || "Atelier",
            avatar_url: session?.user?.user_metadata?.avatar_url || null
          }
        };
        setDiaryPosts([postWithProfile, ...diaryPosts]);
      }
      
      showToast(`Diário atualizado para ${currentProject?.profiles?.nome || 'o cliente'}!`);
      setPostTitle("");
      setPostText("");
      setPostImageFile(null);
      setPostImagePreview(null);
    } catch (error) {
      showToast("Erro ao atualizar o diário.");
    } finally {
      setIsPosting(false);
    }
  };

  const handleDeletePost = async (id: string) => {
    if (!window.confirm("Deseja mesmo apagar este registo do diário?")) return;
    try {
      await supabase.from('diary_posts').delete().eq('id', id);
      setDiaryPosts(diaryPosts.filter(p => p.id !== id));
      showToast("Registo apagado da timeline.");
    } catch (error) {
      showToast("Erro ao apagar registo.");
    }
  };

  if (!activeProjectId) return null;

  return (
    <div className="glass-panel p-6 md:p-8 rounded-[2.5rem] bg-white/60 flex flex-col h-full border border-white shadow-[0_15px_40px_rgba(173,111,64,0.05)]">
      
      {/* HEADER DO MÓDULO */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-[var(--color-atelier-grafite)]/5 shrink-0">
        <div>
          <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] flex items-center gap-2 mb-1">
            <ImageIcon size={20} className="text-[var(--color-atelier-terracota)]" /> 
            Diário de Bordo
          </h3>
          <p className="font-roboto text-[11px] text-[var(--color-atelier-grafite)]/50 uppercase tracking-widest font-bold">
            Timeline Criativa
          </p>
        </div>
        <span className="bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] px-3 py-1 rounded-full text-[10px] font-bold tracking-wider">
          {diaryPosts.length} Registos
        </span>
      </div>

      {/* FORMULÁRIO DE PUBLICAÇÃO */}
      <form onSubmit={handlePostDiary} className="flex flex-col shrink-0 mb-6 bg-white/40 p-5 rounded-3xl border border-[var(--color-atelier-grafite)]/5 shadow-sm">
        <div className="flex flex-col gap-3">
          
          <div className="flex gap-3">
            {/* Imagem Preview / Upload */}
            <label className="w-20 h-20 rounded-2xl border-2 border-dashed border-[var(--color-atelier-terracota)]/20 hover:border-[var(--color-atelier-terracota)]/50 bg-white flex flex-col items-center justify-center cursor-pointer group relative overflow-hidden transition-all shrink-0">
              <input type="file" accept="image/*" className="hidden" onChange={handleDiaryImageSelect} />
              {postImagePreview ? (
                <img src={postImagePreview} alt="Preview" className="w-full h-full object-cover absolute inset-0" />
              ) : (
                <ImageIcon size={20} className="text-[var(--color-atelier-grafite)]/30 group-hover:text-[var(--color-atelier-terracota)] transition-colors" />
              )}
            </label>

            {/* Inputs de Texto */}
            <div className="flex flex-col gap-2 flex-1">
              <input 
                type="text" required 
                value={postTitle} onChange={(e) => setPostTitle(e.target.value)} 
                placeholder="Título da Etapa (Ex: Esboços Iniciais)" 
                className="w-full bg-white border border-[var(--color-atelier-grafite)]/5 focus:border-[var(--color-atelier-terracota)]/40 rounded-xl py-2 px-3 text-[12px] font-bold text-[var(--color-atelier-grafite)] outline-none transition-all" 
              />
              <textarea 
                required 
                value={postText} onChange={(e) => setPostText(e.target.value)} 
                placeholder="O que foi desenvolvido e qual o racional?" 
                className="w-full flex-1 resize-none bg-white border border-[var(--color-atelier-grafite)]/5 focus:border-[var(--color-atelier-terracota)]/40 rounded-xl py-2 px-3 text-[12px] outline-none custom-scrollbar transition-all leading-relaxed" 
              />
            </div>
          </div>

        </div>
        <button 
          type="submit" 
          disabled={isPosting || !postText || !postTitle} 
          className="mt-3 w-full bg-[var(--color-atelier-grafite)] text-white py-3 rounded-xl font-roboto font-bold uppercase tracking-[0.2em] text-[10px] hover:bg-[var(--color-atelier-terracota)] transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isPosting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          Publicar na Timeline
        </button>
      </form>

      {/* TIMELINE DE POSTS */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-3 relative">
         {isLoading ? (
           <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-[var(--color-atelier-terracota)]" /></div>
         ) : diaryPosts.length === 0 ? (
           <div className="flex flex-col items-center justify-center h-full opacity-40 py-10">
             <Sparkles size={32} className="mb-3 text-[var(--color-atelier-grafite)]" />
             <p className="text-[14px] font-elegant">A jornada ainda não começou.</p>
           </div>
         ) : (
           <div className="flex flex-col gap-5 relative before:absolute before:top-4 before:bottom-0 before:left-[19px] before:w-0.5 before:bg-gradient-to-b before:from-[var(--color-atelier-terracota)]/20 before:to-transparent">
             
             {diaryPosts.map((post) => (
                <div key={post.id} className="relative flex items-start gap-4 group">
                  
                  {/* Bolinha da Timeline */}
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-[var(--color-atelier-creme)] text-[var(--color-atelier-terracota)] shadow-sm shrink-0 z-10 mt-1">
                    <div className="w-2.5 h-2.5 bg-[var(--color-atelier-terracota)] rounded-full group-hover:scale-150 transition-transform"></div>
                  </div>
                  
                  {/* Cartão do Post */}
                  <div className="flex-1 bg-white border border-[var(--color-atelier-grafite)]/5 shadow-[0_5px_15px_rgba(122,116,112,0.03)] p-5 rounded-2xl flex flex-col group-hover:border-[var(--color-atelier-terracota)]/20 transition-colors">
                    
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-1.5">
                        <Clock size={12} className="text-[var(--color-atelier-terracota)]" />
                        <span className="text-[9px] text-[var(--color-atelier-grafite)]/50 font-bold uppercase tracking-widest">
                          {new Date(post.created_at).toLocaleDateString('pt-PT')}
                        </span>
                      </div>
                      <button onClick={() => handleDeletePost(post.id)} className="text-[var(--color-atelier-grafite)]/20 hover:text-red-500 transition-colors">
                        <Trash2 size={12}/>
                      </button>
                    </div>

                    <h4 className="font-elegant text-xl text-[var(--color-atelier-grafite)] leading-none mb-2">{post.title}</h4>
                    <p className="font-roboto text-[12px] text-[var(--color-atelier-grafite)]/70 leading-relaxed whitespace-pre-wrap">{post.content}</p>
                    
                    {post.image_url && (
                      <div className="mt-4 rounded-xl overflow-hidden border border-[var(--color-atelier-grafite)]/5 bg-[var(--color-atelier-creme)]">
                        <img src={post.image_url} className="w-full h-auto max-h-[250px] object-cover hover:scale-105 transition-transform duration-500" alt=""/>
                      </div>
                    )}
                  </div>
                </div>
             ))}
           </div>
         )}
      </div>

    </div>
  );
}