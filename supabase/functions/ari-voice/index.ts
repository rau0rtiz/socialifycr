import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { generateChatCompletion, GatewayError, type GeminiChatMessage, type GeminiChatFields } from '@lovable.dev/ai-gateway';
import type {} from './generated/models.d.ts';
import { z } from 'npm:zod@3';
import { piecePatch, moveText, positionBetween } from './production-rules.ts';
import { encodeBase64 } from 'jsr:@std/encoding@1/base64';

// Ari voice assistant: speech -> text (ElevenLabs) -> cheap tool-calling model -> actions via caller RLS -> speech.
const MODEL = 'google/gemini-3.8-flash';
const VOICE_ID = 'EXAVITQu4vr4xnSDxMaL'; // Sarah
const APP_URL = 'https://app.socialifycr.com';
const MAX_AUDIO = 10 * 1024 * 1024;
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), {
  status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

const SECTIONS: Record<string, string> = {
  resumen: '/agencia', producciones: '/agencia/producciones', documentacion: '/agencia/documentacion',
  calendario: '/agencia/calendario', chats: '/agencia/chats', clientes: '/agencia/clientes',
  crm: '/agencia/crm', pagos: '/agencia/pagos', dashboards: '/agencia/dashboards-clientes',
  funnels: '/agencia/funnels', comunicaciones: '/agencia/comunicaciones', ajustes: '/agencia/ajustes',
};

const textProperties = Object.fromEntries(['concept','description','hook','script','cta','tech_notes','content_type','platform','duration_estimate','file_names','notes'].map(k => [k, { type: 'string' }]));
const fieldSchema = { type: 'object', properties: { ...textProperties, done: { type: 'boolean' }, is_draft: { type: 'boolean' } }, additionalProperties: false };
const tool = (name: string, description: string, properties: Record<string, unknown>, required: string[] = []) => ({ type: 'function' as const, function: { name, description, parameters: { type: 'object', properties, required, additionalProperties: false } } });
const str = { type: 'string' };
const tools: GeminiChatFields['tools'] = [
  tool('navigate','Abrir sección del panel.',{section:{type:'string',enum:Object.keys(SECTIONS)}},['section']),
  tool('create_production_sheet','Crear hoja: título breve, nunca toda la instrucción. Devuelve su ID; agrega piezas con add_piece.',{client_id:str,title:str,shoot_date:str,notes:str},['client_id','title']),
  tool('list_recent_sheets','Buscar hojas por cliente y/o título. Usa esto para encontrar una hoja antes de editar.',{client_id:str,search:str}),
  tool('read_production_sheet','Leer hoja y TODAS sus piezas en orden, con IDs y campos actuales. Obligatorio antes de corregir o editar piezas existentes.',{sheet_id:str},['sheet_id']),
  tool('update_production_sheet','Editar título, fecha, lugar, hora, productor o notas de una hoja existente. No crear otra para una corrección.',{sheet_id:str,changes:{type:'object',properties:Object.fromEntries(['title','shoot_date','location','call_time','producer_name','notes'].map(k=>[k,str])),additionalProperties:false}},['sheet_id','changes']),
  tool('add_piece','Agregar pieza. concept = título breve; description = descripción; tech_notes = instrucciones de rodaje/edición; hook = primera frase; script = guion; cta = llamado; content_type = reel/story/post/tiktok/short/foto/carrusel/diseno/correo/otro. No mezclar los campos. Devuelve piece_id.',{sheet_id:str,...textProperties},['sheet_id','concept']),
  tool('update_piece','Corregir una pieza existente identificada por ID después de leer la hoja. Cambiar únicamente los campos pedidos, nunca crear duplicado. concept es título, no descripción.',{sheet_id:str,piece_id:str,changes:fieldSchema},['sheet_id','piece_id','changes']),
  tool('move_piece_text','Trasladar o copiar literalmente texto entre campos de la MISMA pieza, conservando notas previas. Puede vaciar el origen si clear_source=true. Para corregir título usar update_piece luego.',{sheet_id:str,piece_id:str,from:{type:'string',enum:['description','hook','script','cta','tech_notes','notes']},to:{type:'string',enum:['description','hook','script','cta','tech_notes','notes']},clear_source:{type:'boolean'}},['sheet_id','piece_id','from','to','clear_source']),
  tool('reorder_piece','Mover una pieza a una posición (1 = primera) dentro de su hoja.',{sheet_id:str,piece_id:str,position:{type:'integer',minimum:1}},['sheet_id','piece_id','position']),
  tool('move_piece_to_sheet','Mover pieza a otra hoja del MISMO cliente. No mueve datos entre clientes.',{sheet_id:str,piece_id:str,destination_sheet_id:str},['sheet_id','piece_id','destination_sheet_id']),
  tool('set_ari_instagram','Encender o apagar las respuestas automáticas de Ari en Instagram.',{on:{type:'boolean'}},['on']),
  tool('get_calendar_link','Obtener enlace compartido del calendario.',{client_id:str},['client_id']),
  tool('show_copy_text','Mostrar texto listo para copiar y enviar; no leerlo en voz alta.',{text:str},['text']),
];
const argsSchema = z.object({sheet_id:z.string().optional(),piece_id:z.string().uuid().optional(),client_id:z.string().uuid().optional(),title:z.string().max(180).optional(),search:z.string().max(150).optional(),changes:z.record(z.unknown()).optional(),from:z.string().optional(),to:z.string().optional(),clear_source:z.boolean().optional(),position:z.number().int().positive().optional(),destination_sheet_id:z.string().uuid().optional(),section:z.string().optional(),on:z.boolean().optional(),text:z.string().optional(),shoot_date:z.string().optional(),notes:z.string().optional()}).passthrough();

const slugToken = () => crypto.randomUUID().replace(/-/g, '').slice(0, 20);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const auth = req.headers.get('Authorization');
    if (!auth?.startsWith('Bearer ')) return json({ error: 'Iniciá sesión.' }, 401);
    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
    const { data: claims } = await db.auth.getClaims(auth.slice(7));
    const uid = claims?.claims?.sub;
    if (!uid) return json({ error: 'Tu sesión venció.' }, 401);
    const { data: isAgency } = await db.rpc('is_agency_member', { _user_id: uid });
    if (!isAgency) return json({ error: 'Solo para el equipo de agencia.' }, 403);
    const elKey = Deno.env.get('ELEVENLABS_API_KEY');
    if (!elKey) return json({ error: 'Falta configurar la voz o la IA.' }, 503);

    const form = await req.formData();
    const path = String(form.get('path') ?? '').slice(0, 200);
    const speak = form.get('speak') !== 'false';
    let history: { role: string; content: string }[] = [];
    try { history = JSON.parse(String(form.get('history') ?? '[]')).filter((m: any) => ['user', 'assistant'].includes(m?.role) && typeof m.content === 'string').map((m: any) => ({ role: m.role, content: m.content })); } catch { /* ignore */ }

    let text = String(form.get('text') ?? '').trim().slice(0, 2000);
    const audio = form.get('audio');
    if (!text && audio instanceof File && audio.size > 0) {
      if (audio.size > MAX_AUDIO) return json({ error: 'Audio muy largo.' }, 413);
      const up = new FormData();
      up.append('file', audio); up.append('model_id', 'scribe_v2'); up.append('language_code', 'spa');
      const r = await fetch('https://api.elevenlabs.io/v1/speech-to-text', { method: 'POST', headers: { 'xi-api-key': elKey }, body: up });
      if (!r.ok) { const d = await r.text(); console.error(`STT [${r.status}] ${d}`); return json({ error: 'No pude escucharte.', details: d }, r.status); }
      text = String((await r.json()).text ?? '').trim();
    }
    if (!text) return json({ error: 'No escuché nada.' }, 422);

    const { data: profile } = await db.from('profiles').select('full_name').eq('id', uid).maybeSingle();
    const firstName = String((profile as any)?.full_name ?? '').split(' ')[0] || '';
    const { data: clients } = await db.from('clients').select('id, name').order('name').limit(200);
    let currentSheet = path.match(/producciones\/([0-9a-f-]{36})/)?.[1] ?? null;

    const system = `Sos Ari, asistente de Socialify en Costa Rica. Español tico, breve y cálido. Usuario: ${firstName}.
Solo herramientas reales, sin internet, sin inventar resultados. Primero lee la hoja existente y sus piezas; para corregir reutiliza sus IDs. Conserva cualquier texto no solicitado. Cada hoja pertenece a un cliente: nunca mezcles clientes. Si un nombre es ambiguo, pregunta.
MAPA: concept = título corto de la pieza; description = descripción del video; tech_notes = rodaje, tomas, zoom, limpieza de audio y edición; hook = frase inicial; script = guion hablado; cta = llamado a la acción; content_type = tipo de pieza; platform = plataforma.
Si te dictan instrucciones largas, separa todos los datos en sus campos, no pongas el dictado completo como título. No inventes guion ni contenido. Si piden mover una descripción a notas, usa move_piece_text y conserva literalmente el texto y las notas previas. Para renombrar usa update_piece. Para cambiar título de hoja usa update_production_sheet. Ante "te equivocaste", lee el estado y corrige, no recrees.
Al crear hoja y piezas, usa el sheet_id devuelto. Si la hoja ya existe porque la acabas de crear, no la dupliques. Antes de herramientas de escritura incluye una frase breve de lo que vas a hacer en content, en futuro ("Claro, voy a cambiar el título y conservar las notas"). Después resume SOLO resultados verificados; si una herramienta falla, dilo, no digas listo. No envíes correos ni publiques en ClickUp: no tienes esas herramientas.
Ruta: ${path}. Hoja abierta: ${currentSheet ?? 'ninguna'}.
Clientes: ${(clients ?? []).map((c: {id:string;name:string}) => `${c.id}: ${c.name}`).join('; ')}.
Para planes/documentación y dashboards puedes abrir su sección, no crearlos todavía.`;
    const messages: GeminiChatMessage[] = [{ role: 'system', content: system }, ...history.map(m => ({role:m.role === 'user' ? 'user' as const : 'assistant' as const, content:m.content})), { role: 'user', content: text }];
    let navigateTo: string | null = null;
    let link: string | null = null;
    let copyText: string | null = null;
    const done: string[] = [];
    const loaded = new Map<string, {sheet: Record<string, unknown>; pieces: Record<string, unknown>[]} >();
    const getSheet = async (id: string | undefined) => {
      const sheetId = id === 'current' ? currentSheet : id;
      if (!sheetId || !z.string().uuid().safeParse(sheetId).success) throw new Error('Seleccioná una hoja válida.');
      const {data,error} = await db.from('production_sheets').select('*').eq('id',sheetId).single();
      if (error || !data) throw new Error('Hoja no encontrada o sin acceso.');
      return data;
    };
    const getPiece = async (sheetId: string, pieceId: string | undefined) => {
      if (!loaded.has(sheetId)) throw new Error('Primero lee la hoja y sus piezas antes de editarlas.');
      const {data,error} = await db.from('production_sheet_shots').select('*').eq('sheet_id',sheetId).eq('id',pieceId ?? '').single();
      if (error || !data) throw new Error('La pieza no pertenece a esta hoja o no tenés acceso.');
      return data;
    };
    const checkedUpdate = async (row: Record<string,unknown>, patch: Record<string,unknown>) => {
      let q = db.from('production_sheet_shots').update(patch).eq('id',row.id).eq('sheet_id',row.sheet_id);
      for (const key of Object.keys(patch)) {
        q = row[key] === null ? q.is(key,null) : q.eq(key,row[key]);
      }
      const {data,error} = await q.select('*').single();
      if (error || !data) throw new Error('No se guardó: la pieza cambió mientras editabas. Lee la hoja antes de repetir.');
      done.push('sheet:'+row.sheet_id,'sheets');
      return {ok:true,piece:data};
    };

    const run = async (name: string, raw: unknown): Promise<unknown> => {
      const a = argsSchema.parse(raw);
      const rawObject = z.record(z.unknown()).parse(raw);
      if (name === 'navigate') { navigateTo = SECTIONS[a.section ?? ''] ?? null; return { ok: !!navigateTo }; }
      if (name === 'create_production_sheet') {
        if (!a.client_id || !a.title?.trim()) throw new Error('Falta cliente o título.');
        if (!(clients ?? []).some(c=>c.id===a.client_id)) throw new Error('Cliente no disponible.');
        const { data, error } = await db.from('production_sheets').insert({ client_id: a.client_id, title: a.title, shoot_date:a.shoot_date ?? null, notes:a.notes ?? null,created_by:uid }).select('*').single();
        if (error) throw new Error(error.message);
        currentSheet=data.id; navigateTo = `/agencia/producciones/${data.id}`; done.push('sheets'); return { ok: true, sheet_id: data.id };
      }
      if (name === 'read_production_sheet') {
        const sheet = await getSheet(a.sheet_id);
        const {data:pieces,error} = await db.from('production_sheet_shots').select('*').eq('sheet_id',sheet.id).order('sort_order').order('id');
        if (error) throw new Error(error.message);
        loaded.set(sheet.id,{sheet,pieces:pieces ?? []});
        return {sheet,pieces:pieces?.map((p,i)=>({...p,position:i+1}))};
      }
      if (name === 'update_production_sheet') {
        const sheet=await getSheet(a.sheet_id);
        const patch=z.object({title:z.string().min(1).max(180).optional(),shoot_date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),location:z.string().nullable().optional(),call_time:z.string().nullable().optional(),producer_name:z.string().nullable().optional(),notes:z.string().nullable().optional()}).strict().parse(a.changes);
        if (!Object.keys(patch).length) throw new Error('No hay cambios');
        const {data,error}=await db.from('production_sheets').update(patch).eq('id',sheet.id).eq('client_id',sheet.client_id).select('*').single();
        if(error) throw new Error(error.message); done.push('sheets','sheet:'+sheet.id);return {ok:true,sheet:data};
      }
      if (name === 'add_piece') {
        const sheet=await getSheet(a.sheet_id);
        const fields=Object.fromEntries(Object.entries(rawObject).filter(([k])=>k!=='sheet_id'));
        const patch=piecePatch(fields);
        if(!patch.concept) throw new Error('Falta título breve en concept');
        const {data:last,error:lastError}=await db.from('production_sheet_shots').select('sort_order').eq('sheet_id',sheet.id).order('sort_order',{ascending:false}).limit(1).maybeSingle();
        if(lastError) throw new Error(lastError.message);
        const {data,error}=await db.from('production_sheet_shots').insert({sheet_id:sheet.id,...patch,description:patch.description ?? patch.concept,sort_order:(last?.sort_order ?? -1)+1}).select('*').single();
        if(error) throw new Error(error.message);
        done.push('sheet:'+sheet.id);navigateTo=`/agencia/producciones/${sheet.id}`;return {ok:true,piece:data,piece_id:data.id};
      }
      if (['update_piece','move_piece_text','reorder_piece','move_piece_to_sheet'].includes(name)) {
        const sheet=await getSheet(a.sheet_id);const piece=await getPiece(sheet.id,a.piece_id);
        if(name==='update_piece') return await checkedUpdate(piece,piecePatch(a.changes ?? {}));
        if(name==='move_piece_text') {
          const fields=['description','hook','script','cta','tech_notes','notes'];
          if(!a.from || !a.to || a.from===a.to || !fields.includes(a.from) || !fields.includes(a.to)) throw new Error('Campos de traslado inválidos');
          const patch:Record<string,unknown>={[a.to]:moveText(piece[a.from],piece[a.to])};
          if(a.clear_source) patch[a.from]='';
          return await checkedUpdate(piece,patch);
        }
        if(name==='move_piece_to_sheet') {
          const destination=await getSheet(a.destination_sheet_id);
          if(destination.client_id!==sheet.client_id) throw new Error('No se pueden trasladar piezas entre clientes.');
          if(destination.id===sheet.id) throw new Error('La pieza ya está en esa hoja');
          const {data:last,error}=await db.from('production_sheet_shots').select('sort_order').eq('sheet_id',destination.id).order('sort_order',{ascending:false}).limit(1).maybeSingle();
          if(error) throw new Error(error.message);
          const out=await checkedUpdate(piece,{sheet_id:destination.id,sort_order:(last?.sort_order ?? -1)+1});done.push('sheet:'+destination.id);return out;
        }
        const {data:rows,error}=await db.from('production_sheet_shots').select('id,sort_order').eq('sheet_id',sheet.id).order('sort_order').order('id');
        if(error) throw new Error(error.message);
        if(!a.position || a.position>(rows?.length ?? 0)) throw new Error('Posición fuera de la hoja');
        const rest=(rows ?? []).filter(p=>p.id!==piece.id);const i=a.position-1;
        return await checkedUpdate(piece,{sort_order:positionBetween(rest[i-1]?.sort_order,rest[i]?.sort_order)});
      }
      if (name === 'set_ari_instagram') {
        const { error } = await db.from('msg_settings').update({ bot_mode: a.on ? 'automatico' : 'borrador', auto_send_enabled: !!a.on, updated_by: uid } as any).eq('id', true);
        if (error) return { error: error.message }; done.push('msg'); return { ok: true };
      }
      if (name === 'get_calendar_link') {
        let { data } = await db.from('content_calendar_shares').select('token').eq('client_id', a.client_id).maybeSingle();
        if (!data) { const r = await db.from('content_calendar_shares').insert({ client_id: a.client_id, token: slugToken() } as any).select('token').single(); if (r.error) return { error: r.error.message }; data = r.data; }
        link = `${APP_URL}/calendario/${(data as any).token}`; return { ok: true, url: link, note: 'El link se muestra en pantalla; no lo leas completo.' };
      }
      if (name === 'show_copy_text') { copyText = String(a.text ?? '').slice(0, 4000) || null; return { ok: true, note: 'El texto ya está en pantalla para copiar; no lo leas, solo decí que está listo.' }; }
      if (name === 'list_recent_sheets') {
        let q = db.from('production_sheets').select('id, title, client_id, updated_at').order('updated_at', { ascending: false }).limit(8);
        if (a.client_id) q = q.eq('client_id', a.client_id);
        if (a.search) q=q.ilike('title','%'+a.search.replace(/[%_]/g,'')+'%');
        const { data, error } = await q; return error ? { error: error.message } : data;
      }
      return { error: 'Herramienta desconocida' };
    };

    // Every new turn starts from the current stored sheet, not stale chat history.
    if (currentSheet) {
      const sheet = await getSheet(currentSheet);
      const {data:pieces,error} = await db.from('production_sheet_shots').select('*').eq('sheet_id',sheet.id).order('sort_order').order('id');
      if(error) throw new Error(error.message);
      loaded.set(sheet.id,{sheet,pieces:pieces ?? []});
      messages.splice(1,0,{role:'system',content:'Lectura actual verificada de la hoja abierta: '+JSON.stringify({sheet,pieces:pieces?.map((p,i)=>({...p,position:i+1}))})});
    }
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const emit = (event: Record<string,unknown>) => controller.enqueue(encoder.encode(JSON.stringify(event)+'\n'));
        emit({type:'transcript',text});
        let reply=''; let completed=false; let failures=false;
        try {
          for (let i=0;i<12;i++) {
            const response=await generateChatCompletion({model:MODEL,messages,tools});
            const msg=response.choices?.[0]?.message;
            if(!msg) throw new Error('La IA no devolvió respuesta');
            const calls=msg.tool_calls?.filter(tc=>tc.type==='function') ?? [];
            if(calls.length) {
              messages.push({role:'assistant',content:typeof msg.content==='string'?msg.content:null,tool_calls:calls});
              for(const tc of calls) {
                const name=tc.function.name;
                const writes=['create_production_sheet','update_production_sheet','add_piece','update_piece','move_piece_text','reorder_piece','move_piece_to_sheet','set_ari_instagram'];
                const intentions:Record<string,string>={create_production_sheet:'Claro, voy a crear la hoja de producción.',add_piece:'Voy a agregar la pieza con cada dato en su campo.',update_piece:'Voy a corregir los campos de esa pieza.',move_piece_text:'Voy a trasladar el texto conservando las notas existentes.',reorder_piece:'Voy a cambiar el orden de esa pieza.',update_production_sheet:'Voy a actualizar esa hoja.',move_piece_to_sheet:'Voy a mover la pieza a la otra hoja.',set_ari_instagram:'Voy a cambiar el modo de Ari en Instagram.'};
                if(writes.includes(name)) emit({type:'intent',text:typeof msg.content==='string' && msg.content.trim()?msg.content:intentions[name]});
                let out:unknown;
                try {out=await run(name,JSON.parse(tc.function.arguments || '{}'));}
                catch(e) {failures=true;out={error:e instanceof Error?e.message:'No se pudo guardar'};}
                messages.push({role:'tool',tool_call_id:tc.id,content:JSON.stringify(out)});
                emit({type:'tool_result',name,result:out,invalidate:[...new Set(done)]});
              }
              continue;
            }
            reply=typeof msg.content==='string'?msg.content.trim():'';completed=true;break;
          }
          if(!completed) throw new Error('No terminé todos los pasos. Revisá lo guardado antes de repetir el pedido.');
          if(!reply) reply=failures?'No pude completar todos los cambios. Revisá la hoja.':'No tengo una respuesta para ese pedido.';
          emit({type:'reply',text:reply,navigate:navigateTo,link,copy:copyText,invalidate:[...new Set(done)]});
          if(speak) {
            const t=await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_64`,{method:'POST',headers:{'xi-api-key':elKey,'Content-Type':'application/json'},body:JSON.stringify({text:reply.slice(0,600),model_id:'eleven_flash_v2_5'})});
            if(t.ok) emit({type:'audio',audio:encodeBase64(new Uint8Array(await t.arrayBuffer()))});
            else console.error(`TTS [${t.status}] ${await t.text()}`);
          }
          emit({type:'done'});
        } catch(e) {
          console.error('ari-voice failed',e);
          const message=e instanceof GatewayError ? (e.httpStatus===402?'Se acabaron los créditos de IA.':e.httpStatus===429?'La IA está ocupada. Probá más tarde.':'La IA no completó el pedido; revisá los cambios guardados antes de repetir.') : e instanceof Error?e.message:'Algo falló.';
          emit({type:'error',error:message,invalidate:[...new Set(done)]});
        } finally {controller.close();}
      }
    });
    if (form.get('stream') !== '1') {
      // Older installed/published clients expect a single JSON reply.
      const raw = await new Response(stream).text();
      const out: Record<string, unknown> = { transcript: text, invalidate: [] };
      let failed: string | null = null;
      for (const l of raw.split('\n')) {
        if (!l.trim()) continue;
        const ev = JSON.parse(l);
        if (ev.type === 'reply') Object.assign(out, { reply: ev.text, link: ev.link, copy: ev.copy, navigate: ev.navigate, invalidate: ev.invalidate ?? [] });
        else if (ev.type === 'audio') out.audio = ev.audio;
        else if (ev.type === 'error') { failed = ev.error; out.invalidate = ev.invalidate ?? []; }
      }
      if (failed) return json({ ...out, error: failed }, 500);
      return json(out);
    }
    return new Response(stream,{headers:{...corsHeaders,'Content-Type':'application/x-ndjson','Cache-Control':'no-cache'}});
  } catch(e) {
    console.error('ari-voice failed',e);
    return json({error:e instanceof Error?e.message:'Algo falló, probá de nuevo.'},500);
  }
});
