import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { portal_token, email } = await req.json();

    if (!portal_token || !email) {
      return json({ error: "portal_token en email zijn verplicht" });
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
      return json({ error: "Te veel pogingen. Probeer het over een uur opnieuw." });
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
      return json({ error: "Portaal niet gevonden" });
    }

    if (lead.portal_status !== "active") {
      return json({ error: "Dit portaal is nog niet beschikbaar" });
    }

    // Check email match (case-insensitive)
    if (email.toLowerCase().trim() !== (lead.email || "").toLowerCase().trim()) {
      return json({ error: "Dit e-mailadres komt niet overeen met het dossier." });
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
      return json({ error: "Kan sessie niet aanmaken" });
    }

    // Log portal opened event
    await supabase.from("portal_events").insert({
      lead_id: lead.id,
      event_type: "email_verified",
      metadata: { email: email.toLowerCase().trim() },
      ip_address: ip,
      user_agent: req.headers.get("user-agent") || "",
    });

    return json({ session_token: session.session_token });
  } catch (err) {
    console.error("verify-portal-email error:", err);
    return json({ error: "Server error" });
  }
});
