import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const sha256 = async (value: string) => {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

const parseUA = (ua: string) => {
  let device = "Escritorio";
  if (/iPhone/i.test(ua)) device = "iPhone";
  else if (/iPad/i.test(ua)) device = "iPad";
  else if (/Android/i.test(ua)) device = /Mobile/i.test(ua) ? "Android" : "Tablet Android";
  else if (/Macintosh/i.test(ua)) device = "Mac";
  else if (/Windows/i.test(ua)) device = "Windows";
  else if (/Linux/i.test(ua)) device = "Linux";

  let browser = "Navegador";
  if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/OPR\//i.test(ua)) browser = "Opera";
  else if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) browser = "Chrome";
  else if (/CriOS/i.test(ua)) browser = "Chrome";
  else if (/Firefox\//i.test(ua) || /FxiOS/i.test(ua)) browser = "Firefox";
  else if (/Safari\//i.test(ua)) browser = "Safari";
  else if (/facebookexternalhit|WhatsApp|Instagram|bot|crawler|preview/i.test(ua)) browser = "Bot / preview";

  return { device, browser };
};

const geoLookup = async (ip: string): Promise<{ country: string | null; city: string | null }> => {
  if (!ip || ip === "unknown") return { country: null, city: null };
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2500);
    const res = await fetch(`https://ipapi.co/${ip}/json/`, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return { country: null, city: null };
    const data = await res.json();
    return {
      country: (data?.country_name as string) || null,
      city: (data?.city as string) || null,
    };
  } catch {
    return { country: null, city: null };
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const body = await req.json().catch(() => ({}));
    const action = body?.action;

    if (action === "start") {
      const slug = typeof body?.slug === "string" ? body.slug.slice(0, 120) : "";
      if (!slug) return json({ error: "slug requerido" }, 400);

      const { data: doc } = await admin
        .from("agency_proposals")
        .select("id, view_count")
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();

      if (!doc) return json({ error: "documento no encontrado" }, 404);

      const ua = req.headers.get("user-agent") || "";
      const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
      const { device, browser } = parseUA(ua);
      const geo = await geoLookup(ip);
      const sessionToken = crypto.randomUUID();

      const { data: view, error } = await admin
        .from("document_views")
        .insert({
          proposal_id: doc.id,
          slug,
          session_token: sessionToken,
          ip_hash: ip === "unknown" ? null : await sha256(`${ip}|socialify-docs`),
          country: geo.country,
          city: geo.city,
          device,
          browser,
          user_agent: ua.slice(0, 500),
          referrer: typeof body?.referrer === "string" ? body.referrer.slice(0, 300) : null,
        })
        .select("id")
        .single();

      if (error) throw error;

      await admin
        .from("agency_proposals")
        .update({
          view_count: (doc.view_count ?? 0) + 1,
          last_viewed_at: new Date().toISOString(),
        })
        .eq("id", doc.id);

      return json({ view_id: view.id, session_token: sessionToken });
    }

    if (action === "ping") {
      const viewId = typeof body?.view_id === "string" ? body.view_id : "";
      const token = typeof body?.session_token === "string" ? body.session_token : "";
      if (!/^[0-9a-f-]{36}$/i.test(viewId) || !token) return json({ error: "datos inválidos" }, 400);

      const { data: view } = await admin
        .from("document_views")
        .select("id, duration_seconds, last_ping_at, session_token")
        .eq("id", viewId)
        .maybeSingle();

      if (!view || view.session_token !== token) return json({ error: "no autorizado" }, 403);

      const now = Date.now();
      const elapsed = Math.round((now - new Date(view.last_ping_at).getTime()) / 1000);
      // Ignorar saltos largos (pestaña dormida / equipo suspendido)
      const add = elapsed > 0 && elapsed <= 60 ? elapsed : 0;

      await admin
        .from("document_views")
        .update({
          duration_seconds: (view.duration_seconds ?? 0) + add,
          last_ping_at: new Date(now).toISOString(),
        })
        .eq("id", viewId);

      return json({ ok: true });
    }

    return json({ error: "acción no soportada" }, 400);
  } catch (err) {
    console.error("track-document-view error:", err);
    return json({ error: "error interno" }, 500);
  }
});
