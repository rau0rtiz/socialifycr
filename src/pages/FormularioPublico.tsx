import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { buildFormDocument, type FormAnswer } from '@/lib/form-runtime';

interface CachedDraft {
  answers: FormAnswer[];
  name?: string;
  email?: string;
  saved_at: string;
}

const FormularioPublico = () => {
  const { slug } = useParams<{ slug: string }>();
  const [state, setState] = useState<'loading' | 'ok' | 'not_found'>('loading');
  const [doc, setDoc] = useState('');
  const [title, setTitle] = useState('Formulario');
  const frameRef = useRef<HTMLIFrameElement>(null);

  const cacheKey = `sform-draft:${slug ?? ''}`;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!slug) return setState('not_found');
      const { data, error } = await supabase.rpc('get_published_proposal_by_slug', { _slug: slug });
      if (cancelled) return;
      const row = Array.isArray(data) ? data[0] : data;
      if (error || !row) return setState('not_found');
      setTitle(row.title);
      document.title = row.title;
      setDoc(buildFormDocument(row.html_content || '', row.title));
      setState('ok');
    })();
    return () => { cancelled = true; };
  }, [slug]);

  useEffect(() => {
    if (state !== 'ok' || !slug) return;

    const onMessage = async (ev: MessageEvent) => {
      const frame = frameRef.current;
      if (!frame || ev.source !== frame.contentWindow) return;
      const data = ev.data || {};
      const reply = (msg: unknown) => frame.contentWindow?.postMessage(msg, '*');

      if (data.type === 'sform:ready') {
        try {
          const raw = localStorage.getItem(cacheKey);
          if (raw) {
            const draft: CachedDraft = JSON.parse(raw);
            reply({ type: 'sform:restore', answers: draft.answers, name: draft.name, email: draft.email });
          }
        } catch { /* sin borrador */ }
        return;
      }

      if (data.type === 'sform:change') {
        try {
          const prev = localStorage.getItem(cacheKey);
          const prevDraft: CachedDraft | null = prev ? JSON.parse(prev) : null;
          const draft: CachedDraft = {
            answers: data.answers ?? [],
            name: data.name ?? prevDraft?.name,
            email: data.email ?? prevDraft?.email,
            saved_at: new Date().toISOString(),
          };
          localStorage.setItem(cacheKey, JSON.stringify(draft));
        } catch { /* storage lleno */ }
        return;
      }

      if (data.type === 'sform:submit') {
        try {
          const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/submit-form-response`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              slug,
              name: data.name,
              email: data.email,
              answers: data.answers,
              html: data.html,
            }),
          });
          if (!res.ok) throw new Error('submit failed');
          localStorage.removeItem(cacheKey);
          reply({ type: 'sform:submitted' });
        } catch {
          reply({ type: 'sform:error', message: 'No se pudo enviar. Revisá tu conexión e intentá otra vez.' });
        }
      }
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [state, slug, cacheKey]);

  if (state === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (state === 'not_found') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-2 p-6 text-center">
        <h1 className="text-2xl font-bold">Formulario no disponible</h1>
        <p className="text-muted-foreground">Este enlace no existe o fue retirado.</p>
      </div>
    );
  }

  return (
    <iframe
      ref={frameRef}
      title={title}
      srcDoc={doc}
      sandbox="allow-popups allow-forms allow-scripts"
      className="w-screen h-screen border-0 block"
    />
  );
};

export default FormularioPublico;
