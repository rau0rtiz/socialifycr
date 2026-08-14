import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { renderDocumentSource } from '@/lib/jsx-document';

const PropuestaPublica = () => {
  const { slug } = useParams<{ slug: string }>();
  const [state, setState] = useState<'loading' | 'ok' | 'not_found'>('loading');
  const [html, setHtml] = useState('');
  const [title, setTitle] = useState('Propuesta');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!slug) {
        setState('not_found');
        return;
      }
      const { data, error } = await supabase
        .rpc('get_published_proposal_by_slug', { _slug: slug });
      if (cancelled) return;
      const row = Array.isArray(data) ? data[0] : data;
      if (error || !row) {
        setState('not_found');
        return;
      }
      setTitle(row.title);
      setHtml(row.html_content || '');
      setState('ok');
      document.title = row.title;
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  // Registro de vistas + tiempo de lectura
  useEffect(() => {
    if (state !== 'ok' || !slug) return;

    const endpoint = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/track-document-view`;
    let viewId: string | null = null;
    let sessionToken: string | null = null;
    let interval: number | undefined;
    let stopped = false;

    const ping = () => {
      if (!viewId || !sessionToken) return;
      const payload = JSON.stringify({ action: 'ping', view_id: viewId, session_token: sessionToken });
      if (navigator.sendBeacon) {
        navigator.sendBeacon(endpoint, new Blob([payload], { type: 'application/json' }));
      } else {
        fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
        }).catch(() => {});
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') ping();
    };

    const start = async () => {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'start',
            slug,
            referrer: document.referrer || null,
          }),
        });
        if (!res.ok) return;
        const data = await res.json();
        if (stopped || !data?.view_id) return;
        viewId = data.view_id;
        sessionToken = data.session_token;

        interval = window.setInterval(() => {
          if (document.visibilityState === 'visible') ping();
        }, 15000);
        window.addEventListener('pagehide', ping);
        document.addEventListener('visibilitychange', onVisibility);
      } catch {
        /* tracking best-effort */
      }
    };

    start();

    return () => {
      stopped = true;
      ping();
      if (interval) window.clearInterval(interval);
      window.removeEventListener('pagehide', ping);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [state, slug]);

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
        <h1 className="text-2xl font-bold">Propuesta no disponible</h1>
        <p className="text-muted-foreground">Este enlace no existe o fue retirado.</p>
      </div>
    );
  }

  return (
    <iframe
      title={title}
      srcDoc={renderDocumentSource(html, title)}
      sandbox="allow-same-origin allow-popups allow-forms allow-scripts"
      className="w-screen h-screen border-0 block"
    />
  );
};

export default PropuestaPublica;
