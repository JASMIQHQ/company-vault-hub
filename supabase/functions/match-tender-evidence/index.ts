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
    const adminFetch: typeof fetch = (input, init) => {
      const headers = new Headers(typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined);
      if (init?.headers) new Headers(init.headers).forEach((value, key) => headers.set(key, value));
      if (!serviceKey.includes(".") && headers.get("Authorization") === `Bearer ${serviceKey}`) headers.delete("Authorization");
      headers.set("apikey", serviceKey);
      return fetch(input, { ...init, headers });
    };
    const admin = createClient(url, serviceKey, { auth: { persistSession: false }, global: { fetch: adminFetch } });

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

    // Re-read the authoritative tender_requirements ledger so the API contract
    // reports exactly what was persisted, rather than treating processed rows
    // as successful matches.
    const { data: ledgerResults, error: ledgerError } = await admin
      .from("tender_requirements")
      .select("id, status, matched_document_id, confidence_score, explanation, display_order")
      .eq("tender_id", tenderId)
      .eq("organization_id", tender.organization_id)
      .order("display_order", { ascending: true });
    if (ledgerError) throw ledgerError;

    const results = (ledgerResults ?? []).map((row) => ({
      id: row.id,
      status: row.status,
      matched_document_id: row.matched_document_id,
      confidence: row.confidence_score ?? 0,
      explanation: row.explanation ?? "",
    }));

    const summary = {
      processed: results.length,
      matched: results.filter((row) => row.status === "matched").length,
      manual_review: results.filter((row) => row.status === "manual_review").length,
      missing: results.filter((row) => row.status === "missing").length,
      expired: results.filter((row) => row.status === "expired").length,
    };

    return json({
      tender_id: tenderId,
      summary,
      results,
      readiness: result.readiness,
      mandatory_blocked: result.mandatoryBlocked,
    });
  } catch (error) {
    console.error("match-tender-evidence failed", error);
    return json({ error: error instanceof Error ? error.message : "Evidence matching failed." }, 500);
  }
});
