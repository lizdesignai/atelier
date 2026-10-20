import React, { useState } from 'react';
import { getSafeAvatarUrl, handleAvatarError } from '@/lib/imageUtils';

interface UserAvatarProps {
  profile: {
    nome?: string;
    avatar_url?: string;
    role?: string;
    current_mood?: string;
  } | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function UserAvatar({ profile, size = 'md', className = '' }: UserAvatarProps) {
  const [imgError, setImgError] = useState(false);

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base'
  };

  const moodMap: Record<string, string> = {
    focado: '🚀',
    cansado: '☕',
    criativo: '💡',
    animado: '🎉',
    caotico: '🌪️',
    zen: '🧘'
  };

  const name = profile?.nome || 'Studio Veronna';
  const initial = profile?.nome ? profile.nome.trim().charAt(0)?.toUpperCase() : 'V';
  const moodEmoji = profile?.current_mood ? moodMap[profile.current_mood.toLowerCase()] : null;

  const emojiSizeMap = {
    sm: { fontSize: '100%', offset: '-bottom-1.5 -right-1.5' },
    md: { fontSize: '130%', offset: '-bottom-1 -right-1' },
    lg: { fontSize: '160%', offset: '-bottom-0.5 -right-0.5' }
  };
  const currentEmojiConfig = emojiSizeMap[size];

  const resolvedAvatarUrl = profile?.avatar_url 
    ? getSafeAvatarUrl(profile.avatar_url, name) 
    : profile?.nome 
      ? getSafeAvatarUrl(null, name) 
      : null;

  return (
    <div className="relative inline-flex shrink-0">
      <div className={`shrink-0 rounded-full bg-[var(--color-atelier-terracota)]/20 border border-[var(--color-atelier-terracota)]/30 overflow-hidden flex items-center justify-center font-bold text-white/80 uppercase shadow-inner ${sizeClasses[size]} ${className}`}>
        {resolvedAvatarUrl && !imgError ? (
          <img 
            src={resolvedAvatarUrl} 
            alt={name} 
            className="w-full h-full object-cover"
            onError={(e) => {
              handleAvatarError(e, name);
              setImgError(false);
            }}
          />
        ) : (
          initial
        )}
      </div>

      {moodEmoji && (
        <div 
          className={`absolute ${currentEmojiConfig.offset} flex items-center justify-center z-10`}
          style={{ fontSize: currentEmojiConfig.fontSize, filter: 'drop-shadow(0px 2px 3px rgba(0,0,0,0.2))' }}
          title={profile?.current_mood}
        >
          {moodEmoji}
        </div>
      )}
    </div>
  );
}
