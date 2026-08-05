import React from 'react';

interface UserAvatarProps {
  profile: {
    nome?: string;
    avatar_url?: string;
    role?: string;
  } | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function UserAvatar({ profile, size = 'md', className = '' }: UserAvatarProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base'
  };

  const initial = profile?.nome?.charAt(0)?.toUpperCase() || '?';

  return (
    <div className={`shrink-0 rounded-full bg-[var(--color-atelier-terracota)]/20 border border-[var(--color-atelier-terracota)]/30 overflow-hidden flex items-center justify-center font-bold text-white/80 uppercase shadow-inner ${sizeClasses[size]} ${className}`}>
      {profile?.avatar_url ? (
        <img 
          src={profile.avatar_url} 
          alt={profile.nome || 'Avatar'} 
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
            if ((e.target as HTMLImageElement).parentElement) {
              (e.target as HTMLImageElement).parentElement!.innerText = initial;
            }
          }}
        />
      ) : (
        initial
      )}
    </div>
  );
}
