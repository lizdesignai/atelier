// src/lib/dateUtils.ts

/**
 * Converte um ISO string ou objeto Date para a string aceita por <input type="datetime-local"> (YYYY-MM-DDTHH:mm),
 * compensando corretamente o fuso horário local do navegador para que a hora exibida seja exatamente a hora local intencionada.
 */
export const formatForDateTimeLocal = (dateInput: string | Date | null | undefined): string => {
  if (!dateInput) return "";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "";
  
  // Compensar o offset em minutos para manter o horário local exato ao fatiar o ISO
  const localDate = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
};

/**
 * Converte a string vinda de <input type="datetime-local"> (YYYY-MM-DDTHH:mm) em uma ISO String em UTC válida para envio ao Supabase / Backend.
 */
export const parseFromDateTimeLocal = (localString: string | null | undefined): string => {
  if (!localString) return "";
  const d = new Date(localString);
  if (isNaN(d.getTime())) return "";
  return d.toISOString();
};
