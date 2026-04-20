import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

import {
  buildUnsubscribeFooter,
  generateUnsubscribeUrl,
  injectUnsubscribeFooter,
  isEmailSuppressed,
} from "../_shared/unsubscribe.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;

  try {
    const { to, toName, subject, html, sentBy, clientId } = await req.json();

    // Generate unsubscribe link
    const unsubUrl = await generateUnsubscribeUrl(supabaseAdmin, to);
    const unsubFooter = buildUnsubscribeFooter(unsubUrl);
    const htmlWithUnsub = injectUnsubscribeFooter(html, unsubFooter);

    // Insert sent_emails record first to get the ID for tracking pixel
    const { data: emailRecord, error: insertErr } = await supabaseAdmin.from("sent_emails").insert({
      recipient_email: to,
      recipient_name: toName || null,
      subject,
      html_content: htmlWithUnsub,
      status: "pending",
      source: "notification",
      sent_by: sentBy || null,
      client_id: clientId || null,
    }).select("id").single();

    // Inject tracking pixel
    let finalHtml = htmlWithUnsub;
    if (emailRecord?.id) {
      const pixelUrl = `${SUPABASE_URL}/functions/v1/track-email-open?id=${emailRecord.id}`;
      finalHtml = htmlWithUnsub.replace(/<\/body>/i, `<img src="${pixelUrl}" width="1" height="1" style="display:none" alt="" /></body>`);
      if (!finalHtml.includes(pixelUrl)) {
        finalHtml += `<img src="${pixelUrl}" width="1" height="1" style="display:none" alt="" />`;
      }
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Socialify <notificaciones@socialifycr.com>",
        to: [to],
        subject,
        html: finalHtml,
      }),
    });

    const data = await res.json();

    // Update the record with status
    if (emailRecord?.id) {
      await supabaseAdmin.from("sent_emails").update({
        html_content: finalHtml,
        status: res.ok ? "sent" : "failed",
        resend_id: data?.id || null,
        error_message: res.ok ? null : JSON.stringify(data),
      }).eq("id", emailRecord.id);
    }

    if (!res.ok) {
      throw new Error(`Resend API error [${res.status}]: ${JSON.stringify(data)}`);
    }

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error sending email:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
