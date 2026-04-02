import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-portal-session",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { portal_token, session_token } = await req.json();

    if (!portal_token) {
      return new Response(
        JSON.stringify({ error: "portal_token is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if caller is an authenticated user (Bram) via Authorization header
    let isOwner = false;
    const authHeader = req.headers.get("authorization");
    if (authHeader) {
      const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") || supabaseServiceKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      if (user) isOwner = true;
    }

    // 1. Find lead by portal token
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("*")
      .eq("portal_token", portal_token)
      .single();

    if (leadError || !lead) {
      return new Response(
        JSON.stringify({ error: "Portaal niet gevonden" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Check portal is active (owners can always preview)
    if (!isOwner && lead.portal_status !== "active") {
      return new Response(
        JSON.stringify({
          error: "Dit portaal is nog niet beschikbaar",
          portal_status: lead.portal_status,
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Verify session token (owners skip email verification)
    if (!isOwner) {
      if (!session_token) {
        return new Response(
          JSON.stringify({ error: "Verificatie vereist", needs_verification: true }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: session, error: sessionError } = await supabase
        .from("portal_sessions")
        .select("*")
        .eq("session_token", session_token)
        .eq("lead_id", lead.id)
        .gte("expires_at", new Date().toISOString())
        .single();

      if (sessionError || !session) {
        return new Response(
          JSON.stringify({ error: "Sessie verlopen", needs_verification: true }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 4. Build public-safe data (strip internal fields)
    const portalData = {
      voornaam: lead.voornaam,
      achternaam: lead.achternaam,
      adres: lead.adres,
      gesprek_datum: lead.gesprek_datum,
      oppervlakte_m2: lead.oppervlakte_m2,
      // AI narrative sections
      rapport_situatie_ai: lead.rapport_situatie_ai,
      rapport_verwachtingen_ai: lead.rapport_verwachtingen_ai,
      rapport_besproken_ai: lead.rapport_besproken_ai,
      rapport_aandachtspunten_ai: lead.rapport_aandachtspunten_ai,
      waarde_tekst_ai: lead.waarde_tekst_ai,
      // Pricing
      budget_excl: lead.budget_excl,
      btw_percentage: lead.btw_percentage,
      prijs_min_incl_btw: lead.prijs_min_incl_btw,
      prijs_max_incl_btw: lead.prijs_max_incl_btw,
      prijs_mw_min_incl_btw: lead.prijs_mw_min_incl_btw,
      prijs_mw_max_incl_btw: lead.prijs_mw_max_incl_btw,
      // Photos
      fotos: lead.fotos,
      project_feiten: lead.project_feiten,
      // Included items
      inbegrepen_posten: lead.inbegrepen_posten,
      // Technical
      technisch: lead.technisch,
    };

    return new Response(
      JSON.stringify({ data: portalData }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("get-portal-data error:", err);
    return new Response(
      JSON.stringify({ error: "Server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
