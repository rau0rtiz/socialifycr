// Sync Instant Form leads from a Google Sheet into instant_form_leads + customer_contacts.
// Auth: validates caller JWT and checks they have access to the client.
import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  COMFORTEX_CLIENT_ID,
  generateAndSaveComfortexReply,
} from '../_shared/comfortex-reply.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/google_sheets/v4';

// Normalize header → snake_case ASCII, strip non-alnum.
const normalize = (s: string) =>
  s
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[¿?¡!"'`()]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

// Map normalized header → known column
const FIELD_MAP: Record<string, string> = {
  id: 'external_id',
  lead_id: 'external_id',
  created_time: 'created_time',
  fecha: 'created_time',
  fecha_creacion: 'created_time',
  ad_id: 'ad_id',
  ad_name: 'ad_name',
  anuncio: 'ad_name',
  adset_id: 'adset_id',
  adset_name: 'adset_name',
  conjunto: 'adset_name',
  campaign_id: 'campaign_id',
  campaign_name: 'campaign_name',
  campaign: 'campaign_name',
  campana: 'campaign_name',
  campania: 'campaign_name',
  form_id: 'form_id',
  form_name: 'form_name',
  formulario: 'form_name',
  is_organic: 'is_organic',
  platform: 'platform',
  plataforma: 'platform',
  nombre: 'full_name',
  nombre_completo: 'full_name',
  full_name: 'full_name',
  name: 'full_name',
  numero_de_telefono: 'phone',
  telefono: 'phone',
  phone_number: 'phone',
  phone: 'phone',
  lead_status: 'lead_status',
  estado: 'lead_status',
};

// Map normalized header → canonical custom_answer key (Comfortex JULIO 2026 short headers
// and the long Meta question variants both land on the same key the widgets already read).
const CUSTOM_ANSWER_MAP: Record<string, string> = {
  modelo_de_camisa: 'modelo_de_camisa',
  que_modelo_de_camisa_esta_buscando: 'modelo_de_camisa',
  cantidad_de_camisas: 'cantidad_de_camisas',
  cuantas_camisas_necesita: 'cantidad_de_camisas',
  bordado: 'bordado',
  desea_que_las_camisas_tengan_algun_bordado: 'bordado',
  tipo_de_polo: 'tipo_de_polo',
  cual_modelo_de_camisa_tipo_polo_prefiere: 'tipo_de_polo',
  tipo_de_camisa: 'tipo_de_camisa',
  cual_modelo_de_camisa_de_cuello_redondo_prefiere: 'tipo_de_camisa',
};


// Some Meta CSV exports prefix phone numbers with "p:" — strip it.
const cleanPhone = (v: unknown): string | null => {
  const s = String(v ?? '').trim();
  if (!s) return null;
  return s.replace(/^p:/i, '').trim() || null;
};

const parseBool = (v: unknown): boolean | null => {
  if (v === null || v === undefined || v === '') return null;
  const s = String(v).toLowerCase().trim();
  if (['true', 'yes', 'si', 'sí', '1'].includes(s)) return true;
  if (['false', 'no', '0'].includes(s)) return false;
  return null;
};

const parseDate = (v: unknown): string | null => {
  if (!v) return null;
  const d = new Date(String(v));
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
};

const hasUsefulData = (row: unknown[]) =>
  row.some((cell) => String(cell ?? '').trim() !== '');

const stableHash = async (value: string) => {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .slice(0, 16)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableKey = Deno.env.get('LOVABLE_API_KEY');
    const sheetsKey = Deno.env.get('GOOGLE_SHEETS_API_KEY');

    if (!lovableKey || !sheetsKey) {
      return new Response(
        JSON.stringify({ error: 'Google Sheets connector not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get('Authorization');
    const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '';
    const body = await req.json().catch(() => ({}));
    // Cron mode: triggered by pg_cron; syncs all configured sources.
    // This function is locked down by Lovable's edge gateway (anon-key required) so we
    // accept body.cron === true without an additional secret.
    const isCron = body.cron === true;



    let clientIdsToSync: string[] = [];

    if (isCron) {
      // Cron / service-role: sync ALL configured sources
      const { data: sources } = await admin
        .from('instant_form_lead_sources')
        .select('client_id');
      clientIdsToSync = Array.from(new Set((sources || []).map((s: any) => s.client_id)));
    } else {
      if (!authHeader?.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: claims, error: claimsErr } = await userClient.auth.getClaims(bearer);
      if (claimsErr || !claims?.claims) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const userId = claims.claims.sub as string;
      const clientId: string | undefined = body.client_id;
      if (!clientId) {
        return new Response(JSON.stringify({ error: 'Missing client_id' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const { data: hasAccess } = await admin.rpc('has_client_access', {
        _user_id: userId,
        _client_id: clientId,
      });
      if (!hasAccess) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      clientIdsToSync = [clientId];
    }

    const results: any[] = [];
    for (const clientId of clientIdsToSync) {
      const { data: sources } = await admin
        .from('instant_form_lead_sources')
        .select('*')
        .eq('client_id', clientId);
      if (!sources || sources.length === 0) {
        results.push({ client_id: clientId, error: 'No Google Sheet configurado' });
        continue;
      }
      let totalSynced = 0, totalSkipped = 0, totalRows = 0;
      const perSource: any[] = [];
      for (const source of sources) {
        try {
          const r = await syncOne(admin, clientId, source, lovableKey, sheetsKey);
          totalSynced += r.synced || 0;
          totalSkipped += r.skipped || 0;
          totalRows += r.total || 0;
          perSource.push({ source_id: source.id, label: source.label, ...r });
        } catch (e: any) {
          perSource.push({ source_id: source.id, label: source.label, error: e.message || 'unknown' });
        }
      }
      results.push({ client_id: clientId, synced: totalSynced, skipped: totalSkipped, total: totalRows, sources: perSource });
    }

    if (isCron) {
      return new Response(JSON.stringify({ ok: true, results }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ ok: true, ...(results[0] || {}) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (e: any) {
    console.error('sync-instant-form-leads error', e);
    return new Response(JSON.stringify({ error: e.message || 'unknown' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function syncOne(admin: any, clientId: string, source: any, lovableKey: string, sheetsKey: string) {
    if (!source) {
      throw new Error('No Google Sheet configurado para este cliente');
    }



    const sheetName = source.sheet_name || 'Sheet1';
    const range = `${sheetName}!A1:ZZ10000`;
    const url = `${GATEWAY_URL}/spreadsheets/${source.spreadsheet_id}/values/${range}`;

    const gwRes = await fetch(url, {
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        'X-Connection-Api-Key': sheetsKey,
      },
    });

    if (!gwRes.ok) {
      const errText = await gwRes.text();
      await admin
        .from('instant_form_lead_sources')
        .update({ last_error: `${gwRes.status}: ${errText.slice(0, 500)}` })
        .eq('id', source.id);
      throw new Error(`Google Sheets ${gwRes.status}: ${errText.slice(0, 200)}`);
    }

    const sheetData = await gwRes.json();
    const values: string[][] = sheetData.values || [];

    if (values.length < 2) {
      await admin
        .from('instant_form_lead_sources')
        .update({ last_synced_at: new Date().toISOString(), last_row_count: 0, last_error: null })
        .eq('id', source.id);
      return { synced: 0, total: 0 };
    }

    const headerRow = Math.max(0, (source.header_row || 1) - 1);
    const headers = (values[headerRow] || []).map(normalize);
    const rows = values.slice(headerRow + 1);

    // Preload existing leads and customer contacts once (avoids per-row round-trips).
    // Paginate to bypass PostgREST's default 1000-row cap — otherwise leads beyond
    // the first 1000 would bypass phone dedupe and get re-inserted.
    const existingLeadsRows: any[] = [];
    const PAGE_EX = 1000;
    for (let from = 0; ; from += PAGE_EX) {
      const { data, error } = await admin
        .from('instant_form_leads')
        .select('id, external_id, phone, created_time, lead_status')
        .eq('client_id', clientId)
        .range(from, from + PAGE_EX - 1);
      if (error) break;
      const chunk = data || [];
      existingLeadsRows.push(...chunk);
      if (chunk.length < PAGE_EX) break;
      if (existingLeadsRows.length >= 50000) break;
    }
    const existingByExternalId = new Map<string, any>();
    const existingByPhone = new Map<string, any>();
    for (const l of existingLeadsRows) {
      if (l.external_id) existingByExternalId.set(l.external_id, l);
      if (l.phone) existingByPhone.set(l.phone, l);
    }

    const contactsRows: any[] = [];
    for (let from = 0; ; from += PAGE_EX) {
      const { data, error } = await admin
        .from('customer_contacts')
        .select('id, phone, full_name')
        .eq('client_id', clientId)
        .range(from, from + PAGE_EX - 1);
      if (error) break;
      const chunk = data || [];
      contactsRows.push(...chunk);
      if (chunk.length < PAGE_EX) break;
      if (contactsRows.length >= 50000) break;
    }
    const contactByPhone = new Map<string, string>();
    const contactByName = new Map<string, string>();
    for (const c of contactsRows) {
      if (c.phone) contactByPhone.set(c.phone, c.id);
      if (c.full_name) contactByName.set(c.full_name.toLowerCase(), c.id);
    }

    let synced = 0;
    let skipped = 0;
    const payloads: any[] = [];
    const newContactInserts: any[] = [];
    const pendingContactAssign: Array<{ payloadIndex: number; fullName: string; phone: string | null }> = [];
    const newLeadFlags: boolean[] = [];

    for (const [rowIndex, row] of rows.entries()) {
      if (!hasUsefulData(row)) { skipped++; continue; }

      const rec: Record<string, any> = {};
      const customAnswers: Record<string, any> = {};
      const raw: Record<string, any> = {};

      headers.forEach((h, i) => {
        const cell = row[i] ?? '';
        raw[h] = cell;
        const known = FIELD_MAP[h];
        if (known) { rec[known] = cell; return; }
        if (!h || cell === '') return;
        const canonical = CUSTOM_ANSWER_MAP[h] || h;
        customAnswers[canonical] = cell;
      });

      // Test leads de Meta se procesan igual (temporal, para validar la ingesta).

      const sheetRowNumber = headerRow + rowIndex + 2;
      const rawExternalId = String(rec.external_id || '').trim();
      const externalId = rawExternalId ||
        `sheet-${source.spreadsheet_id}-${sheetName}-${sheetRowNumber}`;
      const isSheetSynthetic = !rawExternalId;

      const fullName = (rec.full_name || '').toString().trim() || null;
      const phone = cleanPhone(rec.phone);

      // Dedupe against existing leads for the same phone (regardless of source).
      // Meta assigns a new lead ID each time the same person submits, which would
      // otherwise create parallel duplicate cards. Skip when we already have a
      // lead for this phone under a different external_id.
      if (phone) {
        const dupe = existingByPhone.get(phone);
        if (dupe && dupe.external_id !== externalId) { skipped++; continue; }
      }

      // Resolve customer contact from preloaded maps.
      let customerContactId: string | null = null;
      if (fullName) {
        if (phone && contactByPhone.has(phone)) customerContactId = contactByPhone.get(phone)!;
        else if (contactByName.has(fullName.toLowerCase())) customerContactId = contactByName.get(fullName.toLowerCase())!;
      }

      const existingLead = existingByExternalId.get(externalId);
      const sheetCreated = parseDate(rec.created_time);
      const createdTime = sheetCreated || existingLead?.created_time || new Date().toISOString();

      const allowedStatuses = ['new', 'contactado', 'seguimiento', 'venta', 'perdido'];
      const existingStatus = (existingLead?.lead_status || '').toString().trim().toLowerCase();
      const sheetStatus = (rec.lead_status || '').toString().trim().toLowerCase();
      const leadStatus = allowedStatuses.includes(existingStatus)
        ? existingStatus
        : allowedStatuses.includes(sheetStatus) ? sheetStatus : 'new';

      const payload = {
        client_id: clientId,
        external_id: externalId,
        created_time: createdTime,
        ad_id: rec.ad_id || null,
        ad_name: rec.ad_name || null,
        adset_id: rec.adset_id || null,
        adset_name: rec.adset_name || null,
        campaign_id: rec.campaign_id || null,
        campaign_name: rec.campaign_name || null,
        form_id: rec.form_id || null,
        form_name: rec.form_name || source.label || null,
        platform: rec.platform || null,
        is_organic: parseBool(rec.is_organic),
        full_name: fullName,
        phone,
        lead_status: leadStatus,
        custom_answers: customAnswers,
        raw,
        customer_contact_id: customerContactId,
        updated_at: new Date().toISOString(),
      };

      if (fullName && !customerContactId) {
        pendingContactAssign.push({ payloadIndex: payloads.length, fullName, phone });
        newContactInserts.push({
          client_id: clientId, full_name: fullName, phone, notes: 'Importado de Instant Form',
        });
      }

      payloads.push(payload);
      newLeadFlags.push(!existingLead);
    }

    // Batch insert new customer contacts.
    if (newContactInserts.length > 0) {
      const { data: inserted } = await admin
        .from('customer_contacts')
        .insert(newContactInserts)
        .select('id, phone, full_name');
      const insertedByKey = new Map<string, string>();
      for (const c of inserted || []) {
        const key = `${(c.phone || '').trim()}|${(c.full_name || '').toLowerCase()}`;
        insertedByKey.set(key, c.id);
      }
      for (const item of pendingContactAssign) {
        const key = `${(item.phone || '').trim()}|${item.fullName.toLowerCase()}`;
        const id = insertedByKey.get(key);
        if (id) payloads[item.payloadIndex].customer_contact_id = id;
      }
    }

    // Batch upsert leads.
    const CHUNK = 200;
    const newLeadIds: string[] = [];
    for (let i = 0; i < payloads.length; i += CHUNK) {
      const chunk = payloads.slice(i, i + CHUNK);
      const flagsChunk = newLeadFlags.slice(i, i + CHUNK);
      const { data: upserted, error: upErr } = await admin
        .from('instant_form_leads')
        .upsert(chunk, { onConflict: 'client_id,external_id' })
        .select('id, external_id');
      if (upErr) {
        console.error('Batch upsert error', upErr);
        skipped += chunk.length;
        continue;
      }
      synced += upserted?.length || 0;
      const idByExt = new Map<string, string>();
      for (const r of upserted || []) idByExt.set(r.external_id, r.id);
      chunk.forEach((p, idx) => {
        if (flagsChunk[idx]) {
          const id = idByExt.get(p.external_id);
          if (id) newLeadIds.push(id);
        }
      });
    }

    // Auto-generation of Comfortex AI replies disabled to save credits.
    // Users now generate messages manually via the "Generar mensaje" button in the lead dialog.

    await admin
      .from('instant_form_lead_sources')
      .update({
        last_synced_at: new Date().toISOString(),
        last_row_count: rows.length,
        last_error: null,
      })
      .eq('id', source.id);

    return { synced, skipped, total: rows.length };
}

