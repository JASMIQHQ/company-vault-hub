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

export function RequirementStatusBadge({ status }: { status: string | null }) {
  const key = status ?? "pending";
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full px-2.5 py-0.5 text-xs font-medium",
        STYLES[key] ?? STYLES.pending,
      )}
    >
      {LABELS[key] ?? "Needs review"}
    </Badge>
  );
}
