import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

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
        .from('agency_proposals')
        .select('title, html_content, is_published')
        .eq('slug', slug)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data || !data.is_published) {
        setState('not_found');
        return;
      }
      setTitle(data.title);
      setHtml(data.html_content || '');
      setState('ok');
      document.title = data.title;
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

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
      srcDoc={html}
      sandbox="allow-same-origin allow-popups allow-forms allow-scripts"
      className="w-screen h-screen border-0 block"
    />
  );
};

export default PropuestaPublica;
