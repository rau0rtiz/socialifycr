import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Lock, Loader2 } from 'lucide-react';

interface EmailCaptureStepProps {
  data: { name: string; email: string; phone: string };
  onChange: (field: string, value: string) => void;
  onSubmit: () => void;
  onBack: () => void;
  isSubmitting: boolean;
}

export const EmailCaptureStep = ({ data, onChange, onSubmit, onBack, isSubmitting }: EmailCaptureStepProps) => {
  const canSubmit = data.name.trim().length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email);

  return (
    <div className="space-y-8 animate-fade-in max-w-md mx-auto">
      <div className="text-center">
        <h2 className="text-2xl md:text-3xl font-black text-[#1a1a2e]" style={{ fontFamily: "'Poppins', sans-serif" }}>
          ¡Casi listo!
        </h2>
        <p className="text-[#1a1a2e]/50 mt-2">
          Ingresá tus datos para ver tu resultado y recibir tu estrategia personalizada.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name" className="font-bold text-[#1a1a2e]">Nombre *</Label>
          <Input
            id="name"
            placeholder="Tu nombre"
            value={data.name}
            onChange={(e) => onChange('name', e.target.value)}
            maxLength={100}
            className="h-14 rounded-xl border-2 border-gray-200 focus:border-[#FF6B35] text-base px-5"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email" className="font-bold text-[#1a1a2e]">Correo electrónico *</Label>
          <Input
            id="email"
            type="email"
            placeholder="tu@email.com"
            value={data.email}
            onChange={(e) => onChange('email', e.target.value)}
            maxLength={255}
            className="h-14 rounded-xl border-2 border-gray-200 focus:border-[#FF6B35] text-base px-5"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone" className="font-bold text-[#1a1a2e]">Teléfono (opcional)</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="+506 8888-8888"
            value={data.phone}
            onChange={(e) => onChange('phone', e.target.value)}
            maxLength={20}
            className="h-14 rounded-xl border-2 border-gray-200 focus:border-[#FF6B35] text-base px-5"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-[#1a1a2e]/40 justify-center">
        <Lock className="h-3 w-3" />
        Tu información está segura y no será compartida.
      </div>

      <div className="flex justify-between pt-2">
        <Button variant="ghost" onClick={onBack} disabled={isSubmitting} className="text-[#1a1a2e]/60 hover:text-[#1a1a2e]">
          <ArrowLeft className="h-4 w-4 mr-2" />Atrás
        </Button>
        <Button
          onClick={onSubmit}
          disabled={!canSubmit || isSubmitting}
          size="lg"
          className="bg-[#FF6B35] hover:bg-[#e55a2b] text-white font-bold px-8 rounded-xl"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Ver mi resultado
        </Button>
      </div>
    </div>
  );
};
