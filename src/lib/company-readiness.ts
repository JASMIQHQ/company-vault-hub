export type RequirementCategory = {
  type: string;
  label?: string;
};

export type DocumentValidity = "valid" | "expired" | "missing";

export type VaultDocumentSummary = {
  id: string;
  document_type: string;
  expiry_date: string | null;
};

export type CompanyReadinessInput = {
  required: RequirementCategory[];
  documents: VaultDocumentSummary[];
  asOf?: string;
};

export type CompanyReadinessResult = {
  present: string[];
  missing: string[];
  expired: string[];
  score: number;
  total: number;
};

function validity(document: VaultDocumentSummary | undefined, asOf: string): DocumentValidity {
  if (!document) return "missing";
  if (document.expiry_date && document.expiry_date < asOf) return "expired";
  return "valid";
}

export function deriveCompanyReadiness({ required, documents, asOf = new Date().toISOString().slice(0, 10) }: CompanyReadinessInput): CompanyReadinessResult {
  const latestByType = new Map<string, VaultDocumentSummary>();
  for (const document of documents) {
    if (!latestByType.has(document.document_type)) latestByType.set(document.document_type, document);
  }

  const present: string[] = [];
  const missing: string[] = [];
  const expired: string[] = [];

  for (const requirement of required) {
    const document = latestByType.get(requirement.type);
    const state = validity(document, asOf);
    if (state === "valid") present.push(requirement.type);
    else if (state === "expired") expired.push(requirement.type);
    else missing.push(requirement.type);
  }

  const total = required.length;
  const score = total === 0 ? 0 : Math.round((present.length / total) * 100);

  return { present, missing, expired, score, total };
}
