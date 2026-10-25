// ClickUp create-tasks: crea una task por pieza grabada (production_sheet_shots con done=true).
// Si la pieza ya tiene clickup_task_id, hace PUT para actualizarla.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { calendarSyncFields, isClickUpApproved } from '../_shared/calendar-clickup-rules.ts';

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
  reel: 'REEL', story: 'STORY', post: 'POST', foto: 'FOTO',
  carrusel: 'CARRUSEL', diseno: 'DISEÑO', correo: 'CORREO',
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

function buildDescription(shot: any, sheet: any, references: any[] = []): string {
  const lines: string[] = [];
  if (shot.hook) lines.push(`**⚡ Hook:** ${shot.hook}`, '');
  if (shot.script) lines.push('**📝 Guion / Copy:**', shot.script, '');
  if (shot.cta) lines.push(`**🎯 CTA:** ${shot.cta}`);
  if (shot.tech_notes) lines.push('', '**🎥 Notas técnicas:**', shot.tech_notes);
  if (references.length) {
    lines.push('', '**🔗 Referencias:**');
    for (const r of references) {
      const label = r.platform ? String(r.platform).replace(/_/g, ' ') : 'link';
      lines.push(`- [${label}] ${r.url}${r.notes ? ` — ${r.notes}` : ''}`);
    }
  }
  if (shot.file_names) {
    const files = String(shot.file_names).split(/[\n,]+/).map((f: string) => f.trim()).filter(Boolean);
    if (files.length) lines.push('', '**🗂 Nombres de archivo:**', ...files.map((f: string) => `- ${f}`));
  }
  lines.push('', '---');
  if (sheet.shoot_date) lines.push(`📅 Grabado: ${sheet.shoot_date}`);
  if (sheet.location) lines.push(`📍 Locación: ${sheet.location}`);
  if (sheet.producer_name) lines.push(`🎬 Responsable: ${sheet.producer_name}`);
  if (shot.recorded_at) lines.push(`⏰ Hora: ${new Date(shot.recorded_at).toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })}`);
  return lines.join('\n');
}

function parseClickUpDueDate(value: unknown): number | undefined {
  if (!value || typeof value !== 'string') return undefined;

  const trimmed = value.trim();
  const dateOnly = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const timestamp = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]), 12).getTime()
    : new Date(trimmed).getTime();

  return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : undefined;
}

// ---------- ClickUp → calendar sync (tasks become calendar pieces) ----------

const TAG_TYPE: Record<string, string> = {
  REEL: 'reel', STORY: 'story', POST: 'post', FOTO: 'foto',
  CARRUSEL: 'carrusel', 'DISEÑO': 'diseno', DISENO: 'diseno',
  CORREO: 'correo', TIKTOK: 'tiktok', SHORT: 'short', CONTENIDO: 'otro',
};
const TAG_PLATFORM: Record<string, string> = {
  IG: 'instagram', TT: 'tiktok', YT: 'youtube', LI: 'linkedin', MULTI: 'multi',
};

// Parses "[3] [REEL · IG] Título" → { contentType, platform, title }.
// Returns null for untagged tasks and ops tasks ([PRODUCCIÓN] …) — those are not content pieces.
function parseTaskTitle(name: string) {
  const m = name.match(/^(?:\[\d+\]\s*)?\[([A-ZÑ]+)(?:\s*·\s*([A-Z]+))?\]\s*(.+)$/);
  if (!m) return null;
  if (m[1] === 'PRODUCCIÓN' || m[1] === 'PRODUCCION') return null;
  return {
    contentType: TAG_TYPE[m[1]] ?? 'otro',
    platform: m[2] ? (TAG_PLATFORM[m[2]] ?? null) : null,
    title: m[3].trim() || name,
  };
}

function mapClickUpStatus(status: unknown): string {
  const s = String((status as { status?: string })?.status || '').toLowerCase();
  if (isClickUpApproved(status as { status?: string })) return 'aprobado';
  if (/cambio|correcc|editar|revisi/.test(s)) return 'cambios';
  return 'pendiente';
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

async function syncClientCalendar(admin: ReturnType<typeof createClient>, cfg: { client_id: string; space_id: string | null }) {
  // Every list in the client's space (foldered + folderless).
  const listIds = new Set<string>();
  if (cfg.space_id) {
    const folders = await cuFetch(`/space/${cfg.space_id}/folder?archived=false`);
    for (const f of folders.folders || []) for (const l of f.lists || []) listIds.add(String(l.id));
    const loose = await cuFetch(`/space/${cfg.space_id}/list?archived=false`);
    for (const l of loose.lists || []) listIds.add(String(l.id));
  }

  const { data: existing, error: existingError } = await admin
    .from('content_calendar_items')
    .select('id, clickup_task_id')
    .eq('client_id', cfg.client_id)
    .not('clickup_task_id', 'is', null);
  if (existingError) throw existingError;
  const byTask = new Map((existing || []).map((r: { id: string; clickup_task_id: string }) => [String(r.clickup_task_id), r]));

  let created = 0, updated = 0, skipped = 0;
  // Legacy production exports may have no configured space. Only inspect their already-linked tasks.
  if (!cfg.space_id) {
    const rows = [...byTask.values()];
    for (const row of rows) {
      // Stay below ClickUp's shared request limit. Missing legacy tasks must not block siblings.
      await new Promise((resolve) => setTimeout(resolve, 750));
      try {
        const task = await cuFetch(`/task/${row.clickup_task_id}`);
        const { error } = await admin.from('content_calendar_items')
          .update({ clickup_approved: isClickUpApproved(task.status) })
          .eq('id', row.id).eq('client_id', cfg.client_id);
        if (error) throw error;
        updated += 1;
      } catch (e) {
        if (String((e as Error).message).includes('→ 404:')) { skipped += 1; continue; }
        throw e;
      }
    }
    return { client_id: cfg.client_id, created, updated, skipped };
  }
  for (const listId of listIds) {
    for (let page = 0; ; page += 1) {
      const data = await cuFetch(`/list/${listId}/task?archived=false&subtasks=false&include_closed=true&page=${page}`);
      const tasks = data.tasks || [];
      if (!tasks.length) break;
      for (const t of tasks) {
        const parsed = parseTaskTitle(String(t.name || ''));
        if (!parsed) { skipped += 1; continue; }
        const row = byTask.get(String(t.id));
        const approved = isClickUpApproved(t.status);
        const fields = { ...calendarSyncFields(t, parsed.title), clickup_approved: approved };
        if (row) {
          // Delivery dates belong exclusively to the calendar, even when unset.
          const { error } = await admin.from('content_calendar_items').update(fields).eq('id', row.id).eq('client_id', cfg.client_id);
          if (error) { console.error('[sync] update fail', t.id, error.message); skipped += 1; } else updated += 1;
        } else {
          // Approved tasks never enter the backlog; retain existing pieces and history above.
          if (approved || ['closed', 'done'].includes(String(t.status?.type ?? '').toLowerCase())) {
            skipped += 1;
            continue;
          }
          const { error } = await admin.from('content_calendar_items').insert({
            client_id: cfg.client_id,
            clickup_task_id: String(t.id),
            ...fields,
            clickup_list_id: listId,
            clickup_space_id: cfg.space_id,
            clickup_sync_state: 'synced',
            content_type: parsed.contentType,
            platform: parsed.platform,
            publish_date: null,
            status: mapClickUpStatus(t.status),
          });
          if (error) { console.error('[sync] insert fail', t.id, error.message); skipped += 1; } else created += 1;
        }
      }
      if (tasks.length < 100) break;
    }
  }
  return { client_id: cfg.client_id, created, updated, skipped };
}

async function syncCalendar(reqBody: { client_id?: string }) {
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  let q = admin.from('client_clickup_config').select('client_id, space_id').not('space_id', 'is', null);
  if (reqBody?.client_id) q = q.eq('client_id', reqBody.client_id);
  const { data: configured, error } = await q;
  if (error) throw error;
  let linkedQuery = admin.from('content_calendar_items').select('client_id').not('clickup_task_id', 'is', null);
  if (reqBody?.client_id) linkedQuery = linkedQuery.eq('client_id', reqBody.client_id);
  const { data: linked, error: linkedError } = await linkedQuery;
  if (linkedError) throw linkedError;
  const configMap = new Map<string, { client_id: string; space_id: string | null }>();
  for (const cfg of configured || []) configMap.set(cfg.client_id, cfg);
  for (const row of linked || []) if (!configMap.has(row.client_id)) configMap.set(row.client_id, { client_id: row.client_id, space_id: null });
  const configs = [...configMap.values()];
  if (!configs?.length) {
    if (reqBody?.client_id) throw new Error('Este cliente no tiene un espacio de ClickUp configurado.');
    return json({ success: true, results: [] });
  }
  const results: unknown[] = [];
  for (const cfg of configs) {
    try {
      results.push(await syncClientCalendar(admin, cfg));
    } catch (e) {
      console.error('[sync] client fail', cfg.client_id, (e as Error).message);
      results.push({ client_id: cfg.client_id, error: (e as Error).message });
    }
  }
  return json({ success: true, results });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (!CLICKUP_TOKEN) throw new Error('CLICKUP_API_TOKEN no configurado');

    const reqBody = await req.json();
    const isSync = reqBody?.action === 'sync_calendar';

    // Auth: agency member JWT, or the shared sync secret (hourly cron, no user session).
    let authorized = false;
    const authHeader = req.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: claims } = await userClient.auth.getClaims(authHeader.replace('Bearer ', ''));
      if (claims?.claims?.sub) {
        const { data: isAgency } = await userClient.rpc('is_agency_member', { _user_id: claims.claims.sub });
        authorized = !!isAgency;
      }
    }
    if (!authorized && isSync) {
      const secret = Deno.env.get('CALENDAR_SYNC_SECRET');
      if (secret && req.headers.get('x-sync-secret') === secret) authorized = true;
    }
    if (!authorized) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (isSync) return await syncCalendar(reqBody);

    const {
      sheet_id,
      list_id: overrideListId,
      list_name: overrideListName,
      space_id: overrideSpaceId,
      space_name: overrideSpaceName,
      shot_ids,
      assignee_id,
    } = reqBody || {};
    if (!sheet_id || typeof sheet_id !== 'string') {
      throw new Error('sheet_id requerido');
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const sheetRes = await admin.from('production_sheets').select('*').eq('id', sheet_id).maybeSingle();
    if (sheetRes.error || !sheetRes.data) throw new Error('Sheet no encontrada');
    const sheet = sheetRes.data;

    // If client passed explicit shot_ids, honor exactly that subset AND that order
    // (the dialog lets the user set the edit order; the title gets a [N] prefix).
    let shotsQuery = admin
      .from('production_sheet_shots')
      .select('*')
      .eq('sheet_id', sheet_id)
      .order('sort_order');
    const hasExplicitOrder = Array.isArray(shot_ids) && shot_ids.length > 0;
    if (hasExplicitOrder) {
      shotsQuery = shotsQuery.in('id', shot_ids);
    } else {
      shotsQuery = shotsQuery.eq('done', true);
    }
    const shotsRes = await shotsQuery;
    let recordedShots = shotsRes.data || [];
    if (hasExplicitOrder) {
      const rank = new Map<string, number>((shot_ids as string[]).map((id, i) => [id, i]));
      recordedShots = [...recordedShots].sort(
        (a: any, b: any) => (rank.get(a.id) ?? 9999) - (rank.get(b.id) ?? 9999)
      );
    }

    if (recordedShots.length === 0) {
      throw new Error('No hay piezas para enviar.');
    }

    // References per shot (Instagram / TikTok / YouTube links) so ClickUp carries them.
    const refsByShot = new Map<string, any[]>();
    {
      const { data: refs } = await admin
        .from('production_shot_references')
        .select('shot_id, url, platform, notes, sort_order')
        .in('shot_id', recordedShots.map((s: any) => s.id))
        .order('sort_order', { ascending: true });
      for (const r of refs || []) {
        const arr = refsByShot.get(r.shot_id) || [];
        arr.push(r);
        refsByShot.set(r.shot_id, arr);
      }
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

    // Resolve assignees: explicit picker selection wins; otherwise fall back to client default emails.
    let assignees: number[] = [];
    if (typeof assignee_id === 'number' && Number.isFinite(assignee_id)) {
      assignees = [assignee_id];
    } else {
      const membersRes = await cuFetch(`/list/${listId}/member`);
      const emailToId = new Map<string, number>();
      for (const m of (membersRes.members || [])) {
        if (m.email) emailToId.set(m.email.toLowerCase(), m.id);
      }
      for (const e of defaultAssigneeEmails) {
        const id = emailToId.get(String(e).toLowerCase());
        if (id) assignees.push(id);
      }
    }

    const created: any[] = [];
    const updated: any[] = [];
    const failed: any[] = [];

    let shotIndex = 0;
    for (const shot of recordedShots) {
      shotIndex += 1;
      const typeTag = TYPE_LABEL[shot.content_type || 'otro'] || 'CONTENIDO';
      const platTag = PLATFORM_LABEL[shot.platform || ''] || '';
      const concept = shot.concept || shot.description || 'Pieza sin título';
      const title = `[${shotIndex}] [${typeTag}${platTag ? ' · ' + platTag : ''}] ${concept}`;
      const description = buildDescription(shot, sheet, refsByShot.get(shot.id) || []);

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
          const dueDate = parseClickUpDueDate(sheet.shoot_date);
          const payload: Record<string, unknown> = {
            name: title,
            description,
            assignees,
          };
          if (dueDate) payload.due_date = dueDate;

          const task = await cuFetch(`/list/${listId}/task`, {
            method: 'POST',
            body: JSON.stringify(payload),
          });
          await admin.from('production_sheet_shots').update({
            clickup_task_id: task.id,
            clickup_url: task.url,
            sent_to_clickup_at: new Date().toISOString(),
          }).eq('id', shot.id);
          created.push({ id: shot.id, task_id: task.id, url: task.url });
        }
      } catch (e) {
        const msg = (e as Error).message;
        console.error(`[clickup-create-tasks] FAIL shot=${shot.id} concept="${concept}" → ${msg}`);
        failed.push({ id: shot.id, concept, error: msg });
      }
    }

    // Mirror every sent piece into the client's publication calendar (keeps date/status/media).
    try {
      const createdById = new Map(created.map((c) => [c.id, c]));
      const okShots = recordedShots.filter((s: any) => !failed.some((f) => f.id === s.id));
      const { data: existing } = await admin
        .from('content_calendar_items').select('id, shot_id')
        .in('shot_id', okShots.map((s: any) => s.id));
      const existingByShot = new Map((existing || []).map((e: any) => [e.shot_id, e.id]));
      let i = 0;
      for (const shot of okShots) {
        i += 1;
        const c = createdById.get(shot.id);
        const fields = {
          client_id: sheet.client_id,
          sheet_id: sheet.id,
          clickup_task_id: c?.task_id || shot.clickup_task_id || null,
          clickup_url: c?.url || shot.clickup_url || null,
          title: shot.concept || shot.description || 'Pieza sin título',
          copy: shot.script || null,
          explanation: [shot.hook ? `Hook: ${shot.hook}` : null, shot.cta ? `CTA: ${shot.cta}` : null, shot.notes || null].filter(Boolean).join('\n') || null,
          platform: shot.platform || null,
          content_type: shot.content_type || null,
          sort: i,
        };
        const eid = existingByShot.get(shot.id);
        if (eid) await admin.from('content_calendar_items').update(fields).eq('id', eid);
        else await admin.from('content_calendar_items').insert({ ...fields, shot_id: shot.id, thumbnail_url: sheet.thumbnail_url || null });
      }
    } catch (e) {
      console.error('[clickup-create-tasks] calendar sync failed', (e as Error).message);
    }

    // Extra ops tasks (once per send), with their own assignee
    const opsCreated: any[] = [];
    if (reqBody?.create_ops_tasks) {
      const opsA = (reqBody?.ops_assignees || {}) as Record<string, unknown>;
      const assigneeFor = (key: string): number[] => {
        const v = opsA[key];
        if (typeof v === 'number' && Number.isFinite(v)) return [v];
        return typeof reqBody.ops_assignee_id === 'number' && Number.isFinite(reqBody.ops_assignee_id)
          ? [reqBody.ops_assignee_id] : [];
      };
      const dueDate = parseClickUpDueDate(sheet.shoot_date);
      const ctx = [
        sheet.title ? `Hoja: ${sheet.title}` : null,
        sheet.shoot_date ? `📅 Grabación: ${sheet.shoot_date}` : null,
        sheet.location ? `📍 Locación: ${sheet.location}` : null,
        `🎬 Piezas: ${recordedShots.length}`,
      ].filter(Boolean).join('\n');
      const opsTasks = [
        { key: 'material', name: `[PRODUCCIÓN] Pasar material de la memoria al servidor${sheet.title ? ' · ' + sheet.title : ''}`, description: `Descargar todo el material grabado de las memorias y subirlo al servidor.\n\n${ctx}` },
        { key: 'calendar', name: `[PRODUCCIÓN] Confirmar calendario de producción y entregas con el cliente${sheet.title ? ' · ' + sheet.title : ''}`, description: `Confirmar con el cliente las fechas de producción y de entrega de las piezas.\n\n${ctx}` },
      ];
      for (const t of opsTasks) {
        try {
          const payload: Record<string, unknown> = { name: t.name, description: t.description, assignees: assigneeFor(t.key) };
          if (dueDate) payload.due_date = dueDate;
          const task = await cuFetch(`/list/${listId}/task`, { method: 'POST', body: JSON.stringify(payload) });
          opsCreated.push({ task_id: task.id, url: task.url, name: t.name });
        } catch (e) {
          failed.push({ id: null, concept: t.name, error: (e as Error).message });
        }
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
      ops_tasks_created: opsCreated.length,
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
