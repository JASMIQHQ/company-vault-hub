export type RequirementDisposition =
  | "evidence"
  | "eligibility"
  | "procedural"
  | "general";

export interface RequirementDescriptor {
  category?: string | null;
  name?: string | null;
  text?: string | null;
}

/** Conservative classification: unknown requirements stay in human review. */
export function classifyRequirement(
  requirement: RequirementDescriptor,
): RequirementDisposition {
  const text = [requirement.name, requirement.text]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

  if (
    /\b(envelop(?:e|ing)|mark(?:ing)?|sealed|soft copy|hard copy|electronic submission|email submission|e-mail submission|forward(?:ed)? through|addressed to|number of copies|copies of the bid|bid opening|tender opening|submission format|delivery address|physical submission|online portal)\b/.test(
      text,
    )
  ) {
    return "procedural";
  }

  if (
    /\b(eligibility|eligible|pre[- ]?qualification|qualification|registration|registered|permit|licen[cs]e|accreditation)\b/.test(
      text,
    )
  ) {
    return "eligibility";
  }

  if (
    /\b(certificate|evidence|proof|clearance|compliance|audited|accounts|financial statements|experience|past projects|past jobs|work programme|work plan|schedule|company profile|curriculum vitae|\bcv\b|reference|insurance|tax|pension|current version|validity)\b/.test(
      text,
    )
  ) {
    return "evidence";
  }

  return "general";
}
