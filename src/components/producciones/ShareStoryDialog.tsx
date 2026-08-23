import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ShareStoryPanel } from './ShareStoryPanel';
import type { StoryReceiptData } from './StoryReceiptCard';
import { Instagram } from 'lucide-react';

export function ShareStoryDialog({
  open,
  onClose,
  data,
}: {
  open: boolean;
  onClose: () => void;
  data: StoryReceiptData;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Instagram className="h-4 w-4" /> Compartir historia
          </DialogTitle>
          <DialogDescription>
            El recibo en formato 1080×1920 listo para historias.
          </DialogDescription>
        </DialogHeader>
        <ShareStoryPanel data={data} />
      </DialogContent>
    </Dialog>
  );
}
