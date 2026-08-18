import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { runEvidenceMatching } from "../analyze-tender/evidence-matching.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Not authenticated." }, 401);
    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData.user) return json({ error: "Not authenticated." }, 401);

    const body = await req.json().catch(() => ({}));
    const tenderId = (body as { tender_id?: string }).tender_id;
    if (!tenderId) return json({ error: "A tender_id is required." }, 400);

    const { data: profile } = await admin.from("profiles").select("id").eq("auth_user_id", userData.user.id).maybeSingle();
    if (!profile) return json({ error: "No profile found for this user." }, 403);

    const { data: memberships } = await admin.from("organization_members").select("organization_id").eq("profile_id", profile.id);
    const orgIds = (memberships ?? []).map((row) => row.organization_id).filter(Boolean);
    if (!orgIds.length) return json({ error: "No organization found for this user." }, 403);

    const { data: tender } = await admin.from("tenders").select("id, organization_id").eq("id", tenderId).maybeSingle();
    if (!tender || !orgIds.includes(tender.organization_id)) return json({ error: "You are not allowed to match this tender." }, 403);

    const result = await runEvidenceMatching(admin, tenderId);
    return json({ tender_id: tenderId, ...result });
  } catch (error) {
    console.error("match-tender-evidence failed", error);
    return json({ error: error instanceof Error ? error.message : "Evidence matching failed." }, 500);
  }
});
