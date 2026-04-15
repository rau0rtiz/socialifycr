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
    <div className="space-y-6 md:space-y-8 animate-fade-in max-w-md mx-auto">
      <div className="text-center">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#212121]">
          ¿A dónde te enviamos tu Roadmap de Crecimiento Digital?
        </h2>
        <p className="text-[#212121]/50 mt-1 text-sm md:text-base">
          Ingresá tus datos para recibir tu estrategia personalizada.
        </p>
      </div>

      <div className="space-y-3 md:space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name" className="font-semibold text-[#212121] text-sm">Nombre *</Label>
          <Input
            id="name"
            placeholder="Tu nombre"
            value={data.name}
            onChange={(e) => onChange('name', e.target.value)}
            maxLength={100}
            className="h-12 md:h-14 rounded-xl border-2 border-gray-200 focus:border-[#FF6B35] text-sm md:text-base px-4"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email" className="font-semibold text-[#212121] text-sm">Correo electrónico *</Label>
          <Input
            id="email"
            type="email"
            placeholder="tu@email.com"
            value={data.email}
            onChange={(e) => onChange('email', e.target.value)}
            maxLength={255}
            className="h-12 md:h-14 rounded-xl border-2 border-gray-200 focus:border-[#FF6B35] text-sm md:text-base px-4"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone" className="font-semibold text-[#212121] text-sm">Teléfono (opcional)</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="+506 8888-8888"
            value={data.phone}
            onChange={(e) => onChange('phone', e.target.value)}
            maxLength={20}
            className="h-12 md:h-14 rounded-xl border-2 border-gray-200 focus:border-[#FF6B35] text-sm md:text-base px-4"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 text-[10px] md:text-xs text-[#212121]/40 justify-center">
        <Lock className="h-3 w-3" />
        Tu información está segura y no será compartida.
      </div>

      <div className="flex justify-between pt-1 md:pt-2">
        <Button variant="ghost" onClick={onBack} disabled={isSubmitting} className="text-[#212121]/60 hover:text-[#212121] text-sm">
          <ArrowLeft className="h-4 w-4 mr-1" />Atrás
        </Button>
        <Button
          onClick={onSubmit}
          disabled={!canSubmit || isSubmitting}
          size="lg"
          className="bg-[#FF6B35] hover:bg-[#e55a2b] text-white font-semibold px-6 md:px-8 rounded-xl text-sm md:text-base"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Ver mi resultado
        </Button>
      </div>
    </div>
  );
};
