// ClickUp create-tasks: builds parent task + subtasks for a production sheet.
// Auth: requires Supabase JWT (agency members only).
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (!CLICKUP_TOKEN) throw new Error('CLICKUP_API_TOKEN not configured');

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

    const { sheet_id } = await req.json();
    if (!sheet_id || typeof sheet_id !== 'string') {
      throw new Error('sheet_id required');
    }

    // Use service-role to safely read all relations (RLS already gated above)
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const [sheetRes, teamRes, shotsRes, wardrobeRes] = await Promise.all([
      admin.from('production_sheets').select('*').eq('id', sheet_id).maybeSingle(),
      admin.from('production_sheet_team').select('*').eq('sheet_id', sheet_id).order('sort_order'),
      admin.from('production_sheet_shots').select('*').eq('sheet_id', sheet_id).order('sort_order'),
      admin.from('production_sheet_wardrobe').select('*').eq('sheet_id', sheet_id).order('sort_order'),
    ]);
    if (sheetRes.error || !sheetRes.data) throw new Error('Sheet not found');
    const sheet = sheetRes.data;
    const team = teamRes.data || [];
    const shots = shotsRes.data || [];
    const wardrobe = wardrobeRes.data || [];

    const { data: cfg, error: cfgErr } = await admin
      .from('client_clickup_config')
      .select('*')
      .eq('client_id', sheet.client_id)
      .maybeSingle();
    if (cfgErr) throw cfgErr;
    if (!cfg?.list_id) throw new Error('ClickUp no está configurado para este cliente. Configúralo desde la carpeta del cliente.');

    // Get list members → map email → id
    const membersRes = await cuFetch(`/list/${cfg.list_id}/member`);
    const emailToId = new Map<string, number>();
    for (const m of (membersRes.members || [])) {
      if (m.email) emailToId.set(m.email.toLowerCase(), m.id);
    }
    const resolveAssignees = (emails: string[]): number[] => {
      const ids = new Set<number>();
      for (const e of emails) {
        const id = emailToId.get(e.toLowerCase());
        if (id) ids.add(id);
      }
      return [...ids];
    };

    const defaultAssignees = resolveAssignees(cfg.default_assignee_emails || []);

    // ---- Build parent description ----
    const lines: string[] = [];
    if (sheet.shoot_date) lines.push(`📅 Fecha: ${sheet.shoot_date}`);
    if (sheet.call_time) lines.push(`⏰ Llamado: ${sheet.call_time}`);
    if (sheet.location) lines.push(`📍 Locación: ${sheet.location}`);
    if (sheet.producer_name) lines.push(`🎬 Producción: ${sheet.producer_name}`);
    if (team.length) {
      lines.push('', '**Equipo:**');
      for (const t of team) lines.push(`- ${t.role || '—'}: ${t.name || '—'}${t.clickup_user_email ? ` (${t.clickup_user_email})` : ''}`);
    }
    if (sheet.notes) lines.push('', '**Notas:**', sheet.notes);

    let parentId: string | undefined = sheet.clickup_task_id || undefined;
    let parentUrl: string | undefined = sheet.clickup_url || undefined;

    if (parentId) {
      // Update existing task
      await cuFetch(`/task/${parentId}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: sheet.title,
          description: lines.join('\n'),
        }),
      });
    } else {
      const created = await cuFetch(`/list/${cfg.list_id}/task`, {
        method: 'POST',
        body: JSON.stringify({
          name: sheet.title,
          description: lines.join('\n'),
          assignees: defaultAssignees,
          due_date: sheet.shoot_date ? new Date(sheet.shoot_date).getTime() : undefined,
        }),
      });
      parentId = created.id;
      parentUrl = created.url;
    }

    // ---- Subtasks: shots + wardrobe + team ----
    const created: any[] = [];
    const failed: any[] = [];

    const createSub = async (name: string, description: string, assignees: number[]) => {
      try {
        const sub = await cuFetch(`/list/${cfg.list_id}/task`, {
          method: 'POST',
          body: JSON.stringify({
            name, description, assignees,
            parent: parentId,
          }),
        });
        created.push({ id: sub.id, name: sub.name });
      } catch (e) {
        failed.push({ name, error: (e as Error).message });
      }
    };

    for (const s of shots.filter((x) => !x.done)) {
      const title = `🎬 ${s.scene_label ? `Esc ${s.scene_label} · ` : ''}${s.shot_number ? `#${s.shot_number} ` : ''}${s.description || 'Toma'}`;
      const desc = [s.shot_type && `Tipo: ${s.shot_type}`, s.duration_estimate && `Duración: ${s.duration_estimate}`, s.notes].filter(Boolean).join('\n');
      await createSub(title, desc, defaultAssignees);
    }
    for (const w of wardrobe.filter((x) => !x.done)) {
      await createSub(`👕 ${w.item}`, '', defaultAssignees);
    }
    for (const t of team) {
      const ass = t.clickup_user_email ? resolveAssignees([t.clickup_user_email]) : [];
      await createSub(`👥 ${t.role || 'Rol'}: ${t.name || '—'}`, '', ass);
    }

    // Update DB
    await admin.from('production_sheets').update({
      clickup_task_id: parentId,
      clickup_url: parentUrl,
      clickup_list_id: cfg.list_id,
      sent_to_clickup_at: new Date().toISOString(),
      status: 'sent_to_clickup',
    }).eq('id', sheet_id);

    return new Response(JSON.stringify({
      success: true,
      task_id: parentId,
      url: parentUrl,
      subtasks_created: created.length,
      subtasks_failed: failed.length,
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
