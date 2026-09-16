import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

// Cadencia de seguimiento de Ari:
// 1er seguimiento a las 4 h (o followup_delay_hours), 2do a las 24 h,
// y si tras el segundo sigue sin contestar, la conversación se marca no_interesado.
export const FOLLOWUP_RULES = {
  FIRST: 'followup_1',
  SECOND: 'followup_2',
  FLAG: 'no_interesado_check',
} as const;

export async function cancelPendingFollowups(
  admin: SupabaseClient,
  conversationId: string,
  reason: string,
) {
  await admin
    .from('msg_followup_jobs')
    .update({ status: 'cancelado', cancel_reason: reason, updated_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('status', 'pendiente');
}

export async function scheduleFollowupJob(
  admin: SupabaseClient,
  conversation: { id: string; version?: number | null },
  ruleKey: string,
  delayHours: number,
) {
  await admin.from('msg_followup_jobs').insert({
    conversation_id: conversation.id,
    due_at: new Date(Date.now() + delayHours * 3_600_000).toISOString(),
    rule_key: ruleKey,
    rule_version: 1,
    conversation_version: conversation.version ?? 0,
    status: 'pendiente',
  });
}

export async function scheduleFirstFollowup(
  admin: SupabaseClient,
  conversation: { id: string; version?: number | null },
  settings: { followups_enabled?: boolean | null; followup_delay_hours?: number | null } | null,
) {
  if (!settings?.followups_enabled) return;
  await cancelPendingFollowups(admin, conversation.id, 'nuevo_envio');
  const delayH = Number(settings.followup_delay_hours ?? 4) || 4;
  await scheduleFollowupJob(admin, conversation, FOLLOWUP_RULES.FIRST, delayH);
}
