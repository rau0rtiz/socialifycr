import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export type AuditAction = 
  | 'client.delete'
  | 'client.create'
  | 'client.update'
  | 'platform.connect'
  | 'platform.disconnect'
  | 'team_member.add'
  | 'team_member.remove';

export type EntityType = 'client' | 'platform_connection' | 'team_member';

interface AuditLogParams {
  action: AuditAction;
  entityType: EntityType;
  entityId?: string;
  entityName?: string;
  details?: Json;
}

export const useAuditLog = () => {
  const logAction = async ({
    action,
    entityType,
    entityId,
    entityName,
    details,
  }: AuditLogParams) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('Cannot log audit: no authenticated user');
        return;
      }

      const { error } = await supabase.from('audit_logs').insert([{
        user_id: user.id,
        action,
        entity_type: entityType,
        entity_id: entityId,
        entity_name: entityName,
        details,
        user_agent: navigator.userAgent,
      }]);

      if (error) {
        console.error('Failed to create audit log:', error);
      }
    } catch (err) {
      console.error('Audit logging error:', err);
    }
  };

  return { logAction };
};
