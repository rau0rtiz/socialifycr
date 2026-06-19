import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Loader2, Film, MapPin, Calendar, User as UserIcon, Lock, CheckCircle2 } from 'lucide-react';

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
      <div className="noeval-scope min-h-[100dvh] flex items-center justify-center">
        <Loader2 className="h-6 w-6 text-noeval-accent animate-spin" />
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="noeval-scope min-h-[100dvh] flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <div className="mx-auto h-14 w-14 rounded-full bg-noeval-ink/5 flex items-center justify-center mb-4">
            <Lock className="h-6 w-6 text-noeval-muted" />
          </div>
          <h1 className="font-serif text-2xl text-noeval-ink mb-2">Link no disponible</h1>
          <p className="text-noeval-muted text-sm leading-relaxed">
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
    <div
      className="noeval-scope min-h-[100dvh] w-full overflow-x-hidden"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {/* HEADER */}
      <header className="bg-noeval-ink text-noeval-cream relative">
        <div className="h-1 bg-noeval-accent" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-7 sm:pt-10 pb-8 sm:pb-12">
          <div className="flex items-center gap-3 mb-5">
            {client?.logo_url ? (
              <img
                src={client.logo_url}
                alt={client.name}
                className="h-9 w-9 rounded-full object-cover ring-1 ring-white/15"
              />
            ) : (
              <div className="h-9 w-9 rounded-full bg-noeval-accent/15 flex items-center justify-center">
                <Film className="h-4 w-4 text-noeval-accent" />
              </div>
            )}
            <div className="min-w-0">
              <div className="text-[10px] tracking-[0.4em] uppercase text-noeval-accent font-semibold">
                Hoja de producción
              </div>
              <div className="text-xs text-white/60 truncate">{client?.name || ''}</div>
            </div>
          </div>

          <h1 className="font-serif text-2xl sm:text-4xl md:text-5xl leading-tight text-noeval-cream break-words">
            {sheet.title || 'Sin título'}
          </h1>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <MetaField icon={<Calendar className="h-3.5 w-3.5" />} label="Fecha">
              {sheet.shoot_date ? format(parseISO(sheet.shoot_date), "EEEE d 'de' MMMM", { locale: es }) : '—'}
            </MetaField>
            <MetaField icon={<MapPin className="h-3.5 w-3.5" />} label="Locación">
              {sheet.location || '—'}
            </MetaField>
            <MetaField icon={<UserIcon className="h-3.5 w-3.5" />} label="Responsable">
              {sheet.producer_name || '—'}
            </MetaField>
          </div>

          {total > 0 && (
            <div className="mt-7 sm:mt-8 flex items-end gap-4">
              <div className="shrink-0">
                <div className="text-[10px] tracking-[0.35em] uppercase text-white/40">Grabadas</div>
                <div className="font-serif text-3xl sm:text-4xl text-noeval-cream leading-none mt-1">
                  <span className="text-noeval-accent">{recorded}</span>
                  <span className="text-white/30"> / {total}</span>
                </div>
              </div>
              <div className="flex-1 mb-1 min-w-0">
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-noeval-accent transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="text-[10px] tracking-[0.3em] uppercase text-white/40 mt-1.5">
                  {pct}% completado
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* CONTENT */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10 sm:space-y-12">
        {/* PIEZAS */}
        <section>
          <SectionHeader badge="Piezas" title="Contenido a grabar" />
          {shots.length === 0 ? (
            <div className="border border-dashed border-noeval-line rounded-2xl p-10 text-center bg-noeval-surface">
              <Film className="h-8 w-8 mx-auto text-noeval-muted/60 mb-2" />
              <p className="text-noeval-muted text-sm">Aún no hay piezas en esta hoja.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {shots.map((shot, idx) => (
                <article
                  key={shot.id}
                  className={`rounded-2xl bg-noeval-surface border transition shadow-[0_1px_2px_rgba(33,33,33,0.04)] ${
                    shot.done ? 'border-noeval-accent/30' : 'border-noeval-line'
                  }`}
                >
                  <div className="p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] tracking-[0.3em] uppercase bg-noeval-ink text-noeval-cream rounded-full px-2.5 py-1 font-semibold">
                          #{String(idx + 1).padStart(2, '0')}
                        </span>
                        {shot.content_type && (
                          <span className="text-[11px] font-medium text-noeval-ink/70 bg-noeval-ink/5 rounded-full px-2.5 py-1">
                            {CONTENT_TYPE_LABEL[shot.content_type] || CONTENT_TYPE_LABEL.otro}
                          </span>
                        )}
                        {shot.platform && (
                          <span className="text-[11px] font-medium text-noeval-accent bg-noeval-accent/10 rounded-full px-2.5 py-1">
                            {PLATFORM_LABEL[shot.platform] || shot.platform}
                          </span>
                        )}
                        {shot.scene_label && (
                          <span className="text-[11px] text-noeval-muted">{shot.scene_label}</span>
                        )}
                      </div>
                      {shot.done && (
                        <span className="inline-flex items-center gap-1 text-[10px] tracking-[0.3em] uppercase text-noeval-accent font-semibold">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Grabada
                        </span>
                      )}
                    </div>

                    {(shot.concept || shot.description) && (
                      <h3 className="font-serif text-lg sm:text-xl text-noeval-ink leading-snug mb-3 break-words">
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
                <div
                  key={m.id}
                  className="bg-noeval-surface border border-noeval-line rounded-xl p-3"
                >
                  <div className="text-[10px] tracking-[0.3em] uppercase text-noeval-muted">{m.role}</div>
                  <div className="text-sm font-medium text-noeval-ink mt-0.5 break-words">{m.name}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* VESTUARIO */}
        {wardrobe.length > 0 && (
          <section>
            <SectionHeader badge="Vestuario" title="Lista de wardrobe" />
            <ul className="bg-noeval-surface border border-noeval-line rounded-xl divide-y divide-noeval-line overflow-hidden">
              {wardrobe.map((w) => (
                <li key={w.id} className="px-4 py-3 flex items-center gap-3 text-sm">
                  <span
                    className={`h-4 w-4 rounded border flex-shrink-0 ${
                      w.done ? 'bg-noeval-accent border-noeval-accent' : 'border-noeval-muted/40'
                    }`}
                  />
                  <span className={w.done ? 'line-through text-noeval-muted' : 'text-noeval-ink'}>
                    {w.item}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* NOTAS */}
        {sheet.notes && (
          <section>
            <SectionHeader badge="Notas" title="Apuntes del día" />
            <div className="bg-noeval-surface border border-noeval-line rounded-xl p-4 sm:p-5 whitespace-pre-wrap text-sm text-noeval-ink/85 leading-relaxed">
              {sheet.notes}
            </div>
          </section>
        )}

        <footer className="pt-6 pb-4 text-center">
          <div className="inline-flex items-center gap-2 text-[10px] tracking-[0.35em] uppercase text-noeval-muted">
            <span className="h-1 w-1 rounded-full bg-noeval-accent" />
            Compartido vía Socialify
            <span className="h-1 w-1 rounded-full bg-noeval-accent" />
          </div>
        </footer>
      </main>
    </div>
  );
}

function MetaField({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-white/10 pb-2 min-w-0">
      <div className="flex items-center gap-1.5 text-[10px] tracking-[0.3em] uppercase text-white/40 mb-1">
        {icon} {label}
      </div>
      <div className="text-noeval-cream capitalize text-sm sm:text-[15px] truncate">{children}</div>
    </div>
  );
}

function SectionHeader({ badge, title }: { badge: string; title: string }) {
  return (
    <div className="mb-4">
      <span className="inline-block text-[10px] tracking-[0.4em] uppercase border border-noeval-ink/80 text-noeval-ink rounded-full px-3 py-1">
        {badge}
      </span>
      <h2 className="font-serif text-2xl sm:text-3xl text-noeval-ink mt-2">{title}</h2>
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] tracking-[0.3em] uppercase text-noeval-muted mb-0.5">{label}</div>
      <div className="text-noeval-ink/85 whitespace-pre-wrap leading-relaxed break-words">{children}</div>
    </div>
  );
}
