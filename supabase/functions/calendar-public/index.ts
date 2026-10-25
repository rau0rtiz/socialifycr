// Public publication calendar: the client opens /calendario/<token>, sees pieces and can
// approve or request changes. Changes/approvals sync to ClickUp (status + comment).
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';
import { shouldShowCalendarPiece } from '../_shared/calendar-clickup-rules.ts';

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const CLICKUP_TOKEN = Deno.env.get('CLICKUP_API_TOKEN');

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const Body = z.discriminatedUnion('action', [
  z.object({ action: z.literal('get'), token: z.string().min(8).max(80) }),
  z.object({
    action: z.enum(['approve', 'request_changes', 'comment', 'approve_cover', 'request_cover_changes']),
    token: z.string().min(8).max(80),
    item_id: z.string().uuid(),
    name: z.string().trim().min(1).max(80),
    body: z.string().trim().max(4000).default(''),
  }),
]);

async function cu(path: string, init?: RequestInit) {
  const res = await fetch(`https://api.clickup.com/api/v2${path}`, {
    ...init,
    headers: { Authorization: CLICKUP_TOKEN!, 'Content-Type': 'application/json' },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`ClickUp ${res.status}: ${text}`);
  return text ? JSON.parse(text) : {};
}

/** Moves the task to the first list status matching any of the hints. Returns an error text or null. */
async function syncClickUp(taskId: string, hints: string[], comment: string): Promise<string | null> {
  if (!CLICKUP_TOKEN) return 'ClickUp no está configurado.';
  try {
    await cu(`/task/${taskId}/comment`, { method: 'POST', body: JSON.stringify({ comment_text: comment, notify_all: true }) });
    const task = await cu(`/task/${taskId}`);
    const list = await cu(`/list/${task.list?.id}`);
    const statuses: string[] = (list.statuses || []).map((s: any) => String(s.status));
    const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    // Prefer an exact status (e.g. "aprobado") over partial matches like "pre-aprobación".
    const match = statuses.find((s) => hints.some((h) => norm(s) === norm(h)))
      || statuses.find((s) => hints.some((h) => norm(s).includes(norm(h))));
    if (!match) return `La lista de ClickUp no tiene un estado "${hints[0]}". Crealo para que la tarea cambie sola.`;
    await cu(`/task/${taskId}`, { method: 'PUT', body: JSON.stringify({ status: match }) });
    return null;
  } catch (e) {
    console.error('[calendar-public] clickup', (e as Error).message);
    return (e as Error).message.slice(0, 300);
  }
}

/** Leaves a comment on the task without moving its status. Returns an error text or null. */
async function commentClickUp(taskId: string, comment: string): Promise<string | null> {
  if (!CLICKUP_TOKEN) return 'ClickUp no está configurado.';
  try {
    await cu(`/task/${taskId}/comment`, { method: 'POST', body: JSON.stringify({ comment_text: comment, notify_all: true }) });
    return null;
  } catch (e) {
    console.error('[calendar-public] clickup', (e as Error).message);
    return (e as Error).message.slice(0, 300);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
    const b = parsed.data;

    const { data: share } = await admin.from('content_calendar_shares').select('client_id').eq('token', b.token).maybeSingle();
    if (!share) return json({ error: 'Enlace inválido o vencido' }, 404);

    if (b.action === 'get') {
      const [{ data: client }, { data: allItems, error: itemsError }] = await Promise.all([
        admin.from('clients').select('name, logo_url').eq('id', share.client_id).maybeSingle(),
        admin.from('content_calendar_items')
          .select('id, title, copy, explanation, platform, content_type, thumbnail_url, video_url, publish_date, status, cover_status, sort, clickup_approved')
          .eq('client_id', share.client_id).order('publish_date', { nullsFirst: false }).order('sort'),
      ]);
      if (itemsError) throw itemsError;
      const items = (allItems || []).filter(shouldShowCalendarPiece);
      const ids = (items || []).map((i) => i.id);
      const { data: comments } = ids.length
        ? await admin.from('content_calendar_comments').select('id, item_id, author_name, author_type, kind, scope, body, created_at')
          .in('item_id', ids).order('created_at')
        : { data: [] };
      return json({ client, items: items || [], comments: comments || [] });
    }

    const { data: item } = await admin.from('content_calendar_items')
      .select('id, client_id, title, clickup_task_id, content_type, status, cover_status, thumbnail_url')
      .eq('id', b.item_id).maybeSingle();
    if (!item || item.client_id !== share.client_id) return json({ error: 'Pieza no encontrada' }, 404);
    if ((b.action === 'request_changes' || b.action === 'request_cover_changes') && !b.body)
      return json({ error: 'Escribí qué cambios necesitás' }, 400);

    const isCover = b.action === 'approve_cover' || b.action === 'request_cover_changes';
    const scope = isCover ? 'portada' : 'video';
    const isApprove = b.action === 'approve' || b.action === 'approve_cover';
    const kind = isApprove ? 'aprobacion' : b.action === 'comment' ? 'nota' : 'cambio';
    await admin.from('content_calendar_comments').insert({
      item_id: item.id, author_name: b.name, author_type: 'cliente', kind, scope,
      body: b.body || (kind === 'aprobacion' ? (isCover ? 'Aprobó la portada' : 'Aprobado') : ''),
    });

    if (b.action === 'comment') return json({ ok: true });

    // A piece moves to "aprobado" in ClickUp only when everything is approved:
    // video-type pieces (reel/tiktok/short) with a cover need both video and
    // cover approved; pieces without a cover only need the piece approval.
    const VIDEO_TYPES = ['reel', 'tiktok', 'short'];
    const hasCover = VIDEO_TYPES.includes(item.content_type) && !!item.thumbnail_url;
    const videoApproved = isCover ? item.status === 'aprobado' : isApprove;
    const coverApproved = isCover ? isApprove : !hasCover || item.cover_status === 'aprobada';
    const fullyApproved = isApprove && videoApproved && coverApproved;

    let syncError: string | null = null;
    if (item.clickup_task_id) {
      if (isApprove) {
        const what = isCover ? 'la portada' : 'esta pieza';
        syncError = fullyApproved
          ? await syncClickUp(item.clickup_task_id, ['aprobado', 'approved', 'aprob'],
            `✅ ${b.name} aprobó ${what} desde el calendario. Pieza completamente aprobada.${b.body ? `\n\n${b.body}` : ''}`)
          : await commentClickUp(item.clickup_task_id,
            `✅ ${b.name} aprobó ${what} desde el calendario.${hasCover ? ' Falta aprobar ' + (isCover ? 'el video' : 'la portada') + ' para marcar la tarea como aprobada.' : ''}${b.body ? `\n\n${b.body}` : ''}`);
      } else {
        syncError = await syncClickUp(item.clickup_task_id, ['editar cambios', 'cambios', 'correcc', 'changes'],
          isCover
            ? `✏️ ${b.name} pidió cambios en la portada desde el calendario:\n\n${b.body}`
            : `✏️ ${b.name} pidió cambios desde el calendario:\n\n${b.body}`);
      }
    }
    if (isCover) {
      const cover_status = isApprove ? 'aprobada' : 'cambios';
      await admin.from('content_calendar_items').update({ cover_status, clickup_sync_error: syncError }).eq('id', item.id);
      return json({ ok: true, cover_status });
    }
    const status = isApprove ? 'aprobado' : 'cambios';
    await admin.from('content_calendar_items').update({ status, clickup_sync_error: syncError }).eq('id', item.id);
    return json({ ok: true, status });
  } catch (e) {
    console.error('[calendar-public]', (e as Error).message);
    return json({ error: 'No se pudo procesar' }, 500);
  }
});
