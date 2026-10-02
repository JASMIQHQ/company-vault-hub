export type Status = "matched" | "manual_review" | "missing" | "expired";
export interface Tender { id: string; company_id: string; organization_id: string; }
export interface Requirement { id: string; category: string | null; requirement_name: string | null; requirement_text: string | null; display_order: number | null; }
export interface Document { id: string; company_id: string; organization_id: string; document_name: string | null; original_filename: string | null; document_type: string | null; category: string | null; expiry_date: string | null; document_status: string | null; deleted_at: string | null; }
export interface Candidate { document: Document; score: number; basis: string[]; }
export interface VerifiedFact { id: string; document_id: string; doc_type: string | null; doc_year: number | null; expiry_date: string | null; confidence: string; verification_attempt_id: string | null; verified_at: string; }
export interface EvidenceDecision { status: Status | null; matchBasis: "METADATA" | "VERIFIED"; expiryDate: string | null; verified: boolean; reason?: string; }

const norm = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
const today = () => new Date().toISOString().slice(0, 10);
const QUALIFYING_VERIFIED_CONFIDENCE = new Set(["high"]);

const aliases: Array<[RegExp, string[]]> = [
  [/\b(cac|corporate affairs commission|certificate of incorporation)\b/i, ["cac", "corporate affairs commission", "certificate of incorporation"]],
  [/\b(tcc|tax clearance|tax clearance certificate|firs)\b/i, ["tcc", "tax clearance", "tax clearance certificate", "firs"]],
  [/\b(pencom|pension commission|pension compliance)\b/i, ["pencom", "pension commission", "pension compliance"]],
  [/\b(itf|industrial training fund)\b/i, ["itf", "industrial training fund"]],
  [/\b(nsitf|social insurance trust fund)\b/i, ["nsitf", "social insurance trust fund"]],
  [/\b(bpp|bureau of public procurement)\b/i, ["bpp", "bureau of public procurement"]],
  [/\b(ogisp|oil and gas industry permit)\b/i, ["ogisp", "oil and gas industry permit"]],
  [/\b(cpn|computer professionals of nigeria)\b/i, ["cpn", "computer professionals of nigeria"]],
  [/\b(nemsa|nigerian electricity management services agency)\b/i, ["nemsa", "nigerian electricity management services agency"]],
  [/\b(audited accounts|audited financial statements|financial statements)\b/i, ["audited accounts", "audited financial statements", "financial statements"]],
];

export function requirementAliases(requirement: Requirement): string[] {
  const text = norm([requirement.requirement_name, requirement.requirement_text].filter(Boolean).join(" "));
  for (const [pattern, values] of aliases) if (pattern.test(text)) return values;
  return [];
}

export function documentText(document: Document): string {
  return norm([document.document_name, document.original_filename, document.document_type, document.category].filter(Boolean).join(" "));
}

export function candidateScore(requirement: Requirement, document: Document, wanted: string[]): Candidate | null {
  const text = documentText(document);
  const type = norm(document.document_type ?? "");
  const name = norm([document.document_name, document.original_filename].filter(Boolean).join(" "));
  const category = norm(document.category ?? "");
  const basis: string[] = [];
  let score = 0;

  if (wanted.length > 0) {
    const exactType = wanted.some((alias) => type === norm(alias) || type.includes(norm(alias)));
    const nameHit = wanted.some((alias) => name.includes(norm(alias)));
    const categoryHit = wanted.some((alias) => category.includes(norm(alias)));
    if (exactType) { score += 100; basis.push("document_type"); }
    if (nameHit) { score += 50; basis.push("document_name"); }
    if (categoryHit) { score += 10; basis.push("category"); }
    if (score === 0) return null;
  } else {
    const requirementTokens = new Set(norm([requirement.requirement_name, requirement.requirement_text].filter(Boolean).join(" ")).split(" ").filter((token) => token.length >= 4));
    const hits = [...requirementTokens].filter((token) => text.includes(token));
    if (hits.length === 0) return null;
    score = hits.length;
    basis.push("document_name/category");
  }

  return { document, score, basis };
}

export function classifyExpiry(expiry: string | null): "valid" | "expired" {
  return expiry !== null && expiry < today() ? "expired" : "valid";
}

export function metadataYear(document: Document): number | null {
  const text = [document.document_name, document.original_filename, document.document_type].filter(Boolean).join(" ");
  const years = [...text.matchAll(/\b(20\d{2})\b/g)].map((match) => Number(match[1])).filter((year) => Number.isInteger(year));
  return years.length > 0 ? years[years.length - 1] : null;
}

export function canonicalDocumentType(value: string | null): string | null {
  const normalized = norm(value ?? "");
  if (!normalized) return null;
  if (["cac", "cac cert", "cac certificate", "cac_cert", "cac_certificate", "corporate affairs commission", "certificate of incorporation"].includes(normalized) || normalized.includes("corporate affairs commission")) return "cac";
  if (["tcc", "tax clearance", "tax clearance certificate", "tax_clearance_certificate", "firs"].includes(normalized) || normalized.includes("tax clearance")) return "tcc";
  if (["pencom", "pension commission", "pension compliance"].includes(normalized) || normalized.includes("pension")) return "pencom";
  if (["itf", "industrial training fund"].includes(normalized)) return "itf";
  if (["nsitf", "social insurance trust fund"].includes(normalized)) return "nsitf";
  if (["bpp", "bureau of public procurement"].includes(normalized)) return "bpp";
  if (["ogisp", "oil and gas industry permit"].includes(normalized)) return "ogisp";
  if (["cpn", "computer professionals of nigeria"].includes(normalized)) return "cpn";
  if (["nemsa", "nigerian electricity management services agency"].includes(normalized)) return "nemsa";
  if (["audited accounts", "audited financial statements", "financial statements", "audited acct", "audited acct 2023", "audited acct 2024", "audited acct 2025"].includes(normalized)) return "audited_financial_statements";
  return normalized;
}

export function expectedCanonicalType(wanted: string[]): string | null {
  for (const alias of wanted) {
    const canonical = canonicalDocumentType(alias);
    if (canonical) return canonical;
  }
  return null;
}

export function latestVerifiedFacts(rows: VerifiedFact[]): Map<string, VerifiedFact> {
  const latest = new Map<string, VerifiedFact>();
  for (const row of rows) {
    const existing = latest.get(row.document_id);
    if (!existing || new Date(row.verified_at).getTime() > new Date(existing.verified_at).getTime() || (row.verified_at === existing.verified_at && row.id > existing.id)) {
      latest.set(row.document_id, row);
    }
  }
  return latest;
}

export function applyVerifiedEvidence(requirement: Requirement, candidate: Candidate, wanted: string[], fact: VerifiedFact | undefined): EvidenceDecision {
  if (!fact) return { status: null, matchBasis: "METADATA", expiryDate: candidate.document.expiry_date, verified: false };

  const confidence = norm(String(fact.confidence ?? ""));
  if (!QUALIFYING_VERIFIED_CONFIDENCE.has(confidence)) {
    console.warn("match-tender-evidence: unrecognized or non-qualifying verified confidence", { document_id: fact.document_id, confidence: fact.confidence });
    return { status: null, matchBasis: "METADATA", expiryDate: candidate.document.expiry_date, verified: false, reason: "unsupported_confidence" };
  }

  const expectedType = expectedCanonicalType(wanted);
  const verifiedType = canonicalDocumentType(fact.doc_type);
  const metadataType = canonicalDocumentType(candidate.document.document_type);

  if (verifiedType && expectedType && verifiedType !== expectedType) {
    return { status: "manual_review", matchBasis: "VERIFIED", expiryDate: candidate.document.expiry_date, verified: true, reason: "verified_doc_type_conflict" };
  }
  if (verifiedType && metadataType && metadataType !== "unspecified" && verifiedType !== metadataType) {
    return { status: "manual_review", matchBasis: "VERIFIED", expiryDate: candidate.document.expiry_date, verified: true, reason: "metadata_verified_doc_type_conflict" };
  }

  const verifiedYear = fact.doc_year;
  const metadataDocYear = metadataYear(candidate.document);
  if (verifiedYear !== null && metadataDocYear !== null && verifiedYear !== metadataDocYear) {
    return { status: "manual_review", matchBasis: "VERIFIED", expiryDate: candidate.document.expiry_date, verified: true, reason: "metadata_verified_year_conflict" };
  }

  const verifiedExpiry = fact.expiry_date;
  const metadataExpiry = candidate.document.expiry_date;
  if (verifiedExpiry !== null && metadataExpiry !== null && verifiedExpiry !== metadataExpiry) {
    return { status: "manual_review", matchBasis: "VERIFIED", expiryDate: metadataExpiry, verified: true, reason: "metadata_verified_expiry_conflict" };
  }

  const effectiveExpiry = verifiedExpiry ?? metadataExpiry;
  return {
    status: classifyExpiry(effectiveExpiry) === "expired" ? "expired" : "matched",
    matchBasis: "VERIFIED",
    expiryDate: effectiveExpiry,
    verified: true,
    reason: "verified_evidence_applied",
  };
}


