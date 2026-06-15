// src/hooks/usePresenceTracker.ts
import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

// Configurações do Motor (Ajustáveis)
const IDLE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutos para ser considerado Inativo
const HEARTBEAT_INTERVAL_MS = 60 * 1000; // Ping a cada 60 segundos no DB
const THROTTLE_MS = 2000; // Limite de 2 segundos entre leituras de movimento (Proteção de CPU)

export type PresenceStatus = 'online' | 'idle' | 'offline';

export function usePresenceTracker(userId: string | null | undefined) {
  const [currentStatus, setCurrentStatus] = useState<PresenceStatus>('offline');
  
  const statusRef = useRef<PresenceStatus>('offline');
  const lastLoggedStatusRef = useRef<PresenceStatus | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);
  const presenceChannelRef = useRef<any>(null); // 🟢 Referência do WebSocket

  // 1. MOTOR DE COMUNICAÇÃO COM O BANCO E WEBSOCKET
  const syncPresence = useCallback(async (newStatus: PresenceStatus) => {
    if (!userId) return;

    try {
      const nowIso = new Date().toISOString();

      // A. Sincroniza via WebSocket (Supabase Presence) para as telas Live
      if (presenceChannelRef.current) {
        await presenceChannelRef.current.track({
          user_id: userId,
          status: newStatus,
          last_seen: nowIso
        });
      }

      // B. Atualiza o perfil no PostgreSQL
      await supabase.from('profiles').update({ 
        current_status: newStatus, 
        last_seen: nowIso 
      }).eq('id', userId);

      // C. Registo Histórico de Mudança de Estado
      if (newStatus !== lastLoggedStatusRef.current) {
        await supabase.from('attendance_logs').insert({
          user_id: userId,
          status: newStatus,
          date_log: nowIso.split('T')[0]
        });
        lastLoggedStatusRef.current = newStatus;
      }
    } catch (error) {
      console.error("[Telemetry Engine] Erro ao sincronizar presença:", error);
    }
  }, [userId]);

  // Atualizador de Estado Duplo
  const updateStatus = useCallback((newStatus: PresenceStatus) => {
    if (statusRef.current !== newStatus) {
      statusRef.current = newStatus;
      setCurrentStatus(newStatus);
      syncPresence(newStatus);
    }
  }, [syncPresence]);

  // 2. SENSOR DE INATIVIDADE (Idle Detection)
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    
    idleTimerRef.current = setTimeout(() => {
      console.log("[Telemetry Engine] Inatividade detectada. Alterando para 'idle'.");
      updateStatus('idle');
    }, IDLE_TIMEOUT_MS);
  }, [updateStatus]);

  const handleUserActivity = useCallback(() => {
    const now = Date.now();
    if (now - lastActivityRef.current < THROTTLE_MS) return;
    
    lastActivityRef.current = now;

    if (statusRef.current !== 'online') {
      updateStatus('online');
    }
    
    resetIdleTimer();
  }, [resetIdleTimer, updateStatus]);

  // 3. ORQUESTRAÇÃO DE CICLO DE VIDA (Mount / Unmount)
  useEffect(() => {
    if (!userId) return;

    console.log("[Telemetry Engine] Inicializando Presence e Banco de Dados...");

    // 🟢 INICIALIZA O CANAL DE WEBSOCKET (Supabase Presence)
    const channel = supabase.channel('atelier-presence', {
      config: {
        presence: { key: userId },
      },
    });

    channel.on('presence', { event: 'sync' }, () => {
      // Opcional: Aqui poderíamos ler o estado de todos os outros usuários conectados
      // const newState = channel.presenceState();
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        presenceChannelRef.current = channel;
        // Ao confirmar a conexão WebSocket, damos o Start Inicial
        updateStatus('online');
        resetIdleTimer();
      }
    });

    // Inicia o Heartbeat de Banco de Dados
    heartbeatTimerRef.current = setInterval(() => {
      syncPresence(statusRef.current);
    }, HEARTBEAT_INTERVAL_MS);

    // Conecta os sensores de movimento
    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    window.addEventListener('scroll', handleUserActivity);
    window.addEventListener('click', handleUserActivity);

    // Graceful Shutdown
    const handleBeforeUnload = () => {
      updateStatus('offline');
      if (presenceChannelRef.current) presenceChannelRef.current.untrack();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup
    return () => {
      console.log("[Telemetry Engine] Motor desligado.");
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
      
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('scroll', handleUserActivity);
      window.removeEventListener('click', handleUserActivity);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      updateStatus('offline');
      if (presenceChannelRef.current) {
        presenceChannelRef.current.untrack();
        supabase.removeChannel(presenceChannelRef.current);
      }
    };
  }, [userId, handleUserActivity, resetIdleTimer, updateStatus, syncPresence]);

  return currentStatus;
}