import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Goal types with their corresponding Meta action_types
export const GOAL_OPTIONS = [
  { 
    value: 'messages', 
    label: 'Conversaciones', 
    actionType: 'onsite_conversion.messaging_conversation_started_7d',
    alternativeTypes: ['onsite_conversion.messaging_first_reply']
  },
  { 
    value: 'leads', 
    label: 'Leads', 
    actionType: 'lead',
    alternativeTypes: ['onsite_conversion.lead_grouped', 'leadgen_grouped']
  },
  { 
    value: 'purchases', 
    label: 'Compras', 
    actionType: 'purchase',
    alternativeTypes: ['omni_purchase', 'onsite_web_purchase']
  },
  { 
    value: 'registrations', 
    label: 'Registros', 
    actionType: 'complete_registration',
    alternativeTypes: ['omni_complete_registration']
  },
  { 
    value: 'link_clicks', 
    label: 'Clics en enlace', 
    actionType: 'link_click',
    alternativeTypes: []
  },
  { 
    value: 'video_views', 
    label: 'Reproducciones', 
    actionType: 'video_view',
    alternativeTypes: []
  },
  { 
    value: 'engagement', 
    label: 'Interacciones', 
    actionType: 'post_engagement',
    alternativeTypes: ['page_engagement']
  },
] as const;

export type GoalType = typeof GOAL_OPTIONS[number]['value'];

export interface CampaignGoal {
  id: string;
  client_id: string;
  campaign_id: string;
  goal_type: GoalType;
  action_type: string | null;
  created_at: string;
  updated_at: string;
}

// Hook to fetch all campaign goals for a client
export function useCampaignGoals(clientId: string | null) {
  return useQuery({
    queryKey: ['campaign-goals', clientId],
    queryFn: async () => {
      if (!clientId) return {};
      
      const { data, error } = await supabase
        .from('campaign_goals')
        .select('*')
        .eq('client_id', clientId);
      
      if (error) throw error;
      
      // Return as a map for easy lookup by campaign_id
      const goalsMap: Record<string, CampaignGoal> = {};
      data?.forEach(goal => {
        goalsMap[goal.campaign_id] = goal as CampaignGoal;
      });
      
      return goalsMap;
    },
    enabled: !!clientId,
  });
}

// Hook to set/update a campaign goal
export function useSetCampaignGoal() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      clientId, 
      campaignId, 
      goalType 
    }: { 
      clientId: string; 
      campaignId: string; 
      goalType: GoalType;
    }) => {
      const goalOption = GOAL_OPTIONS.find(g => g.value === goalType);
      if (!goalOption) throw new Error('Invalid goal type');
      
      const { data, error } = await supabase
        .from('campaign_goals')
        .upsert({
          client_id: clientId,
          campaign_id: campaignId,
          goal_type: goalType,
          action_type: goalOption.actionType,
        }, {
          onConflict: 'client_id,campaign_id',
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['campaign-goals', variables.clientId] });
      queryClient.invalidateQueries({ queryKey: ['meta-campaigns'] });
    },
  });
}

// Hook to delete a campaign goal (revert to auto-detection)
export function useDeleteCampaignGoal() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      clientId, 
      campaignId 
    }: { 
      clientId: string; 
      campaignId: string; 
    }) => {
      const { error } = await supabase
        .from('campaign_goals')
        .delete()
        .eq('client_id', clientId)
        .eq('campaign_id', campaignId);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['campaign-goals', variables.clientId] });
      queryClient.invalidateQueries({ queryKey: ['meta-campaigns'] });
    },
  });
}

// Helper to get the label for a goal type
export function getGoalLabel(goalType: GoalType): string {
  const goal = GOAL_OPTIONS.find(g => g.value === goalType);
  return goal?.label || 'Resultados';
}

// Helper to get action types for a goal (primary + alternatives)
export function getGoalActionTypes(goalType: GoalType): string[] {
  const goal = GOAL_OPTIONS.find(g => g.value === goalType);
  if (!goal) return [];
  return [goal.actionType, ...goal.alternativeTypes];
}
