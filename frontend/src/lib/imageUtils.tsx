import React, { useState } from 'react';
import { ImageIcon } from 'lucide-react';

/**
 * Normaliza qualquer URL de imagem do sistema.
 * Converte referências antigas do Supabase Storage para o endpoint interno /api/storage/file/ (Neon)
 */
export function normalizeImageUrl(url?: any, label?: string): string {
  if (!url || typeof url !== 'string') return '';

  // Se for URL legada do Supabase Storage
  if (url.includes('supabase.co/storage/v1/object/')) {
    const match = url.match(/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/(.+)$/);
    if (match) {
      const bucket = match[1];
      const cleanPath = match[2].split('?')[0];
      return `/api/storage/file/${bucket}/${cleanPath}`;
    }
  }

  // Já é URL do proxy
  if (url.startsWith('/api/storage/instagram-photo')) {
    return url;
  }

  // Se for CDN temporário/expirado do Instagram/Meta
  if (url.includes('fbcdn.net') || url.includes('cdninstagram.com')) {
    const enc = encodeURIComponent(url);
    const lbl = label ? `&label=${encodeURIComponent(label)}` : '';
    return `/api/storage/instagram-photo?url=${enc}${lbl}`;
  }

  return url;
}

/**
 * Retorna uma URL segura para Avatar, com fallback garantido do ui-avatars.com
 */
export function getSafeAvatarUrl(avatarUrl?: string | null, name?: string | null): string {
  const encodedName = encodeURIComponent(name || 'Studio Veronna');
  const fallback = `https://ui-avatars.com/api/?name=${encodedName}&background=a45a33&color=fff&bold=true`;

  if (!avatarUrl) return fallback;

  const normalized = normalizeImageUrl(avatarUrl);
  return normalized || fallback;
}

export function getSafeImageUrl(url?: string | null, label?: string): string {
  return normalizeImageUrl(url, label);
}

export function handleAvatarError(
  e: React.SyntheticEvent<HTMLImageElement, Event>,
  name?: string
) {
  const target = e.currentTarget;
  const encodedName = encodeURIComponent(name || 'Studio Veronna');
  const fallback = `https://ui-avatars.com/api/?name=${encodedName}&background=a45a33&color=fff&bold=true`;
  if (target.src !== fallback) {
    target.src = fallback;
  }
}

export function handleImageFallbackError(
  e: React.SyntheticEvent<HTMLImageElement, Event>,
  fallbackSrc?: string
) {
  const target = e.currentTarget;
  const fallback = fallbackSrc || `/api/storage/instagram-photo?label=${encodeURIComponent('Post')}`;
  if (target.src !== fallback) {
    target.src = fallback;
  }
}

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackText?: string;
  fallbackIcon?: React.ReactNode;
}

export function SafeImage({
  src,
  alt = '',
  className = '',
  fallbackText,
  fallbackIcon,
  onError,
  ...props
}: SafeImageProps) {
  const [hasError, setHasError] = useState(false);
  const normalizedSrc = normalizeImageUrl(src);

  if (hasError || !normalizedSrc) {
    return (
      <div className={`flex flex-col items-center justify-center bg-gray-100 text-gray-400 p-2 text-center select-none ${className}`}>
        {fallbackIcon || <ImageIcon size={24} className="mb-1 opacity-50" />}
        {fallbackText && <span className="text-[10px] font-medium leading-tight">{fallbackText}</span>}
      </div>
    );
  }

  return (
    <img
      src={normalizedSrc}
      alt={alt}
      className={className}
      onError={(e) => {
        setHasError(true);
        if (onError) onError(e);
      }}
      {...props}
    />
  );
}
