// Sync Instant Form leads from a Google Sheet into instant_form_leads + customer_contacts.
// Auth: validates caller JWT and checks they have access to the client.
import { createClient } from 'npm:@supabase/supabase-js@2';

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
    const isCron = body.cron === true || bearer === serviceKey;

    let clientIdsToSync: string[] = [];

    if (isCron) {
      // Cron / service-role: sync ALL configured sources
      const { data: sources } = await admin
        .from('instant_form_lead_sources')
        .select('client_id');
      clientIdsToSync = (sources || []).map((s: any) => s.client_id);
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
      try {
        const r = await syncOne(admin, clientId, lovableKey, sheetsKey);
        results.push({ client_id: clientId, ...r });
      } catch (e: any) {
        results.push({ client_id: clientId, error: e.message || 'unknown' });
      }
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

async function syncOne(admin: any, clientId: string, lovableKey: string, sheetsKey: string) {
    // Load config
    const { data: source } = await admin
      .from('instant_form_lead_sources')
      .select('*')
      .eq('client_id', clientId)
      .maybeSingle();

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

    let synced = 0;
    let skipped = 0;

    for (const [rowIndex, row] of rows.entries()) {
      if (!hasUsefulData(row)) {
        skipped++;
        continue;
      }

      const rec: Record<string, any> = {};
      const customAnswers: Record<string, any> = {};
      const raw: Record<string, any> = {};

      headers.forEach((h, i) => {
        const cell = row[i] ?? '';
        raw[h] = cell;
        const known = FIELD_MAP[h];
        if (known) {
          rec[known] = cell;
        } else if (h && cell !== '') {
          customAnswers[h] = cell;
        }
      });

      const sheetRowNumber = headerRow + rowIndex + 2;
      const externalId = String(rec.external_id || '').trim() ||
        `sheet-${source.spreadsheet_id}-${sheetName}-${sheetRowNumber}-${await stableHash(JSON.stringify(row))}`;

      const fullName = (rec.full_name || '').toString().trim() || null;
      const phone = cleanPhone(rec.phone);

      // Upsert customer contact when we have a name
      let customerContactId: string | null = null;
      if (fullName) {
        let existingId: string | null = null;
        if (phone) {
          const { data: existing } = await admin
            .from('customer_contacts')
            .select('id')
            .eq('client_id', clientId)
            .eq('phone', phone)
            .maybeSingle();
          if (existing) existingId = existing.id;
        }
        if (!existingId) {
          const { data: existingName } = await admin
            .from('customer_contacts')
            .select('id')
            .eq('client_id', clientId)
            .eq('full_name', fullName)
            .maybeSingle();
          if (existingName) existingId = existingName.id;
        }

        if (existingId) {
          customerContactId = existingId;
          if (phone) {
            await admin
              .from('customer_contacts')
              .update({ phone, updated_at: new Date().toISOString() })
              .eq('id', existingId);
          }
        } else {
          const { data: created } = await admin
            .from('customer_contacts')
            .insert({
              client_id: clientId,
              full_name: fullName,
              phone,
              notes: 'Importado de Instant Form',
            })
            .select('id')
            .single();
          if (created) customerContactId = created.id;
        }
      }

      const payload = {
        client_id: clientId,
        external_id: externalId,
        created_time: parseDate(rec.created_time),
        ad_id: rec.ad_id || null,
        ad_name: rec.ad_name || null,
        adset_id: rec.adset_id || null,
        adset_name: rec.adset_name || null,
        campaign_id: rec.campaign_id || null,
        campaign_name: rec.campaign_name || null,
        form_id: rec.form_id || null,
        form_name: rec.form_name || null,
        platform: rec.platform || null,
        is_organic: parseBool(rec.is_organic),
        full_name: fullName,
        phone,
        lead_status: rec.lead_status || null,
        custom_answers: customAnswers,
        raw,
        customer_contact_id: customerContactId,
        updated_at: new Date().toISOString(),
      };

      const { error: upErr } = await admin
        .from('instant_form_leads')
        .upsert(payload, { onConflict: 'client_id,external_id' });

      if (upErr) {
        console.error('Upsert error', upErr, externalId);
        skipped++;
      } else {
        synced++;
      }
    }

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

