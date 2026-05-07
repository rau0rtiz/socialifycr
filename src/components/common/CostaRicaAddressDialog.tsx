import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { CR_PROVINCIAS, getCantones, getDistritos } from '@/data/costa-rica-locations';
import type { CustomerAddress } from '@/hooks/use-customer-contacts';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: CustomerAddress | null;
  onSave: (a: CustomerAddress) => void;
}

export const CostaRicaAddressDialog = ({ open, onOpenChange, initial, onSave }: Props) => {
  const [label, setLabel] = useState('');
  const [provincia, setProvincia] = useState('');
  const [canton, setCanton] = useState('');
  const [distrito, setDistrito] = useState('');
  const [senas, setSenas] = useState('');
  const [postal, setPostal] = useState('');

  useEffect(() => {
    if (open) {
      setLabel(initial?.label || '');
      setProvincia(initial?.state || '');
      setCanton(initial?.city || '');
      setDistrito(initial?.district || '');
      setSenas(initial?.address_line_1 || '');
      setPostal(initial?.post_code || '');
    }
  }, [open, initial]);

  const cantones = provincia ? getCantones(provincia) : [];
  const distritos = provincia && canton ? getDistritos(provincia, canton) : [];

  const handleSave = () => {
    if (!provincia || !canton || !distrito || !senas.trim()) return;
    onSave({
      label: label.trim() || null,
      state: provincia,
      city: canton,
      district: distrito,
      address_line_1: senas.trim(),
      post_code: postal.trim() || null,
      country: 'Costa Rica',
    });
    onOpenChange(false);
  };

  const valid = provincia && canton && distrito && senas.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Dirección de envío</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Etiqueta (opcional)</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Casa, Trabajo, etc." />
          </div>

          <div>
            <Label className="text-xs">Provincia *</Label>
            <Select value={provincia} onValueChange={(v) => { setProvincia(v); setCanton(''); setDistrito(''); }}>
              <SelectTrigger><SelectValue placeholder="Selecciona provincia" /></SelectTrigger>
              <SelectContent className="max-h-72">
                {CR_PROVINCIAS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Cantón *</Label>
            <Select value={canton} onValueChange={(v) => { setCanton(v); setDistrito(''); }} disabled={!provincia}>
              <SelectTrigger><SelectValue placeholder={provincia ? 'Selecciona cantón' : 'Primero la provincia'} /></SelectTrigger>
              <SelectContent className="max-h-72">
                {cantones.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Distrito *</Label>
            <Select value={distrito} onValueChange={setDistrito} disabled={!canton}>
              <SelectTrigger><SelectValue placeholder={canton ? 'Selecciona distrito' : 'Primero el cantón'} /></SelectTrigger>
              <SelectContent className="max-h-72">
                {distritos.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Señas exactas *</Label>
            <Textarea value={senas} onChange={(e) => setSenas(e.target.value)} placeholder="Ej: 200m sur del parque, casa azul portón blanco" rows={3} />
          </div>

          <div>
            <Label className="text-xs">Código postal (opcional)</Label>
            <Input value={postal} onChange={(e) => setPostal(e.target.value)} placeholder="10101" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!valid}>Guardar dirección</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
