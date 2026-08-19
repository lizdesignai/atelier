"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "../../lib/supabase";
import { Music, Headphones, Plus, Trash2, Smile, X, Link as LinkIcon, Edit3, Loader2 } from "lucide-react";

export const MOOD_OPTIONS = [
  { id: 'focado', icon: '🚀', label: 'Modo Foguete (Focado)' },
  { id: 'cansado', icon: '☕', label: 'Movido a Café (Cansado)' },
  { id: 'criativo', icon: '💡', label: 'Cérebro Fritando (Criativo)' },
  { id: 'animado', icon: '🎉', label: 'Sextou (Animado)' },
  { id: 'caotico', icon: '🌪️', label: 'Caótico (Correria)' },
  { id: 'zen', icon: '🧘', label: 'Paz Interior (Zen)' },
];

export function extractSpotifyId(url: string) {
  if (!url) return null;
  const trackRegex = /track\/([a-zA-Z0-9]+)/;
  const match = url.match(trackRegex);
  return match ? match[1] : null;
}

export default function DailyJamDropdown({ userProfile, onClose }: { userProfile: any, onClose: () => void }) {
  const [jamMembers, setJamMembers] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [selectedMood, setSelectedMood] = useState(userProfile?.current_mood || '');
  const [songUrl, setSongUrl] = useState(userProfile?.current_song_url || '');

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.trim().length > 2) {
        searchSpotify(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const searchSpotify = async (query: string) => {
    setIsSearching(true);
    try {
      const res = await fetch(`/api/spotify/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.tracks) {
        setSearchResults(data.tracks);
      } else if (data.error) {
        setSearchResults([]);
        console.error("Spotify API Error:", data.error);
        // Only show toast if it's the missing credentials error, to avoid spam
        if (data.error.includes('configuradas')) {
          window.dispatchEvent(new CustomEvent("showToast", { detail: "Configure as chaves do Spotify no .env.local" }));
        }
      }
    } catch(e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  }

  useEffect(() => {
    fetchJamMembers();
    
    const channel = supabase.channel('profiles-jam')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, () => {
        fetchJamMembers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    }
  }, []);

  const fetchJamMembers = async () => {
    const { data } = await supabase.from('profiles').select('*').order('nome');
    if (data) {
      const activeMembers = data.filter(p => p.current_mood || p.current_song_id);
      setJamMembers(activeMembers);
    }
    setIsLoading(false);
  }
  
  const handleSave = async () => {
    setIsSaving(true);
    const spotifyId = extractSpotifyId(songUrl);
    
    try {
      const { error } = await supabase.from('profiles').update({
        current_mood: selectedMood || null,
        current_song_id: spotifyId || extractSpotifyId(songUrl) || null // fallback para URL caso o spotifyId state seja null
      }).eq('id', userProfile.id);
      
      if (error) throw error;
      
      setIsEditing(false);
      window.dispatchEvent(new CustomEvent("showToast", { detail: "Vibe atualizada com sucesso!" }));
    } catch (e) {
      console.error(e);
      window.dispatchEvent(new CustomEvent("showToast", { detail: "Erro ao salvar. Verifique se as colunas existem no BD." }));
    } finally {
      setIsSaving(false);
    }
  }

  const handleClear = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase.from('profiles').update({
        current_mood: null,
        current_song_id: null
      }).eq('id', userProfile.id);
      
      if (error) throw error;
      
      setSelectedMood('');
      setSongUrl('');
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  }

  const currentUserJam = jamMembers.find(m => m.id === userProfile?.id);
  const showEditState = isEditing || (!currentUserJam?.current_mood && !currentUserJam?.current_song_id);

  return (
    <motion.div 
      initial={{ opacity: 0, y: -10, scale: 0.98 }} 
      animate={{ opacity: 1, y: 8, scale: 1 }} 
      exit={{ opacity: 0, y: -5, scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="absolute right-0 md:right-16 top-full w-[calc(100vw-2rem)] max-w-[340px] md:w-[340px] bg-white/95 backdrop-blur-2xl border border-white/40 rounded-[2rem] shadow-[0_20px_40px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col z-50 pointer-events-auto"
    >
      <div className="px-5 py-4 border-b border-[var(--color-atelier-grafite)]/5 flex justify-between items-center bg-gray-50/50">
        <div className="flex items-center gap-2">
          <Headphones size={18} className="text-[var(--color-atelier-terracota)]" />
          <h3 className="font-elegant text-lg text-[var(--color-atelier-grafite)] leading-none">Daily Jam</h3>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-red-500 bg-white shadow-sm p-1.5 rounded-full transition-colors">
          <X size={14} />
        </button>
      </div>
      
      <div className="max-h-[60vh] overflow-y-auto custom-scrollbar flex flex-col">
        {/* MY VIBE SECTION */}
        <div className="p-5 border-b border-gray-100 bg-white">
          <div className="flex justify-between items-center mb-3">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/40">Sua Vibe Hoje</span>
            {!showEditState && (
              <button onClick={() => setIsEditing(true)} className="text-[10px] flex items-center gap-1 text-[var(--color-atelier-terracota)] hover:underline font-bold uppercase tracking-widest">
                <Edit3 size={10} /> Editar
              </button>
            )}
          </div>

          {showEditState ? (
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-[11px] font-bold text-gray-700 mb-2 block">Humor Atual</label>
                <div className="grid grid-cols-2 gap-2">
                  {MOOD_OPTIONS.map(mood => (
                    <button
                      key={mood.id}
                      onClick={() => setSelectedMood(mood.id)}
                      className={`text-left px-3 py-2 rounded-xl text-xs flex items-center gap-2 border transition-all ${selectedMood === mood.id ? 'border-[var(--color-atelier-terracota)] bg-[var(--color-atelier-terracota)]/5 text-[var(--color-atelier-terracota)]' : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-300'}`}
                    >
                      <span className="text-lg">{mood.icon}</span>
                      <span className="font-medium leading-tight">{mood.label.split(' (')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-700 mb-2 flex items-center gap-1">
                  <Music size={12} /> Qual a boa de hoje?
                </label>
                
                {songUrl ? (
                  <div className="flex items-center justify-between bg-[var(--color-atelier-terracota)]/10 border border-[var(--color-atelier-terracota)]/20 rounded-xl p-2 pl-3">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <Music size={14} className="text-[var(--color-atelier-terracota)] shrink-0" />
                      <span className="text-[11px] text-[var(--color-atelier-grafite)] font-bold truncate">Música Selecionada</span>
                    </div>
                    <button onClick={() => setSongUrl('')} className="text-gray-400 hover:text-red-500 p-1 bg-white rounded-lg shadow-sm border border-gray-100">
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <input 
                      type="text" 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Pesquisar música no Spotify..."
                      className="w-full text-xs px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-[var(--color-atelier-terracota)] bg-gray-50/50 transition-colors"
                    />
                    {isSearching && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-atelier-terracota)]">
                        <Loader2 size={14} className="animate-spin" />
                      </div>
                    )}
                    
                    {searchResults.length > 0 && !songUrl && (
                      <div className="absolute top-full left-0 w-full mt-1 bg-white border border-gray-100 rounded-xl shadow-lg max-h-[160px] overflow-y-auto z-10 custom-scrollbar">
                        {searchResults.map(track => (
                          <button
                            key={track.id}
                            onClick={() => {
                              setSongUrl(track.url);
                              setSearchQuery('');
                              setSearchResults([]);
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2 border-b border-gray-50 last:border-0 transition-colors"
                          >
                            <img src={track.albumArt} alt="Capa" className="w-8 h-8 rounded-md object-cover shadow-sm border border-gray-100" />
                            <div className="flex flex-col min-w-0">
                              <span className="text-[11px] font-bold text-gray-800 truncate">{track.name}</span>
                              <span className="text-[9px] text-gray-500 truncate">{track.artist}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-2 mt-2">
                <button onClick={handleSave} disabled={isSaving} className="flex-1 bg-black text-white rounded-xl py-2.5 text-[11px] font-bold uppercase tracking-widest flex justify-center items-center gap-2 hover:bg-gray-800 transition-colors disabled:opacity-50">
                  {isSaving ? <Loader2 size={14} className="animate-spin" /> : 'Salvar Vibe'}
                </button>
                {(selectedMood || songUrl) && (
                  <button onClick={handleClear} disabled={isSaving} className="w-10 flex-shrink-0 bg-red-50 text-red-500 rounded-xl flex items-center justify-center hover:bg-red-100 transition-colors">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex gap-3 items-start">
              <div className="w-12 h-12 rounded-2xl overflow-hidden shrink-0 shadow-sm border border-gray-100">
                {userProfile?.avatar_url ? (
                  <img src={userProfile.avatar_url} alt="You" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-500 text-lg font-bold">{userProfile?.nome?.charAt(0)}</div>
                )}
              </div>
              <div className="flex flex-col flex-1 w-full min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm text-gray-900">{userProfile?.nome.split(' ')[0]}</span>
                  {currentUserJam?.current_mood && (
                    <span className="text-sm" title={MOOD_OPTIONS.find(m => m.id === currentUserJam.current_mood)?.label}>
                      {MOOD_OPTIONS.find(m => m.id === currentUserJam.current_mood)?.icon}
                    </span>
                  )}
                </div>
                {currentUserJam?.current_song_id ? (
                  <div className="mt-2 w-full h-[80px] rounded-xl overflow-hidden bg-white shadow-sm border border-gray-100">
                    <iframe src={`https://open.spotify.com/embed/track/${currentUserJam.current_song_id}?utm_source=generator&theme=0`} width="100%" height="80" frameBorder="0" allowFullScreen allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>
                  </div>
                ) : (
                  <span className="text-xs text-gray-400 mt-1">Nenhuma música escolhida</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* TEAM JAM SECTION */}
        <div className="p-5 bg-gray-50/50 flex-1 min-h-[150px]">
          <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/40 mb-4 block">Fila da Equipe</span>
          
          {isLoading ? (
            <div className="flex justify-center py-6"><Loader2 size={20} className="animate-spin text-[var(--color-atelier-terracota)]" /></div>
          ) : jamMembers.filter(m => m.id !== userProfile?.id).length === 0 ? (
            <div className="text-center py-6 text-xs text-[var(--color-atelier-grafite)]/40 flex flex-col items-center">
              <Smile size={24} className="mb-2 opacity-30" />
              Ninguém mais compartilhou a vibe hoje.
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {jamMembers.filter(m => m.id !== userProfile?.id).map(member => (
                <div key={member.id} className="flex gap-3 items-start">
                  <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 shadow-sm border border-white">
                    {member.avatar_url ? (
                      <img src={member.avatar_url} alt={member.nome} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center text-[var(--color-atelier-grafite)] text-xs font-bold">{member.nome?.charAt(0)}</div>
                    )}
                  </div>
                  <div className="flex flex-col flex-1 w-full min-w-0">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="font-bold text-xs text-[var(--color-atelier-grafite)] truncate">{member.nome.split(' ')[0]}</span>
                      {member.current_mood && (
                        <span className="text-xs" title={MOOD_OPTIONS.find(m => m.id === member.current_mood)?.label}>
                          {MOOD_OPTIONS.find(m => m.id === member.current_mood)?.icon}
                        </span>
                      )}
                    </div>
                    {member.current_song_id && (
                      <div className="w-full h-[80px] rounded-xl overflow-hidden bg-white border border-[var(--color-atelier-grafite)]/10 shadow-sm">
                        <iframe src={`https://open.spotify.com/embed/track/${member.current_song_id}?utm_source=generator&theme=0`} width="100%" height="80" frameBorder="0" allowFullScreen allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
