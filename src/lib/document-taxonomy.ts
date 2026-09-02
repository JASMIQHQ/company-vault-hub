export const FEDERAL_TENDER_DOCUMENT_TYPES = [
  "TAX_CLEARANCE_CERTIFICATE",
  "PENCOM_CERTIFICATE",
  "ITF_CERTIFICATE",
  "NSITF_CERTIFICATE",
  "BPP_CERTIFICATE",
  "CAC_CERTIFICATE",
  "OGISP_CERTIFICATE",
  "CPN_CERTIFICATE",
  "NEMSA_CERTIFICATE",
  "AUDITED_ACCOUNTS",
  "OTHER",
] as const;

export type FederalTenderDocumentType = (typeof FEDERAL_TENDER_DOCUMENT_TYPES)[number];

export const DOCUMENT_TYPE_ALIASES: Record<string, FederalTenderDocumentType> = {
  CAC: "CAC_CERTIFICATE",
  "CORPORATE AFFAIRS CERTIFICATE": "CAC_CERTIFICATE",
  TCC: "TAX_CLEARANCE_CERTIFICATE",
  "TAX CLEARANCE CERTIFICATE": "TAX_CLEARANCE_CERTIFICATE",
  PENCOM: "PENCOM_CERTIFICATE",
  "NATIONAL PENSION COMMISSION COMPLIANCE CERTIFICATE": "PENCOM_CERTIFICATE",
  ITF: "ITF_CERTIFICATE",
  "INDUSTRIAL TRAINING FUND COMPLIANCE CERTIFICATE": "ITF_CERTIFICATE",
  NSITF: "NSITF_CERTIFICATE",
  "NIGERIA SOCIAL INSURANCE TRUST FUND COMPLIANCE CERTIFICATE": "NSITF_CERTIFICATE",
  BPP: "BPP_CERTIFICATE",
  "BUREAU OF PUBLIC PROCUREMENT CERTIFICATE OF REGISTRATION": "BPP_CERTIFICATE",
  CPN: "CPN_CERTIFICATE",
  "COMPUTER PROFESSIONALS OF NIGERIA": "CPN_CERTIFICATE",
  NEMSA: "NEMSA_CERTIFICATE",
  "NIGERIAN ELECTRICITY MANAGEMENT SERVICES AGENCY CERTIFICATE": "NEMSA_CERTIFICATE",
};

export function normalizeDocumentType(value: string | null | undefined): FederalTenderDocumentType | null {
  if (!value) return null;
  const normalized = value.trim().toUpperCase().replace(/\s+/g, " ");
  if ((FEDERAL_TENDER_DOCUMENT_TYPES as readonly string[]).includes(normalized)) return normalized as FederalTenderDocumentType;
  return DOCUMENT_TYPE_ALIASES[normalized] ?? null;
}

export const DOCUMENT_TYPE_LABELS: Record<FederalTenderDocumentType, string> = {
  TAX_CLEARANCE_CERTIFICATE: "Tax Clearance Certificate",
  PENCOM_CERTIFICATE: "National Pension Commission Compliance Certificate",
  ITF_CERTIFICATE: "Industrial Training Fund Compliance Certificate",
  NSITF_CERTIFICATE: "Nigeria Social Insurance Trust Fund Compliance Certificate",
  BPP_CERTIFICATE: "Bureau of Public Procurement Certificate of Registration",
  CAC_CERTIFICATE: "Corporate Affairs Certificate",
  OGISP_CERTIFICATE: "OGISP Certificate",
  CPN_CERTIFICATE: "Computer Professionals of Nigeria Certificate",
  NEMSA_CERTIFICATE: "Nigerian Electricity Management Services Agency Certificate",
  AUDITED_ACCOUNTS: "Audited Accounts",
  OTHER: "Other Document",
};
