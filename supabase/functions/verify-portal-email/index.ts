import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { portal_token, email } = await req.json();

    if (!portal_token || !email) {
      return new Response(
        JSON.stringify({ error: "portal_token en email zijn verplicht" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Rate limiting: max 5 attempts per hour per portal_token
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("portal_email_attempts")
      .select("*", { count: "exact", head: true })
      .eq("portal_token", portal_token)
      .gte("attempted_at", oneHourAgo);

    if ((count ?? 0) >= 5) {
      return new Response(
        JSON.stringify({ error: "Te veel pogingen. Probeer het over een uur opnieuw." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log this attempt
    await supabase.from("portal_email_attempts").insert({
      portal_token,
      ip_address: ip,
    });

    // Find lead by portal token
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("id, email, portal_status")
      .eq("portal_token", portal_token)
      .single();

    if (leadError || !lead) {
      return new Response(
        JSON.stringify({ error: "Portaal niet gevonden" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (lead.portal_status !== "active") {
      return new Response(
        JSON.stringify({ error: "Dit portaal is nog niet beschikbaar" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check email match (case-insensitive)
    if (email.toLowerCase().trim() !== (lead.email || "").toLowerCase().trim()) {
      return new Response(
        JSON.stringify({ error: "Dit e-mailadres komt niet overeen met het dossier." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create session (7 days)
    const { data: session, error: sessionError } = await supabase
      .from("portal_sessions")
      .insert({
        lead_id: lead.id,
        email_verified: email.toLowerCase().trim(),
      })
      .select("session_token")
      .single();

    if (sessionError || !session) {
      console.error("Session creation error:", sessionError);
      return new Response(
        JSON.stringify({ error: "Kan sessie niet aanmaken" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log portal opened event
    await supabase.from("portal_events").insert({
      lead_id: lead.id,
      event_type: "email_verified",
      metadata: { email: email.toLowerCase().trim() },
      ip_address: ip,
      user_agent: req.headers.get("user-agent") || "",
    });

    return new Response(
      JSON.stringify({ session_token: session.session_token }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("verify-portal-email error:", err);
    return new Response(
      JSON.stringify({ error: "Server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
