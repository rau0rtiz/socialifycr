import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const provider = url.searchParams.get("provider");
    const body = await req.json();

    console.log(`Webhook received from provider: ${provider}`, JSON.stringify(body));

    if (!provider) {
      return new Response(JSON.stringify({ error: "Provider param required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let transactionId: string | null = null;
    let paymentStatus: string = "pending";
    let providerTransactionId: string | null = null;

    // Route webhook processing by provider
    switch (provider) {
      case "tilopay": {
        // Tilopay webhook processing
        // Verify signature with TILOPAY_WEBHOOK_SECRET
        // Extract transaction details from Tilopay payload
        // Docs: https://tilopay.com/documentacion
        transactionId = body.reference || body.transaction_id;
        providerTransactionId = body.tilopay_id || body.id;
        if (body.status === "approved" || body.result === 1) {
          paymentStatus = "completed";
        } else if (body.status === "declined" || body.result === 0) {
          paymentStatus = "failed";
        }
        break;
      }

      case "onvopay": {
        // OnvoPay webhook processing
        // Verify signature with ONVOPAY_WEBHOOK_SECRET
        // Docs: https://docs.onvopay.com/
        transactionId = body.metadata?.transaction_id || body.reference;
        providerTransactionId = body.id;
        if (body.status === "succeeded" || body.status === "completed") {
          paymentStatus = "completed";
        } else if (body.status === "failed") {
          paymentStatus = "failed";
        }
        break;
      }

      case "bac_compra_click": {
        // BAC Compra Click webhook processing
        // Verify with BAC signature
        // Docs: https://developers.baccredomatic.com/
        transactionId = body.orderNumber || body.reference;
        providerTransactionId = body.transactionId;
        if (body.responseCode === "00" || body.approved === true) {
          paymentStatus = "completed";
        } else {
          paymentStatus = "failed";
        }
        break;
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown provider: ${provider}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    if (!transactionId) {
      console.error("Could not extract transaction ID from webhook payload");
      return new Response(JSON.stringify({ error: "Missing transaction reference" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update the transaction
    const { data: transaction, error: txError } = await supabaseAdmin
      .from("payment_transactions")
      .update({
        status: paymentStatus,
        provider_transaction_id: providerTransactionId,
        provider_response: body,
        paid_at: paymentStatus === "completed" ? new Date().toISOString() : null,
        error_message: paymentStatus === "failed" ? (body.error_message || body.reason || "Payment declined") : null,
      })
      .eq("id", transactionId)
      .select("*, subscription_id, client_id")
      .single();

    if (txError) {
      console.error("Error updating transaction:", txError);
      // Still return 200 to avoid webhook retries
      return new Response(JSON.stringify({ received: true, error: txError.message }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If payment completed and has a subscription, activate/renew it
    if (paymentStatus === "completed" && transaction) {
      if (transaction.subscription_id) {
        await supabaseAdmin
          .from("client_subscriptions")
          .update({
            status: "active",
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(
              Date.now() + 30 * 24 * 60 * 60 * 1000
            ).toISOString(),
          })
          .eq("id", transaction.subscription_id);
      } else {
        // First payment — find or create subscription
        // Get the plan from the transaction amount (or pass plan_id in metadata)
        const { data: plans } = await supabaseAdmin
          .from("subscription_plans")
          .select("id")
          .eq("price_amount", transaction.amount)
          .eq("currency", transaction.currency)
          .eq("is_active", true)
          .limit(1);

        if (plans && plans.length > 0) {
          const { data: sub } = await supabaseAdmin
            .from("client_subscriptions")
            .upsert(
              {
                client_id: transaction.client_id,
                plan_id: plans[0].id,
                status: "active",
                payment_provider: provider as any,
                current_period_start: new Date().toISOString(),
                current_period_end: new Date(
                  Date.now() + 30 * 24 * 60 * 60 * 1000
                ).toISOString(),
              },
              { onConflict: "client_id" }
            )
            .select()
            .single();

          // Link transaction to subscription
          if (sub) {
            await supabaseAdmin
              .from("payment_transactions")
              .update({ subscription_id: sub.id })
              .eq("id", transaction.id);
          }
        }
      }
    }

    return new Response(JSON.stringify({ received: true, status: paymentStatus }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
