// analyze-tender: extracts metadata + requirements from an uploaded tender PDF.
// Contract: POST { tender_id: uuid } with the caller's Supabase JWT.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { extractText, getDocumentProxy } from "https://esm.sh/unpdf@0.12.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CATEGORIES = ["mandatory", "technical", "financial", "general"];

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const SCHEMA_PROMPT = `You analyse Nigerian public procurement tender documents.
Return ONLY JSON matching:
{
  "procuring_entity": string|null,
  "submission_deadline": string|null,
  "opening_date": string|null,
  "reference_number": string|null,
  "procurement_method": string|null,
  "tender_type": string|null,
  "industry": string|null,
  "lot_number": string|null,
  "lot_description": string|null,
  "requires_bid_security": boolean|null,
  "requires_bank_reference": boolean|null,
  "requires_affidavit": boolean|null,
  "requirements": [
    {
      "category": "mandatory"|"technical"|"financial"|"general",
      "requirement_name": string,
      "requirement_text": string,
      "display_order": number
    }
  ]
}
Never invent values. Use null when the document does not state something.
List every eligibility/submission requirement you find, in document order.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const aiKey = Deno.env.get("LOVABLE_API_KEY");
  // New-format Supabase secret keys (sb_secret_...) are opaque strings, not JWTs.
  // PostgREST rejects them when sent as `Authorization: Bearer <key>`, which makes every
  // service-role table read fail (surfacing as "No profile found for this user.").
  const adminFetch: typeof fetch = (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) new Headers(init.headers).forEach((v, k) => headers.set(k, v));
    if (!serviceKey.includes(".") && headers.get("Authorization") === `Bearer ${serviceKey}`) {
      headers.delete("Authorization");
    }
    headers.set("apikey", serviceKey);
    return fetch(input, { ...init, headers });
  };

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false },
    global: { fetch: adminFetch },
  });

  let tenderId: string | null = null;

  const fail = async (message: string, status: number) => {
    if (tenderId) {
      await admin.rpc("mark_tender_analysis_failed", {
        p_tender_id: tenderId,
        p_error: message,
      });
    }
    return json({ error: message }, status);
  };

  try {
    const body = await req.json().catch(() => ({}));
    const id = (body as { tender_id?: string }).tender_id;
    if (!id || !UUID_RE.test(id)) return json({ error: "A valid tender_id is required." }, 400);

    // --- authenticate caller ---
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Not authenticated." }, 401);
    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData.user) return json({ error: "Not authenticated." }, 401);

    // --- resolve organization from existing profile/membership architecture ---
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id, auth_user_id")
      .eq("auth_user_id", userData.user.id)
      .maybeSingle();
    if (profileError) {
      console.error("profile lookup failed", profileError);
      return json({ error: "Could not resolve your profile." }, 500);
    }
    if (!profile || profile.auth_user_id !== userData.user.id) {
      return json({ error: "No profile found for this user." }, 403);
    }

    const { data: memberships } = await admin
      .from("organization_members")
      .select("organization_id")
      .eq("profile_id", profile.id);
    const orgIds = (memberships ?? []).map((m) => m.organization_id);
    if (orgIds.length === 0) return json({ error: "No organization found for this user." }, 403);

    // --- tender ownership ---
    const { data: tender, error: tenderError } = await admin
      .from("tenders")
      .select("id, organization_id")
      .eq("id", id)
      .maybeSingle();
    if (tenderError) return json({ error: "Could not load the tender." }, 500);
    if (!tender) return json({ error: "Tender not found." }, 404);
    if (!orgIds.includes(tender.organization_id)) {
      return json({ error: "You are not allowed to analyze this tender." }, 403);
    }

    tenderId = tender.id;

    if (!aiKey) return await fail("AI provider is not configured.", 500);

    const { data: file } = await admin
      .from("tender_files")
      .select("storage_path, mime_type")
      .eq("tender_id", tender.id)
      .eq("organization_id", tender.organization_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!file?.storage_path) return await fail("No tender document was found.", 404);
    if (!file.storage_path.toLowerCase().endsWith(".pdf")) {
      return await fail("Only PDF tender documents can be analyzed.", 400);
    }

    await admin.from("tenders").update({ analysis_status: "processing", analysis_error: null }).eq("id", tender.id);

    // --- download from the private bucket with the service role ---
    const { data: blob, error: downloadError } = await admin.storage
      .from("tender-files")
      .download(file.storage_path);
    if (downloadError || !blob) return await fail("Could not download the tender document.", 500);

    // --- PDF text extraction ---
    let text = "";
    try {
      const buffer = new Uint8Array(await blob.arrayBuffer());
      const pdf = await getDocumentProxy(buffer);
      const extracted = await extractText(pdf, { mergePages: true });
      text = String(extracted.text ?? "").replace(/\s+/g, " ").trim();
    } catch {
      return await fail("Could not read text from the tender PDF.", 422);
    }
    if (text.length < 200) {
      return await fail("The tender PDF has no readable text (it may be a scanned image).", 422);
    }
    const clipped = text.slice(0, 120000);

    // --- AI analysis (Lovable AI Gateway) ---
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${aiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SCHEMA_PROMPT },
          { role: "user", content: `Tender document text:\n\n${clipped}` },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      console.error("AI gateway error", status, await aiResponse.text());
      if (status === 429) return await fail("AI rate limit reached. Please try again shortly.", 429);
      if (status === 402) return await fail("AI credits exhausted. Please top up the workspace.", 402);
      return await fail("The AI analysis service failed.", 502);
    }

    const aiJson = await aiResponse.json();
    const content = aiJson?.choices?.[0]?.message?.content ?? "";
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(typeof content === "string" ? content.replace(/^```json|```$/g, "").trim() : "");
    } catch {
      return await fail("The AI returned an unreadable response.", 502);
    }

    const str = (key: string) => {
      const value = parsed[key];
      return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
    };
    const bool = (key: string) => (typeof parsed[key] === "boolean" ? (parsed[key] as boolean) : null);
    const date = (key: string) => {
      const raw = str(key);
      if (!raw) return null;
      const parsedDate = new Date(raw);
      return Number.isNaN(parsedDate.getTime()) ? null : parsedDate.toISOString();
    };

    const requirements = (Array.isArray(parsed.requirements) ? parsed.requirements : [])
      .map((entry, index) => {
        const row = (entry ?? {}) as Record<string, unknown>;
        const category = String(row.category ?? "general").toLowerCase();
        const name = typeof row.requirement_name === "string" ? row.requirement_name.trim() : "";
        const requirementText =
          typeof row.requirement_text === "string" ? row.requirement_text.trim() : "";
        if (!name && !requirementText) return null;
        return {
          category: CATEGORIES.includes(category) ? category : "general",
          requirement_name: name || requirementText.slice(0, 120),
          requirement_text: requirementText || name,
          display_order: typeof row.display_order === "number" ? row.display_order : index + 1,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    // --- persist through the existing RPC (also replaces tender_requirements) ---
    const { error: rpcError } = await admin.rpc("mark_tender_analyzed", {
      p_tender_id: tender.id,
      p_procuring_entity: str("procuring_entity"),
      p_submission_deadline: date("submission_deadline"),
      p_analysis_json: parsed,
      p_requirements: requirements,
    });
    if (rpcError) {
      console.error("mark_tender_analyzed failed", rpcError);
      return await fail("Could not save the analysis results.", 500);
    }

    await admin
      .from("tenders")
      .update({
        opening_date: date("opening_date"),
        reference_number: str("reference_number"),
        procurement_method: str("procurement_method"),
        tender_type: str("tender_type"),
        industry: str("industry"),
        lot_number: str("lot_number"),
        lot_description: str("lot_description"),
        requires_bid_security: bool("requires_bid_security"),
        requires_bank_reference: bool("requires_bank_reference"),
        requires_affidavit: bool("requires_affidavit"),
        raw_text: clipped.slice(0, 40000),
      })
      .eq("id", tender.id);

    return json({ tender_id: tender.id, analysis_status: "analyzed", requirements: requirements.length });
  } catch (error) {
    console.error("analyze-tender unexpected error", error);
    return await fail("Unexpected error during tender analysis.", 500);
  }
});
