import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CheckoutRequest {
  client_id: string;
  plan_id: string;
  provider: "tilopay" | "onvopay" | "bac_compra_click";
  return_url?: string;
}

// Provider-specific checkout creation
async function createTilopayCheckout(
  amount: number,
  currency: string,
  transactionId: string,
  returnUrl: string
) {
  const apiKey = Deno.env.get("TILOPAY_API_KEY");
  const apiUser = Deno.env.get("TILOPAY_API_USER");
  if (!apiKey || !apiUser) {
    throw new Error(
      "Tilopay credentials not configured. Set TILOPAY_API_KEY and TILOPAY_API_USER secrets."
    );
  }

  // Tilopay API integration placeholder
  // Docs: https://tilopay.com/documentacion
  // When ready, replace with actual Tilopay API call:
  // POST https://app.tilopay.com/api/v1/processPayment
  return {
    checkout_url: null,
    provider_session_id: null,
    message:
      "Tilopay integration ready. Configure TILOPAY_API_KEY and TILOPAY_API_USER to activate.",
  };
}

async function createOnvoPayCheckout(
  amount: number,
  currency: string,
  transactionId: string,
  returnUrl: string
) {
  const apiKey = Deno.env.get("ONVOPAY_API_KEY");
  if (!apiKey) {
    throw new Error(
      "OnvoPay credentials not configured. Set ONVOPAY_API_KEY secret."
    );
  }

  // OnvoPay API integration placeholder
  // Docs: https://docs.onvopay.com/
  // When ready, replace with actual OnvoPay API call:
  // POST https://api.onvopay.com/v1/checkout/sessions
  return {
    checkout_url: null,
    provider_session_id: null,
    message:
      "OnvoPay integration ready. Configure ONVOPAY_API_KEY to activate.",
  };
}

async function createBacCheckout(
  amount: number,
  currency: string,
  transactionId: string,
  returnUrl: string
) {
  const clientId = Deno.env.get("BAC_CLIENT_ID");
  const clientSecret = Deno.env.get("BAC_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    throw new Error(
      "BAC credentials not configured. Set BAC_CLIENT_ID and BAC_CLIENT_SECRET secrets."
    );
  }

  // BAC Compra Click API integration placeholder
  // Docs: https://developers.baccredomatic.com/
  // When ready, replace with actual BAC API call
  return {
    checkout_url: null,
    provider_session_id: null,
    message:
      "BAC Compra Click integration ready. Configure BAC_CLIENT_ID and BAC_CLIENT_SECRET to activate.",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify JWT
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const supabaseUser = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify the user
    const {
      data: { user },
      error: authError,
    } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const { data: isAdmin } = await supabaseAdmin.rpc("is_admin_or_higher", {
      _user_id: user.id,
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: CheckoutRequest = await req.json();
    const { client_id, plan_id, provider, return_url } = body;

    if (!client_id || !plan_id || !provider) {
      return new Response(
        JSON.stringify({ error: "client_id, plan_id, and provider required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch plan
    const { data: plan, error: planError } = await supabaseAdmin
      .from("subscription_plans")
      .select("*")
      .eq("id", plan_id)
      .eq("is_active", true)
      .single();

    if (planError || !plan) {
      return new Response(JSON.stringify({ error: "Plan not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create pending transaction
    const { data: transaction, error: txError } = await supabaseAdmin
      .from("payment_transactions")
      .insert({
        client_id,
        provider,
        amount: plan.price_amount,
        currency: plan.currency,
        status: "pending",
      })
      .select()
      .single();

    if (txError) throw txError;

    const baseReturnUrl =
      return_url || `${req.headers.get("origin")}/facturacion`;

    // Route to provider
    let result;
    switch (provider) {
      case "tilopay":
        result = await createTilopayCheckout(
          plan.price_amount,
          plan.currency,
          transaction.id,
          baseReturnUrl
        );
        break;
      case "onvopay":
        result = await createOnvoPayCheckout(
          plan.price_amount,
          plan.currency,
          transaction.id,
          baseReturnUrl
        );
        break;
      case "bac_compra_click":
        result = await createBacCheckout(
          plan.price_amount,
          plan.currency,
          transaction.id,
          baseReturnUrl
        );
        break;
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }

    // Update transaction with provider session
    if (result.provider_session_id) {
      await supabaseAdmin
        .from("payment_transactions")
        .update({
          provider_transaction_id: result.provider_session_id,
          status: "processing",
        })
        .eq("id", transaction.id);
    }

    return new Response(
      JSON.stringify({
        transaction_id: transaction.id,
        checkout_url: result.checkout_url,
        message: result.message,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Checkout error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
