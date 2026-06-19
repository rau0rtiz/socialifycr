// ClickUp create-tasks: crea una task por pieza grabada (production_sheet_shots con done=true).
// Si la pieza ya tiene clickup_task_id, hace PUT para actualizarla.
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const CLICKUP_TOKEN = Deno.env.get('CLICKUP_API_TOKEN');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const TYPE_LABEL: Record<string, string> = {
  reel: 'REEL', story: 'STORY', post: 'POST',
  tiktok: 'TIKTOK', short: 'SHORT', otro: 'CONTENIDO',
};
const PLATFORM_LABEL: Record<string, string> = {
  instagram: 'IG', tiktok: 'TT', youtube: 'YT', linkedin: 'LI', multi: 'MULTI',
};

async function cuFetch(path: string, init?: RequestInit) {
  const res = await fetch(`https://api.clickup.com/api/v2${path}`, {
    ...init,
    headers: {
      Authorization: CLICKUP_TOKEN!,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ClickUp ${path} → ${res.status}: ${text}`);
  }
  return res.json();
}

function buildDescription(shot: any, sheet: any): string {
  const lines: string[] = [];
  if (shot.hook) lines.push(`**⚡ Hook:** ${shot.hook}`, '');
  if (shot.script) lines.push('**📝 Guion / Copy:**', shot.script, '');
  if (shot.cta) lines.push(`**🎯 CTA:** ${shot.cta}`);
  if (shot.tech_notes) lines.push('', '**🎥 Notas técnicas:**', shot.tech_notes);
  lines.push('', '---');
  if (sheet.shoot_date) lines.push(`📅 Grabado: ${sheet.shoot_date}`);
  if (sheet.location) lines.push(`📍 Locación: ${sheet.location}`);
  if (sheet.producer_name) lines.push(`🎬 Responsable: ${sheet.producer_name}`);
  if (shot.recorded_at) lines.push(`⏰ Hora: ${new Date(shot.recorded_at).toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })}`);
  return lines.join('\n');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (!CLICKUP_TOKEN) throw new Error('CLICKUP_API_TOKEN no configurado');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims } = await userClient.auth.getClaims(authHeader.replace('Bearer ', ''));
    if (!claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { data: isAgency } = await userClient.rpc('is_agency_member', { _user_id: claims.claims.sub });
    if (!isAgency) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const reqBody = await req.json();
    const { sheet_id, list_id: overrideListId, list_name: overrideListName, space_id: overrideSpaceId, space_name: overrideSpaceName } = reqBody || {};
    if (!sheet_id || typeof sheet_id !== 'string') {
      throw new Error('sheet_id requerido');
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const [sheetRes, shotsRes] = await Promise.all([
      admin.from('production_sheets').select('*').eq('id', sheet_id).maybeSingle(),
      admin.from('production_sheet_shots').select('*').eq('sheet_id', sheet_id).eq('done', true).order('sort_order'),
    ]);
    if (sheetRes.error || !sheetRes.data) throw new Error('Sheet no encontrada');
    const sheet = sheetRes.data;
    const recordedShots = shotsRes.data || [];

    if (recordedShots.length === 0) {
      throw new Error('No hay piezas grabadas para enviar. Marca tarjetas como grabadas primero.');
    }

    // Prefer explicit override (from per-sheet picker), fall back to the sheet's stored list, then client-level config.
    let listId: string | null = overrideListId || sheet.clickup_list_id || null;
    let listName: string | null = overrideListName || sheet.clickup_list_name || null;
    let defaultAssigneeEmails: string[] = [];

    const { data: cfg } = await admin
      .from('client_clickup_config')
      .select('*')
      .eq('client_id', sheet.client_id)
      .maybeSingle();
    if (cfg?.default_assignee_emails) defaultAssigneeEmails = cfg.default_assignee_emails;
    if (!listId && cfg?.list_id) {
      listId = cfg.list_id;
      listName = cfg.list_name || null;
    }
    if (!listId) {
      throw new Error('Selecciona o crea una lista de ClickUp para esta hoja.');
    }

    // Persist picked list on the sheet so next send defaults to it
    if (overrideListId) {
      await admin.from('production_sheets').update({
        clickup_list_id: overrideListId,
        clickup_list_name: overrideListName || null,
        clickup_space_id: overrideSpaceId || null,
        clickup_space_name: overrideSpaceName || null,
      }).eq('id', sheet_id);
    }

    // Resolve assignees from the chosen list
    const membersRes = await cuFetch(`/list/${listId}/member`);
    const emailToId = new Map<string, number>();
    for (const m of (membersRes.members || [])) {
      if (m.email) emailToId.set(m.email.toLowerCase(), m.id);
    }
    const defaultAssignees: number[] = [];
    for (const e of defaultAssigneeEmails) {
      const id = emailToId.get(String(e).toLowerCase());
      if (id) defaultAssignees.push(id);
    }

    const created: any[] = [];
    const updated: any[] = [];
    const failed: any[] = [];

    for (const shot of recordedShots) {
      const typeTag = TYPE_LABEL[shot.content_type || 'otro'] || 'CONTENIDO';
      const platTag = PLATFORM_LABEL[shot.platform || ''] || '';
      const concept = shot.concept || shot.description || 'Pieza sin título';
      const title = `[${typeTag}${platTag ? ' · ' + platTag : ''}] ${concept}`;
      const description = buildDescription(shot, sheet);

      try {
        if (shot.clickup_task_id) {
          // Update
          await cuFetch(`/task/${shot.clickup_task_id}`, {
            method: 'PUT',
            body: JSON.stringify({ name: title, description }),
          });
          updated.push({ id: shot.id, task_id: shot.clickup_task_id });
        } else {
          // Create
          const task = await cuFetch(`/list/${listId}/task`, {
            method: 'POST',
            body: JSON.stringify({
              name: title,
              description,
              assignees: defaultAssignees,
              due_date: sheet.shoot_date ? new Date(sheet.shoot_date).getTime() : undefined,
            }),
          });
          await admin.from('production_sheet_shots').update({
            clickup_task_id: task.id,
            clickup_url: task.url,
            sent_to_clickup_at: new Date().toISOString(),
          }).eq('id', shot.id);
          created.push({ id: shot.id, task_id: task.id, url: task.url });
        }
      } catch (e) {
        failed.push({ id: shot.id, concept, error: (e as Error).message });
      }
    }

    // Update sheet status if all recorded were sent successfully
    const allSent = failed.length === 0 && recordedShots.length > 0;
    if (allSent) {
      await admin.from('production_sheets').update({
        status: 'sent_to_clickup',
        sent_to_clickup_at: new Date().toISOString(),
      }).eq('id', sheet_id);
    }

    return new Response(JSON.stringify({
      success: true,
      tasks_created: created.length,
      tasks_updated: updated.length,
      tasks_failed: failed.length,
      created,
      updated,
      failed,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
