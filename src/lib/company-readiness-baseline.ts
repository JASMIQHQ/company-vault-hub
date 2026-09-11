import type { RequirementCategory } from "@/lib/company-readiness";

/**
 * JASMIQ MVP company-readiness baseline.
 * These six universal procurement categories are the only denominator for the
 * headline readiness score. Supporting and conditional documents are surfaced
 * separately and never reduce the headline score.
 */
export const COMPANY_READINESS_CORE: RequirementCategory[] = [
  { type: "CAC CERTIFICATE", label: "CAC Certificate" },
  { type: "TCC", label: "Tax Clearance Certificate" },
  { type: "PENCOM", label: "PENCOM Compliance" },
  { type: "ITF", label: "ITF Compliance" },
  { type: "NSITF", label: "NSITF Compliance" },
  { type: "BPP", label: "BPP Registration / IRR" },
];

export const COMPANY_READINESS_SUPPORTING: RequirementCategory[] = [
  { type: "CAC 2", label: "C02" },
  { type: "CAC 7", label: "C07" },
  { type: "MEMART", label: "MEMART" },
  { type: "CAC ANNUAL RETURN", label: "CAC Annual Return" },
  { type: "COMPANY PROFILE", label: "Company Profile" },
  { type: "C.V", label: "CV of Staff" },
  { type: "PAST JOBS", label: "Past Jobs" },
  { type: "AUDITED ACCT 2023", label: "Audited Accounts" },
  { type: "BANK REFERENCE", label: "Bank Reference" },
  { type: "SWORN AFFIDAVIT", label: "Sworn Affidavit" },
];

export const COMPANY_READINESS_CONDITIONAL: RequirementCategory[] = [
  { type: "NITDA", label: "NITDA" },
  { type: "NEMSA", label: "NEMSA" },
  { type: "OEM", label: "OEM" },
  { type: "DPR LICENSE", label: "DPR License" },
];
