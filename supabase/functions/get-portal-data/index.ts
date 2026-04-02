import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-portal-session",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status: 200, // Always 200 — error info in body
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { portal_token, session_token } = await req.json();

    if (!portal_token) {
      return json({ error: "portal_token is required" });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if caller is an authenticated user (Bram) via Authorization header
    let isOwner = false;
    const authHeader = req.headers.get("authorization");
    if (authHeader) {
      try {
        const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || supabaseServiceKey;
        const userClient = createClient(supabaseUrl, anonKey, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data: { user } } = await userClient.auth.getUser();
        if (user) isOwner = true;
      } catch {
        // Not authenticated — continue as anonymous
      }
    }

    // 1. Find lead by portal token
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("*")
      .eq("portal_token", portal_token)
      .single();

    if (leadError || !lead) {
      return json({ error: "Portaal niet gevonden" });
    }

    // 2. Check portal is active (owners can always preview)
    if (!isOwner && lead.portal_status !== "active") {
      const msg = lead.portal_status === "draft" || lead.portal_status === "review"
        ? "Dit portaal wordt nog voorbereid. U ontvangt een bericht zodra het klaar is."
        : "Dit portaal is niet meer beschikbaar.";
      return json({ error: msg, portal_status: lead.portal_status });
    }

    // 3. Verify session token (owners skip email verification)
    if (!isOwner) {
      if (!session_token) {
        return json({ needs_verification: true });
      }

      const { data: session, error: sessionError } = await supabase
        .from("portal_sessions")
        .select("*")
        .eq("session_token", session_token)
        .eq("lead_id", lead.id)
        .gte("expires_at", new Date().toISOString())
        .single();

      if (sessionError || !session) {
        return json({ needs_verification: true, error: "Sessie verlopen" });
      }
    }

    // 4. Build public-safe data (strip internal fields)
    const portalData = {
      voornaam: lead.voornaam,
      achternaam: lead.achternaam,
      adres: lead.adres,
      gesprek_datum: lead.gesprek_datum,
      oppervlakte_m2: lead.oppervlakte_m2,
      rapport_situatie_ai: lead.rapport_situatie_ai,
      rapport_verwachtingen_ai: lead.rapport_verwachtingen_ai,
      rapport_besproken_ai: lead.rapport_besproken_ai,
      rapport_aandachtspunten_ai: lead.rapport_aandachtspunten_ai,
      waarde_tekst_ai: lead.waarde_tekst_ai,
      budget_excl: lead.budget_excl,
      btw_percentage: lead.btw_percentage,
      prijs_min_incl_btw: lead.prijs_min_incl_btw,
      prijs_max_incl_btw: lead.prijs_max_incl_btw,
      prijs_mw_min_incl_btw: lead.prijs_mw_min_incl_btw,
      prijs_mw_max_incl_btw: lead.prijs_mw_max_incl_btw,
      fotos: lead.fotos,
      project_feiten: lead.project_feiten,
      inbegrepen_posten: lead.inbegrepen_posten,
      technisch: lead.technisch,
    };

    return json({ data: portalData });
  } catch (err) {
    console.error("get-portal-data error:", err);
    return json({ error: "Server error" });
  }
});
