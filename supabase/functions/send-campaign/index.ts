import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

import {
  buildUnsubscribeFooter,
  generateUnsubscribeUrl,
  injectUnsubscribeFooter as injectFooter,
  isEmailSuppressed,
} from "../_shared/unsubscribe.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: corsHeaders,
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    const token = authHeader.replace("Bearer ", "");

    // Allow either a real user JWT or the service-role key (used by dispatcher)
    let isServiceRoleCall = false;
    if (token === SERVICE_ROLE_KEY) {
      isServiceRoleCall = true;
    } else {
      const supabase = createClient(SUPABASE_URL, ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
      if (claimsError || !claimsData?.claims) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: corsHeaders,
        });
      }
    }

    const { campaign_id } = await req.json();
    if (!campaign_id) throw new Error("campaign_id is required");

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Get campaign
    const { data: campaign, error: campErr } = await supabaseAdmin
      .from("email_campaigns")
      .select("*")
      .eq("id", campaign_id)
      .single();

    if (campErr || !campaign) throw new Error("Campaign not found");
    if (campaign.status === "sent") throw new Error("Campaign already sent");

    // Resolve recipients: prefer snapshot, fallback to email_contacts query
    type Recipient = { id: string; email: string; full_name: string | null };
    let contacts: Recipient[] = [];

    if (Array.isArray(campaign.recipients_snapshot) && campaign.recipients_snapshot.length > 0) {
      contacts = (campaign.recipients_snapshot as any[]).map((r) => ({
        id: r.id || r.email,
        email: r.email,
        full_name: r.name || r.full_name || null,
      }));
    } else {
      let query = supabaseAdmin
        .from("email_contacts")
        .select("id, email, full_name")
        .eq("client_id", campaign.client_id)
        .eq("status", "active");

      if (campaign.target_tags && campaign.target_tags.length > 0) {
        query = query.overlaps("tags", campaign.target_tags);
      }

      const { data, error: contactsErr } = await query;
      if (contactsErr) throw contactsErr;
      contacts = (data || []) as Recipient[];
    }

    if (contacts.length === 0) throw new Error("No contacts found");

    // Update campaign status
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

    const batchSize = 5;
    for (let i = 0; i < contacts.length; i += batchSize) {
      const batch = contacts.slice(i, i + batchSize);

      await Promise.allSettled(
        batch.map(async (contact) => {
          // Pre-create sent_emails row so we can embed the tracking pixel BEFORE sending
          const personalizedSubject = campaign.subject
            .replace(/\{\{name\}\}/g, contact.full_name || "")
            .replace(/\{\{email\}\}/g, contact.email);

          let basePersonalizedHtml = campaign.html_content
            .replace(/\{\{name\}\}/g, contact.full_name || "")
            .replace(/\{\{email\}\}/g, contact.email);

          const { data: emailRecord } = await supabaseAdmin.from("sent_emails").insert({
            recipient_email: contact.email,
            recipient_name: contact.full_name || null,
            subject: personalizedSubject,
            source: "campaign",
            status: "pending",
            client_id: campaign.client_id,
            campaign_id,
          }).select("id").single();

          try {
            if (await isEmailSuppressed(supabaseAdmin, contact.email)) {
              await supabaseAdmin.from("email_send_logs").insert({
                campaign_id,
                contact_id: contact.id,
                status: "skipped",
                error_message: "suppressed",
              });
              if (emailRecord?.id) {
                await supabaseAdmin.from("sent_emails").update({
                  status: "failed",
                  error_message: "suppressed",
                }).eq("id", emailRecord.id);
              }
              return;
            }

            const unsubUrl = await generateUnsubscribeUrl(supabaseAdmin, contact.email);
            let personalizedHtml = injectFooter(basePersonalizedHtml, buildUnsubscribeFooter(unsubUrl));

            // Inject tracking pixel BEFORE sending so opens are tracked
            if (emailRecord?.id) {
              const pixelUrl = `${SUPABASE_URL}/functions/v1/track-email-open?id=${emailRecord.id}`;
              const pixel = `<img src="${pixelUrl}" width="1" height="1" style="display:none" alt="" />`;
              if (/<\/body>/i.test(personalizedHtml)) {
                personalizedHtml = personalizedHtml.replace(/<\/body>/i, `${pixel}</body>`);
              } else {
                personalizedHtml = personalizedHtml + pixel;
              }
            }

            const res = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${RESEND_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                from: `${campaign.from_name} <${campaign.from_email}>`,
                to: [contact.email],
                subject: personalizedSubject,
                html: personalizedHtml,
              }),
            });

            const resData = await res.json();
            if (!res.ok) throw new Error(JSON.stringify(resData));

            await supabaseAdmin.from("email_send_logs").insert({
              campaign_id,
              contact_id: contact.id,
              status: "sent",
              resend_id: resData.id,
              sent_at: new Date().toISOString(),
            });

            if (emailRecord?.id) {
              await supabaseAdmin.from("sent_emails").update({
                status: "sent",
                resend_id: resData.id,
                html_content: personalizedHtml,
              }).eq("id", emailRecord.id);
            }

            sentCount++;
          } catch (err: any) {
            await supabaseAdmin.from("email_send_logs").insert({
              campaign_id,
              contact_id: contact.id,
              status: "failed",
              error_message: err.message,
            });

            if (emailRecord?.id) {
              await supabaseAdmin.from("sent_emails").update({
                status: "failed",
                error_message: err.message,
              }).eq("id", emailRecord.id);
            }

            failedCount++;
          }
        })
      );

      if (i + batchSize < contacts.length) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    await supabaseAdmin
      .from("email_campaigns")
      .update({
        status: "sent",
        sent_count: sentCount,
        failed_count: failedCount,
      })
      .eq("id", campaign_id);

    return new Response(
      JSON.stringify({ success: true, total: contacts.length, sent: sentCount, failed: failedCount }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error sending campaign:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
