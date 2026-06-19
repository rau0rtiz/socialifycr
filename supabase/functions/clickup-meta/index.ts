// ClickUp meta: list teams (workspaces), spaces, lists, and members.
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

async function cu(path: string, init?: RequestInit) {
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
    const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims } = await sb.auth.getClaims(authHeader.replace('Bearer ', ''));
    if (!claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { data: isAgency } = await sb.rpc('is_agency_member', { _user_id: claims.claims.sub });
    if (!isAgency) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const { action, team_id, space_id, folder_id, list_id } = body || {};

    let result: any = {};
    switch (action) {
      case 'workspaces': {
        result = await cu('/team');
        break;
      }
      case 'spaces': {
        if (!team_id) throw new Error('team_id required');
        result = await cu(`/team/${team_id}/space?archived=false`);
        break;
      }
      case 'folders': {
        if (!space_id) throw new Error('space_id required');
        result = await cu(`/space/${space_id}/folder?archived=false`);
        break;
      }
      case 'folderless_lists': {
        if (!space_id) throw new Error('space_id required');
        result = await cu(`/space/${space_id}/list?archived=false`);
        break;
      }
      case 'folder_lists': {
        if (!folder_id) throw new Error('folder_id required');
        result = await cu(`/folder/${folder_id}/list?archived=false`);
        break;
      }
      case 'list_members': {
        if (!list_id) throw new Error('list_id required');
        result = await cu(`/list/${list_id}/member`);
        break;
      }
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
