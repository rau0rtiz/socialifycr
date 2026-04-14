import { Check, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';

interface Option {
  value: string;
  label: string;
}

interface FunnelQuestionProps {
  question: string;
  subtitle?: string;
  options: Option[];
  selected: string;
  onSelect: (value: string) => void;
  onBack: () => void;
  /** Auto-advance after selection (default true) */
  autoAdvance?: boolean;
}

export const FunnelQuestion = ({
  question,
  subtitle,
  options,
  selected,
  onSelect,
  onBack,
  autoAdvance = true,
}: FunnelQuestionProps) => {
  const [justSelected, setJustSelected] = useState<string | null>(null);

  const handleSelect = (value: string) => {
    setJustSelected(value);
    onSelect(value);
  };

  // Reset justSelected when question changes
  useEffect(() => {
    setJustSelected(null);
  }, [question]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
      <div className="w-full max-w-lg space-y-8 md:space-y-10">
        {/* Question */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#212121] tracking-tight uppercase leading-tight">
            {question}
          </h2>
          {subtitle && (
            <p className="text-sm md:text-base text-[#212121]/50 font-medium">{subtitle}</p>
          )}
        </div>

        {/* Options */}
        <div className="space-y-2.5 md:space-y-3">
          {options.map((opt) => {
            const isSelected = selected === opt.value;
            const isJust = justSelected === opt.value;

            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSelect(opt.value)}
                className={`w-full text-left px-5 py-4 md:px-6 md:py-5 rounded-2xl border-2 transition-all duration-300 flex items-center gap-4 group ${
                  isSelected
                    ? 'border-[#FF6B35] bg-[#FF6B35]/5 shadow-md'
                    : 'border-gray-200 hover:border-[#FF6B35]/40 hover:bg-gray-50/80 hover:shadow-sm'
                } ${isJust ? 'scale-[0.98]' : ''}`}
              >
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                    isSelected
                      ? 'border-[#FF6B35] bg-[#FF6B35] scale-110'
                      : 'border-gray-300 group-hover:border-[#FF6B35]/50'
                  }`}
                >
                  {isSelected && <Check className="h-3.5 w-3.5 text-white" />}
                </div>
                <span
                  className={`text-sm md:text-base transition-colors duration-200 ${
                    isSelected ? 'text-[#212121] font-semibold' : 'text-[#212121]/70'
                  }`}
                >
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Back */}
        <div className="pt-2">
          <Button
            variant="ghost"
            onClick={onBack}
            className="text-[#212121]/40 hover:text-[#212121]/70 text-sm font-medium"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            ATRÁS
          </Button>
        </div>
      </div>
    </div>
  );
};
