import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STYLES: Record<string, string> = {
  matched: "bg-success-soft text-success border-success/25",
  missing: "bg-destructive/10 text-destructive border-destructive/25",
  expired: "bg-destructive/10 text-destructive border-destructive/25",
  manual_review: "bg-warning-soft text-warning border-warning/25",
  pending: "bg-warning-soft text-warning border-warning/25",
};

const LABELS: Record<string, string> = {
  matched: "Available",
  missing: "Missing",
  expired: "Expired",
  manual_review: "Needs review",
  pending: "Needs review",
};

export function RequirementStatusBadge({
  status,
  matchBasis,
  hasCandidateLink,
}: {
  status: string | null;
  matchBasis?: string | null;
  hasCandidateLink?: boolean;
}) {
  const key = status ?? "pending";
  const isSubmissionAction = matchBasis === "PROCEDURAL_DECLARATION";
  const isCandidate = status === "manual_review" && Boolean(hasCandidateLink);
  const label = isSubmissionAction
    ? "Submission action"
    : isCandidate
      ? "Candidate evidence"
      : (LABELS[key] ?? "Needs review");
  const style =
    isSubmissionAction || isCandidate ? STYLES.manual_review : (STYLES[key] ?? STYLES.pending);
  return (
    <Badge
      variant="outline"
      className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", style)}
    >
      {label}
    </Badge>
  );
}
