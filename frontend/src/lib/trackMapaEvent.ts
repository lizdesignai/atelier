// src/lib/trackMapaEvent.ts

export type MapaEventName = 
  | 'sprint_started'
  | 'video_watched'
  | 'micro_check_completed'
  | 'pdf_downloaded'
  | 'task_completed'
  | 'evidence_submitted'
  | 'checkpoint_attempted'
  | 'checkpoint_passed'
  | 'sprint_completed'
  | 'mapa_verified'
  | 'share_card_downloaded';

export interface MapaEventProperties {
  sprint_id?: number | string;
  ipd_atual?: number;
  duracao?: string | number;
  score?: number;
  dimensao?: string;
  task_id?: string;
  tipo?: string;
  tentativa?: number;
  tempo_total?: number;
  ipd_inicial?: number;
  ipd_final?: number;
  delta?: number;
  [key: string]: any;
}

/**
 * Tracks an event in the Mapa 4D journey.
 * Uses console.log for development. Can be easily swapped with PostHog, Mixpanel, etc.
 */
export const trackMapaEvent = (eventName: MapaEventName, properties?: MapaEventProperties) => {
  // In production, this would send to your analytics provider
  // e.g. posthog.capture(eventName, properties);
  // ou mixpanel.track(eventName, properties);
  // ou fetch('/api/analytics/track', { ... })
  
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[Analytics] 📊 Evento Trackeado: ${eventName}`, properties || {});
  } else {
    // Falso envio para manter logs de prod limpos se ainda não houver provedor
    // console.log(`[Analytics] ${eventName}`);
  }
};
