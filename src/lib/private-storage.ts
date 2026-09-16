import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Archivos sensibles de la agencia viven en el bucket privado `agency-private`.
 * En la base de datos se guarda una referencia `agency-private:<ruta>` en vez de
 * una URL pública, y la UI la resuelve con un enlace firmado temporal.
 */
export const PRIVATE_BUCKET = 'agency-private';
export const PRIVATE_PREFIX = `${PRIVATE_BUCKET}:`;

export const isPrivateRef = (value?: string | null): value is string =>
  !!value && value.startsWith(PRIVATE_PREFIX);

export const privateRef = (path: string) => `${PRIVATE_PREFIX}${path}`;
export const privatePath = (ref: string) => ref.slice(PRIVATE_PREFIX.length);

/** Firma en lote las referencias privadas y devuelve un mapa ref -> URL temporal. */
export const usePrivateUrls = (refs: (string | null | undefined)[]) => {
  const unique = Array.from(new Set(refs.filter(isPrivateRef)));

  const { data } = useQuery({
    queryKey: ['private-urls', unique.slice().sort().join('|')],
    queryFn: async () => {
      const map: Record<string, string> = {};
      if (!unique.length) return map;
      const { data, error } = await supabase.storage
        .from(PRIVATE_BUCKET)
        .createSignedUrls(unique.map(privatePath), 60 * 60);
      if (error) {
        console.error('No se pudieron firmar los archivos privados:', error);
        return map;
      }
      (data ?? []).forEach((item) => {
        if (item.path && item.signedUrl) map[privateRef(item.path)] = item.signedUrl;
      });
      return map;
    },
    enabled: unique.length > 0,
    staleTime: 45 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  return (value?: string | null): string | null => {
    if (!value) return null;
    if (!isPrivateRef(value)) return value;
    return data?.[value] ?? null;
  };
};
