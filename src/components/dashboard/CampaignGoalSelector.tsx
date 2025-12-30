import { useState } from 'react';
import { Settings2, Check, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  GOAL_OPTIONS, 
  GoalType, 
  useSetCampaignGoal, 
  useDeleteCampaignGoal 
} from '@/hooks/use-campaign-goals';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface CampaignGoalSelectorProps {
  clientId: string;
  campaignId: string;
  currentGoal?: GoalType | null;
  className?: string;
}

export function CampaignGoalSelector({ 
  clientId, 
  campaignId, 
  currentGoal,
  className 
}: CampaignGoalSelectorProps) {
  const [open, setOpen] = useState(false);
  const setGoal = useSetCampaignGoal();
  const deleteGoal = useDeleteCampaignGoal();
  
  const handleSelectGoal = async (goalType: GoalType) => {
    try {
      await setGoal.mutateAsync({ clientId, campaignId, goalType });
      toast.success('Meta de conversión actualizada');
      setOpen(false);
    } catch (error) {
      console.error('Error setting goal:', error);
      toast.error('Error al guardar la meta');
    }
  };
  
  const handleResetGoal = async () => {
    try {
      await deleteGoal.mutateAsync({ clientId, campaignId });
      toast.success('Meta restablecida a detección automática');
      setOpen(false);
    } catch (error) {
      console.error('Error deleting goal:', error);
      toast.error('Error al restablecer la meta');
    }
  };
  
  const isLoading = setGoal.isPending || deleteGoal.isPending;
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-7 w-7 shrink-0",
            currentGoal ? "text-primary" : "text-muted-foreground hover:text-foreground",
            className
          )}
          title={currentGoal ? "Meta configurada manualmente" : "Configurar meta de conversión"}
        >
          <Settings2 className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground px-2 py-1">
            Meta de conversión
          </p>
          {GOAL_OPTIONS.map((goal) => (
            <button
              key={goal.value}
              onClick={() => handleSelectGoal(goal.value)}
              disabled={isLoading}
              className={cn(
                "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm",
                "hover:bg-accent hover:text-accent-foreground",
                "disabled:opacity-50 disabled:pointer-events-none",
                currentGoal === goal.value && "bg-accent"
              )}
            >
              <span>{goal.label}</span>
              {currentGoal === goal.value && <Check className="h-4 w-4" />}
              {isLoading && setGoal.variables?.goalType === goal.value && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
            </button>
          ))}
          {currentGoal && (
            <>
              <div className="my-1 h-px bg-border" />
              <button
                onClick={handleResetGoal}
                disabled={isLoading}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm",
                  "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  "disabled:opacity-50 disabled:pointer-events-none"
                )}
              >
                <X className="h-3 w-3" />
                <span>Detección automática</span>
                {isLoading && deleteGoal.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin ml-auto" />
                )}
              </button>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
