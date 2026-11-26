import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import {
  DOCUMENT_TYPES,
  normalizeDocumentType,
  type VerifiedDocType,
} from "../_shared/document-classifier.ts";
import { authorizeCompanyMembership } from "../_shared/company-authorization.ts";
import { canUseAiStub, resolveVerificationOutcome } from "../_shared/verification-decision.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const MAX_PDF_BYTES = 20 * 1024 * 1024;

type Provider = "gemini" | "anthropic" | "stub";
type VerificationStatus = "verified" | "mismatch" | "failed";

interface CompanyDocumentRow {
  id: string;
  organization_id: string;
  company_id: string;
  document_name: string | null;
  original_filename: string | null;
  document_type: string | null;
  category: string | null;
  storage_path: string | null;
  mime_type: string | null;
  file_size: number | null;
}

interface AttemptExtra {
  model?: string | null;
  doc_type?: string | null;
  year?: number | null;
  expiry_date?: string | null;
  confidence?: "high" | "low" | null;
  error_stage?: string | null;
  error_message?: string | null;
  diagnostics?: Record<string, unknown> | null;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });

function getProperty(value: unknown, key: string): unknown {
  if (typeof value !== "object" || value === null) return undefined;
  return (value as Record<string, unknown>)[key];
}

function extractTextBlocks(value: unknown, requiredType?: string): string[] {
  const items: unknown[] = Array.isArray(value) ? value : [];
  return items.flatMap((item) => {
    const text = getProperty(item, "text");
    if (typeof text !== "string") return [];
    if (requiredType && getProperty(item, "type") !== requiredType) return [];
    return [text];
  });
}

const parse = (value: string): Record<string, unknown> | null => {
  try {
    const withoutCodeFence = value
      .replace(/^\x60{3}json\s*/i, "")
      .replace(/\x60{3}\s*$/i, "")
      .trim();
    return JSON.parse(withoutCodeFence) as Record<string, unknown>;
  } catch {
    return null;
  }
};

const validType = (value: unknown): value is VerifiedDocType =>
  typeof value === "string" && (DOCUMENT_TYPES as readonly string[]).includes(value);

const provider = (): Provider => {
  const configured = Deno.env.get("AI_PROVIDER")?.toLowerCase();
  return configured === "stub" ? "stub" : configured === "anthropic" ? "anthropic" : "gemini";
};

const prompt = () =>
  `You are JASMIQ's document verification engine for Nigerian procurement compliance. Inspect the supplied PDF itself. Classify it conservatively using ONLY this enum: ${DOCUMENT_TYPES.join(", ")}. Extract the document year when explicitly present, otherwise null. Extract an explicit expiry date as YYYY-MM-DD when present, otherwise null. Return JSON only with exactly: {"doc_type":"ENUM","year":integer|null,"expiry_date":"YYYY-MM-DD"|null,"confidence":"high"|"low"}. Do not infer a year from today's date or filename alone. If ambiguous or unrelated, use OTHER and low confidence.`;

async function aiCall(
  selectedProvider: Provider,
  key: string | null,
  base64: string,
  filename: string,
) {
  if (selectedProvider === "stub") {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    if (!canUseAiStub(supabaseUrl)) {
      return {
        ok: false as const,
        provider: selectedProvider,
        model: "stub",
        stage: "STUB_FORBIDDEN_PRODUCTION",
        message: "The AI stub is forbidden in production.",
        diagnostics: null,
      };
    }

    const fixture = Deno.env.get("AI_STUB_RESPONSE");
    if (!fixture) {
      return {
        ok: false as const,
        provider: selectedProvider,
        model: "stub",
        stage: "AI_STUB_RESPONSE_MISSING",
        message: "AI_STUB_RESPONSE is not configured.",
        diagnostics: null,
      };
    }

    return {
      ok: true as const,
      provider: selectedProvider,
      model: "deterministic-test-fixture",
      text: fixture,
      diagnostics: { mode: "stub" },
    };
  }

  if (!key) {
    return {
      ok: false as const,
      provider: selectedProvider,
      model: "unknown",
      stage: "AI_CONFIGURATION",
      message: "AI provider key is missing.",
      diagnostics: null,
    };
  }

  if (selectedProvider === "anthropic") {
    const model = Deno.env.get("ANTHROPIC_MODEL") || "claude-sonnet-4-6";
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 300,
        system: prompt(),
        messages: [
          {
            role: "user",
            content: [
              {
                type: "document",
                source: {
                  type: "base64",
                  media_type: "application/pdf",
                  data: base64,
                },
              },
              { type: "text", text: `Filename: ${filename}` },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return {
        ok: false as const,
        provider: selectedProvider,
        model,
        stage: "AI_UPSTREAM_HTTP",
        message: "Claude verification failed.",
        diagnostics: {
          http_status: response.status,
          response_length: errorBody.length,
        },
      };
    }

    const payload: unknown = await response.json();
    const text = extractTextBlocks(getProperty(payload, "content"), "text").join("\n");

    return {
      ok: true as const,
      provider: selectedProvider,
      model,
      text,
      diagnostics: null,
    };
  }

  const model = Deno.env.get("GEMINI_MODEL") || "gemini-3.6-flash";
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "x-goog-api-key": key,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt() },
              { inlineData: { mimeType: "application/pdf", data: base64 } },
              { text: `Filename: ${filename}` },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          maxOutputTokens: 1024,
          thinkingConfig: { thinkingLevel: "minimal" },
        },
      }),
    },
  );

  if (!response.ok) {
    const errorBody = await response.text();
    return {
      ok: false as const,
      provider: selectedProvider,
      model,
      stage: "AI_UPSTREAM_HTTP",
      message: "Gemini verification failed.",
      diagnostics: {
        http_status: response.status,
        response_length: errorBody.length,
      },
    };
  }

  const payload: unknown = await response.json();
  const candidateValue = getProperty(payload, "candidates");
  const candidates: unknown[] = Array.isArray(candidateValue) ? candidateValue : [];
  const firstCandidate = candidates[0];
  const content = getProperty(firstCandidate, "content");
  const text = extractTextBlocks(getProperty(content, "parts")).join("\n");

  return {
    ok: true as const,
    provider: selectedProvider,
    model,
    text,
    diagnostics: {
      finish_reason: getProperty(firstCandidate, "finishReason") ?? null,
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const selectedProvider = provider();
  const key =
    selectedProvider === "stub"
      ? null
      : selectedProvider === "gemini"
        ? (Deno.env.get("GEMINI_API_KEY") ?? null)
        : (Deno.env.get("ANTHROPIC_API_KEY") ?? null);

  if (!url || !serviceKey || (selectedProvider !== "stub" && !key)) {
    return json(
      {
        error: "Verification service configuration is missing.",
        provider: selectedProvider,
      },
      500,
    );
  }

  if (selectedProvider === "stub" && !canUseAiStub(url)) {
    return json({ error: "The AI stub is forbidden in production." }, 500);
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let profileId: string | null = null;
  let doc: CompanyDocumentRow | null = null;

  const recordAttempt = async (
    outcome: VerificationStatus,
    extra: AttemptExtra = {},
  ): Promise<string> => {
    if (!doc || !profileId) {
      throw new Error("Verification context is incomplete.");
    }

    const { data, error } = await admin.rpc("record_document_verification", {
      p_document_id: doc.id,
      p_requested_by: profileId,
      p_provider: selectedProvider,
      p_model: extra.model ?? null,
      p_outcome: outcome,
      p_detected_doc_type: extra.doc_type ?? null,
      p_detected_year: extra.year ?? null,
      p_detected_expiry_date: extra.expiry_date ?? null,
      p_confidence: extra.confidence ?? null,
      p_error_stage: extra.error_stage ?? null,
      p_error_message: extra.error_message ?? null,
      p_diagnostics: extra.diagnostics ?? null,
    });

    if (error) throw error;
    return data as string;
  };

  try {
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Not authenticated." }, 401);

    const { data: authResult, error: authError } = await admin.auth.getUser(token);
    if (authError || !authResult.user) {
      return json({ error: "Not authenticated." }, 401);
    }

    const body = (await req.json().catch(() => ({}))) as {
      document_id?: string;
    };
    if (!body.document_id) {
      return json({ error: "A document_id is required." }, 400);
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("id")
      .eq("auth_user_id", authResult.user.id)
      .maybeSingle();

    if (!profile) {
      return json({ error: "No profile found for this user." }, 403);
    }
    profileId = profile.id;

    const { data: memberships } = await admin
      .from("organization_members")
      .select("organization_id,is_owner")
      .eq("profile_id", profile.id);
    const organizationIds = (memberships ?? [])
      .map((membership) => membership.organization_id)
      .filter(Boolean);

    const { data: document, error: documentError } = await admin
      .from("company_documents")
      .select(
        "id,organization_id,company_id,document_name,original_filename,document_type,category,storage_path,mime_type,file_size",
      )
      .eq("id", body.document_id)
      .is("deleted_at", null)
      .maybeSingle();

    if (documentError) throw documentError;
    doc = document as CompanyDocumentRow | null;

    if (!doc || !organizationIds.includes(doc.organization_id)) {
      return json({ error: "Document not found or not accessible." }, 404);
    }

    const companyAuthorized = await authorizeCompanyMembership(admin, {
      profileId: profile.id,
      companyId: doc.company_id,
      organizationId: doc.organization_id,
      organizationMemberships: memberships ?? [],
    });

    if (!companyAuthorized) {
      return json({ error: "Document not found or not accessible." }, 404);
    }

    const filename = String(doc.original_filename ?? doc.document_name ?? "unknown");
    const mime = String(doc.mime_type ?? "")
      .toLowerCase()
      .split(";")[0]
      .trim();

    if (mime !== "application/pdf" && !filename.toLowerCase().endsWith(".pdf")) {
      await recordAttempt("failed", {
        error_stage: "PDF_MIME_INVALID",
        error_message: "Only PDF documents can be verified.",
      });
      return json(
        {
          error: "Only PDF documents can be verified.",
          stage: "PDF_MIME_INVALID",
        },
        415,
      );
    }

    if (Number(doc.file_size ?? 0) > MAX_PDF_BYTES) {
      await recordAttempt("failed", {
        error_stage: "PDF_TOO_LARGE",
        error_message: "PDF exceeds 20 MB limit.",
      });
      return json(
        {
          error: "PDF_TOO_LARGE",
          document_id: doc.id,
          max_raw_bytes: MAX_PDF_BYTES,
        },
        413,
      );
    }

    if (!doc.storage_path) {
      await recordAttempt("failed", {
        error_stage: "STORAGE_PATH_MISSING",
        error_message: "Document has no stored file.",
      });
      return json({ error: "Document has no stored file.", stage: "STORAGE_PATH_MISSING" }, 404);
    }

    const { data: blob, error: downloadError } = await admin.storage
      .from("company-documents")
      .download(doc.storage_path);

    if (downloadError || !blob) {
      await recordAttempt("failed", {
        error_stage: "STORAGE_DOWNLOAD",
        error_message: "Could not download document for verification.",
      });
      return json(
        {
          error: "Could not download document for verification.",
          stage: "STORAGE_DOWNLOAD",
        },
        502,
      );
    }

    const bytes = new Uint8Array(await blob.arrayBuffer());
    if (bytes.byteLength > MAX_PDF_BYTES) {
      await recordAttempt("failed", {
        error_stage: "PDF_TOO_LARGE",
        error_message: "PDF exceeds 20 MB limit.",
      });
      return json(
        {
          error: "PDF_TOO_LARGE",
          document_id: doc.id,
          raw_bytes: bytes.byteLength,
          max_raw_bytes: MAX_PDF_BYTES,
        },
        413,
      );
    }

    const pdfHeader = new TextDecoder().decode(bytes.subarray(0, 1024));
    if (!pdfHeader.includes("%PDF-")) {
      await recordAttempt("failed", {
        error_stage: "PDF_SIGNATURE_INVALID",
        error_message: "Uploaded content is not a valid PDF.",
      });
      return json(
        {
          error: "Uploaded content is not a valid PDF.",
          stage: "PDF_SIGNATURE_INVALID",
        },
        415,
      );
    }

    const chunks: string[] = [];
    for (let i = 0; i < bytes.length; i += 0x8000) {
      chunks.push(String.fromCharCode(...bytes.subarray(i, i + 0x8000)));
    }
    const base64 = btoa(chunks.join(""));

    let result: Awaited<ReturnType<typeof aiCall>>;
    try {
      result = await aiCall(selectedProvider, key, base64, filename);
    } catch (error) {
      await recordAttempt("failed", {
        error_stage: "AI_REQUEST_EXCEPTION",
        error_message: error instanceof Error ? error.message : String(error),
      });
      return json({ error: "AI verification request failed.", stage: "AI_REQUEST_EXCEPTION" }, 502);
    }

    if (!result.ok) {
      await recordAttempt("failed", {
        model: result.model,
        error_stage: result.stage,
        error_message: result.message,
        diagnostics: result.diagnostics,
      });
      return json(
        {
          error: result.message,
          provider: selectedProvider,
          stage: result.stage,
          diagnostics: result.diagnostics,
        },
        502,
      );
    }

    const parsed = parse(result.text);
    if (!parsed || !validType(parsed.doc_type)) {
      await recordAttempt("failed", {
        model: result.model,
        error_stage: "AI_CONTENT_PARSE_EXCEPTION",
        error_message: "Invalid verification payload.",
        diagnostics: { response_length: result.text.length },
      });
      return json(
        {
          error: "Invalid verification payload.",
          provider: selectedProvider,
          model: result.model,
          stage: "AI_CONTENT_PARSE_EXCEPTION",
        },
        502,
      );
    }

    const year =
      typeof parsed.year === "number" &&
      Number.isInteger(parsed.year) &&
      parsed.year >= 1900 &&
      parsed.year <= 2100
        ? parsed.year
        : null;
    const expiry =
      typeof parsed.expiry_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(parsed.expiry_date)
        ? parsed.expiry_date
        : null;
    const confidence = parsed.confidence === "high" ? "high" : "low";
    const detected = parsed.doc_type as VerifiedDocType;
    const declared = normalizeDocumentType(doc.document_type);
    const status = resolveVerificationOutcome({
      declaredType: declared,
      detectedType: detected,
      confidence,
    });

    const attemptId = await recordAttempt(status, {
      model: result.model,
      doc_type: detected,
      year,
      expiry_date: expiry,
      confidence,
    });

    // The database audit trigger is the single writer for verified facts.
    // Inserting here as well would duplicate the fact for the same document.
    return json({
      document_id: doc.id,
      verified_doc_type: detected,
      verified_year: year,
      verified_expiry_date: expiry,
      verification_status: status,
      confidence,
      provider: selectedProvider,
      model: result.model,
      verification_attempt_id: attemptId,
    });
  } catch (error) {
    console.error("verify-document failed", error);
    return json(
      {
        error: error instanceof Error ? error.message : "Document verification failed.",
        stage: "UNHANDLED_EXCEPTION",
      },
      500,
    );
  }
});
