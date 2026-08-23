import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Lock, FileText } from 'lucide-react';
import { ShareStoryPanel } from '@/components/producciones/ShareStoryPanel';
import { buildStoryReceipt } from '@/lib/story-receipt';

export default function ReciboPublico() {
  const { token = '' } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: rpcData, error } = await supabase.rpc('get_public_production_sheet', { _token: token });
      if (error || !rpcData) setNotFound(true);
      else setData(rpcData);
      setLoading(false);
    })();
  }, [token]);

  const receipt = useMemo(() => {
    if (!data?.sheet) return null;
    return buildStoryReceipt({
      sheetId: data.sheet.id,
      title: data.sheet.title,
      shootDate: data.sheet.shoot_date,
      clientName: data.client?.name,
      clientLogo: data.client?.logo_url,
      shots: data.shots || [],
    });
  }, [data]);

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center" style={{ background: '#f5f0e6' }}>
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: '#e85d3a' }} />
      </div>
    );
  }

  if (notFound || !receipt) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center px-6" style={{ background: '#f5f0e6' }}>
        <div className="text-center max-w-sm">
          <div className="mx-auto h-14 w-14 rounded-full flex items-center justify-center mb-4" style={{ background: 'rgba(26,26,26,0.06)' }}>
            <Lock className="h-6 w-6" style={{ color: '#8b7355' }} />
          </div>
          <h1 className="text-2xl mb-2" style={{ color: '#1a1a1a', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}>
            Link no disponible
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: '#8b7355' }}>
            Este recibo ya no está activo o nunca existió.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-[100dvh] px-4 py-10"
      style={{ background: '#f5f0e6', fontFamily: "'Space Grotesk', sans-serif" }}
    >
      <div className="mx-auto max-w-lg">
        <div className="text-center mb-7">
          <div className="text-[10px] tracking-[0.4em] uppercase font-bold" style={{ color: '#e85d3a' }}>
            Socialify
          </div>
          <h1 className="text-3xl sm:text-4xl mt-2" style={{ color: '#1a1a1a', fontWeight: 700, letterSpacing: '-0.02em' }}>
            Tu recibo de producción
          </h1>
          <p className="text-sm mt-2" style={{ color: '#8b7355' }}>
            {receipt.dateLabel} · {receipt.pieces.length} pieza{receipt.pieces.length !== 1 ? 's' : ''} grabada{receipt.pieces.length !== 1 ? 's' : ''}
          </p>
        </div>

        <ShareStoryPanel data={receipt} />

        <div className="mt-8 text-center">
          <Link
            to={`/produccion-publica/${token}`}
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest"
            style={{ color: '#8b7355' }}
          >
            <FileText className="h-3.5 w-3.5" /> Ver la hoja completa
          </Link>
        </div>
      </div>
    </div>
  );
}
