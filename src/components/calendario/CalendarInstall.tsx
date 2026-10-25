import { useEffect, useState } from 'react';
import { Download, Share, PlusSquare, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface InstallPrompt extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function CalendarInstall({ token }: { token: string }) {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [open, setOpen] = useState(false);
  const [installed, setInstalled] = useState(false);
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const embedded = window.self !== window.top || /Instagram|FBAN|FBAV/.test(navigator.userAgent);

  useEffect(() => {
    const display = window.matchMedia('(display-mode: standalone)');
    const update = () => setInstalled(display.matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    update();
    display.addEventListener('change', update);
    const onPrompt = (event: Event) => { event.preventDefault(); setPrompt(event as InstallPrompt); };
    const onInstalled = () => { setInstalled(true); setOpen(false); setPrompt(null); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    const manifest = document.createElement('link');
    manifest.rel = 'manifest';
    manifest.crossOrigin = 'anonymous';
    const url = new URL(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calendar-manifest`);
    url.searchParams.set('token', token);
    url.searchParams.set('origin', window.location.origin);
    manifest.href = url.toString();
    document.head.appendChild(manifest);
    return () => {
      manifest.remove();
      display.removeEventListener('change', update);
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, [token]);

  const install = async () => {
    if (!prompt || embedded) { setOpen(true); return; }
    try {
      await prompt.prompt();
      await prompt.userChoice;
      setPrompt(null);
    } catch { setOpen(true); }
  };

  if (installed) return null;
  return <>
    <Button size="sm" variant="outline" onClick={install}><Download className="mr-2 h-4 w-4" />Instalar calendario</Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="shared-calendar border-border bg-background text-foreground">
        <DialogHeader className="text-left">
          <img src="/calendar-icon-192.png" alt="Socialify" className="mb-3 h-20 w-20 rounded-lg" />
          <DialogTitle>Calendario Socialify</DialogTitle>
          <DialogDescription>Guardá el calendario en tu pantalla de inicio.</DialogDescription>
        </DialogHeader>
        {embedded ? <div className="space-y-4 text-sm">
          <p className="text-muted-foreground">Abrí este enlace en Safari o Chrome para agregarlo a tu pantalla de inicio.</p>
          <Button asChild className="w-full"><a href={`${window.location.origin}/calendario/${encodeURIComponent(token)}`} target="_blank" rel="noopener noreferrer"><ExternalLink className="mr-2 h-4 w-4" />Abrir en el navegador</a></Button>
        </div> : <ol className="space-y-4 text-sm">
          <li className="flex items-start gap-3"><span className="font-semibold text-primary">1</span><span>{ios ? 'Abrí este calendario en Safari.' : 'Abrí el menú de tu navegador.'}</span></li>
          <li className="flex items-start gap-3"><span className="font-semibold text-primary">2</span><span className="flex items-center gap-2">{ios ? <><Share className="h-4 w-4 shrink-0 text-primary" />Tocá Compartir.</> : 'Elegí «Instalar app» o «Agregar a pantalla de inicio».'}</span></li>
          <li className="flex items-start gap-3"><span className="font-semibold text-primary">3</span><span>{ios ? <span className="flex items-center gap-2"><PlusSquare className="h-4 w-4 shrink-0 text-primary" />Elegí «Agregar a pantalla de inicio».</span> : 'Confirmá «Calendario Socialify».'}</span></li>
          {ios && <li className="flex items-start gap-3"><span className="font-semibold text-primary">4</span><span>Confirmá el nombre «Calendario Socialify» y tocá Agregar.</span></li>}
        </ol>}
        <p className="text-xs text-muted-foreground">Necesitás conexión a internet para ver las piezas y enviar tu revisión.</p>
      </DialogContent>
    </Dialog>
  </>;
}