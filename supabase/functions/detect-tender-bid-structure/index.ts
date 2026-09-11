import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const SCHEMA_PROMPT = `You analyse Nigerian procurement tender text and identify whether the bid is divided into distinct bidding scopes.
A scope can be an explicit Lot (for example Lot 1, Lot 2), a Category (for example Category A - Works, Category B - Supply), or another clearly named bid package.
Do NOT invent scopes. If the tender is not explicitly divided into multiple bid scopes, return an empty scopes array.
Do NOT confuse requirement categories such as mandatory, technical, or financial with bid scopes.
For each scope, return its exact identifier and a concise title taken from the document.
Only assign a requirement to a scope when the document clearly ties that requirement to that scope. Requirements that apply to the entire tender must remain unassigned.
Return ONLY JSON matching:
{
  "scopes": [
    {
      "identifier": string,
      "title": string,
      "description": string|null,
      "requirement_orders": number[]
    }
  ]
}
Use the supplied requirement order numbers. Never invent a requirement order.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const aiKey = Deno.env.get("LOVABLE_API_KEY");
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
  const admin = createClient(url, serviceKey, { auth: { persistSession: false }, global: { fetch: adminFetch } });

  try {
    const body = await req.json().catch(() => ({}));
    const tenderId = (body as { tender_id?: string }).tender_id;
    if (!tenderId || !UUID_RE.test(tenderId)) return json({ error: "A valid tender_id is required." }, 400);

    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Not authenticated." }, 401);
    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData.user) return json({ error: "Not authenticated." }, 401);

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id, auth_user_id")
      .eq("auth_user_id", userData.user.id)
      .maybeSingle();
    if (profileError) return json({ error: "Could not resolve your profile." }, 500);
    if (!profile) return json({ error: "No profile found for this user." }, 403);

    const { data: memberships } = await admin
      .from("organization_members")
      .select("organization_id")
      .eq("profile_id", profile.id);
    const orgIds = (memberships ?? []).map((row) => row.organization_id);
    if (!orgIds.length) return json({ error: "No organization found for this user." }, 403);

    const { data: tender, error: tenderError } = await admin
      .from("tenders")
      .select("id, organization_id, company_id, raw_text, analysis_status, lot_number, lot_description")
      .eq("id", tenderId)
      .maybeSingle();
    if (tenderError) return json({ error: "Could not load the tender." }, 500);
    if (!tender) return json({ error: "Tender not found." }, 404);
    if (!orgIds.includes(tender.organization_id)) return json({ error: "You are not allowed to configure this tender." }, 403);
    if (tender.analysis_status !== "analyzed" && tender.analysis_status !== "requires_review") {
      return json({ error: "Analyze the tender before detecting its bid structure." }, 409);
    }

    const { data: existingLots, error: lotsError } = await admin
      .from("tender_lots")
      .select("id, tender_id, organization_id, company_id, lot_number, lot_title, description, created_at, updated_at")
      .eq("tender_id", tender.id)
      .order("created_at", { ascending: true });
    if (lotsError) return json({ error: "Could not load existing bid scopes." }, 500);
    if ((existingLots ?? []).length > 0) {
      return json({ detected: true, created: false, scopes: existingLots });
    }

    const { data: requirements, error: requirementsError } = await admin
      .from("tender_requirements")
      .select("id, display_order, requirement_name, requirement_text, category")
      .eq("tender_id", tender.id)
      .order("display_order", { ascending: true });
    if (requirementsError) return json({ error: "Could not load tender requirements." }, 500);

    const rawText = typeof tender.raw_text === "string" ? tender.raw_text.trim() : "";
    if (!rawText) return json({ detected: false, created: false, scopes: [], message: "No stored tender text is available for structure detection." }, 200);
    if (!aiKey) return json({ error: "AI provider is not configured." }, 500);

    const requirementIndex = (requirements ?? []).map((row, index) => ({
      order: index + 1,
      id: row.id,
      display_order: row.display_order,
      category: row.category,
      name: row.requirement_name,
      text: row.requirement_text,
    }));

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${aiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SCHEMA_PROMPT },
          {
            role: "user",
            content: `Tender text:\n\n${rawText.slice(0, 120000)}\n\nNumbered requirements:\n${JSON.stringify(requirementIndex)}`,
          },
        ],
      }),
    });
    if (!aiResponse.ok) return json({ error: "The AI structure detection service failed." }, 502);

    const aiJson = await aiResponse.json();
    const content = aiJson?.choices?.[0]?.message?.content ?? "";
    let parsed: { scopes?: unknown };
    try {
      parsed = JSON.parse(typeof content === "string" ? content.replace(/^```json|```$/g, "").trim() : "{}");
    } catch {
      return json({ error: "The AI returned an unreadable bid structure." }, 502);
    }

    const requirementByOrder = new Map(requirementIndex.map((row) => [row.order, row]));
    const rawScopes = Array.isArray(parsed.scopes) ? parsed.scopes : [];
    const scopes = rawScopes
      .map((value) => {
        const row = (value ?? {}) as Record<string, unknown>;
        const identifier = typeof row.identifier === "string" ? row.identifier.trim() : "";
        const title = typeof row.title === "string" ? row.title.trim() : "";
        const description = typeof row.description === "string" && row.description.trim() ? row.description.trim() : null;
        const orders = Array.isArray(row.requirement_orders)
          ? row.requirement_orders.filter((item): item is number => typeof item === "number" && Number.isInteger(item))
          : [];
        if (!identifier || !title) return null;
        return { identifier, title, description, requirement_orders: [...new Set(orders)].filter((order) => requirementByOrder.has(order)) };
      })
      .filter((scope): scope is NonNullable<typeof scope> => scope !== null)
      .slice(0, 50);

    if (scopes.length === 0) {
      return json({ detected: false, created: false, scopes: [], message: "No explicit lot or category structure was found. The tender remains tender-wide." });
    }

    const created: Record<string, unknown>[] = [];
    for (const scope of scopes) {
      const { data: lot, error } = await admin
        .from("tender_lots")
        .insert({
          tender_id: tender.id,
          organization_id: tender.organization_id,
          company_id: tender.company_id,
          lot_number: scope.identifier,
          lot_title: scope.title,
          description: scope.description,
        })
        .select("id, tender_id, organization_id, company_id, lot_number, lot_title, description, created_at, updated_at")
        .single();
      if (error || !lot) return json({ error: "Could not save the detected bid structure." }, 500);
      created.push(lot);

      for (const order of scope.requirement_orders) {
        const requirement = requirementByOrder.get(order);
        if (!requirement) continue;
        const { error: updateError } = await admin
          .from("tender_requirements")
          .update({ lot_id: lot.id })
          .eq("id", requirement.id)
          .eq("tender_id", tender.id);
        if (updateError) return json({ error: "Could not assign a requirement to its detected bid scope." }, 500);
      }
    }

    return json({ detected: true, created: true, scopes: created });
  } catch (error) {
    console.error("detect-tender-bid-structure unexpected error", error);
    return json({ error: "Unexpected error while detecting the bid structure." }, 500);
  }
});
