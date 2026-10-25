import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';
import { listBelongsToSpace, publicationDueDate, calendarTaskPayload, calendarSpaceConfigFields } from '../_shared/calendar-clickup-rules.ts';

const id = z.string().regex(/^\d+$/).max(40);
const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('configure'), client_id: z.string().uuid(), workspace_id: id, space_id: id, default_assignee_emails: z.array(z.string().email()).max(30).default([]) }),
  z.object({ action: z.literal('create'), client_id: z.string().uuid(), item_id: z.string().uuid(), list_id: id, title: z.string().trim().min(1).max(255), content_type: z.enum(['reel','story','foto','post','carrusel','diseno','correo','tiktok','short','otro']), platform: z.enum(['instagram','tiktok','youtube','facebook','linkedin','google','multi']), publish_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => Number.isFinite(publicationDueDate(v))).nullable(), copy: z.string().max(30000).default(''), explanation: z.string().max(10000).default(''), video_url: z.union([z.literal(''), z.string().url().max(2000).refine(v => /^https?:\/\//i.test(v))]).default('') }),
  z.object({ action: z.literal('retry'), client_id: z.string().uuid(), item_id: z.string().uuid() }),
]);

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
class ClickUpError extends Error { constructor(public status: number, message: string) { super(message); } }
async function cu(path: string, init?: RequestInit) {
  const token = Deno.env.get('CLICKUP_API_TOKEN');
  if (!token) throw new Error('La conexión con ClickUp no está configurada.');
  const r = await fetch(`https://api.clickup.com/api/v2${path}`, { ...init, headers: { Authorization: token, 'Content-Type': 'application/json' } });
  if (!r.ok) { const body = await r.text(); console.error('ClickUp', r.status, body); throw new ClickUpError(r.status, `ClickUp rechazó la solicitud (${r.status}). Revisá permisos y la lista seleccionada.`); }
  return r.json();
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const url = Deno.env.get('SUPABASE_URL'); const anon = Deno.env.get('SUPABASE_ANON_KEY'); const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !anon || !service) throw new Error('Servicio no disponible.');
    const auth = req.headers.get('Authorization') ?? '';
    if (!auth.startsWith('Bearer ')) return json({ error: 'Iniciá sesión.' }, 401);
    const sb = createClient(url, anon, { global: { headers: { Authorization: auth } } });
    const { data: claims, error: authError } = await sb.auth.getClaims(auth.slice(7));
    if (authError || !claims?.claims?.sub) return json({ error: 'Sesión inválida.' }, 401);
    const { data: agency } = await sb.rpc('is_agency_member', { _user_id: claims.claims.sub });
    if (!agency) return json({ error: 'Acceso solo para agencia.' }, 403);
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return json({ error: 'Revisá el título, los enlaces y la selección de ClickUp.' }, 400);
    const b = parsed.data;
    const { data: client } = await sb.from('clients').select('id').eq('id', b.client_id).maybeSingle();
    if (!client) return json({ error: 'Cliente no disponible.' }, 403);
    const admin = createClient(url, service);
    if (b.action === 'configure') {
      const [spaces, teams] = await Promise.all([cu(`/team/${b.workspace_id}/space?archived=false`), cu('/team')]);
      const space = spaces.spaces?.find((s: { id: string }) => String(s.id) === b.space_id);
      const workspace = teams.teams?.find((t: { id: string }) => String(t.id) === b.workspace_id);
      if (!space || !workspace) return json({ error: 'El espacio no pertenece al workspace seleccionado.' }, 400);
      const { error } = await admin.from('client_clickup_config').upsert({ client_id: b.client_id, workspace_id: b.workspace_id, workspace_name: workspace.name, ...calendarSpaceConfigFields(space), default_assignee_emails: b.default_assignee_emails }, { onConflict: 'client_id' });
      if (error) throw error;
      return json({ ok: true });
    }
    const { data: cfg } = await admin.from('client_clickup_config').select('*').eq('client_id', b.client_id).maybeSingle();
    if (!cfg?.space_id) return json({ error: 'Primero configurá el espacio de ClickUp de este cliente.' }, 400);
    let { data: item } = await admin.from('content_calendar_items').select('*').eq('id', b.item_id).eq('client_id', b.client_id).maybeSingle();
    const listId = item?.clickup_list_id ?? (b.action === 'create' ? b.list_id : null);
    if (!listId) return json({ error: 'Seleccioná una lista.' }, 400);
    const list = await cu(`/list/${listId}`);
    if (!listBelongsToSpace(list, cfg.space_id)) return json({ error: 'Esta lista no pertenece al espacio configurado para el cliente.' }, 400);
    if (!item && b.action === 'create') {
      const { data, error } = await admin.from('content_calendar_items').upsert({ id: b.item_id, client_id: b.client_id, title: b.title, content_type: b.content_type, platform: b.platform, publish_date: b.publish_date, copy: b.copy || null, explanation: b.explanation || null, video_url: b.video_url || null, clickup_list_id: listId, clickup_space_id: cfg.space_id }, { onConflict: 'id', ignoreDuplicates: true });
      if (error) throw error;
      const read = await admin.from('content_calendar_items').select('*').eq('id', b.item_id).eq('client_id', b.client_id).single();
      if (read.error) throw read.error;
      item = read.data;
    }
    if (!item) return json({ error: 'Pieza no encontrada.' }, 404);
    if (item.clickup_task_id) return json({ ok: true, item_id: item.id, task_url: item.clickup_url });
    const { data: claimed, error: claimError } = await admin.rpc('claim_calendar_clickup_sync', { p_item_id: item.id, p_client_id: b.client_id });
    if (claimError) throw claimError;
    if (!claimed) return json({ saved: true, item_id: item.id, error: 'La sincronización está en curso o requiere revisión. No se creará otra tarea.' });
    let task;
    try {
      task = await cu(`/list/${listId}/task`, { method: 'POST', body: JSON.stringify(calendarTaskPayload(item)) });
    } catch (e) {
      const safeRetry = e instanceof ClickUpError && e.status >= 400 && e.status < 500;
      await admin.from('content_calendar_items').update({ clickup_sync_state: safeRetry ? 'failed' : 'syncing', clickup_sync_error: safeRetry ? (e as Error).message : 'ClickUp no confirmó la creación. Revisar la lista antes de reintentar para evitar duplicados.' }).eq('id', item.id).eq('client_id', b.client_id);
      return json({ saved: true, item_id: item.id, error: safeRetry ? (e as Error).message : 'La pieza se guardó. ClickUp requiere revisión antes de reintentar.' });
    }
    const { error: saveError } = await admin.from('content_calendar_items').update({ clickup_task_id: task.id, clickup_url: task.url, clickup_sync_state: 'synced', clickup_sync_error: null }).eq('id', item.id).eq('client_id', b.client_id);
    if (saveError) return json({ saved: true, item_id: item.id, error: 'La tarea se creó en ClickUp, pero falta guardar su vínculo. No vuelvas a crearla.', task_url: task.url });
    return json({ ok: true, item_id: item.id, task_url: task.url });
  } catch (e) { return json({ error: (e as Error).message }, 400); }
});