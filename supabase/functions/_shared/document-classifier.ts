export const DOCUMENT_TYPES = [
  "TAX_CLEARANCE_CERTIFICATE",
  "PENCOM_CERTIFICATE",
  "ITF_CERTIFICATE",
  "NSITF_CERTIFICATE",
  "BPP_CERTIFICATE",
  "CAC_CERTIFICATE",
  "OGISP_CERTIFICATE",
  "AUDITED_ACCOUNTS",
  "OTHER",
] as const;

export type VerifiedDocType = typeof DOCUMENT_TYPES[number];

const PATTERNS: Array<[VerifiedDocType, RegExp[]]> = [
  ["TAX_CLEARANCE_CERTIFICATE", [/\btcc\b/i, /tax\s*clearance/i, /firs\s*(tax\s*)?clearance/i, /tax\s*clearance\s*certificate/i]],
  ["PENCOM_CERTIFICATE", [/\bpencom\b/i, /pension\s*compliance/i, /pension\s*certificate/i]],
  ["ITF_CERTIFICATE", [/\bitf\b/i, /industrial\s*training\s*fund/i]],
  ["NSITF_CERTIFICATE", [/\bnsitf\b/i, /social\s*insurance\s*trust\s*fund/i]],
  ["BPP_CERTIFICATE", [/\bbpp\b/i, /bureau\s*of\s*public\s*procurement/i, /contractor\s*registration.*bpp/i]],
  ["CAC_CERTIFICATE", [/\bcac\b/i, /corporate\s*affairs\s*commission/i, /certificate\s*of\s*incorporation/i]],
  ["OGISP_CERTIFICATE", [/\bogisp\b/i, /dpr\b/i, /upstream\s*regulatory/i, /nupc?rc/i, /oil\s*&?\s*gas\s*industry/i]],
  ["AUDITED_ACCOUNTS", [/audited\s*(financial\s*)?(accounts|statements)/i, /audited\s*account/i, /financial\s*statement/i, /annual\s*accounts/i]],
];

export function normalizeFilename(value: string | null | undefined): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9& ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function classifyFilename(value: string | null | undefined): VerifiedDocType | null {
  const text = normalizeFilename(value);
  if (!text) return null;
  for (const [type, patterns] of PATTERNS) {
    if (patterns.some((pattern) => pattern.test(text))) return type;
  }
  return null;
}

export function extractYear(value: string | null | undefined): number | null {
  const match = String(value ?? "").match(/\b(20\d{2})\b/);
  return match ? Number(match[1]) : null;
}

export function classifyDocument(doc: {
  document_name?: string | null;
  original_filename?: string | null;
  document_type?: string | null;
  category?: string | null;
}) {
  const filenameType = classifyFilename(doc.original_filename) ?? classifyFilename(doc.document_name);
  const year = extractYear(doc.original_filename) ?? extractYear(doc.document_name);
  return { filenameType, year };
}

export const VALIDITY_RULES: Record<string, { validity: "calendar_year" | "lookback_years"; expires?: string; years_back?: number }> = {
  TAX_CLEARANCE_CERTIFICATE: { validity: "calendar_year", expires: "12-31" },
  PENCOM_CERTIFICATE: { validity: "calendar_year", expires: "12-31" },
  ITF_CERTIFICATE: { validity: "calendar_year", expires: "12-31" },
  NSITF_CERTIFICATE: { validity: "calendar_year", expires: "12-31" },
  BPP_CERTIFICATE: { validity: "calendar_year", expires: "12-31" },
  CAC_CERTIFICATE: { validity: "calendar_year", expires: "12-31" },
  OGISP_CERTIFICATE: { validity: "calendar_year", expires: "12-31" },
  AUDITED_ACCOUNTS: { validity: "lookback_years", years_back: 3 },
};

export function requirementCategory(text: string): VerifiedDocType | null {
  return classifyFilename(text);
}

export function requiredYear(text: string, deadline?: string | null): number | null {
  const explicit = extractYear(text);
  if (explicit) return explicit;
  const normalized = normalizeFilename(text);
  if (/\b(current|latest|renewed|up\s*to\s*date)\b/.test(normalized) && /\b(year|version|document|certificate)\b/.test(normalized)) {
    return deadline ? new Date(deadline).getUTCFullYear() : new Date().getUTCFullYear();
  }
  return null;
}

export function auditedYears(requiredCurrentYear: number): number[] {
  return [requiredCurrentYear - 1, requiredCurrentYear - 2, requiredCurrentYear - 3];
}
