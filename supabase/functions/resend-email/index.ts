import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.190.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY_1") || Deno.env.get("RESEND_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!RESEND_API_KEY || !LOVABLE_API_KEY) {
      throw new Error("Missing email configuration");
    }

    const { sent_email_id, override_email } = await req.json();
    if (!sent_email_id) {
      return new Response(JSON.stringify({ error: "sent_email_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Validate caller (must be authenticated)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch original email
    const { data: original, error: origErr } = await supabaseAdmin
      .from("sent_emails")
      .select("*")
      .eq("id", sent_email_id)
      .single();

    if (origErr || !original) throw new Error("Original email not found");

    const targetEmail = override_email || original.recipient_email;

    // Build attachments from metadata
    const attachments: any[] = [];
    if (Array.isArray(original.attachments_meta)) {
      for (const att of original.attachments_meta) {
        if (att.source === "storage" && att.bucket && att.path) {
          const { data: blob, error: blobErr } = await supabaseAdmin.storage
            .from(att.bucket)
            .download(att.path);
          if (blobErr) {
            console.error("Attachment download error:", att.path, blobErr);
            continue;
          }
          if (blob) {
            const buf = await blob.arrayBuffer();
            attachments.push({
              filename: att.filename || "attachment.pdf",
              content: base64Encode(new Uint8Array(buf)),
            });
          }
        }
      }
    }

    // Strip tracking pixel from previous send to avoid duplicates
    let html = (original.html_content || "").replace(/<img[^>]*track-email-open[^>]*>/gi, "");

    const emailPayload: any = {
      from: "Socialify <hola@socialifycr.com>",
      to: [targetEmail],
      subject: original.subject,
      html,
    };
    if (attachments.length > 0) emailPayload.attachments = attachments;

    const emailRes = await fetch(`${GATEWAY_URL}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
      },
      body: JSON.stringify(emailPayload),
    });

    const emailResult = await emailRes.json();

    // Log the resend
    const { data: newRecord } = await supabaseAdmin.from("sent_emails").insert({
      recipient_email: targetEmail,
      recipient_name: original.recipient_name,
      subject: `[Reenvío] ${original.subject}`,
      html_content: html,
      source: "resend",
      status: emailRes.ok ? "sent" : "failed",
      error_message: emailRes.ok ? null : JSON.stringify(emailResult),
      resend_id: emailRes.ok ? emailResult?.id || null : null,
      sent_by: userData.user.id,
      client_id: original.client_id,
      attachments_meta: original.attachments_meta,
      metadata: original.metadata,
      parent_email_id: original.id,
    }).select("id").single();

    // Add tracking pixel
    if (newRecord?.id && emailRes.ok) {
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
      const pixelUrl = `${SUPABASE_URL}/functions/v1/track-email-open?id=${newRecord.id}`;
      const trackedHtml = html + `<img src="${pixelUrl}" width="1" height="1" style="display:none" alt="" />`;
      await supabaseAdmin.from("sent_emails").update({ html_content: trackedHtml }).eq("id", newRecord.id);
    }

    if (!emailRes.ok) {
      console.error("Resend error:", emailResult);
      throw new Error("Failed to resend email");
    }

    return new Response(
      JSON.stringify({ success: true, recipient: targetEmail, attachments_count: attachments.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("resend-email error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
