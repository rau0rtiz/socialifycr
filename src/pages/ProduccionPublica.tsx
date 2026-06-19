import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Loader2, Film, MapPin, Calendar, User as UserIcon, Lock } from 'lucide-react';

interface PublicSheetData {
  sheet: {
    id: string;
    title: string;
    shoot_date: string | null;
    location: string | null;
    call_time: string | null;
    producer_name: string | null;
    status: string;
    notes: string | null;
    updated_at: string;
  };
  client: { id: string; name: string; logo_url: string | null; primary_color: string | null } | null;
  team: Array<{ id: string; role: string; name: string }>;
  shots: Array<{
    id: string;
    scene_label: string | null;
    description: string;
    content_type: string | null;
    platform: string | null;
    concept: string | null;
    script: string | null;
    hook: string | null;
    cta: string | null;
    tech_notes: string | null;
    done: boolean;
    sort_order: number;
  }>;
  wardrobe: Array<{ id: string; item: string; done: boolean }>;
}

const CONTENT_TYPE_LABEL: Record<string, string> = {
  reel: '🎬 Reel',
  story: '📱 Story',
  post: '🖼️ Post',
  foto: '📷 Foto',
  tiktok: '🎵 TikTok',
  short: '▶️ Short',
  otro: '🎞️ Pieza',
};

const PLATFORM_LABEL: Record<string, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  linkedin: 'LinkedIn',
  multi: 'Multi-plataforma',
};

export default function ProduccionPublica() {
  const { token = '' } = useParams();
  const [data, setData] = useState<PublicSheetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: rpcData, error } = await supabase.rpc('get_public_production_sheet', { _token: token });
      if (error || !rpcData) {
        setNotFound(true);
      } else {
        setData(rpcData as unknown as PublicSheetData);
      }
      setLoading(false);
    })();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <Loader2 className="h-6 w-6 text-white/60 animate-spin" />
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <div className="mx-auto h-14 w-14 rounded-full bg-white/5 flex items-center justify-center mb-4">
            <Lock className="h-6 w-6 text-white/60" />
          </div>
          <h1 className="text-white text-xl font-serif mb-2">Link no disponible</h1>
          <p className="text-white/50 text-sm">
            Este link ya no está activo o nunca existió. Pedile a quien te lo envió que vuelva a habilitar el acceso.
          </p>
        </div>
      </div>
    );
  }

  const { sheet, client, team, shots, wardrobe } = data;
  const total = shots.length;
  const recorded = shots.filter((s) => s.done).length;
  const pct = total ? Math.round((recorded / total) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#f5f1e8] text-[#1a1a1a]">
      {/* HEADER / CLAQUETA */}
      <div className="bg-[#1a1a1a] text-[#f5f1e8] relative">
        <div className="h-1.5 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <div className="flex items-center gap-3 mb-5">
            {client?.logo_url ? (
              <img src={client.logo_url} alt={client.name} className="h-10 w-10 rounded-full object-cover ring-1 ring-white/20" />
            ) : null}
            <div className="text-[10px] tracking-[0.42em] uppercase text-amber-400 font-medium">
              Hoja de producción · {client?.name || ''}
            </div>
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl uppercase tracking-wide leading-tight">
            {sheet.title || 'Sin título'}
          </h1>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <Field icon={<Calendar className="h-3.5 w-3.5" />} label="Fecha">
              {sheet.shoot_date ? format(parseISO(sheet.shoot_date), "EEEE d 'de' MMMM", { locale: es }) : '—'}
            </Field>
            <Field icon={<MapPin className="h-3.5 w-3.5" />} label="Locación">
              {sheet.location || '—'}
            </Field>
            <Field icon={<UserIcon className="h-3.5 w-3.5" />} label="Responsable">
              {sheet.producer_name || '—'}
            </Field>
          </div>

          {total > 0 && (
            <div className="mt-8 flex items-end gap-4">
              <div>
                <div className="text-[10px] tracking-[0.4em] uppercase text-white/40">Grabadas</div>
                <div className="font-serif text-3xl sm:text-4xl text-[#f5f1e8] leading-none mt-1">
                  <span className="text-amber-400">{recorded}</span>
                  <span className="text-white/30"> / {total}</span>
                </div>
              </div>
              <div className="flex-1 mb-1">
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-400 transition-all" style={{ width: `${pct}%` }} />
                </div>
                <div className="text-[10px] tracking-[0.3em] uppercase text-white/40 mt-1.5">
                  {pct}% completado
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CONTENT */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-10">

        {/* PIEZAS */}
        <section>
          <SectionHeader badge="Piezas" title="Contenido a grabar" />
          {shots.length === 0 ? (
            <div className="border border-dashed border-black/15 rounded-2xl p-10 text-center">
              <Film className="h-8 w-8 mx-auto text-black/40 mb-2" />
              <p className="text-black/50 text-sm">Aún no hay piezas en esta hoja.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {shots.map((shot, idx) => (
                <article
                  key={shot.id}
                  className={`rounded-2xl border bg-white shadow-sm transition ${
                    shot.done ? 'border-emerald-200 opacity-75' : 'border-black/10'
                  }`}
                >
                  <div className="p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] tracking-[0.3em] uppercase bg-black text-[#f5f1e8] rounded-full px-2.5 py-1 font-semibold">
                          #{String(idx + 1).padStart(2, '0')}
                        </span>
                        {shot.content_type && (
                          <span className="text-[11px] tracking-wide font-medium text-black/70 bg-black/5 rounded-full px-2.5 py-1">
                            {CONTENT_TYPE_LABEL[shot.content_type] || CONTENT_TYPE_LABEL.otro}
                          </span>
                        )}
                        {shot.platform && (
                          <span className="text-[11px] tracking-wide font-medium text-amber-700 bg-amber-100 rounded-full px-2.5 py-1">
                            {PLATFORM_LABEL[shot.platform] || shot.platform}
                          </span>
                        )}
                        {shot.scene_label && (
                          <span className="text-[11px] text-black/50">{shot.scene_label}</span>
                        )}
                      </div>
                      {shot.done && (
                        <span className="text-[10px] tracking-[0.3em] uppercase text-emerald-700 font-semibold">✓ Grabada</span>
                      )}
                    </div>

                    {(shot.concept || shot.description) && (
                      <h3 className="font-serif text-lg sm:text-xl text-black leading-snug mb-3">
                        {shot.concept || shot.description}
                      </h3>
                    )}

                    <div className="space-y-3 text-sm">
                      {shot.hook && <FieldRow label="Hook">{shot.hook}</FieldRow>}
                      {shot.script && <FieldRow label="Guión">{shot.script}</FieldRow>}
                      {shot.cta && <FieldRow label="CTA">{shot.cta}</FieldRow>}
                      {shot.tech_notes && <FieldRow label="Notas técnicas">{shot.tech_notes}</FieldRow>}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* EQUIPO */}
        {team.length > 0 && (
          <section>
            <SectionHeader badge="Equipo" title="Quien produce" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {team.map((m) => (
                <div key={m.id} className="bg-white border border-black/10 rounded-xl p-3">
                  <div className="text-[10px] tracking-[0.3em] uppercase text-black/40">{m.role}</div>
                  <div className="text-sm font-medium text-black mt-0.5">{m.name}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* VESTUARIO */}
        {wardrobe.length > 0 && (
          <section>
            <SectionHeader badge="Vestuario" title="Lista de wardrobe" />
            <ul className="bg-white border border-black/10 rounded-xl divide-y divide-black/5">
              {wardrobe.map((w) => (
                <li key={w.id} className="px-4 py-3 flex items-center gap-3 text-sm">
                  <span
                    className={`h-4 w-4 rounded border ${
                      w.done ? 'bg-emerald-500 border-emerald-500' : 'border-black/30'
                    }`}
                  />
                  <span className={w.done ? 'line-through text-black/40' : 'text-black'}>{w.item}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* NOTAS */}
        {sheet.notes && (
          <section>
            <SectionHeader badge="Notas" title="Apuntes del día" />
            <div className="bg-white border border-black/10 rounded-xl p-4 sm:p-5 whitespace-pre-wrap text-sm text-black/80 leading-relaxed">
              {sheet.notes}
            </div>
          </section>
        )}

        <footer className="pt-6 pb-2 text-center text-[11px] tracking-[0.3em] uppercase text-black/30">
          Vista compartida · Solo lectura
        </footer>
      </div>
    </div>
  );
}

function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-white/15 pb-2">
      <div className="flex items-center gap-1.5 text-[10px] tracking-[0.3em] uppercase text-white/40 mb-1">
        {icon} {label}
      </div>
      <div className="text-[#f5f1e8] capitalize">{children}</div>
    </div>
  );
}

function SectionHeader({ badge, title }: { badge: string; title: string }) {
  return (
    <div className="mb-4">
      <span className="inline-block text-[10px] tracking-[0.4em] uppercase border border-black text-black rounded-full px-3 py-1">
        {badge}
      </span>
      <h2 className="font-serif text-2xl sm:text-3xl text-black mt-2">{title}</h2>
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] tracking-[0.3em] uppercase text-black/40 mb-0.5">{label}</div>
      <div className="text-black/80 whitespace-pre-wrap leading-relaxed">{children}</div>
    </div>
  );
}
