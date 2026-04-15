import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: corsHeaders,
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: corsHeaders,
      });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const { campaign_id } = await req.json();
    if (!campaign_id) throw new Error("campaign_id is required");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Get campaign
    const { data: campaign, error: campErr } = await supabaseAdmin
      .from("email_campaigns")
      .select("*")
      .eq("id", campaign_id)
      .single();

    if (campErr || !campaign) throw new Error("Campaign not found");
    if (campaign.status === "sent") throw new Error("Campaign already sent");

    // Get contacts
    let query = supabaseAdmin
      .from("email_contacts")
      .select("id, email, full_name")
      .eq("client_id", campaign.client_id)
      .eq("status", "active");

    // Filter by tags if specified
    if (campaign.target_tags && campaign.target_tags.length > 0) {
      query = query.overlaps("tags", campaign.target_tags);
    }

    const { data: contacts, error: contactsErr } = await query;
    if (contactsErr) throw contactsErr;
    if (!contacts || contacts.length === 0) throw new Error("No contacts found");

    // Update campaign status to sending
    await supabaseAdmin
      .from("email_campaigns")
      .update({
        status: "sending",
        total_recipients: contacts.length,
        sent_at: new Date().toISOString(),
      })
      .eq("id", campaign_id);

    let sentCount = 0;
    let failedCount = 0;

    // Send emails in batches of 5
    const batchSize = 5;
    for (let i = 0; i < contacts.length; i += batchSize) {
      const batch = contacts.slice(i, i + batchSize);

      const results = await Promise.allSettled(
        batch.map(async (contact) => {
          try {
            const personalizedHtml = campaign.html_content
              .replace(/\{\{name\}\}/g, contact.full_name || "")
              .replace(/\{\{email\}\}/g, contact.email);

            const res = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${RESEND_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                from: `${campaign.from_name} <${campaign.from_email}>`,
                to: [contact.email],
                subject: campaign.subject,
                html: personalizedHtml,
              }),
            });

            const resData = await res.json();

            if (!res.ok) {
              throw new Error(JSON.stringify(resData));
            }

            // Log success
            await supabaseAdmin.from("email_send_logs").insert({
              campaign_id,
              contact_id: contact.id,
              status: "sent",
              resend_id: resData.id,
              sent_at: new Date().toISOString(),
            });

            // Log to sent_emails for unified history with tracking pixel
            const { data: emailRecord } = await supabaseAdmin.from("sent_emails").insert({
              recipient_email: contact.email,
              recipient_name: contact.full_name || null,
              subject: campaign.subject,
              html_content: personalizedHtml,
              source: "campaign",
              status: "sent",
              resend_id: resData.id,
              client_id: campaign.client_id,
            }).select("id").single();

            if (emailRecord?.id) {
              const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
              const pixelUrl = `${SUPABASE_URL}/functions/v1/track-email-open?id=${emailRecord.id}`;
              const trackedHtml = personalizedHtml + `<img src="${pixelUrl}" width="1" height="1" style="display:none" alt="" />`;
              await supabaseAdmin.from("sent_emails").update({ html_content: trackedHtml }).eq("id", emailRecord.id);
            }

            sentCount++;
          } catch (err) {
            // Log failure
            await supabaseAdmin.from("email_send_logs").insert({
              campaign_id,
              contact_id: contact.id,
              status: "failed",
              error_message: err.message,
            });

            // Log failure to sent_emails
            await supabaseAdmin.from("sent_emails").insert({
              recipient_email: contact.email,
              recipient_name: contact.full_name || null,
              subject: campaign.subject,
              source: "campaign",
              status: "failed",
              error_message: err.message,
              client_id: campaign.client_id,
            });

            failedCount++;
          }
        })
      );

      // Small delay between batches to respect rate limits
      if (i + batchSize < contacts.length) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    // Update campaign final status
    await supabaseAdmin
      .from("email_campaigns")
      .update({
        status: "sent",
        sent_count: sentCount,
        failed_count: failedCount,
      })
      .eq("id", campaign_id);

    return new Response(
      JSON.stringify({
        success: true,
        total: contacts.length,
        sent: sentCount,
        failed: failedCount,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error sending campaign:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
