export type TenderRequirementState =
  | "matched"
  | "manual_review"
  | "missing"
  | "expired";

export type TenderReadiness =
  | "READY"
  | "REVIEW_REQUIRED"
  | "NOT_READY";

interface ReadinessRequirement {
  status: string | null | undefined;
}

export function deriveTenderReadiness(
  requirements: ReadinessRequirement[],
): TenderReadiness {
  if (requirements.length === 0) {
    return "NOT_READY";
  }

  const hasMissingOrExpired = requirements.some(
    (requirement) =>
      requirement.status === "missing" ||
      requirement.status === "expired",
  );

  if (hasMissingOrExpired) {
    return "NOT_READY";
  }

  const hasManualReview = requirements.some(
    (requirement) => requirement.status === "manual_review",
  );

  if (hasManualReview) {
    return "REVIEW_REQUIRED";
  }

  const allMatched = requirements.every(
    (requirement) => requirement.status === "matched",
  );

  return allMatched ? "READY" : "NOT_READY";
}
