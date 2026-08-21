export type RegulatoryConcept = {
  canonicalId: string;
  canonicalName: string;
  currentRegulator: string;
  historicalRegulators: string[];
  aliases: string[];
  legacyRequiresReview: boolean;
};

export const REGULATORY_ONTOLOGY: Record<string, RegulatoryConcept> = {
  TCC: {
    canonicalId: "TCC",
    canonicalName: "Tax Clearance Certificate",
    currentRegulator: "Nigeria Revenue Service (NRS)",
    historicalRegulators: ["Federal Inland Revenue Service (FIRS)", "FIRS"],
    aliases: ["tcc", "tax clearance", "tax clearance certificate", "tax compliance certificate", "firs tax clearance", "nrs tax clearance"],
    legacyRequiresReview: false,
  },
  OGISP: {
    canonicalId: "OGISP",
    canonicalName: "Oil and Gas Industry Service Permit / Upstream Registration",
    currentRegulator: "Nigerian Upstream Petroleum Regulatory Commission (NUPRC)",
    historicalRegulators: ["Department of Petroleum Resources (DPR)", "DPR"],
    aliases: ["ogisp", "oil and gas industry service permit", "oil and gas industry permit", "nuprc permit", "nuprc ogisp", "dpr permit", "dpr ogisp"],
    legacyRequiresReview: true,
  },
  CAC_CERT: {
    canonicalId: "CAC_CERT",
    canonicalName: "Corporate Affairs Commission Registration",
    currentRegulator: "Corporate Affairs Commission (CAC)",
    historicalRegulators: [],
    aliases: ["cac", "cac registration", "cac certificate", "certificate of incorporation", "form cac 1.1", "status report"],
    legacyRequiresReview: false,
  },
  PENCOM: {
    canonicalId: "PENCOM",
    canonicalName: "Pension Compliance Certificate",
    currentRegulator: "National Pension Commission (PENCOM)",
    historicalRegulators: [],
    aliases: ["pencom", "pencom certificate", "pencom compliance", "pension compliance", "pension certificate"],
    legacyRequiresReview: false,
  },
  ITF: {
    canonicalId: "ITF",
    canonicalName: "Industrial Training Fund Compliance Certificate",
    currentRegulator: "Industrial Training Fund (ITF)",
    historicalRegulators: [],
    aliases: ["itf", "itf certificate", "industrial training fund", "itf compliance"],
    legacyRequiresReview: false,
  },
  NSITF: {
    canonicalId: "NSITF",
    canonicalName: "NSITF Compliance Certificate",
    currentRegulator: "Nigeria Social Insurance Trust Fund (NSITF)",
    historicalRegulators: [],
    aliases: ["nsitf", "nsitf certificate", "nsitf compliance", "ecs clearance"],
    legacyRequiresReview: false,
  },
  BPP: {
    canonicalId: "BPP",
    canonicalName: "BPP Interim Registration Report / Procurement Registration",
    currentRegulator: "Bureau of Public Procurement (BPP)",
    historicalRegulators: [],
    aliases: ["bpp", "bpp irr", "interim registration report", "bpp certificate", "bureau of public procurement"],
    legacyRequiresReview: false,
  },
  CPN: {
    canonicalId: "CPN",
    canonicalName: "Computer Professionals of Nigeria Registration",
    currentRegulator: "Computer Professionals of Nigeria (CPN)",
    historicalRegulators: [],
    aliases: ["cpn", "cpn certificate", "computer professionals of nigeria"],
    legacyRequiresReview: false,
  },
  NEMSA: {
    canonicalId: "NEMSA",
    canonicalName: "NEMSA Compliance / Certification",
    currentRegulator: "Nigerian Electricity Management Services Agency (NEMSA)",
    historicalRegulators: [],
    aliases: ["nemsa", "nemsa certificate", "nigerian electricity management services agency"],
    legacyRequiresReview: false,
  },
  SCUML: {
    canonicalId: "SCUML",
    canonicalName: "SCUML Registration",
    currentRegulator: "Special Control Unit Against Money Laundering (SCUML)",
    historicalRegulators: [],
    aliases: ["scuml", "scuml certificate", "special control unit against money laundering"],
    legacyRequiresReview: false,
  },
};

export function normalizeRegulatoryText(value: string | null | undefined) {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

export function resolveRegulatoryConcept(value: string | null | undefined) {
  const normalized = normalizeRegulatoryText(value);
  if (!normalized) return null;
  return Object.values(REGULATORY_ONTOLOGY).find((concept) =>
    concept.aliases.some((alias) => normalized.includes(normalizeRegulatoryText(alias))),
  ) ?? null;
}

export function detectHistoricalRegulator(value: string | null | undefined, concept: RegulatoryConcept) {
  const normalized = normalizeRegulatoryText(value);
  return concept.historicalRegulators.find((issuer) => normalized.includes(normalizeRegulatoryText(issuer))) ?? null;
}
