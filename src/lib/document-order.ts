import type { CompanyDocument } from "@/lib/vault";

/**
 * Canonical procurement document order. Display-only: nothing in the database
 * is renamed or reordered — the Vault simply sorts rows with this list.
 */
export const CANONICAL_DOCUMENT_ORDER = [
  "CAC",
  "CO2",
  "CO7",
  "MEMART",
  "CAC ANNUAL RETURN",
  "TCC",
  "PENCOM",
  "ITF",
  "NSITF",
  "BPP",
  "NITDA",
  "CPN",
  "NDPC",
  "NEMSA",
  "CMD",
  "OEM",
  "SWORN AFFIDAVIT",
  "BANK REFERENCE",
  "SCUML",
  "COMPANY PROFILE",
  "C.V",
  "PAST JOBS",
  "AUDITED ACCT 2023",
  "AUDITED ACCT 2024",
  "AUDITED ACCT 2025",
] as const;

export type CanonicalCategory = (typeof CANONICAL_DOCUMENT_ORDER)[number] | "OTHER";

/** Uppercase, strip everything that isn't a letter or digit. */
function normalize(value: string | null | undefined): string {
  return (value ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

const NORMALIZED_KEYS = CANONICAL_DOCUMENT_ORDER.map((label) => ({
  label,
  key: normalize(label),
}));

/**
 * Conservative match: a canonical key must appear as a substring of the
 * normalized document_type (preferred) or document_name. The longest matching
 * key wins so "CACANNUALRETURN" is not mistaken for "CAC". Anything that does
 * not match confidently falls back to OTHER — never hidden.
 */
export function canonicalCategory(document: CompanyDocument): CanonicalCategory {
  for (const candidate of [normalize(document.document_type), normalize(document.document_name)]) {
    if (!candidate) continue;
    let best: { label: CanonicalCategory; length: number } | null = null;
    for (const { label, key } of NORMALIZED_KEYS) {
      if (key && candidate.includes(key) && (!best || key.length > best.length)) {
        best = { label, length: key.length };
      }
    }
    if (best) return best.label;
  }
  return "OTHER";
}

function rank(document: CompanyDocument): number {
  const category = canonicalCategory(document);
  if (category === "OTHER") return CANONICAL_DOCUMENT_ORDER.length;
  return CANONICAL_DOCUMENT_ORDER.indexOf(category);
}

/** Sorted copy of the documents in canonical procurement order. */
export function sortByCanonicalOrder(documents: CompanyDocument[]): CompanyDocument[] {
  return [...documents].sort((a, b) => {
    const diff = rank(a) - rank(b);
    if (diff !== 0) return diff;
    return a.document_name.localeCompare(b.document_name);
  });
}
