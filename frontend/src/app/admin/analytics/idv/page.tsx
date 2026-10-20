"use client";
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function IDVMetricsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/tessera/idv-intel');
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <Loader2 className="animate-spin text-[var(--color-atelier-terracota)]" size={40} />
    </div>
  );
}
