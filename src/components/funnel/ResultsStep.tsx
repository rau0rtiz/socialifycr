import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Download, Calendar, Crown, ArrowRight } from 'lucide-react';

interface ResultsStepProps {
  level: number;
  name: string;
  onCalendlyClick: () => void;
}

const levelData = [
  { name: 'Idea Stage', revenue: '$0', desc: 'Tenés una idea pero aún no la has lanzado. Tu plan te guiará con los primeros pasos para validar y monetizar.', color: 'hsl(var(--muted-foreground))' },
  { name: 'Startup', revenue: '$0 – $3K/mes', desc: 'Ya lanzaste y estás consiguiendo tus primeros clientes. Tu estrategia se enfoca en tracción y consistencia.', color: 'hsl(210, 70%, 50%)' },
  { name: 'Growing', revenue: '$3K – $15K/mes', desc: 'Tenés ingresos consistentes. Es hora de construir sistemas y escalar tu adquisición.', color: 'hsl(150, 60%, 40%)' },
  { name: 'Scaling', revenue: '$15K – $50K/mes', desc: 'Tu equipo está en su lugar. Necesitás optimizar operaciones y multiplicar canales.', color: 'hsl(40, 80%, 50%)' },
  { name: 'Established', revenue: '$50K – $200K/mes', desc: 'Sistemas sólidos. Estás listo para multiplicar y expandir a nuevos mercados.', color: 'hsl(280, 60%, 50%)' },
  { name: 'Empire', revenue: '$200K+/mes', desc: 'Operación multi-canal. Tu enfoque es liderazgo, legado y crecimiento exponencial.', color: 'hsl(0, 70%, 50%)' },
];

export const ResultsStep = ({ level, name, onCalendlyClick }: ResultsStepProps) => {
  const current = levelData[level - 1];
  const qualifiesForSession = level >= 3 && level <= 5;
  const isPremium = level === 6;

  return (
    <div className="space-y-8 animate-fade-in max-w-2xl mx-auto text-center">
      <div>
        <p className="text-muted-foreground mb-2">Resultado para</p>
        <h2 className="text-3xl md:text-4xl font-bold text-foreground">{name}</h2>
      </div>

      {/* Level meter */}
      <div className="flex items-center justify-center gap-1 md:gap-2 py-6">
        {levelData.map((l, i) => {
          const isActive = i + 1 === level;
          return (
            <div key={i} className="flex flex-col items-center gap-2">
              <div
                className={`w-10 h-10 md:w-14 md:h-14 rounded-full flex items-center justify-center font-bold text-sm md:text-lg transition-all ${
                  isActive
                    ? 'ring-4 ring-primary/30 scale-110 text-primary-foreground shadow-lg'
                    : i + 1 < level
                    ? 'opacity-60 text-primary-foreground'
                    : 'opacity-30 text-muted-foreground bg-muted'
                }`}
                style={i + 1 <= level ? { backgroundColor: levelData[i].color } : undefined}
              >
                {i + 1}
              </div>
              <span className={`text-[10px] md:text-xs max-w-[60px] leading-tight ${isActive ? 'font-bold text-foreground' : 'text-muted-foreground'}`}>
                {l.name}
              </span>
            </div>
          );
        })}
      </div>

      {/* Current level card */}
      <Card className="p-6 md:p-8 text-left space-y-4 border-2" style={{ borderColor: current.color }}>
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-xl"
            style={{ backgroundColor: current.color }}
          >
            {level}
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground">Nivel {level}: {current.name}</h3>
            <p className="text-sm text-muted-foreground">{current.revenue}</p>
          </div>
        </div>
        <p className="text-foreground/80 leading-relaxed">{current.desc}</p>
      </Card>

      {/* PDF Download */}
      <Button
        size="lg"
        variant="outline"
        className="w-full py-6 text-base gap-2"
        onClick={() => {
          // Placeholder — will be replaced with real PDF URLs per level
          alert('Los PDFs serán subidos próximamente. Por ahora este es un placeholder.');
        }}
      >
        <Download className="h-5 w-5" />
        Descargar mi estrategia (PDF)
      </Button>

      {/* CTA based on level */}
      {qualifiesForSession && (
        <Card className="p-6 bg-primary/5 border-primary/20 space-y-4">
          <div className="flex items-center gap-2 justify-center">
            <Calendar className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-bold text-foreground">¡Calificás para una sesión gratuita!</h3>
          </div>
          <p className="text-muted-foreground text-sm">
            Basado en tu nivel de negocio, te ofrecemos una sesión de planificación estratégica sin costo.
          </p>
          <Button size="lg" className="gap-2" onClick={onCalendlyClick}>
            Agendar sesión gratuita
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Card>
      )}

      {isPremium && (
        <Card className="p-6 bg-primary/5 border-primary/20 space-y-4">
          <div className="flex items-center gap-2 justify-center">
            <Crown className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-bold text-foreground">Consultoría Premium</h3>
          </div>
          <p className="text-muted-foreground text-sm">
            Tu negocio está en un nivel avanzado. Te ofrecemos una consultoría premium personalizada.
          </p>
          <Button size="lg" className="gap-2" onClick={onCalendlyClick}>
            Solicitar consultoría
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Card>
      )}

      {level <= 2 && (
        <p className="text-sm text-muted-foreground">
          Descargá tu estrategia y empezá a implementar. Cuando tu negocio crezca, estaremos acá para ayudarte a escalar. 🚀
        </p>
      )}
    </div>
  );
};
