// src/app/admin/gerenciamento/views/VisualFlow.tsx
import { useState, useEffect } from "react";
import { supabase } from "../../../../lib/supabase";
import { UploadCloud, Loader2, Send, Trash2, MapPin, Clock, CheckCircle2 } from "lucide-react";

interface VisualFlowProps {
  activeProjectId: string;
  currentProject: any;
}

export default function VisualFlow({ activeProjectId, currentProject }: VisualFlowProps) {
  // ==========================================
  // ESTADOS GERAIS
  // ==========================================
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Dados da Base de Dados
  const [posts, setPosts] = useState<any[]>([]);
  const [pins, setPins] = useState<any[]>([]);
  const [approvedPlans, setApprovedPlans] = useState<any[]>([]);

  // Formulário de Nova Arte
  const [newPostImage, setNewPostImage] = useState<File | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string>(""); 
  const [newPostCaption, setNewPostCaption] = useState("");

  // ==========================================
  // 1. CARREGAMENTO DE DADOS (Lazy Load)
  // ==========================================
  useEffect(() => {
    fetchVisualData();
  }, [activeProjectId]);

  // Se o utilizador selecionar uma ideia da lista, preenchemos a legenda automaticamente
  useEffect(() => {
    if (selectedPlanId) {
      const selectedPlan = approvedPlans.find(p => p.id === selectedPlanId);
      if (selectedPlan) {
        setNewPostCaption(`**${selectedPlan.hook}**\n\n${selectedPlan.briefing}`);
      }
    } else {
      setNewPostCaption("");
    }
  }, [selectedPlanId, approvedPlans]);

  const fetchVisualData = async () => {
    setIsLoading(true);
    try {
      if (!activeProjectId) return;

      // 1. Busca os Posts Visuais
      const { data: postsData } = await supabase
        .from('social_posts')
        .select('*')
        .eq('project_id', activeProjectId)
        .order('created_at', { ascending: false });
        
      if (postsData) setPosts(postsData);

      // 2. Busca os Pinos de Feedback (Comentários do Cliente)
      const postIds = postsData?.map(p => p.id) || [];
      if (postIds.length > 0) {
        const { data: pinsData } = await supabase
          .from('content_feedback_pins')
          .select('*')
          .in('post_id', postIds);
        if (pinsData) setPins(pinsData);
      }

      // 3. Busca os Planeamentos Aprovados (para vincular à arte)
      const { data: plans } = await supabase
        .from('content_planning')
        .select('*')
        .eq('project_id', activeProjectId)
        .eq('status', 'approved'); // Traz apenas os aprovados
      
      if (plans) setApprovedPlans(plans);

    } catch (error) {
      console.error("Erro ao carregar Fluxo Visual:", error);
      window.dispatchEvent(new CustomEvent("showToast", { detail: "Erro ao carregar as artes gráficas." }));
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // 2. LÓGICA DE SUBMISSÃO DE ARTE
  // ==========================================
  const handleCreatePost = async () => {
    if (!newPostImage || !activeProjectId || !currentProject) {
      window.dispatchEvent(new CustomEvent("showToast", { detail: "Selecione uma imagem e garanta que há um cliente ativo." }));
      return;
    }
    setIsProcessing(true);
    try {
      // 1. Prepara o nome do ficheiro e envia para o Storage (Bucket 'moodboard')
      const fileExt = newPostImage.name.split('.').pop();
      const fileName = `post_${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${currentProject.client_id}/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('moodboard').upload(filePath, newPostImage, { upsert: true });
      if (uploadError) throw uploadError;

      // 2. Pega o URL público da imagem enviada
      const { data: publicUrlData } = supabase.storage.from('moodboard').getPublicUrl(filePath);

      // 3. Cria o registo do Post na tabela social_posts
      const { error: dbError } = await supabase.from('social_posts').insert({
        project_id: activeProjectId,
        client_id: currentProject.client_id,
        image_url: publicUrlData.publicUrl,
        caption: newPostCaption,
        status: 'pending_approval' // Vai para a fila de aprovação do cliente
      });

      if (dbError) throw dbError;

      // 4. Se a arte for vinculada a uma ideia, marcamos a ideia como concluída
      if (selectedPlanId) {
        await supabase.from('content_planning').update({ status: 'completed' }).eq('id', selectedPlanId);
      }

      window.dispatchEvent(new CustomEvent("showToast", { detail: "Arte gráfica enviada para a mesa do cliente!" }));
      
      // Limpa os campos e recarrega a lista
      setNewPostImage(null); 
      setNewPostCaption(""); 
      setSelectedPlanId("");
      fetchVisualData(); 
    } catch (error) {
      console.error(error);
      window.dispatchEvent(new CustomEvent("showToast", { detail: "Erro ao criar post visual." }));
    } finally {
      setIsProcessing(false);
    }
  };

  // ==========================================
  // 3. LÓGICA DE ELIMINAÇÃO
  // ==========================================
  const handleDeletePost = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja apagar esta arte do fluxo?")) return;
    try {
      await supabase.from('social_posts').delete().eq('id', id);
      setPosts(posts.filter(p => p.id !== id));
      window.dispatchEvent(new CustomEvent("showToast", { detail: "Arte removida." }));
    } catch (error) {
      console.error(error);
    }
  };

  // Filtramos para mostrar apenas os posts que estão em fluxo ativo
  const visiblePosts = posts.filter(p => ['pending', 'pending_approval', 'needs_revision', 'approved'].includes(p.status));

  // Renderização de Loading Modular
  if (isLoading) {
    return (
      <div className="flex h-full min-h-[400px] items-center justify-center glass-panel bg-white/50 rounded-2xl border border-white">
        <Loader2 size={32} className="animate-spin text-[var(--color-atelier-terracota)]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row gap-6 h-full min-h-0 pb-4">
      
      {/* COLUNA ESQUERDA: FORMULÁRIO DE SUBMISSÃO */}
      <div className="w-full md:w-1/3 glass-panel bg-white/80 p-8 rounded-[2rem] flex flex-col gap-5 shadow-sm h-fit shrink-0 border border-white overflow-y-auto custom-scrollbar max-h-full">
        <div className="border-b border-[var(--color-atelier-grafite)]/5 pb-4 mb-2 shrink-0">
          <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">Submeter Arte</h3>
          <p className="font-roboto text-[11px] text-[var(--color-atelier-grafite)]/50 uppercase tracking-widest mt-1">Vincular Design ao Copy</p>
        </div>

        <div className="flex flex-col gap-1 shrink-0">
          <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1">Ideia Aprovada (Opcional)</span>
          <select value={selectedPlanId} onChange={(e) => setSelectedPlanId(e.target.value)} className="w-full bg-white border border-[var(--color-atelier-grafite)]/10 rounded-xl p-3 text-[12px] outline-none focus:border-[var(--color-atelier-terracota)]/50 shadow-sm">
            <option value="">Apenas fazer upload sem ideia prévia...</option>
            {approvedPlans.map(plan => (
              <option key={plan.id} value={plan.id}>"{plan.hook}" - {plan.pillar}</option>
            ))}
          </select>
        </div>
        
        <label className="w-full h-48 bg-white border-2 border-dashed border-[var(--color-atelier-grafite)]/20 hover:border-[var(--color-atelier-terracota)]/50 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-colors relative overflow-hidden group shadow-inner shrink-0 mt-2">
          <input type="file" accept="image/*,video/*" className="hidden" onChange={(e) => setNewPostImage(e.target.files?.[0] || null)} />
          {newPostImage ? (
            <img src={URL.createObjectURL(newPostImage)} className="w-full h-full object-cover" alt="Preview" />
          ) : (
            <>
              <UploadCloud size={32} className="text-[var(--color-atelier-grafite)]/30 mb-3 group-hover:scale-110 group-hover:text-[var(--color-atelier-terracota)] transition-all" />
              <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 group-hover:text-[var(--color-atelier-terracota)]">Upload da Arte Gráfica</span>
            </>
          )}
        </label>

        <div className="flex flex-col gap-1 flex-1 min-h-0 shrink-0 mt-2">
          <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1">Copy / Legenda</span>
          <textarea 
            placeholder="Escreva a copy que acompanha esta arte..." 
            value={newPostCaption} 
            onChange={(e) => setNewPostCaption(e.target.value)} 
            className="w-full bg-white border border-[var(--color-atelier-grafite)]/10 rounded-xl p-4 text-[13px] resize-none h-32 md:min-h-[120px] outline-none focus:border-[var(--color-atelier-terracota)]/50 custom-scrollbar shadow-sm" 
          />
        </div>

        <button 
          onClick={handleCreatePost} 
          disabled={isProcessing || !newPostImage} 
          className="w-full bg-[var(--color-atelier-grafite)] hover:bg-[var(--color-atelier-terracota)] text-white py-4 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50 shadow-md shrink-0"
        >
          {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Disparar para Cliente
        </button>
      </div>

      {/* COLUNA DIREITA: GALERIA DE FLUXO */}
      <div className="w-full md:w-2/3 flex flex-col gap-4 overflow-y-auto custom-scrollbar pr-2 pb-4">
        {visiblePosts.map(post => {
          // Filtra apenas os pinos referentes a este post específico
          const postPins = pins.filter(pin => pin.post_id === post.id);
          
          return (
            <div key={post.id} className="glass-panel bg-white/70 p-6 rounded-[2.5rem] flex flex-col md:flex-row gap-6 border border-white shadow-sm relative group shrink-0">
              {/* Botão de Excluir */}
              <button onClick={() => handleDeletePost(post.id)} className="absolute top-4 right-4 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity bg-white p-2 rounded-full shadow-md z-10">
                <Trash2 size={14}/>
              </button>
              
              {/* Imagem e Status */}
              <div className="w-32 h-40 rounded-2xl overflow-hidden shrink-0 border border-[var(--color-atelier-grafite)]/5 shadow-inner relative">
                <img src={post.image_url} alt="Post" className="w-full h-full object-cover" />
                <div className={`absolute top-2 left-2 backdrop-blur-md px-2 py-1 rounded text-[9px] font-bold uppercase tracking-widest border shadow-sm
                  ${post.status === 'approved' ? 'bg-green-500/90 border-green-400 text-white' : post.status === 'needs_revision' ? 'bg-orange-500/90 border-orange-400 text-white' : 'bg-black/60 border-white/20 text-white'}
                `}>
                  {post.status === 'approved' ? 'Aprovado' : post.status === 'needs_revision' ? 'Ajustes' : 'Pendente'}
                </div>
              </div>
              
              {/* Informações e Feedback */}
              <div className="flex flex-col flex-1 justify-center min-w-0">
                <p className="font-roboto text-[12px] text-[var(--color-atelier-grafite)]/80 leading-relaxed mb-4 truncate italic">
                  {post.caption?.substring(0, 80) || "Arte visual enviada sem legenda..."}
                </p>
                
                {postPins.length > 0 ? (
                  <div className="bg-[var(--color-atelier-creme)]/80 p-4 rounded-xl border border-[var(--color-atelier-terracota)]/20 shadow-sm mt-auto max-h-32 overflow-y-auto custom-scrollbar">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)] flex items-center gap-1.5 mb-2">
                      <MapPin size={12}/> Pinos do Cliente (Ajustes)
                    </span>
                    <ul className="flex flex-col gap-2">
                      {postPins.map((pin, i) => (
                        <li key={pin.id} className="text-[11px] text-[var(--color-atelier-grafite)] flex gap-2 items-start bg-white p-2 rounded-lg shadow-sm">
                          <span className="font-black text-[var(--color-atelier-terracota)] mt-0.5">{i + 1}.</span> {pin.comment}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="bg-white/50 p-4 rounded-xl border border-white flex items-center gap-2 justify-center opacity-60">
                    <Clock size={14}/> <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]">Aguardando revisão ou aprovado sem ajustes.</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        
        {/* Caso não existam posts visíveis */}
        {visiblePosts.length === 0 && (
          <div className="glass-panel bg-white/40 border border-white p-10 rounded-[2.5rem] flex flex-col items-center justify-center text-center h-[300px] shadow-sm shrink-0">
            <CheckCircle2 size={48} className="text-[var(--color-atelier-terracota)]/30 mb-4" />
            <p className="font-elegant text-3xl text-[var(--color-atelier-grafite)]/50">Fluxo Vazio</p>
            <p className="font-roboto text-sm text-[var(--color-atelier-grafite)]/40 mt-2">Nenhuma arte gráfica no fluxo ativo deste cliente.</p>
          </div>
        )}
      </div>
      
    </div>
  );
}