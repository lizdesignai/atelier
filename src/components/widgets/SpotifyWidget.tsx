// src/components/widgets/SpotifyWidget.tsx
import React from 'react';

// Criamos uma interface para dizer que este widget pode receber um link diferente para cada cliente
interface SpotifyWidgetProps {
  spotifyUrl: string;
}

export default function SpotifyWidget({ spotifyUrl }: SpotifyWidgetProps) {
  return (
    <div className="bg-atelier-creme/80 backdrop-blur-md rounded-3xl p-6 shadow-lg border border-atelier-rose/20 h-full flex flex-col">
      <h3 className="text-lg font-elegant text-atelier-terracota mb-4 flex items-center gap-2">
        A Trilha Sonora da sua Marca
      </h3>
      
      {/* O iframe é a janela mágica que traz o player do Spotify para dentro do nosso site */}
      <div className="flex-1 rounded-2xl overflow-hidden shadow-inner">
        <iframe 
          src={spotifyUrl} 
          width="100%" 
          height="100%" 
          frameBorder="0" 
          allowFullScreen 
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          className="rounded-2xl"
        ></iframe>
      </div>
    </div>
  );
}